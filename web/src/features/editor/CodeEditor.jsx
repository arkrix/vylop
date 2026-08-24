import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Editor from "@monaco-editor/react";
import Stomp from 'stompjs';
import SockJS from 'sockjs-client';
import axios from 'axios';
import toast from 'react-hot-toast';
import Split from 'react-split';
import { initVimMode } from 'monaco-vim';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import ReactMarkdown from 'react-markdown'; 
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import { Awareness } from 'y-protocols/awareness';
import { FilePlus, Code2 } from 'lucide-react';

import { getFileIcon } from './FileExplorer';
import './CodeEditor.css'; 
import { evaluateSubmission } from '../evaluation/evaluationService';
import { 
    API_BASE_URL, 
    CODE_SNIPPETS, 
    MOCK_PROBLEMS, 
    CURSOR_COLORS, 
    getExtension, 
    getLanguageFromExtension 
} from './editorConstants';
import { resolveFileName, parseErrors, getSeverityColor } from './utils/errorParsers';

import EditorToolbar from './components/EditorToolbar';
import EditorSidebar from './components/EditorSidebar';
import ProblemDescriptionPanel from './components/ProblemDescriptionPanel';
import BottomPanel from './components/BottomPanel';
import EditorModals from './components/EditorModals';
import PageLoader from '../../components/common/PageLoader';

const loadedRooms = new Set();

const CodeEditor = () => {
    const { roomId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    
    const [username] = useState(() => location.state?.username || localStorage.getItem('username') || '');
    const [roomName, setRoomName] = useState(() => location.state?.roomName || "Syncing Workspace...");

    const [isInterviewMode, setIsInterviewMode] = useState(() => {
        const mode = location.state?.mode || location.state?.roomType;
        return mode === 'INTERVIEW' || mode === 'interview';
    });

    const [files, setFiles] = useState({});
    const [openFiles, setOpenFiles] = useState([]);
    const [activeFile, setActiveFile] = useState(null);
    
    const [currentProblem, setCurrentProblem] = useState(null);
    const [isQuestionBankOpen, setIsQuestionBankOpen] = useState(false);
    const [problemSearch, setProblemSearch] = useState("");
    
    const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(false);
    const [isPanelMaximized, setIsPanelMaximized] = useState(false);
    const [panelSizes, setPanelSizes] = useState([65, 35]);
    const [activeBottomTab, setActiveBottomTab] = useState("console"); 
    const [activeTestCaseId, setActiveTestCaseId] = useState(1);

    const [output, setOutput] = useState("");
    const [userInput, setUserInput] = useState(""); 
    const [isRunning, setIsRunning] = useState(false);
    const [isSaving, setIsSaving] = useState(false); 

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionResult, setSubmissionResult] = useState(null);

    const [users, setUsers] = useState([]); 
    const [currentUserRole, setCurrentUserRole] = useState('READ_ONLY');

    const [editorErrors, setEditorErrors] = useState({});
    const decorationIds = useRef([]);
    const viewZoneIds = useRef([]);

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isExplorerExpanded, setIsExplorerExpanded] = useState(true);
    const [isOnlineExpanded, setIsOnlineExpanded] = useState(true);
    const [isChatExpanded, setIsChatExpanded] = useState(true);

    const [isVimMode, setIsVimMode] = useState(false);
    const [showMarkdownPreview, setShowMarkdownPreview] = useState(false); 
    const [messages, setMessages] = useState([]);
    const [chatMsg, setChatMsg] = useState("");
    const [typingUsers, setTypingUsers] = useState([]);
    const [wsConnected, setWsConnected] = useState(false);

    const [editorTheme, setEditorTheme] = useState(() => localStorage.getItem('editorTheme') || 'vs-dark');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newFileLang, setNewFileLang] = useState("python");
    const [newFileName, setNewFileName] = useState("");
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [fileToDelete, setFileToDelete] = useState(null);
    const [isSecretsModalOpen, setIsSecretsModalOpen] = useState(false);
    const [secrets, setSecrets] = useState([{ key: '', value: '' }]);
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

    const [isLangChangeModalOpen, setIsLangChangeModalOpen] = useState(false);
    const [pendingLangChange, setPendingLangChange] = useState(null);

    // Leaving workspace transition loader state
    const [isLeavingWorkspace, setIsLeavingWorkspace] = useState(false);

    const editorRef = useRef(null);
    const monacoRef = useRef(null);
    const vimInstanceRef = useRef(null); 
    const remoteCursors = useRef({}); 
    const chatContainerRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const stompClient = useRef(null);
    const isConnected = useRef(false);
    const notifiedUsers = useRef(new Set()); 
    const pendingCursors = useRef({});
    const userColorMap = useRef({});
    const nextColorIndex = useRef(0);
    const disconnectTimeoutRef = useRef(null); 
    const fileInputRef = useRef(null); 

    const ydocRef = useRef(new Y.Doc());
    const awarenessRef = useRef(new Awareness(ydocRef.current));
    const ymonacoBindingRef = useRef(null);
    const isHostRef = useRef(false);
    
    const [isWorkspaceLoaded, setIsWorkspaceLoaded] = useState(false);
    const loadedFilesRef = useRef({});
    const initialSyncRequested = useRef(false);

    const isHost = currentUserRole === 'HOST';
    const canEdit = currentUserRole === 'HOST' || currentUserRole === 'EDITOR';

    useEffect(() => {
        isHostRef.current = currentUserRole === 'HOST';
    }, [currentUserRole]);

    useEffect(() => {
        if (currentProblem) {
            setIsInterviewMode(true);
            setIsBottomPanelOpen(true);
            setActiveBottomTab("testcases");
            setActiveTestCaseId(1);
            setSubmissionResult(null); 
        }
    }, [currentProblem]);

    useEffect(() => {
        const fileKeys = Object.keys(files);
        if (!activeFile && fileKeys.length > 0) {
            const nextFile = openFiles.length > 0 ? openFiles[openFiles.length - 1] : fileKeys[0];
            setActiveFile(nextFile);
            if (!openFiles.includes(nextFile)) {
                setOpenFiles(prev => [...prev, nextFile]);
            }
        }
    }, [files, activeFile, openFiles]);

    const getTooltip = (requiredRole) => {
        if (requiredRole === 'HOST' && !isHost) return "Only the host can perform this action";
        if (requiredRole === 'EDITOR' && !canEdit) return "You are in read-only mode";
        return "";
    };

    const getUserColor = (user) => {
        if (!userColorMap.current[user]) {
            userColorMap.current[user] = CURSOR_COLORS[nextColorIndex.current % CURSOR_COLORS.length];
            nextColorIndex.current += 1;
        }
        return userColorMap.current[user];
    };

    // 1. Fetch initial workspace data with intentional loading buffer
    useEffect(() => {
        let isMounted = true;
        const fetchWorkspaceData = async () => {
            if (loadedRooms.has(roomId)) return;
            loadedRooms.add(roomId);

            const minimumLoadDelay = new Promise(resolve => setTimeout(resolve, 1400));

            try {
                const [metaRes, loadRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/api/workspace/${roomId}`).catch(() => ({ data: null })),
                    axios.get(`${API_BASE_URL}/api/workspace/${roomId}/load`).catch(() => ({ data: {} })),
                    minimumLoadDelay
                ]);

                if (!isMounted) return;

                if (metaRes.data?.name) setRoomName(metaRes.data.name);
                if (metaRes.data?.type === 'INTERVIEW' || metaRes.data?.roomType === 'INTERVIEW' || metaRes.data?.mode === 'INTERVIEW') {
                    setIsInterviewMode(true);
                }
                
                loadedFilesRef.current = loadRes.data || {};
                
                if (Object.keys(loadedFilesRef.current).length > 0) {
                    const newFilesState = {};
                    Object.keys(loadedFilesRef.current).forEach(fileName => {
                        newFilesState[fileName] = { 
                            name: fileName, 
                            language: getLanguageFromExtension(fileName) 
                        };
                    });
                    setFiles(newFilesState);
                    const firstFile = Object.keys(newFilesState)[0];
                    setActiveFile(firstFile);
                    setOpenFiles([firstFile]);
                } else {
                    const defaultFile = "src/Main.java";
                    const defaultLang = "java";
                    setFiles({
                        [defaultFile]: { name: defaultFile, language: defaultLang }
                    });
                    setActiveFile(defaultFile);
                    setOpenFiles([defaultFile]);
                }
            } catch (error) {
                if (isMounted) {
                    await minimumLoadDelay;
                    loadedRooms.delete(roomId);
                    setRoomName(prev => prev === "Syncing Workspace..." ? "Dev Workspace" : prev);

                    const defaultFile = "src/Main.java";
                    const defaultLang = "java";
                    setFiles({
                        [defaultFile]: { name: defaultFile, language: defaultLang }
                    });
                    setActiveFile(defaultFile);
                    setOpenFiles([defaultFile]);
                }
            } finally {
                if (isMounted) setIsWorkspaceLoaded(true);
            }
        };
        
        if (roomId && username) {
            fetchWorkspaceData();
        }
        
        return () => { 
            isMounted = false; 
            loadedRooms.delete(roomId); 
        };
    }, [roomId, username]);

    useEffect(() => {
        const ydoc = ydocRef.current;
        const updateHandler = (update, origin) => {
            if (origin !== 'remote' && stompClient.current?.connected) {
                const updateArray = Array.from(update);
                stompClient.current.send(`/app/yjs/${roomId}`, {}, JSON.stringify({ 
                    sender: username, 
                    type: 'SYNC', 
                    update: updateArray 
                }));
            }
        };
        ydoc.on('update', updateHandler);
        return () => ydoc.off('update', updateHandler);
    }, [roomId, username]);

    const applyDecorations = useCallback((fileName) => {
        if (!fileName || !editorRef.current || !monacoRef.current) return;
        
        const monaco = monacoRef.current;
        const editor = editorRef.current;
        const errors = editorErrors[fileName] || [];

        try {
            const newDecorations = errors.map(err => ({
                range: new monaco.Range(err.line, err.col || 1, err.line, Number.MAX_VALUE),
                options: {
                    inlineClassName: err.severity === 'error' ? 'diagnostic-error' : err.severity === 'warning' ? 'diagnostic-warning' : 'diagnostic-info',
                    hoverMessage: { value: `**${err.severity.toUpperCase()}**: ${err.message}` },
                    overviewRuler: { color: getSeverityColor(err.severity), position: monaco.editor.OverviewRulerLane.Right },
                    minimap: { color: getSeverityColor(err.severity), position: monaco.editor.MinimapPosition.Inline },
                    glyphMarginClassName: err.severity === 'error' ? 'diagnostic-glyph-error' : 'diagnostic-glyph-warning',
                }
            }));
            
            decorationIds.current = editor.deltaDecorations(decorationIds.current, newDecorations);

            editor.changeViewZones(accessor => {
                viewZoneIds.current.forEach(id => accessor.removeZone(id));
                viewZoneIds.current = [];

                errors.forEach(err => {
                    const color = getSeverityColor(err.severity);
                    const icon = err.severity === 'error' ? '●' : '▲';
                    const marginDomNode = document.createElement('div');
                    const domNode = document.createElement('div');
                    
                    domNode.style.cssText = `
                        display: flex; 
                        align-items: center; 
                        gap: 6px; 
                        padding: 1px 12px 1px 12px; 
                        font-family: JetBrains Mono, monospace; 
                        font-size: 12px; 
                        color: ${color}; 
                        background: ${color}11; 
                        border-left: 2px solid ${color}66; 
                        white-space: nowrap; 
                        overflow: hidden; 
                        text-overflow: ellipsis; 
                        cursor: pointer; 
                        box-sizing: border-box; 
                        width: 100%; 
                        height: 100%;
                    `;
                    
                    domNode.title = `Line ${err.line}: ${err.message}`;
                    
                    const iconSpan = document.createElement('span');
                    iconSpan.style.opacity = '0.7';
                    iconSpan.style.fontSize = '10px';
                    iconSpan.style.marginRight = '4px';
                    iconSpan.textContent = icon;
                    
                    const textNode = document.createTextNode(err.message);
                    domNode.appendChild(iconSpan);
                    domNode.appendChild(textNode);

                    domNode.onclick = () => { 
                        editor.revealLineNearTop(err.line); 
                        editor.setPosition({ lineNumber: err.line, column: 1 }); 
                        editor.focus(); 
                    };

                    const zoneId = accessor.addZone({ 
                        afterLineNumber: err.line, 
                        afterColumn: Number.MAX_VALUE, 
                        heightInLines: 1, 
                        minWidthInPx: 200, 
                        domNode, 
                        marginDomNode 
                    });
                    
                    viewZoneIds.current.push(zoneId);
                });
            });
        } catch (e) {
            console.warn("Decoration render skipped:", e);
        }
    }, [editorErrors]);

    useEffect(() => {
        if (!activeFile) {
            decorationIds.current = [];
            viewZoneIds.current = [];
            return;
        }
        applyDecorations(activeFile);
        return () => {
            if (editorRef.current) {
                try {
                    editorRef.current.changeViewZones(accessor => { 
                        viewZoneIds.current.forEach(id => accessor.removeZone(id)); 
                        viewZoneIds.current = []; 
                    });
                } catch (e) {}
            }
        };
    }, [activeFile, editorErrors, applyDecorations]);

    useEffect(() => {
        return () => { 
            if (vimInstanceRef.current) vimInstanceRef.current.dispose(); 
        };
    }, []);

    const updateRemoteCursor = (user, pos, file) => {
        if (user === username) return;
        
        if (file !== activeFile) {
            if (remoteCursors.current[user] && editorRef.current) {
                try { editorRef.current.removeContentWidget(remoteCursors.current[user]); } catch (e) {}
            }
            return;
        }
        
        if (!editorRef.current || !monacoRef.current) { 
            pendingCursors.current[user] = { pos, file }; 
            return; 
        }
        
        if (remoteCursors.current[user]) {
            try { editorRef.current.removeContentWidget(remoteCursors.current[user]); } catch (e) {}
        }
        
        const userColor = getUserColor(user);
        const lineHeight = editorRef.current.getOption(monacoRef.current.editor.EditorOption.lineHeight);
        
        const widget = {
            getId: () => `cursor-${user}`,
            getDomNode: () => {
                const node = document.createElement('div');
                node.className = 'remote-cursor';
                node.style.height = `${lineHeight}px`;
                node.style.backgroundColor = userColor;
                
                const label = document.createElement('div');
                label.className = 'remote-cursor-label';
                label.innerText = user;
                label.style.backgroundColor = userColor;
                label.style.top = pos.lineNumber === 1 ? `${lineHeight}px` : '-20px';
                label.style.borderRadius = pos.lineNumber === 1 ? '0 3px 3px 3px' : '3px 3px 3px 0';
                
                node.appendChild(label);
                return node;
            },
            getPosition: () => ({ 
                position: { lineNumber: pos.lineNumber, column: pos.column }, 
                preference: [monacoRef.current.editor.ContentWidgetPositionPreference.EXACT] 
            })
        };
        
        try {
            editorRef.current.addContentWidget(widget);
            remoteCursors.current[user] = widget;
        } catch (e) {}
    };

    const bindMonacoToYjs = useCallback((fileName, editor = editorRef.current) => {
        if (ymonacoBindingRef.current) { 
            try { ymonacoBindingRef.current.destroy(); } catch (e) {}
            ymonacoBindingRef.current = null; 
        }

        if (!fileName || !editor) return;
        
        const ytext = ydocRef.current.getText(fileName);
        
        try {
            ymonacoBindingRef.current = new MonacoBinding(
                ytext, 
                editor.getModel(), 
                new Set([editor]), 
                awarenessRef.current
            );
        } catch (err) {
            console.warn("Binding initialization warning:", err);
        }
    }, []);

    useEffect(() => {
        if (!activeFile) {
            if (ymonacoBindingRef.current) {
                try { ymonacoBindingRef.current.destroy(); } catch (e) {}
                ymonacoBindingRef.current = null;
            }
            return;
        }
        if (editorRef.current) {
            bindMonacoToYjs(activeFile);
        }
    }, [activeFile, bindMonacoToYjs]);

    const handleEditorDidMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
        window.monaco = monaco;

        monaco.editor.setTheme(editorTheme);

        if (document.fonts) {
            document.fonts.ready.then(() => {
                try {
                    monaco.editor.remeasureFonts();
                    editor.layout();
                } catch (e) {}
            });
        }

        monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({ 
            noSemanticValidation: false, 
            noSyntaxValidation: false 
        });
        
        monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({ 
            noSemanticValidation: false, 
            noSyntaxValidation: false 
        });

        if (activeFile) {
            bindMonacoToYjs(activeFile, editor);
        }

        Object.keys(pendingCursors.current).forEach(user => {
            if (pendingCursors.current[user].file === activeFile) {
                updateRemoteCursor(user, pendingCursors.current[user].pos, pendingCursors.current[user].file);
            }
        });
        
        pendingCursors.current = {};

        editor.onDidChangeCursorPosition((e) => {
            if (stompClient.current?.connected && activeFile) {
                stompClient.current.send(`/app/cursor/${roomId}`, {}, JSON.stringify({ 
                    username, 
                    lineNumber: e.position.lineNumber, 
                    column: e.position.column, 
                    fileName: activeFile 
                }));
            }
        });

        applyDecorations(activeFile);
    };

    const toggleVimMode = () => {
        if (!editorRef.current) return;
        
        if (isVimMode) {
            if (vimInstanceRef.current) { 
                vimInstanceRef.current.dispose(); 
                vimInstanceRef.current = null; 
            }
            const statusNode = document.getElementById('vim-status-bar');
            if (statusNode) statusNode.textContent = '';
            setIsVimMode(false);
            toast("Vim Mode Disabled", { icon: '⌨️' });
        } else {
            vimInstanceRef.current = initVimMode(editorRef.current, document.getElementById('vim-status-bar'));
            setIsVimMode(true);
            toast.success("Vim Mode Enabled");
        }
    };

    const handleThemeChange = (newTheme) => {
        setEditorTheme(newTheme);
        localStorage.setItem('editorTheme', newTheme);
        if (monacoRef.current) {
            monacoRef.current.editor.setTheme(newTheme);
        }
        toast(`Switched to ${newTheme === 'vs-dark' ? 'Dark' : 'Light'} Mode`, { 
            icon: newTheme === 'vs-dark' ? '🌙' : '☀️' 
        });
    };

    const changeUserRole = (targetUser, newRole) => {
        if (stompClient.current?.connected && isHost) {
            stompClient.current.send(`/app/room/${roomId}/roleChange`, {}, JSON.stringify({ 
                targetUser, 
                newRole 
            }));
        }
    };

    const kickTargetUser = (targetUser) => {
        if (stompClient.current?.connected && isHost) {
            stompClient.current.send(`/app/room/${roomId}/kick`, {}, JSON.stringify({ 
                targetUser 
            }));
        }
    };

    const handlePushProblem = (problemId) => {
        if (stompClient.current?.connected && isHost) {
            setCurrentProblem(MOCK_PROBLEMS[problemId]);
            setIsInterviewMode(true);
            stompClient.current.send(`/app/code/${roomId}`, {}, JSON.stringify({ 
                sender: username, 
                type: "PROBLEM_SYNC", 
                fileName: problemId 
            }));
            setIsQuestionBankOpen(false);
            toast.success("Problem pushed to room!", { icon: '🚀' });
        }
    };

    const handleClearProblem = () => {
        if (stompClient.current?.connected && isHost) {
            setCurrentProblem(null);
            stompClient.current.send(`/app/code/${roomId}`, {}, JSON.stringify({ 
                sender: username, 
                type: "PROBLEM_SYNC", 
                fileName: "CLEAR" 
            }));
            toast("Problem cleared from workspace.");
        }
    };

    useEffect(() => {
        if (!username || !isWorkspaceLoaded) return; 
        
        if (disconnectTimeoutRef.current) { 
            clearTimeout(disconnectTimeoutRef.current); 
            disconnectTimeoutRef.current = null; 
        }
        
        let reconnectTimeout;
        
        const handleBeforeUnload = () => {
            if (stompClient.current?.connected) {
                stompClient.current.send(`/app/room/${roomId}/leave`, {}, JSON.stringify({ 
                    username, 
                    type: "LEAVE" 
                }));
                stompClient.current.disconnect();
            }
        };
        
        window.addEventListener('beforeunload', handleBeforeUnload);

        const connectToSocket = () => {
            if (isConnected.current) return;
            
            const socket = new SockJS(`${API_BASE_URL}/ws`);
            const client = Stomp.over(socket);
            client.debug = () => {};
            
            client.connect({}, () => {
                stompClient.current = client;
                isConnected.current = true;
                setWsConnected(true);
                clearTimeout(reconnectTimeout);

                client.subscribe(`/topic/yjs/${roomId}`, (msg) => {
                    try {
                        let payload = msg.body;
                        if (typeof payload === 'string') payload = JSON.parse(payload);
                        if (typeof payload === 'string') payload = JSON.parse(payload);

                        if (payload.type === 'SYNC' && payload.sender !== username) {
                            const updateArray = new Uint8Array(payload.update);
                            Y.applyUpdate(ydocRef.current, updateArray, 'remote');
                        } else if (payload.type === 'REQUEST_SYNC' && isHostRef.current && payload.sender !== username) {
                            const state = Y.encodeStateAsUpdate(ydocRef.current);
                            stompClient.current.send(`/app/yjs/${roomId}`, {}, JSON.stringify({ 
                                sender: username, 
                                type: 'SYNC', 
                                update: Array.from(state) 
                            }));
                        }
                    } catch (err) {
                        console.error("[VYLOP DEBUG] Yjs Sync Parsing Error:", err);
                    }
                });

                client.subscribe(`/topic/code/${roomId}`, (msg) => {
                    const body = JSON.parse(msg.body);
                    
                    if (body.type === "PROBLEM_SYNC") {
                        if (body.fileName === "CLEAR") {
                            setCurrentProblem(null);
                        } else if (MOCK_PROBLEMS[body.fileName]) {
                            setCurrentProblem(MOCK_PROBLEMS[body.fileName]);
                            setIsInterviewMode(true);
                            if (body.sender !== username) {
                                toast(`The Host assigned a new problem: ${MOCK_PROBLEMS[body.fileName].title}`, { 
                                    icon: '📝', 
                                    duration: 4000 
                                });
                            }
                        }
                        return; 
                    }
                    
                    if (body.type === "DELETE") {
                        setFiles(prev => { 
                            const n = { ...prev }; 
                            delete n[body.fileName]; 
                            return n; 
                        });
                        setOpenFiles(prev => prev.filter(f => f !== body.fileName));
                        setActiveFile(currentActive => currentActive === body.fileName ? null : currentActive);
                        setEditorErrors(prev => { 
                            const n = { ...prev }; 
                            delete n[body.fileName]; 
                            return n; 
                        });
                        if (body.sender !== username) {
                            toast(`${body.sender} deleted ${body.fileName}`, { icon: '🗑️' });
                        }
                    } else if (body.type === "METADATA") {
                        setFiles(prev => ({ 
                            ...prev, 
                            [body.fileName]: { 
                                name: body.fileName, 
                                language: body.language 
                            } 
                        }));
                        setOpenFiles(prev => prev.includes(body.fileName) ? prev : [...prev, body.fileName]);
                        setActiveFile(body.fileName);
                    }
                });

                client.subscribe(`/topic/users/${roomId}`, (msg) => {
                    const body = JSON.parse(msg.body);

                    if (body.users) {
                        body.users.forEach(u => getUserColor(u.username));
                        setUsers(body.users);
                        const me = body.users.find(u => u.username === username);
                        if (me) {
                            setCurrentUserRole(me.role);
                            isHostRef.current = me.role === 'HOST';

                            if (!initialSyncRequested.current) {
                                initialSyncRequested.current = true;
                                if (me.role === 'HOST') {
                                    ydocRef.current.transact(() => {
                                        const dbFiles = Object.keys(loadedFilesRef.current);
                                        if (dbFiles.length > 0) {
                                            dbFiles.forEach(fileName => { 
                                                const ytext = ydocRef.current.getText(fileName); 
                                                if (ytext.length === 0) {
                                                    ytext.insert(0, loadedFilesRef.current[fileName]); 
                                                }
                                            });
                                        } else {
                                            const ytext = ydocRef.current.getText("src/Main.java");
                                            if (ytext.length === 0) {
                                                ytext.insert(0, CODE_SNIPPETS["java"]);
                                            }
                                        }
                                    });
                                } else {
                                    client.send(`/app/yjs/${roomId}`, {}, JSON.stringify({ 
                                        sender: username, 
                                        type: 'REQUEST_SYNC' 
                                    }));
                                }
                            }
                        }

                        const activeUsernames = body.users.map(u => u.username);
                        Object.keys(remoteCursors.current).forEach(u => {
                            if (!activeUsernames.includes(u)) {
                                if (editorRef.current) {
                                    try { editorRef.current.removeContentWidget(remoteCursors.current[u]); } catch (e) {}
                                }
                                delete remoteCursors.current[u];
                            }
                        });
                    }

                    if (body.type === 'KICK') {
                        if (body.username === username) { 
                            toast.error("You have been kicked from the room by the host.", { 
                                icon: '🚪', 
                                duration: 5000 
                            }); 
                            window.location.href = '/'; 
                            return; 
                        } else { 
                            toast(`${body.username} was kicked by the host.`); 
                        }
                    } else if (body.username !== username) {
                        const toastKey = `${body.type}-${body.username}`;
                        if (!notifiedUsers.current.has(toastKey)) {
                            if (body.type === "JOIN") toast.success(`${body.username} joined`);
                            if (body.type === "LEAVE") toast(`${body.username} left`);
                            if (body.type === "ROLE_UPDATE") toast(`${body.username}'s role was updated`);
                            notifiedUsers.current.add(toastKey); 
                            setTimeout(() => notifiedUsers.current.delete(toastKey), 4000);
                        }
                    }
                });

                client.subscribe(`/topic/chat/${roomId}`, (msg) => { 
                    setMessages(prev => [...prev, JSON.parse(msg.body)]); 
                });
                
                client.subscribe(`/topic/typing/${roomId}`, (msg) => {
                    const body = JSON.parse(msg.body);
                    if (body.username !== username) {
                        setTypingUsers(prev => { 
                            const s = new Set(prev); 
                            if (body.isTyping === 'true') {
                                s.add(body.username);
                            } else {
                                s.delete(body.username);
                            }
                            return Array.from(s); 
                        });
                    }
                });
                
                client.subscribe(`/topic/cursor/${roomId}`, (msg) => {
                    const body = JSON.parse(msg.body);
                    updateRemoteCursor(
                        body.username, 
                        { lineNumber: body.lineNumber, column: body.column }, 
                        body.fileName || activeFile
                    );
                });
                
                client.send(`/app/room/${roomId}/join`, {}, JSON.stringify({ 
                    username, 
                    type: "JOIN" 
                }));
                
            }, () => {
                isConnected.current = false; 
                setWsConnected(false); 
                stompClient.current = null;
                reconnectTimeout = setTimeout(connectToSocket, 3000);
            });
        };
        connectToSocket();

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            clearTimeout(reconnectTimeout);
            disconnectTimeoutRef.current = setTimeout(() => {
                if (stompClient.current?.connected) { 
                    stompClient.current.send(`/app/room/${roomId}/leave`, {}, JSON.stringify({ 
                        username, 
                        type: "LEAVE" 
                    })); 
                    stompClient.current.disconnect(); 
                }
                isConnected.current = false; 
                setWsConnected(false); 
                stompClient.current = null;
            }, 200);
        };
    }, [roomId, username, navigate, isWorkspaceLoaded]); 

    useEffect(() => { 
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, typingUsers]);

    const handleFileOpen = (fileName) => { 
        if (!openFiles.includes(fileName)) {
            setOpenFiles(prev => [...prev, fileName]);
        }
        setActiveFile(fileName); 
    };

    const handleCloseTab = (e, fileName) => { 
        e.stopPropagation(); 
        const newOpenFiles = openFiles.filter(f => f !== fileName); 
        setOpenFiles(newOpenFiles); 
        if (activeFile === fileName) {
            setActiveFile(newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null);
        }
    };

    const handleCreateNewFile = () => {
        if (!canEdit) return;
        if (!newFileName.trim()) { 
            toast.error("File name cannot be empty"); 
            return; 
        }
        
        let name = newFileName.trim();
        const requiredExt = `.${getExtension(newFileLang)}`;
        
        if (!name.endsWith(requiredExt)) {
            if (!name.includes('.')) {
                name += requiredExt; 
            } else { 
                const nameWithoutExt = name.substring(0, name.lastIndexOf('.')); 
                name = nameWithoutExt + requiredExt; 
            }
        }

        const initialCode = CODE_SNIPPETS[newFileLang] || `// Start coding in ${name}...`;
        
        ydocRef.current.transact(() => { 
            ydocRef.current.getText(name).insert(0, initialCode); 
        });
        
        setFiles(prev => ({ 
            ...prev, 
            [name]: { name, language: newFileLang } 
        }));
        
        if (!openFiles.includes(name)) {
            setOpenFiles(prev => [...prev, name]);
        }
        setActiveFile(name);
        
        if (stompClient.current?.connected) {
            stompClient.current.send(`/app/code/${roomId}`, {}, JSON.stringify({ 
                sender: username, 
                language: newFileLang, 
                type: "METADATA", 
                fileName: name 
            }));
        }
        setIsModalOpen(false); 
        setNewFileName("");
    };

    const handleFileUpload = (e) => {
        if (!canEdit) return;
        const uploadedFiles = Array.from(e.target.files);
        if (uploadedFiles.length === 0) return;

        let lastFileName = "";
        let uploadedCount = 0;
        const allowedExtensions = ['.java', '.py', '.cpp', '.js', '.ts', '.go', '.rs', '.md', '.txt'];

        uploadedFiles.forEach(file => {
            const ext = file.name.includes('.') ? `.${file.name.split('.').pop()}` : '';
            if (!allowedExtensions.includes(ext)) { 
                toast.error(`Skipped ${file.name}: Unsupported file`, { 
                    duration: 4000, 
                    icon: '🚫' 
                }); 
                return; 
            }

            const name = `src/${file.name}`; 
            const language = getLanguageFromExtension(name);
            uploadedCount++;

            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target.result;
                ydocRef.current.transact(() => {
                    const ytext = ydocRef.current.getText(name);
                    if (ytext.length > 0) {
                        ytext.delete(0, ytext.length); 
                    }
                    ytext.insert(0, content);
                });
                
                setFiles(prev => ({ 
                    ...prev, 
                    [name]: { name, language } 
                }));
                
                if (!openFiles.includes(name)) {
                    setOpenFiles(prev => [...prev, name]);
                }
                lastFileName = name;
                
                if (stompClient.current?.connected) {
                    stompClient.current.send(`/app/code/${roomId}`, {}, JSON.stringify({ 
                        sender: username, 
                        language: language, 
                        type: "METADATA", 
                        fileName: name 
                    }));
                }
            };
            reader.readAsText(file);
        });

        setTimeout(() => { 
            if (lastFileName) setActiveFile(lastFileName); 
        }, 100);
        
        setIsModalOpen(false);
        if (uploadedCount > 0) {
            toast.success(`${uploadedCount} file(s) uploaded!`, { icon: '📁' });
        }
        e.target.value = null; 
    };

    const handleDeleteIconClick = (e, fileName) => {
        e.stopPropagation();
        if (!canEdit) { 
            toast.error("You are in read-only mode"); 
            return; 
        }
        if (Object.keys(files).length <= 1) { 
            toast.error("Cannot delete the only remaining file in workspace.", { icon: '⚠️' }); 
            return; 
        }
        setFileToDelete(fileName); 
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteFile = () => {
        if (!fileToDelete || !canEdit) return;
        
        if (Object.keys(files).length <= 1) {
            toast.error("Cannot delete the only remaining file in workspace.", { icon: '⚠️' });
            setIsDeleteModalOpen(false);
            setFileToDelete(null);
            return;
        }

        ydocRef.current.transact(() => { 
            const ytext = ydocRef.current.getText(fileToDelete); 
            if (ytext.length > 0) {
                ytext.delete(0, ytext.length); 
            }
        });
        
        const updatedFiles = { ...files };
        delete updatedFiles[fileToDelete];

        const updatedOpenFiles = openFiles.filter(f => f !== fileToDelete);
        const remainingKeys = Object.keys(updatedFiles);

        setFiles(updatedFiles);
        setOpenFiles(updatedOpenFiles);

        if (activeFile === fileToDelete) {
            const nextActive = updatedOpenFiles.length > 0 
                ? updatedOpenFiles[updatedOpenFiles.length - 1] 
                : (remainingKeys.length > 0 ? remainingKeys[0] : null);
            setActiveFile(nextActive);
        }
        
        setEditorErrors(prev => { 
            const n = { ...prev }; 
            delete n[fileToDelete]; 
            return n; 
        });
        
        if (stompClient.current?.connected) {
            stompClient.current.send(`/app/code/${roomId}`, {}, JSON.stringify({ 
                sender: username, 
                type: "DELETE", 
                fileName: fileToDelete 
            }));
        }
        
        toast.success(`${fileToDelete} deleted`);
        setIsDeleteModalOpen(false); 
        setFileToDelete(null);
    };

    const applyLanguageChange = (newLang) => {
        if (!activeFile) return;

        const newExt = getExtension(newLang);
        let baseName = activeFile;
        if (baseName.includes('.')) {
            baseName = baseName.substring(0, baseName.lastIndexOf('.'));
        }
        const newFileName = `${baseName}.${newExt}`;
        const newCode = CODE_SNIPPETS[newLang] || `// Start coding in ${newLang}...`;
        const oldFile = activeFile;

        if (newFileName !== oldFile) {
            ydocRef.current.transact(() => {
                const oldYText = ydocRef.current.getText(oldFile);
                if (oldYText.length > 0) {
                    oldYText.delete(0, oldYText.length);
                }
                const newYText = ydocRef.current.getText(newFileName);
                if (newYText.length > 0) {
                    newYText.delete(0, newYText.length);
                }
                newYText.insert(0, newCode);
            });

            setFiles(prev => {
                const next = { ...prev };
                delete next[oldFile];
                next[newFileName] = { name: newFileName, language: newLang };
                return next;
            });

            setOpenFiles(prev => {
                return prev.map(f => f === oldFile ? newFileName : f);
            });

            setActiveFile(newFileName);

            setEditorErrors(prev => {
                const next = { ...prev };
                delete next[oldFile];
                return next;
            });

            if (stompClient.current?.connected) {
                stompClient.current.send(`/app/code/${roomId}`, {}, JSON.stringify({ 
                    sender: username, 
                    type: "DELETE", 
                    fileName: oldFile 
                }));
                stompClient.current.send(`/app/code/${roomId}`, {}, JSON.stringify({ 
                    sender: username, 
                    language: newLang, 
                    type: "METADATA", 
                    fileName: newFileName 
                }));
            }
            toast.success(`Renamed to ${newFileName.split('/').pop()} (${newLang})`);
        } else {
            ydocRef.current.transact(() => {
                const ytext = ydocRef.current.getText(oldFile);
                ytext.delete(0, ytext.length);
                ytext.insert(0, newCode);
            });

            setFiles(prev => ({ 
                ...prev, 
                [oldFile]: { ...prev[oldFile], language: newLang } 
            }));

            setEditorErrors(prev => { 
                const n = { ...prev }; 
                delete n[oldFile]; 
                return n; 
            });

            if (stompClient.current?.connected) {
                stompClient.current.send(`/app/code/${roomId}`, {}, JSON.stringify({ 
                    sender: username, 
                    language: newLang, 
                    type: "METADATA", 
                    fileName: oldFile 
                }));
            }
            toast.success(`Switched language to ${newLang}`);
        }
    };

    const handleLanguageSelect = (e) => {
        if (!isHost || !activeFile) return;
        
        const newLang = e.target.value;
        const currentLang = files[activeFile]?.language || "plaintext";
        if (newLang === currentLang) return;

        const currentText = ydocRef.current.getText(activeFile).toString().trim();
        const defaultSnippet = (CODE_SNIPPETS[currentLang] || "").trim();

        if (currentText.length > 0 && currentText !== defaultSnippet) {
            setPendingLangChange(newLang);
            setIsLangChangeModalOpen(true);
        } else {
            applyLanguageChange(newLang);
        }
    };

    const confirmLanguageChange = () => {
        if (pendingLangChange) {
            applyLanguageChange(pendingLangChange);
        }
        setIsLangChangeModalOpen(false);
        setPendingLangChange(null);
    };

    const handleTypingChange = (e) => {
        setChatMsg(e.target.value);
        if (stompClient.current?.connected) {
            stompClient.current.send(`/app/typing/${roomId}`, {}, JSON.stringify({ 
                username, 
                isTyping: 'true' 
            }));
            
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => { 
                if (stompClient.current?.connected) {
                    stompClient.current.send(`/app/typing/${roomId}`, {}, JSON.stringify({ 
                        username, 
                        isTyping: 'false' 
                    })); 
                }
            }, 1500);
        }
    };

    const sendChat = () => {
        if (chatMsg.trim() && stompClient.current?.connected) {
            stompClient.current.send(`/app/chat/${roomId}`, {}, JSON.stringify({ 
                sender: username, 
                content: chatMsg 
            }));
            setChatMsg(""); 
            clearTimeout(typingTimeoutRef.current);
            stompClient.current.send(`/app/typing/${roomId}`, {}, JSON.stringify({ 
                username, 
                isTyping: 'false' 
            }));
        }
    };

    const formatCode = () => {
        if (!canEdit || !activeFile) return;
        if (editorRef.current) {
            editorRef.current.getAction('editor.action.formatDocument').run();
            if (['javascript', 'typescript'].includes(files[activeFile]?.language)) {
                toast.success("Code formatted!");
            } else {
                toast("Native formatting is only available for JS/TS.", { icon: 'ℹ️' });
            }
        }
    };

    const runCode = async () => {
        if (!activeFile) return;
        
        setIsRunning(true);
        setIsBottomPanelOpen(true);
        setActiveBottomTab("console"); 
        setOutput("Executing code in sandbox container...");
        setEditorErrors({});

        let inputToRun = userInput;
        if (currentProblem && activeBottomTab === "testcases") {
            const selectedTc = (currentProblem.testcases || []).find(t => t.id === activeTestCaseId);
            if (selectedTc) {
                inputToRun = selectedTc.rawInput;
            }
        }

        try {
            const fileData = {};
            Object.keys(files).forEach(key => { 
                fileData[key] = ydocRef.current.getText(key).toString(); 
            });
            
            const envVarsPayload = secrets.reduce((acc, curr) => {
                if (curr.key.trim() && curr.value.trim()) {
                    acc[curr.key.trim()] = curr.value.trim();
                }
                return acc;
            }, {});
            
            const response = await axios.post(`${API_BASE_URL}/api/execute`, {
                language: files[activeFile]?.language || "plaintext",
                code: ydocRef.current.getText(activeFile).toString(),
                input: inputToRun, 
                mainFile: activeFile,
                files: fileData,
                envVars: envVarsPayload
            }, { transformResponse: [(data) => data] }); 
            
            const outputText = typeof response.data === 'object' ? JSON.stringify(response.data, null, 2) : String(response.data);
            setOutput(outputText);

            const parsed = parseErrors(outputText, files[activeFile]?.language || "plaintext", files);
            if (parsed.length > 0) {
                const byFile = {};
                parsed.forEach(err => { 
                    if (!byFile[err.fileName]) {
                        byFile[err.fileName] = [];
                    }
                    byFile[err.fileName].push(err); 
                });
                
                setEditorErrors(byFile);
                const errCount = parsed.filter(e => e.severity === 'error').length;
                const warnCount = parsed.filter(e => e.severity === 'warning').length;
                
                if (errCount > 0) {
                    toast.error(`${errCount} error${errCount > 1 ? 's' : ''} found`, { icon: '🔴' });
                } else if (warnCount > 0) {
                    toast(`${warnCount} warning${warnCount > 1 ? 's' : ''}`, { icon: '🟡' });
                }
            }
        } catch (error) {
            setOutput("Execution failed: Connection to sandbox runtime error.");
        } finally {
            setIsRunning(false);
        }
    };

    const handleSubmit = async () => {
        if (!activeFile || !currentProblem) return;

        setIsSubmitting(true);
        setIsBottomPanelOpen(true);
        setSubmissionResult(null);
        setActiveBottomTab("submission"); 

        const fileData = {};
        Object.keys(files).forEach(key => { 
            fileData[key] = ydocRef.current.getText(key).toString(); 
        });
        
        const envVarsPayload = secrets.reduce((acc, curr) => {
            if (curr.key.trim() && curr.value.trim()) acc[curr.key.trim()] = curr.value.trim();
            return acc;
        }, {});

        const language = files[activeFile]?.language;
        const code = ydocRef.current.getText(activeFile).toString();

        const result = await evaluateSubmission(currentProblem, activeFile, language, code, fileData, envVarsPayload);
        
        setSubmissionResult(result);
        
        if (result.status === 'ACCEPTED') {
            toast.success("Accepted!", { icon: '🟢' });
        } else if (result.status === 'WRONG_ANSWER') {
            toast.error("Wrong Answer", { icon: '🔴' });
        } else {
            toast.error("Evaluation Error");
        }

        setIsSubmitting(false);
    };

    const saveWorkspace = async () => {
        if (!isHost) return;
        
        setIsSaving(true);
        try {
            const fileData = {};
            Object.keys(files).forEach(key => { 
                fileData[key] = ydocRef.current.getText(key).toString(); 
            });
            
            await axios.post(`${API_BASE_URL}/api/workspace/${roomId}/save?username=${encodeURIComponent(username)}&roomName=${encodeURIComponent(roomName)}`, fileData);
            toast.success("Workspace saved to cloud! ☁️");
        } catch (error) { 
            toast.error(error.response?.data || "Failed to save workspace."); 
        } finally { 
            setIsSaving(false); 
        }
    };

    const downloadWorkspace = async () => {
        try {
            const zip = new JSZip();
            Object.keys(files).forEach(fileName => { 
                zip.file(fileName, ydocRef.current.getText(fileName).toString()); 
            });
            
            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `${roomName.replace(/[^a-zA-Z0-9]/g, '_')}_vylop.zip`);
            toast.success("Workspace Exported! 📦");
        } catch (error) { 
            toast.error("Failed to export workspace"); 
        }
    };

    const copyRoomLink = () => { 
        navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`); 
        toast.success("Invite Link Copied!", { icon: '🔗' }); 
    };

    const handleJumpToLine = (fileName, lineNumber) => {
        if (files[fileName]) {
            if (activeFile !== fileName) {
                handleFileOpen(fileName);
            }
            setTimeout(() => { 
                if (editorRef.current) { 
                    editorRef.current.revealLineNearTop(lineNumber); 
                    editorRef.current.setPosition({ lineNumber, column: 1 }); 
                    editorRef.current.focus(); 
                } 
            }, 50);
        } else { 
            toast.error(`File ${fileName} not found.`); 
        }
    };

    const renderFormattedOutput = (text) => {
        if (!text) return "// Output will appear here after clicking Run...";
        
        const strText = typeof text === 'string' ? text : JSON.stringify(text, null, 2);
        const lines = strText.split('\n');
        
        return lines.map((line, index) => {
            const isError = /(error|exception|traceback|failed|at\s+[\w.]+\.)/i.test(line);
            const style = isError ? { color: '#f87171' } : { color: '#cbd5e1' };
            const match1 = line.match(/([a-zA-Z0-9_/\\-]+\.[a-zA-Z0-9]+):(\d+)/);
            const match2 = line.match(/File "([^"]+)", line (\d+)/);
            const match = match1 || match2;
            
            if (match) {
                const fullMatch = match[0];
                const rawFile = match[1];
                const lineNumber = parseInt(match[2], 10);
                const resolvedFile = resolveFileName(rawFile, files);
                const parts = line.split(fullMatch);
                
                return (
                    <div key={index} style={{ ...style, fontFamily: 'JetBrains Mono, monospace', lineHeight: '1.5' }}>
                        {parts[0]}
                        <span 
                            onClick={() => handleJumpToLine(resolvedFile, lineNumber)} 
                            style={{ textDecoration: 'underline', cursor: 'pointer', color: '#38bdf8', fontWeight: 'bold' }} 
                            title={`Jump to line ${lineNumber} in ${resolvedFile}`}
                        >
                            {fullMatch}
                        </span>
                        {parts[1]}
                    </div>
                );
            }
            
            return (
                <div key={index} style={{ ...style, fontFamily: 'JetBrains Mono, monospace', lineHeight: '1.5' }}>
                    {line}
                </div>
            );
        });
    };

    const renderTabName = (filePath) => {
        const fileName = filePath.split('/').pop();
        const duplicates = openFiles.filter(p => p.split('/').pop() === fileName);
        const fileErrors = editorErrors[filePath] || [];
        const errorCount = fileErrors.filter(e => e.severity === 'error').length;
        const warnCount = fileErrors.filter(e => e.severity === 'warning').length;

        const badge = errorCount > 0 ? ( 
            <span style={{ marginLeft: '5px', background: '#f87171', color: '#fff', borderRadius: '8px', fontSize: '0.6rem', padding: '0 5px', fontWeight: 'bold', lineHeight: '16px', flexShrink: 0 }}>
                {errorCount}
            </span>
        ) : warnCount > 0 ? ( 
            <span style={{ marginLeft: '5px', background: '#fbbf24', color: '#000', borderRadius: '8px', fontSize: '0.6rem', padding: '0 5px', fontWeight: 'bold', lineHeight: '16px', flexShrink: 0 }}>
                {warnCount}
            </span> 
        ) : null;

        if (duplicates.length > 1) {
            const parts = filePath.split('/');
            if (parts.length > 1) {
                return ( 
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                        {fileName}
                        <span style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginLeft: '6px', fontWeight: 'normal' }}>
                            {parts[parts.length - 2]}/
                        </span>
                        {badge}
                    </span> 
                );
            }
        }
        
        return (
            <span style={{ display: 'flex', alignItems: 'center' }}>
                {fileName}{badge}
            </span>
        );
    };

    const activeFileErrors = editorErrors[activeFile] || [];

    const handleToggleMaximize = () => {
        if (isPanelMaximized) {
            setPanelSizes([65, 35]);
            setIsPanelMaximized(false);
        } else {
            setPanelSizes([20, 80]);
            setIsPanelMaximized(true);
        }
    };

    // Smooth exit with full transition animation
    const handleExitWorkspace = async (saveBeforeLeave = false) => {
        setIsLeaveModalOpen(false);
        setIsLeavingWorkspace(true);

        if (saveBeforeLeave) {
            await saveWorkspace();
        }

        await new Promise(resolve => setTimeout(resolve, 1200));
        navigate('/');
    };

    // Render Futuristic Loader while connecting & loading room state
    if (!isWorkspaceLoaded) {
        return (
            <PageLoader 
                message="Initializing Workspace..." 
                subtext={`Establishing real-time session as ${username || 'developer'}...`} 
            />
        );
    }

    if (isLeavingWorkspace) {
        return (
            <PageLoader 
                message="Disconnecting from session..." 
                subtext="Flushing Yjs buffers and returning to Dashboard..." 
            />
        );
    }

    return (
        <div className="app-container">
            <EditorModals 
                isQuestionBankOpen={isQuestionBankOpen}
                setIsQuestionBankOpen={setIsQuestionBankOpen}
                isHost={isHost}
                problemSearch={problemSearch}
                setProblemSearch={setProblemSearch}
                currentProblem={currentProblem}
                handlePushProblem={handlePushProblem}
                handleClearProblem={handleClearProblem}
                isLeaveModalOpen={isLeaveModalOpen}
                setIsLeaveModalOpen={setIsLeaveModalOpen}
                saveWorkspace={saveWorkspace}
                navigate={() => handleExitWorkspace(false)}
                roomId={roomId}
                username={username}
                API_BASE_URL={API_BASE_URL}
                isSecretsModalOpen={isSecretsModalOpen}
                setIsSecretsModalOpen={setIsSecretsModalOpen}
                secrets={secrets}
                setSecrets={setSecrets}
                isModalOpen={isModalOpen}
                setIsModalOpen={setIsModalOpen}
                newFileLang={newFileLang}
                setNewFileLang={setNewFileLang}
                newFileName={newFileName}
                setNewFileName={setNewFileName}
                handleCreateNewFile={handleCreateNewFile}
                fileInputRef={fileInputRef}
                handleFileUpload={handleFileUpload}
                isDeleteModalOpen={isDeleteModalOpen}
                setIsDeleteModalOpen={setIsDeleteModalOpen}
                fileToDelete={fileToDelete}
                confirmDeleteFile={confirmDeleteFile}
                isLangChangeModalOpen={isLangChangeModalOpen}
                setIsLangChangeModalOpen={setIsLangChangeModalOpen}
                pendingLangChange={pendingLangChange}
                confirmLanguageChange={confirmLanguageChange}
                activeFile={activeFile}
            />

            <EditorSidebar 
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                isExplorerExpanded={isExplorerExpanded}
                setIsExplorerExpanded={setIsExplorerExpanded}
                files={files}
                activeFile={activeFile}
                handleFileOpen={handleFileOpen}
                isOnlineExpanded={isOnlineExpanded}
                setIsOnlineExpanded={setIsOnlineExpanded}
                users={users}
                wsConnected={wsConnected}
                getUserColor={getUserColor}
                isHost={isHost}
                canEdit={canEdit}
                username={username}
                changeUserRole={changeUserRole}
                kickTargetUser={kickTargetUser}
                isChatExpanded={isChatExpanded}
                setIsChatExpanded={setIsChatExpanded}
                messages={messages}
                chatContainerRef={chatContainerRef}
                typingUsers={typingUsers}
                chatMsg={chatMsg}
                handleTypingChange={handleTypingChange}
                sendChat={sendChat}
                copyRoomLink={copyRoomLink}
                setIsLeaveModalOpen={setIsLeaveModalOpen}
                setIsModalOpen={setIsModalOpen}
                navigate={() => handleExitWorkspace(false)}
            />

            <div className="main-area">
                <EditorToolbar 
                    roomName={roomName}
                    isSidebarOpen={isSidebarOpen}
                    setIsSidebarOpen={setIsSidebarOpen}
                    isHost={isHost}
                    canEdit={canEdit}
                    isInterviewMode={isInterviewMode}
                    activeFile={activeFile}
                    files={files}
                    isQuestionBankOpen={isQuestionBankOpen}
                    setIsQuestionBankOpen={setIsQuestionBankOpen}
                    showMarkdownPreview={showMarkdownPreview}
                    setShowMarkdownPreview={setShowMarkdownPreview}
                    setIsModalOpen={setIsModalOpen}
                    setIsSecretsModalOpen={setIsSecretsModalOpen}
                    isSaving={isSaving}
                    saveWorkspace={saveWorkspace}
                    downloadWorkspace={downloadWorkspace}
                    handleDeleteIconClick={handleDeleteIconClick}
                    formatCode={formatCode}
                    isVimMode={isVimMode}
                    toggleVimMode={toggleVimMode}
                    editorTheme={editorTheme}
                    handleThemeChange={handleThemeChange}
                    handleLanguageSelect={handleLanguageSelect}
                    isRunning={isRunning}
                    runCode={runCode}
                    currentProblem={currentProblem}
                    isSubmitting={isSubmitting}
                    handleSubmit={handleSubmit}
                    getTooltip={getTooltip}
                    isBottomPanelOpen={isBottomPanelOpen}
                    setIsBottomPanelOpen={setIsBottomPanelOpen}
                />

                <div className="file-tabs">
                    {openFiles.map((fileName) => (
                        <div key={fileName} className={`file-tab ${activeFile === fileName ? 'active' : ''}`} onClick={() => setActiveFile(fileName)}>
                            <span className="file-tab-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {getFileIcon(fileName.split('/').pop())}
                                {renderTabName(fileName)}
                            </span>
                            <span className="file-tab-close" onClick={(e) => handleCloseTab(e, fileName)} title="Close Tab">&times;</span>
                        </div>
                    ))}
                </div>

                {!activeFile ? (
                    <div className="editor-empty-container">
                        <div className="editor-empty-icon-box">
                            <Code2 className="w-8 h-8 text-emerald-400" />
                        </div>
                        <h3 className="editor-empty-title">No Active File</h3>
                        <p className="editor-empty-desc">Select a file from the explorer on the left or create a new file to start coding.</p>
                        {canEdit && (
                            <button className="btn-solid-emerald" onClick={() => setIsModalOpen(true)}>
                                <FilePlus className="w-4 h-4 mr-1.5" />
                                <span>Create File</span>
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="editor-workspace-container">
                        {currentProblem && (
                            <div className="problem-panel-drawer">
                                <ProblemDescriptionPanel currentProblem={currentProblem} />
                            </div>
                        )}

                        <div className="editor-center-pane">
                            {isBottomPanelOpen ? (
                                <Split 
                                    direction="vertical"
                                    sizes={panelSizes}
                                    minSize={[120, 100]}
                                    gutterSize={6}
                                    className="split-vertical-container"
                                    onDragEnd={(sizes) => {
                                        setPanelSizes(sizes);
                                        if (editorRef.current) editorRef.current.layout();
                                    }}
                                    onDrag={() => {
                                        if (editorRef.current) editorRef.current.layout();
                                    }}
                                >
                                    {/* Top Editor Area */}
                                    <div className="editor-wrapper" style={{ height: '100%', overflow: 'hidden', minHeight: 0 }}>
                                        {showMarkdownPreview && files[activeFile]?.language === "markdown" ? (
                                            <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                                                <div style={{ flex: 1, height: '100%' }}>
                                                    <Editor 
                                                        path={activeFile} 
                                                        height="100%" 
                                                        width="100%" 
                                                        language="markdown" 
                                                        theme={editorTheme} 
                                                        onMount={handleEditorDidMount} 
                                                        options={{ 
                                                            readOnly: !canEdit, 
                                                            domReadOnly: !canEdit, 
                                                            minimap: { enabled: false }, 
                                                            fontSize: 14, 
                                                            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace",
                                                            lineHeight: 22,
                                                            letterSpacing: 0,
                                                            cursorBlinking: "smooth",
                                                            cursorSmoothCaretAnimation: "on",
                                                            cursorStyle: "line",
                                                            cursorWidth: 2,
                                                            automaticLayout: true, 
                                                            wordWrap: 'on', 
                                                            hover: { above: false }, 
                                                            fixedOverflowWidgets: true 
                                                        }} 
                                                    />
                                                </div>
                                                <div className="markdown-preview" style={{ flex: 1, height: '100%', overflowY: 'auto', padding: '20px', backgroundColor: 'var(--bg-editor-base)', color: 'var(--text-main)', borderLeft: '1px solid var(--border-editor)' }}>
                                                    <ReactMarkdown>{ydocRef.current.getText(activeFile).toString()}</ReactMarkdown>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ width: '100%', height: '100%' }}>
                                                <Editor 
                                                    path={activeFile} 
                                                    height="100%" 
                                                    width="100%" 
                                                    language={files[activeFile]?.language === "cpp" ? "cpp" : files[activeFile]?.language || "plaintext"} 
                                                    theme={editorTheme} 
                                                    onMount={handleEditorDidMount} 
                                                    options={{ 
                                                        readOnly: !canEdit, 
                                                        domReadOnly: !canEdit, 
                                                        minimap: { enabled: false }, 
                                                        fontSize: 14, 
                                                        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace",
                                                        lineHeight: 22,
                                                        letterSpacing: 0,
                                                        cursorBlinking: "smooth",
                                                        cursorSmoothCaretAnimation: "on",
                                                        cursorStyle: "line",
                                                        cursorWidth: 2,
                                                        automaticLayout: true, 
                                                        formatOnPaste: true, 
                                                        glyphMargin: true, 
                                                        hover: { above: false }, 
                                                        fixedOverflowWidgets: true 
                                                    }} 
                                                />
                                            </div>
                                        )}
                                        <div id="vim-status-bar" className="vim-status-bar"></div>

                                        {activeFileErrors.length > 0 && (
                                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '140px', overflowY: 'auto', backgroundColor: '#0d1117ee', borderTop: '1px solid #ff6b6b44', backdropFilter: 'blur(4px)', zIndex: 10 }}>
                                                <div style={{ padding: '4px 12px', fontSize: '0.65rem', color: '#ff6b6b', letterSpacing: '0.5px', fontWeight: 'bold', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, backgroundColor: '#0d1117ee', zIndex: 1 }}>
                                                    <span>
                                                        {activeFileErrors.filter(e => e.severity === 'error').length > 0 && `🔴 ${activeFileErrors.filter(e => e.severity === 'error').length} error${activeFileErrors.filter(e => e.severity === 'error').length > 1 ? 's' : ''}`}
                                                        {activeFileErrors.filter(e => e.severity === 'warning').length > 0 && `  🟡 ${activeFileErrors.filter(e => e.severity === 'warning').length} warning${activeFileErrors.filter(e => e.severity === 'warning').length > 1 ? 's' : ''}`}
                                                    </span>
                                                    <button onClick={() => setEditorErrors(prev => { const n = { ...prev }; delete n[activeFile]; return n; })} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}>
                                                        ✕ Clear
                                                    </button>
                                                </div>
                                                {activeFileErrors.map((err, i) => (
                                                    <div key={i} onClick={() => handleJumpToLine(activeFile, err.line)} style={{ padding: '3px 12px', fontSize: '0.78rem', fontFamily: 'JetBrains Mono, monospace', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'baseline', color: getSeverityColor(err.severity) }} title={`Jump to line ${err.line}`}>
                                                        <span style={{ flexShrink: 0, opacity: 0.7 }}>Line {err.line}</span>
                                                        <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>—</span>
                                                        <span>{err.message}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Resizable Bottom Panel */}
                                    <div className="bottom-panel-container" style={{ height: '100%', overflow: 'hidden', minHeight: 0 }}>
                                        <BottomPanel 
                                            currentProblem={currentProblem}
                                            activeBottomTab={activeBottomTab}
                                            setActiveBottomTab={setActiveBottomTab}
                                            activeTestCaseId={activeTestCaseId}
                                            setActiveTestCaseId={setActiveTestCaseId}
                                            isSubmitting={isSubmitting}
                                            submissionResult={submissionResult}
                                            output={output}
                                            setOutput={setOutput}
                                            renderFormattedOutput={renderFormattedOutput}
                                            userInput={userInput}
                                            setUserInput={setUserInput}
                                            onClose={() => setIsBottomPanelOpen(false)}
                                            isMaximized={isPanelMaximized}
                                            onToggleMaximize={handleToggleMaximize}
                                        />
                                    </div>
                                </Split>
                            ) : (
                                <div className="editor-wrapper full-height">
                                    {showMarkdownPreview && files[activeFile]?.language === "markdown" ? (
                                        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                                            <div style={{ flex: 1, height: '100%' }}>
                                                <Editor 
                                                    path={activeFile} 
                                                    height="100%" 
                                                    width="100%" 
                                                    language="markdown" 
                                                    theme={editorTheme} 
                                                    onMount={handleEditorDidMount} 
                                                    options={{ 
                                                        readOnly: !canEdit, 
                                                        domReadOnly: !canEdit, 
                                                        minimap: { enabled: false }, 
                                                        fontSize: 14, 
                                                        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace",
                                                        lineHeight: 22,
                                                        letterSpacing: 0,
                                                        cursorBlinking: "smooth",
                                                        cursorSmoothCaretAnimation: "on",
                                                        cursorStyle: "line",
                                                        cursorWidth: 2,
                                                        automaticLayout: true, 
                                                        wordWrap: 'on', 
                                                        hover: { above: false }, 
                                                        fixedOverflowWidgets: true 
                                                    }} 
                                                />
                                            </div>
                                            <div className="markdown-preview" style={{ flex: 1, height: '100%', overflowY: 'auto', padding: '20px', backgroundColor: 'var(--bg-editor-base)', color: 'var(--text-main)', borderLeft: '1px solid var(--border-editor)' }}>
                                                <ReactMarkdown>{ydocRef.current.getText(activeFile).toString()}</ReactMarkdown>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ width: '100%', height: '100%' }}>
                                            <Editor 
                                                path={activeFile} 
                                                height="100%" 
                                                width="100%" 
                                                language={files[activeFile]?.language === "cpp" ? "cpp" : files[activeFile]?.language || "plaintext"} 
                                                theme={editorTheme} 
                                                onMount={handleEditorDidMount} 
                                                options={{ 
                                                    readOnly: !canEdit, 
                                                    domReadOnly: !canEdit, 
                                                    minimap: { enabled: false }, 
                                                    fontSize: 14, 
                                                    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace",
                                                    lineHeight: 22,
                                                    letterSpacing: 0,
                                                    cursorBlinking: "smooth",
                                                    cursorSmoothCaretAnimation: "on",
                                                    cursorStyle: "line",
                                                    cursorWidth: 2,
                                                    automaticLayout: true, 
                                                    formatOnPaste: true, 
                                                    glyphMargin: true, 
                                                    hover: { above: false }, 
                                                    fixedOverflowWidgets: true 
                                                }} 
                                            />
                                        </div>
                                    )}
                                    <div id="vim-status-bar" className="vim-status-bar"></div>

                                    {activeFileErrors.length > 0 && (
                                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '140px', overflowY: 'auto', backgroundColor: '#0d1117ee', borderTop: '1px solid #ff6b6b44', backdropFilter: 'blur(4px)', zIndex: 10 }}>
                                            <div style={{ padding: '4px 12px', fontSize: '0.65rem', color: '#ff6b6b', letterSpacing: '0.5px', fontWeight: 'bold', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, backgroundColor: '#0d1117ee', zIndex: 1 }}>
                                                <span>
                                                    {activeFileErrors.filter(e => e.severity === 'error').length > 0 && `🔴 ${activeFileErrors.filter(e => e.severity === 'error').length} error${activeFileErrors.filter(e => e.severity === 'error').length > 1 ? 's' : ''}`}
                                                    {activeFileErrors.filter(e => e.severity === 'warning').length > 0 && `  🟡 ${activeFileErrors.filter(e => e.severity === 'warning').length} warning${activeFileErrors.filter(e => e.severity === 'warning').length > 1 ? 's' : ''}`}
                                                </span>
                                                <button onClick={() => setEditorErrors(prev => { const n = { ...prev }; delete n[activeFile]; return n; })} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}>
                                                    ✕ Clear
                                                </button>
                                            </div>
                                            {activeFileErrors.map((err, i) => (
                                                <div key={i} onClick={() => handleJumpToLine(activeFile, err.line)} style={{ padding: '3px 12px', fontSize: '0.78rem', fontFamily: 'JetBrains Mono, monospace', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'baseline', color: getSeverityColor(err.severity) }} title={`Jump to line ${err.line}`}>
                                                    <span style={{ flexShrink: 0, opacity: 0.7 }}>Line {err.line}</span>
                                                    <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>—</span>
                                                    <span>{err.message}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CodeEditor;