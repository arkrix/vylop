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

const ALLOWED_THEMES = new Set(['vs-dark', 'vs-light', 'light']);
const ALLOWED_EXTENSIONS = new Set(['.java', '.py', '.cpp', '.js', '.ts', '.go', '.rs', '.md', '.txt']);
const ERROR_KEYWORDS = ['error', 'exception', 'traceback', 'failed'];

const loadedRooms = new Set();

const parsePythonTracebackLocation = (line, files) => {
    if (!line.includes('File "') || !line.includes('", line ')) {
        return null;
    }
    const fileStart = line.indexOf('File "') + 6;
    const fileEnd = line.indexOf('", line ', fileStart);
    if (fileEnd === -1) {
        return null;
    }
    const rawFile = line.slice(fileStart, fileEnd);
    const linePart = line.slice(fileEnd + 8).trim();
    const lineDigits = linePart.split(/[^\d]/)[0];
    if (!lineDigits) {
        return null;
    }
    return {
        fullMatch: `File "${rawFile}", line ${lineDigits}`,
        resolvedFile: resolveFileName(rawFile, files),
        lineNumber: Number.parseInt(lineDigits, 10)
    };
};

const parseCompilerLocation = (line, files) => {
    const tokens = line.split(/\s+/);
    for (const token of tokens) {
        const colonIdx = token.lastIndexOf(':');
        if (colonIdx > 0) {
            const filePart = token.slice(0, colonIdx);
            const linePart = token.slice(colonIdx + 1);
            if (/^\d+$/.test(linePart) && filePart.includes('.')) {
                return {
                    fullMatch: token,
                    resolvedFile: resolveFileName(filePart, files),
                    lineNumber: Number.parseInt(linePart, 10)
                };
            }
        }
    }
    return null;
};

const parseErrorLocation = (line, files) => {
    const pythonLoc = parsePythonTracebackLocation(line, files);
    if (pythonLoc) {
        return pythonLoc;
    }
    return parseCompilerLocation(line, files);
};

const sanitizeTheme = (theme) => {
    if (ALLOWED_THEMES.has(theme)) {
        return theme;
    }
    return 'vs-dark';
};

const resolveEditorLanguage = (fileObj) => {
    if (!fileObj?.language) return 'plaintext';
    if (fileObj.language === 'cpp') return 'cpp';
    return fileObj.language;
};

const checkIsErrorLine = (line) => {
    const lower = line.toLowerCase();
    return ERROR_KEYWORDS.some((kw) => lower.includes(kw)) || lower.includes('at ');
};

const getYTextContent = (ydoc, key) => {
    if (!ydoc || !key) return '';
    const ytext = ydoc.getText(key);
    if (!ytext) return '';
    return ytext.toString();
};

const collectFilesData = (files, ydoc) => {
    const fileData = {};
    Object.keys(files).forEach((key) => {
        fileData[key] = getYTextContent(ydoc, key);
    });
    return fileData;
};

const getInitialFilesState = (loadedFiles) => {
    const fileEntries = Object.keys(loadedFiles);
    if (fileEntries.length > 0) {
        const state = {};
        fileEntries.forEach((fileName) => {
            state[fileName] = { 
                name: fileName, 
                language: getLanguageFromExtension(fileName) 
            };
        });
        return { filesState: state, initialActive: fileEntries[0] };
    }
    const defaultFile = "src/Main.java";
    return {
        filesState: { [defaultFile]: { name: defaultFile, language: "java" } },
        initialActive: defaultFile
    };
};

const renderTabBadge = (errorCount, warnCount) => {
    if (errorCount > 0) {
        return (
            <span style={{ marginLeft: '5px', background: '#f87171', color: '#fff', borderRadius: '8px', fontSize: '0.6rem', padding: '0 5px', fontWeight: 'bold', lineHeight: '16px', flexShrink: 0 }}>
                {errorCount}
            </span>
        );
    }
    if (warnCount > 0) {
        return (
            <span style={{ marginLeft: '5px', background: '#fbbf24', color: '#000', borderRadius: '8px', fontSize: '0.6rem', padding: '0 5px', fontWeight: 'bold', lineHeight: '16px', flexShrink: 0 }}>
                {warnCount}
            </span>
        );
    }
    return null;
};

const renderTabContent = (filePath, openFiles, editorErrors) => {
    const fileName = filePath.split('/').pop();
    const duplicates = openFiles.filter(p => p.split('/').pop() === fileName);
    const fileErrors = editorErrors[filePath] || [];
    const errorCount = fileErrors.filter(e => e.severity === 'error').length;
    const warnCount = fileErrors.filter(e => e.severity === 'warning').length;
    const badge = renderTabBadge(errorCount, warnCount);

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

const getNextActiveFile = (openFiles, fileKeys, fileToDelete) => {
    const updatedOpen = openFiles.filter((f) => f !== fileToDelete);
    if (updatedOpen.length > 0) {
        return updatedOpen.at(-1);
    }
    const remainingKeys = fileKeys.filter((k) => k !== fileToDelete);
    if (remainingKeys.length > 0) {
        return remainingKeys[0];
    }
    return null;
};

const buildRemoteCursorWidget = (user, pos, userColor, lineHeight) => {
    const isFirstLine = pos.lineNumber === 1;
    const labelTop = isFirstLine ? `${lineHeight}px` : '-20px';
    const labelRadius = isFirstLine ? '0 3px 3px 3px' : '3px 3px 3px 0';

    return {
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
            label.style.top = labelTop;
            label.style.borderRadius = labelRadius;
            
            node.appendChild(label);
            return node;
        },
        getPosition: () => ({ 
            position: { lineNumber: pos.lineNumber, column: pos.column }, 
            preference: [1]
        })
    };
};

const buildEnvVarsPayload = (secrets) => {
    return secrets.reduce((acc, curr) => {
        if (curr.key.trim() && curr.value.trim()) {
            acc[curr.key.trim()] = curr.value.trim();
        }
        return acc;
    }, {});
};

const buildEditorDecorations = (errors, monaco) => {
    return errors.map((err) => ({
        range: new monaco.Range(err.line, err.col || 1, err.line, Number.MAX_VALUE),
        options: {
            inlineClassName: err.severity === 'error' ? 'diagnostic-error' : 'diagnostic-warning',
            hoverMessage: { value: `**${err.severity.toUpperCase()}**: ${err.message}` },
            overviewRuler: { color: getSeverityColor(err.severity), position: monaco.editor.OverviewRulerLane.Right },
            minimap: { color: getSeverityColor(err.severity), position: monaco.editor.MinimapPosition.Inline },
            glyphMarginClassName: err.severity === 'error' ? 'diagnostic-glyph-error' : 'diagnostic-glyph-warning',
        }
    }));
};

const createZoneDomNode = (err, editor) => {
    const color = getSeverityColor(err.severity);
    const icon = err.severity === 'error' ? '●' : '▲';
    const domNode = document.createElement('div');
    
    domNode.style.cssText = `
        display: flex; 
        align-items: center; 
        gap: 6px; 
        padding: 1px 12px; 
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

    return domNode;
};

const cleanupStaleCursors = (remoteCursors, activeUsernames, editorRef) => {
    Object.keys(remoteCursors.current).forEach((u) => {
        if (!activeUsernames.has(u)) {
            if (editorRef.current) {
                try { 
                    editorRef.current.removeContentWidget(remoteCursors.current[u]); 
                } catch (error_) {
                    console.debug("Offline cursor removal:", error_);
                }
            }
            delete remoteCursors.current[u];
        }
    });
};

const notifyPeerStatus = (body, username, notifiedUsers) => {
    if (body.username === username) return;
    const toastKey = `${body.type}-${body.username}`;
    if (notifiedUsers.current.has(toastKey)) return;
    
    if (body.type === "JOIN") toast.success(`${body.username} joined`);
    if (body.type === "LEAVE") toast(`${body.username} left`);
    if (body.type === "ROLE_UPDATE") toast(`${body.username}'s role was updated`);
    
    notifiedUsers.current.add(toastKey); 
    setTimeout(() => notifiedUsers.current.delete(toastKey), 4000);
};

const normalizeFileName = (rawName, lang) => {
    const name = rawName.trim();
    const requiredExt = `.${getExtension(lang)}`;
    if (name.endsWith(requiredExt)) {
        return name;
    }
    if (!name.includes('.')) {
        return `${name}${requiredExt}`;
    }
    const nameWithoutExt = name.substring(0, name.lastIndexOf('.'));
    return `${nameWithoutExt}${requiredExt}`;
};

const updateYDocContent = (ydoc, targetFile, newCode) => {
    ydoc.transact(() => {
        const ytext = ydoc.getText(targetFile);
        if (ytext.length > 0) {
            ytext.delete(0, ytext.length);
        }
        ytext.insert(0, newCode);
    });
};

const executeFileRename = (config) => {
    const { ydoc, oldFile, newFileName, newLang, newCode, stompRef, roomId, username, setters } = config;
    ydoc.transact(() => {
        const oldYText = ydoc.getText(oldFile);
        if (oldYText.length > 0) {
            oldYText.delete(0, oldYText.length);
        }
        const newYText = ydoc.getText(newFileName);
        if (newYText.length > 0) {
            newYText.delete(0, newYText.length);
        }
        newYText.insert(0, newCode);
    });

    setters.setFiles(prev => {
        const next = { ...prev };
        delete next[oldFile];
        next[newFileName] = { name: newFileName, language: newLang };
        return next;
    });

    setters.setOpenFiles(prev => prev.map(f => f === oldFile ? newFileName : f));
    setters.setActiveFile(newFileName);
    setters.setEditorErrors(prev => {
        const next = { ...prev };
        delete next[oldFile];
        return next;
    });

    if (stompRef.current?.connected) {
        stompRef.current.send(`/app/code/${roomId}`, {}, JSON.stringify({ sender: username, type: "DELETE", fileName: oldFile }));
        stompRef.current.send(`/app/code/${roomId}`, {}, JSON.stringify({ sender: username, language: newLang, type: "METADATA", fileName: newFileName }));
    }
    toast.success(`Renamed to ${newFileName.split('/').pop()} (${newLang})`);
};

const executeLanguageSwitch = (config) => {
    const { ydoc, oldFile, newLang, newCode, stompRef, roomId, username, setters } = config;
    updateYDocContent(ydoc, oldFile, newCode);
    setters.setFiles(prev => ({ ...prev, [oldFile]: { ...prev[oldFile], language: newLang } }));
    setters.setEditorErrors(prev => {
        const next = { ...prev };
        delete next[oldFile];
        return next;
    });

    if (stompRef.current?.connected) {
        stompRef.current.send(`/app/code/${roomId}`, {}, JSON.stringify({ sender: username, language: newLang, type: "METADATA", fileName: oldFile }));
    }
    toast.success(`Switched language to ${newLang}`);
};

const resolveExecutionInput = (userInput, currentProblem, activeBottomTab, activeTestCaseId) => {
    if (currentProblem && activeBottomTab === "testcases") {
        const selectedTc = (currentProblem.testcases || []).find((t) => t.id === activeTestCaseId);
        if (selectedTc) {
            return selectedTc.rawInput;
        }
    }
    return userInput;
};

const handleSubmissionFeedback = (status) => {
    if (status === 'ACCEPTED') {
        toast.success("Accepted!", { icon: '🟢' });
    } else if (status === 'WRONG_ANSWER') {
        toast.error("Wrong Answer", { icon: '🔴' });
    } else {
        toast.error("Evaluation Error");
    }
};

const triggerVimModeToggle = (editor, isVimMode, vimInstanceRef, setIsVimMode) => {
    if (!editor) return;
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
        vimInstanceRef.current = initVimMode(editor, document.getElementById('vim-status-bar'));
        setIsVimMode(true);
        toast.success("Vim Mode Enabled");
    }
};

const triggerCodeFormat = (editor, activeLanguage) => {
    if (!editor) return;
    editor.getAction('editor.action.formatDocument').run();
    if (['javascript', 'typescript'].includes(activeLanguage)) {
        toast.success("Code formatted!");
    } else {
        toast("Native formatting is only available for JS/TS.", { icon: 'ℹ️' });
    }
};

const processExecutionErrors = (outputText, language, files, setEditorErrors) => {
    const parsed = parseErrors(outputText, language, files);
    if (parsed.length === 0) return;

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
};

const processSingleUpload = async (file, ydoc, roomId, username, stompClient, setters) => {
    const ext = file.name.includes('.') ? `.${file.name.split('.').pop()}` : '';
    if (!ALLOWED_EXTENSIONS.has(ext)) { 
        toast.error(`Skipped ${file.name}: Unsupported file`, { 
            duration: 4000, 
            icon: '🚫' 
        }); 
        return null; 
    }

    const name = `src/${file.name}`; 
    const language = getLanguageFromExtension(name);

    try {
        const content = await file.text();
        updateYDocContent(ydoc, name, content);
        
        setters.setFiles(prev => ({ 
            ...prev, 
            [name]: { name, language } 
        }));
        
        setters.setOpenFiles(prev => (prev.includes(name) ? prev : [...prev, name]));
        
        if (stompClient.current?.connected) {
            stompClient.current.send(`/app/code/${roomId}`, {}, JSON.stringify({ 
                sender: username, 
                language, 
                type: "METADATA", 
                fileName: name 
            }));
        }
        return name;
    } catch (error_) {
        console.debug("Local file upload read error:", error_);
        return null;
    }
};

const handleCreateNewFileHelper = (config) => {
    const { canEdit, newFileName, newFileLang, ydoc, roomId, username, stompClient, setters } = config;
    if (!canEdit) return;
    if (!newFileName.trim()) {
        toast.error("File name cannot be empty");
        return;
    }
    const name = normalizeFileName(newFileName, newFileLang);
    const initialCode = CODE_SNIPPETS[newFileLang] || `// Start coding in ${name}...`;
    updateYDocContent(ydoc, name, initialCode);
    
    setters.setFiles(prev => ({ ...prev, [name]: { name, language: newFileLang } }));
    setters.setOpenFiles(prev => (prev.includes(name) ? prev : [...prev, name]));
    setters.setActiveFile(name);
    
    if (stompClient.current?.connected) {
        stompClient.current.send(`/app/code/${roomId}`, {}, JSON.stringify({
            sender: username,
            language: newFileLang,
            type: "METADATA",
            fileName: name
        }));
    }
    setters.setIsModalOpen(false);
    setters.setNewFileName("");
};

const handleDeleteIconClickHelper = (config) => {
    const { e, fileName, canEdit, fileCount, setFileToDelete, setIsDeleteModalOpen } = config;
    e.stopPropagation();
    if (!canEdit) {
        toast.error("You are in read-only mode");
        return;
    }
    if (fileCount <= 1) {
        toast.error("Cannot delete the only remaining file in workspace.", { icon: '⚠️' });
        return;
    }
    setFileToDelete(fileName);
    setIsDeleteModalOpen(true);
};

const confirmDeleteFileHelper = (config) => {
    const { fileToDelete, canEdit, files, openFiles, ydoc, roomId, username, stompClient, setters } = config;
    if (!fileToDelete || !canEdit) return;
    if (Object.keys(files).length <= 1) {
        toast.error("Cannot delete the only remaining file in workspace.", { icon: '⚠️' });
        setters.setIsDeleteModalOpen(false);
        setters.setFileToDelete(null);
        return;
    }

    ydoc.transact(() => {
        const ytext = ydoc.getText(fileToDelete);
        if (ytext.length > 0) ytext.delete(0, ytext.length);
    });

    const updatedFiles = { ...files };
    delete updatedFiles[fileToDelete];
    const remainingKeys = Object.keys(updatedFiles);
    const nextActive = getNextActiveFile(openFiles, remainingKeys, fileToDelete);

    setters.setFiles(updatedFiles);
    setters.setOpenFiles(prev => prev.filter(f => f !== fileToDelete));
    if (setters.activeFile === fileToDelete) {
        setters.setActiveFile(nextActive);
    }
    setters.setEditorErrors(prev => {
        const n = { ...prev };
        delete n[fileToDelete];
        return n;
    });

    if (stompClient.current?.connected) {
        stompClient.current.send(`/app/code/${roomId}`, {}, JSON.stringify({ sender: username, type: "DELETE", fileName: fileToDelete }));
    }
    toast.success(`${fileToDelete} deleted`);
    setters.setIsDeleteModalOpen(false);
    setters.setFileToDelete(null);
};

const handleFileUploadHelper = async (config) => {
    const { e, canEdit, ydoc, roomId, username, stompClient, setters } = config;
    if (!canEdit) return;
    const uploadedFiles = Array.from(e.target.files);
    if (uploadedFiles.length === 0) return;

    let lastFileName = "";
    let uploadedCount = 0;

    for (const file of uploadedFiles) {
        const processed = await processSingleUpload(file, ydoc, roomId, username, stompClient, setters);
        if (processed) {
            lastFileName = processed;
            uploadedCount += 1;
        }
    }

    if (lastFileName) setters.setActiveFile(lastFileName);
    setters.setIsModalOpen(false);
    if (uploadedCount > 0) {
        toast.success(`${uploadedCount} file(s) uploaded!`, { icon: '📁' });
    }
    e.target.value = null;
};

const runCodeHelper = async (config) => {
    const { activeFile, files, ydoc, secrets, userInput, currentProblem, activeBottomTab, activeTestCaseId, setters } = config;
    if (!activeFile) return;

    setters.setIsRunning(true);
    setters.setIsBottomPanelOpen(true);
    setters.setActiveBottomTab("console");
    setters.setOutput("Executing code in sandbox container...");
    setters.setEditorErrors({});

    const inputToRun = resolveExecutionInput(userInput, currentProblem, activeBottomTab, activeTestCaseId);

    try {
        const fileData = collectFilesData(files, ydoc);
        const envVarsPayload = buildEnvVarsPayload(secrets);

        const response = await axios.post(`${API_BASE_URL}/api/execute`, {
            language: files[activeFile]?.language || "plaintext",
            code: getYTextContent(ydoc, activeFile),
            input: inputToRun,
            mainFile: activeFile,
            files: fileData,
            envVars: envVarsPayload
        }, { transformResponse: [(data) => data] });

        const outputText = typeof response.data === 'object' ? JSON.stringify(response.data, null, 2) : String(response.data);
        setters.setOutput(outputText);
        processExecutionErrors(outputText, files[activeFile]?.language || "plaintext", files, setters.setEditorErrors);
    } catch (error_) {
        console.debug("Sandbox code execution failure:", error_);
        setters.setOutput("Execution failed: Connection to sandbox runtime error.");
    } finally {
        setters.setIsRunning(false);
    }
};

const handleSubmitHelper = async (config) => {
    const { activeFile, currentProblem, files, ydoc, secrets, setters } = config;
    if (!activeFile || !currentProblem) return;

    setters.setIsSubmitting(true);
    setters.setIsBottomPanelOpen(true);
    setters.setSubmissionResult(null);
    setters.setActiveBottomTab("submission");

    const fileData = collectFilesData(files, ydoc);
    const envVarsPayload = buildEnvVarsPayload(secrets);
    const language = files[activeFile]?.language;
    const code = getYTextContent(ydoc, activeFile);

    const result = await evaluateSubmission(currentProblem, activeFile, language, code, fileData, envVarsPayload);
    setters.setSubmissionResult(result);
    handleSubmissionFeedback(result.status);
    setters.setIsSubmitting(false);
};

const saveWorkspaceHelper = async (config) => {
    const { isHost, files, ydoc, roomId, username, roomName, setIsSaving } = config;
    if (!isHost) return;
    setIsSaving(true);
    try {
        const fileData = collectFilesData(files, ydoc);
        await axios.post(`${API_BASE_URL}/api/workspace/${encodeURIComponent(roomId)}/save`, fileData, {
            params: {
                username: String(username || '').trim(),
                roomName: String(roomName || '').trim()
            }
        });
        toast.success("Workspace saved to cloud! ☁️");
    } catch (error_) {
        console.debug("Save workspace error:", error_);
        toast.error("Failed to save workspace.");
    } finally {
        setIsSaving(false);
    }
};

const downloadWorkspaceHelper = async (files, ydoc, roomName) => {
    try {
        const zip = new JSZip();
        Object.keys(files).forEach(fileName => {
            zip.file(fileName, getYTextContent(ydoc, fileName));
        });
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `${roomName.replace(/[^a-zA-Z0-9]/g, '_')}_vylop.zip`);
        toast.success("Workspace Exported! 📦");
    } catch (error_) {
        console.debug("Export zip error:", error_);
        toast.error("Failed to export workspace");
    }
};

const handleJumpToLineHelper = (config) => {
    const { fileName, lineNumber, files, activeFile, handleFileOpen, editorRef } = config;
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

const getTooltipHelper = (requiredRole, isHost, canEdit) => {
    if (requiredRole === 'HOST' && !isHost) return "Only the host can perform this action";
    if (requiredRole === 'EDITOR' && !canEdit) return "You are in read-only mode";
    return "";
};

const renderOutputRow = (line, index, files, handleJumpToLine) => {
    const isError = checkIsErrorLine(line);
    const style = isError ? { color: '#f87171' } : { color: '#cbd5e1' };
    const loc = parseErrorLocation(line, files);
    
    if (loc) {
        const parts = line.split(loc.fullMatch);
        return (
            <div key={`output-matched-${loc.resolvedFile}-${loc.lineNumber}-${index}`} style={{ ...style, fontFamily: 'JetBrains Mono, monospace', lineHeight: '1.5' }}>
                {parts[0]}
                <button 
                    type="button"
                    onClick={() => handleJumpToLine(loc.resolvedFile, loc.lineNumber)} 
                    style={{ background: 'none', border: 'none', padding: 0, textDecoration: 'underline', cursor: 'pointer', color: '#38bdf8', fontWeight: 'bold', font: 'inherit' }} 
                    title={`Jump to line ${loc.lineNumber} in ${loc.resolvedFile}`}
                >
                    {loc.fullMatch}
                </button>
                {parts[1]}
            </div>
        );
    }
    
    return (
        <div key={`output-line-${index}-${line.slice(0, 10)}`} style={{ ...style, fontFamily: 'JetBrains Mono, monospace', lineHeight: '1.5' }}>
            {line}
        </div>
    );
};

const renderFormattedOutput = (text, files, handleJumpToLine) => {
    if (!text) {
        return [
            <div key="default-empty-output" style={{ color: '#cbd5e1', fontFamily: 'JetBrains Mono, monospace', lineHeight: '1.5' }}>
                {"// Output will appear here after clicking Run..."}
            </div>
        ];
    }
    
    const strText = typeof text === 'string' ? text : JSON.stringify(text, null, 2);
    const lines = strText.split('\n');
    return lines.map((line, index) => renderOutputRow(line, index, files, handleJumpToLine));
};

const syncHostWorkspaceState = (ydocRef, loadedFilesRef) => {
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
                ytext.insert(0, CODE_SNIPPETS.java);
            }
        }
    });
};

const handleWsProblemSync = (fileName, sender, username, setters) => {
    if (fileName === "CLEAR") {
        setters.setCurrentProblem(null);
        return;
    }
    const problem = MOCK_PROBLEMS[fileName];
    if (!problem) return;

    setters.setCurrentProblem(problem);
    setters.setIsInterviewMode(true);
    if (sender !== username) {
        toast(`The Host assigned a new problem: ${problem.title}`, { icon: '📝', duration: 4000 });
    }
};

const handleWsFileDelete = (fileName, sender, username, setters) => {
    setters.setFiles(prev => {
        const next = { ...prev };
        delete next[fileName];
        return next;
    });
    setters.setOpenFiles(prev => prev.filter(f => f !== fileName));
    setters.setActiveFile(curr => (curr === fileName ? null : curr));
    setters.setEditorErrors(prev => {
        const next = { ...prev };
        delete next[fileName];
        return next;
    });
    if (sender !== username) {
        toast(`${sender} deleted ${fileName}`, { icon: '🗑️' });
    }
};

const handleWsFileMetadata = (fileName, language, setters) => {
    setters.setFiles(prev => ({
        ...prev,
        [fileName]: { name: fileName, language }
    }));
    setters.setOpenFiles(prev => (prev.includes(fileName) ? prev : [...prev, fileName]));
    setters.setActiveFile(fileName);
};

const processWsCodeMessage = (body, username, setters) => {
    if (body.type === "PROBLEM_SYNC") {
        handleWsProblemSync(body.fileName, body.sender, username, setters);
    } else if (body.type === "DELETE") {
        handleWsFileDelete(body.fileName, body.sender, username, setters);
    } else if (body.type === "METADATA") {
        handleWsFileMetadata(body.fileName, body.language, setters);
    }
};

const handleUserSyncAndRoles = (users, config) => {
    const { username, roomId, client, getUserColor, setUsers, setCurrentUserRole, isHostRef, initialSyncRequested, ydocRef, loadedFilesRef, remoteCursors, editorRef } = config;
    users.forEach(u => getUserColor(u.username));
    setUsers(users);
    const me = users.find(u => u.username === username);
    if (!me) return;

    setCurrentUserRole(me.role);
    isHostRef.current = me.role === 'HOST';

    if (initialSyncRequested.current) return;
    initialSyncRequested.current = true;
    if (me.role === 'HOST') {
        syncHostWorkspaceState(ydocRef, loadedFilesRef);
    } else {
        client.send(`/app/yjs/${roomId}`, {}, JSON.stringify({ sender: username, type: 'REQUEST_SYNC' }));
    }

    const activeUsernames = new Set(users.map(u => u.username));
    cleanupStaleCursors(remoteCursors, activeUsernames, editorRef);
};

const handleKickEvent = (targetUser, username, navigate) => {
    if (targetUser === username) {
        toast.error("You have been kicked from the room by the host.", { icon: '🚪', duration: 5000 });
        navigate('/');
    } else {
        toast(`${targetUser} was kicked by the host.`);
    }
};

const processWsUsersMessage = (config) => {
    const { body, username, navigate, notifiedUsers } = config;

    if (body.users) {
        handleUserSyncAndRoles(body.users, config);
    }

    if (body.type === 'KICK') {
        handleKickEvent(body.username, username, navigate);
    } else {
        notifyPeerStatus(body, username, notifiedUsers);
    }
};

const handleYjsMessage = (msg, username, roomId, ydocRef, isHostRef, client) => {
    try {
        let payload = msg.body;
        if (typeof payload === 'string') payload = JSON.parse(payload);
        if (typeof payload === 'string') payload = JSON.parse(payload);

        if (payload.type === 'SYNC' && payload.sender !== username) {
            Y.applyUpdate(ydocRef.current, new Uint8Array(payload.update), 'remote');
        } else if (payload.type === 'REQUEST_SYNC' && isHostRef.current && payload.sender !== username) {
            const state = Y.encodeStateAsUpdate(ydocRef.current);
            client.send(`/app/yjs/${roomId}`, {}, JSON.stringify({
                sender: username,
                type: 'SYNC',
                update: Array.from(state)
            }));
        }
    } catch (error_) {
        console.debug("Yjs frame parsing:", error_);
    }
};

const attachSocketSubscriptions = (config) => {
    const { client, roomId, username, ydocRef, isHostRef, codeSetters, usersConfig, setMessages, setTypingUsers, updateRemoteCursor, activeFile } = config;

    client.subscribe(`/topic/yjs/${roomId}`, (msg) => handleYjsMessage(msg, username, roomId, ydocRef, isHostRef, client));
    client.subscribe(`/topic/code/${roomId}`, (msg) => processWsCodeMessage(JSON.parse(msg.body), username, codeSetters));
    client.subscribe(`/topic/users/${roomId}`, (msg) => processWsUsersMessage({ ...usersConfig, body: JSON.parse(msg.body), client }));
    client.subscribe(`/topic/chat/${roomId}`, (msg) => setMessages(prev => [...prev, JSON.parse(msg.body)]));
    
    client.subscribe(`/topic/typing/${roomId}`, (msg) => {
        const body = JSON.parse(msg.body);
        if (body.username === username) return;
        setTypingUsers(prev => {
            const s = new Set(prev);
            if (body.isTyping === 'true') {
                s.add(body.username);
            } else {
                s.delete(body.username);
            }
            return Array.from(s);
        });
    });

    client.subscribe(`/topic/cursor/${roomId}`, (msg) => {
        const body = JSON.parse(msg.body);
        updateRemoteCursor(body.username, { lineNumber: body.lineNumber, column: body.column }, body.fileName || activeFile);
    });

    client.send(`/app/room/${roomId}/join`, {}, JSON.stringify({ username, type: "JOIN" }));
};

const DiagnosticDrawer = (props) => {
    const { activeFile, activeFileErrors, onJumpToLine, onClearErrors } = props;
    if (activeFileErrors.length === 0) return null;
    const errorCount = activeFileErrors.filter(e => e.severity === 'error').length;
    const warnCount = activeFileErrors.filter(e => e.severity === 'warning').length;

    return (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '140px', overflowY: 'auto', backgroundColor: '#0d1117ee', borderTop: '1px solid #ff6b6b44', backdropFilter: 'blur(4px)', zIndex: 10 }}>
            <div style={{ padding: '4px 12px', fontSize: '0.65rem', color: '#ff6b6b', letterSpacing: '0.5px', fontWeight: 'bold', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, backgroundColor: '#0d1117ee', zIndex: 1 }}>
                <span>
                    {errorCount > 0 && `🔴 ${errorCount} error${errorCount > 1 ? 's' : ''}`}
                    {warnCount > 0 && `  🟡 ${warnCount} warning${warnCount > 1 ? 's' : ''}`}
                </span>
                <button type="button" onClick={onClearErrors} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}>
                    ✕ Clear
                </button>
            </div>
            {activeFileErrors.map((err, i) => (
                <button 
                    type="button"
                    key={`active-err-${activeFile}-${err.line}-${i}`} 
                    onClick={() => onJumpToLine(activeFile, err.line)} 
                    style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', padding: '3px 12px', fontSize: '0.78rem', fontFamily: 'JetBrains Mono, monospace', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'baseline', color: getSeverityColor(err.severity) }} 
                    title={`Jump to line ${err.line}`}
                >
                    <span style={{ flexShrink: 0, opacity: 0.7 }}>Line {err.line}</span>
                    <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>—</span>
                    <span>{err.message}</span>
                </button>
            ))}
        </div>
    );
};

const EditorWorkspacePane = (props) => {
    const { activeFile, files, showMarkdownPreview, editorTheme, canEdit, handleEditorDidMount, ydocRef, activeFileErrors, onJumpToLine, onClearErrors } = props;
    const isMarkdown = showMarkdownPreview && files[activeFile]?.language === "markdown";
    return (
        <div className="editor-wrapper full-height" style={{ height: '100%', overflow: 'hidden', minHeight: 0 }}>
            {isMarkdown ? (
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
                        <ReactMarkdown>{getYTextContent(ydocRef.current, activeFile)}</ReactMarkdown>
                    </div>
                </div>
            ) : (
                <div style={{ width: '100%', height: '100%' }}>
                    <Editor 
                        path={activeFile} 
                        height="100%" 
                        width="100%" 
                        language={resolveEditorLanguage(files[activeFile])} 
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
            <DiagnosticDrawer 
                activeFile={activeFile}
                activeFileErrors={activeFileErrors}
                onJumpToLine={onJumpToLine}
                onClearErrors={onClearErrors}
            />
        </div>
    );
};

const FileTabsBar = (props) => {
    const { openFiles, activeFile, editorErrors, onSelectFile, onCloseTab } = props;
    return (
        <div className="file-tabs" role="tablist" aria-label="Open workspace files">
            {openFiles.map((fileName) => {
                const isTabActive = activeFile === fileName;
                return (
                    <div 
                        key={fileName} 
                        className={`file-tab ${isTabActive ? 'active' : ''}`}
                    >
                        <button
                            type="button"
                            role="tab"
                            aria-selected={isTabActive}
                            className="file-tab-btn"
                            onClick={() => onSelectFile(fileName)}
                            style={{ background: 'none', border: 'none', color: 'inherit', font: 'inherit', display: 'flex', alignItems: 'center', cursor: 'pointer', padding: 0 }}
                        >
                            <span className="file-tab-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {getFileIcon(fileName.split('/').pop())}
                                {renderTabContent(fileName, openFiles, editorErrors)}
                            </span>
                        </button>
                        <button 
                            type="button"
                            className="file-tab-close" 
                            onClick={(e) => onCloseTab(e, fileName)} 
                            title="Close Tab"
                            aria-label={`Close ${fileName} tab`}
                        >
                            &times;
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

const EmptyEditorState = (props) => {
    const { canEdit, onOpenCreateModal } = props;
    return (
        <div className="editor-empty-container">
            <div className="editor-empty-icon-box">
                <Code2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="editor-empty-title">No Active File</h3>
            <p className="editor-empty-desc">Select a file from the explorer on the left or create a new file to start coding.</p>
            {canEdit && (
                <button type="button" className="btn-solid-emerald" onClick={onOpenCreateModal}>
                    <FilePlus className="w-4 h-4 mr-1.5" />
                    <span>Create File</span>
                </button>
            )}
        </div>
    );
};

const WorkspaceCenterArea = (props) => {
    const {
        activeFile,
        files,
        currentProblem,
        isBottomPanelOpen,
        panelSizes,
        setPanelSizes,
        editorRef,
        showMarkdownPreview,
        editorTheme,
        canEdit,
        handleEditorDidMount,
        ydocRef,
        activeFileErrors,
        handleJumpToLine,
        setEditorErrors,
        activeBottomTab,
        setActiveBottomTab,
        activeTestCaseId,
        setActiveTestCaseId,
        isSubmitting,
        submissionResult,
        output,
        setOutput,
        userInput,
        setUserInput,
        setIsBottomPanelOpen,
        isPanelMaximized,
        handleToggleMaximize
    } = props;

    return (
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
                        <EditorWorkspacePane 
                            activeFile={activeFile}
                            files={files}
                            showMarkdownPreview={showMarkdownPreview}
                            editorTheme={editorTheme}
                            canEdit={canEdit}
                            handleEditorDidMount={handleEditorDidMount}
                            ydocRef={ydocRef}
                            activeFileErrors={activeFileErrors}
                            onJumpToLine={handleJumpToLine}
                            onClearErrors={() => setEditorErrors(prev => { const n = { ...prev }; delete n[activeFile]; return n; })}
                        />

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
                                renderFormattedOutput={() => renderFormattedOutput(output, files, handleJumpToLine)}
                                userInput={userInput}
                                setUserInput={setUserInput}
                                onClose={() => setIsBottomPanelOpen(false)}
                                isMaximized={isPanelMaximized}
                                onToggleMaximize={handleToggleMaximize}
                            />
                        </div>
                    </Split>
                ) : (
                    <EditorWorkspacePane 
                        activeFile={activeFile}
                        files={files}
                        showMarkdownPreview={showMarkdownPreview}
                        editorTheme={editorTheme}
                        canEdit={canEdit}
                        handleEditorDidMount={handleEditorDidMount}
                        ydocRef={ydocRef}
                        activeFileErrors={activeFileErrors}
                        onJumpToLine={handleJumpToLine}
                        onClearErrors={() => setEditorErrors(prev => { const n = { ...prev }; delete n[activeFile]; return n; })}
                    />
                )}
            </div>
        </div>
    );
};

const handlePushProblemHelper = (config) => {
    const { id, stompClient, isHost, username, roomId, setCurrentProblem, setIsInterviewMode, setIsQuestionBankOpen } = config;
    if (!stompClient.current?.connected || !isHost) return;
    setCurrentProblem(MOCK_PROBLEMS[id]);
    setIsInterviewMode(true);
    stompClient.current.send(`/app/code/${roomId}`, {}, JSON.stringify({ sender: username, type: "PROBLEM_SYNC", fileName: id }));
    setIsQuestionBankOpen(false);
    toast.success("Problem pushed to room!", { icon: '🚀' });
};

const handleClearProblemHelper = (config) => {
    const { stompClient, isHost, username, roomId, setCurrentProblem } = config;
    if (!stompClient.current?.connected || !isHost) return;
    setCurrentProblem(null);
    stompClient.current.send(`/app/code/${roomId}`, {}, JSON.stringify({ sender: username, type: "PROBLEM_SYNC", fileName: "CLEAR" }));
    toast("Problem cleared from workspace.");
};

const handleLanguageSelectHelper = (config) => {
    const { e, isHost, activeFile, files, ydocRef, setPendingLangChange, setIsLangChangeModalOpen, applyLanguageChange } = config;
    if (!isHost || !activeFile) return;
    
    const newLang = e.target.value;
    const currentLang = files[activeFile]?.language || "plaintext";
    if (newLang === currentLang) return;

    const currentText = getYTextContent(ydocRef.current, activeFile).trim();
    const defaultSnippet = (CODE_SNIPPETS[currentLang] || "").trim();

    if (currentText.length > 0 && currentText !== defaultSnippet) {
        setPendingLangChange(newLang);
        setIsLangChangeModalOpen(true);
    } else {
        applyLanguageChange(newLang);
    }
};

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

    const [editorTheme, setEditorTheme] = useState(() => sanitizeTheme(localStorage.getItem('editorTheme')));

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newFileLang, setNewFileLang] = useState("python");
    const [newFileName, setNewFileName] = useState("");
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [fileToDelete, setFileToDelete] = useState(null);
    const [isSecretsModalOpen, setIsSecretsModalOpen] = useState(false);
    const [secrets, setSecrets] = useState([{ key: '', value: '' }]);
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

    const [pendingLangChange, setPendingLangChange] = useState(null);
    const [isLangChangeModalOpen, setIsLangChangeModalOpen] = useState(false);
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
            let next = fileKeys[0];
            if (openFiles.length > 0) {
                next = openFiles.at(-1);
            }
            setActiveFile(next);
            if (!openFiles.includes(next)) {
                setOpenFiles(prev => [...prev, next]);
            }
        }
    }, [files, activeFile, openFiles]);

    const getUserColor = (user) => {
        if (!userColorMap.current[user]) {
            userColorMap.current[user] = CURSOR_COLORS[nextColorIndex.current % CURSOR_COLORS.length];
            nextColorIndex.current += 1;
        }
        return userColorMap.current[user];
    };

    const loadWorkspaceState = useCallback(async () => {
        const minimumLoadDelay = new Promise(resolve => setTimeout(resolve, 1400));
        try {
            const [metaRes, loadRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/workspace/${encodeURIComponent(roomId)}`).catch(() => ({ data: null })),
                axios.get(`${API_BASE_URL}/api/workspace/${encodeURIComponent(roomId)}/load`).catch(() => ({ data: {} })),
                minimumLoadDelay
            ]);

            if (metaRes.data?.name) setRoomName(metaRes.data.name);
            if (['INTERVIEW', 'interview'].includes(metaRes.data?.type || metaRes.data?.roomType || metaRes.data?.mode)) {
                setIsInterviewMode(true);
            }
            
            loadedFilesRef.current = loadRes.data || {};
            const { filesState, initialActive } = getInitialFilesState(loadedFilesRef.current);
            setFiles(filesState);
            setActiveFile(initialActive);
            setOpenFiles([initialActive]);
        } catch (error_) {
            console.debug("Workspace fetch fallback:", error_);
            await minimumLoadDelay;
            loadedRooms.delete(roomId);
            setRoomName(prev => prev === "Syncing Workspace..." ? "Dev Workspace" : prev);
            const { filesState, initialActive } = getInitialFilesState({});
            setFiles(filesState);
            setActiveFile(initialActive);
            setOpenFiles([initialActive]);
        } finally {
            setIsWorkspaceLoaded(true);
        }
    }, [roomId]);

    useEffect(() => {
        if (loadedRooms.has(roomId)) return;
        loadedRooms.add(roomId);

        if (roomId && username) {
            loadWorkspaceState();
        }
        
        return () => { 
            loadedRooms.delete(roomId); 
        };
    }, [roomId, username, loadWorkspaceState]);

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
            const newDecorations = buildEditorDecorations(errors, monaco);
            decorationIds.current = editor.deltaDecorations(decorationIds.current, newDecorations);

            editor.changeViewZones(accessor => {
                viewZoneIds.current.forEach(id => accessor.removeZone(id));
                viewZoneIds.current = [];

                errors.forEach(err => {
                    const marginDomNode = document.createElement('div');
                    const domNode = createZoneDomNode(err, editor);
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
        } catch (error_) {
            console.debug("Monaco diagnostic zone calculation skipped:", error_);
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
                } catch (error_) {
                    console.debug("Safe unmount of Monaco view zones:", error_);
                }
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
                try { 
                    editorRef.current.removeContentWidget(remoteCursors.current[user]); 
                } catch (error_) {
                    console.debug("Remote cursor removal on file switch:", error_);
                }
            }
            return;
        }
        
        if (!editorRef.current || !monacoRef.current) { 
            pendingCursors.current[user] = { pos, file }; 
            return; 
        }
        
        if (remoteCursors.current[user]) {
            try { 
                editorRef.current.removeContentWidget(remoteCursors.current[user]); 
            } catch (error_) {
                console.debug("Stale remote cursor cleanup:", error_);
            }
        }
        
        const userColor = getUserColor(user);
        const lineHeight = editorRef.current.getOption(monacoRef.current.editor.EditorOption.lineHeight);
        const widget = buildRemoteCursorWidget(user, pos, userColor, lineHeight);
        
        try {
            editorRef.current.addContentWidget(widget);
            remoteCursors.current[user] = widget;
        } catch (error_) {
            console.debug("Remote cursor DOM insertion timing:", error_);
        }
    };

    const bindMonacoToYjs = useCallback((fileName, editor = editorRef.current) => {
        if (ymonacoBindingRef.current) { 
            try { 
                ymonacoBindingRef.current.destroy(); 
            } catch (error_) {
                console.debug("Yjs binding disposal:", error_);
            }
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
                try { 
                    ymonacoBindingRef.current.destroy(); 
                } catch (error_) {
                    console.debug("Binding reset on active file clear:", error_);
                }
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
                } catch (error_) {
                    console.debug("Monaco font measurement timing:", error_);
                }
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

    const handleThemeChange = (newTheme) => {
        const safeTheme = sanitizeTheme(newTheme);
        setEditorTheme(safeTheme);
        localStorage.setItem('editorTheme', safeTheme);
        if (monacoRef.current) {
            monacoRef.current.editor.setTheme(safeTheme);
        }
        const themeLabel = safeTheme === 'vs-dark' ? 'Dark' : 'Light';
        const themeIcon = safeTheme === 'vs-dark' ? '🌙' : '☀️';
        toast(`Switched to ${themeLabel} Mode`, { icon: themeIcon });
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

                const codeSetters = { setFiles, setOpenFiles, setActiveFile, setEditorErrors, setCurrentProblem, setIsInterviewMode };
                const usersConfig = { username, roomId, getUserColor, setUsers, setCurrentUserRole, isHostRef, initialSyncRequested, ydocRef, loadedFilesRef, remoteCursors, editorRef, notifiedUsers, navigate };

                attachSocketSubscriptions({
                    client,
                    roomId,
                    username,
                    ydocRef,
                    isHostRef,
                    codeSetters,
                    usersConfig,
                    setMessages,
                    setTypingUsers,
                    updateRemoteCursor,
                    activeFile
                });
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
    }, [roomId, username, navigate, isWorkspaceLoaded, activeFile]); 

    useEffect(() => { 
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, typingUsers]);

    const handleCloseTab = (e, fileName) => { 
        e.stopPropagation(); 
        const newOpenFiles = openFiles.filter(f => f !== fileName); 
        setOpenFiles(newOpenFiles); 
        if (activeFile === fileName) {
            setActiveFile(newOpenFiles.length > 0 ? newOpenFiles.at(-1) : null);
        }
    };

    const handleCreateNewFile = () => {
        const setters = { setFiles, setOpenFiles, setActiveFile, setIsModalOpen, setNewFileName };
        handleCreateNewFileHelper({ canEdit, newFileName, newFileLang, ydoc: ydocRef.current, roomId, username, stompClient, setters });
    };

    const handleFileUpload = async (e) => {
        const setters = { setFiles, setOpenFiles, setActiveFile, setIsModalOpen };
        await handleFileUploadHelper({ e, canEdit, ydoc: ydocRef.current, roomId, username, stompClient, setters });
    };

    const handleDeleteIconClick = (e, fileName) => {
        handleDeleteIconClickHelper({ e, fileName, canEdit, fileCount: Object.keys(files).length, setFileToDelete, setIsDeleteModalOpen });
    };

    const confirmDeleteFile = () => {
        const setters = { setFiles, setOpenFiles, setActiveFile, setEditorErrors, setIsDeleteModalOpen, setFileToDelete, activeFile };
        confirmDeleteFileHelper({ fileToDelete, canEdit, files, openFiles, ydoc: ydocRef.current, roomId, username, stompClient, setters });
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
        const setters = { setFiles, setOpenFiles, setActiveFile, setEditorErrors };

        if (newFileName !== oldFile) {
            executeFileRename({ ydoc: ydocRef.current, oldFile, newFileName, newLang, newCode, stompRef: stompClient, roomId, username, setters });
        } else {
            executeLanguageSwitch({ ydoc: ydocRef.current, oldFile, newLang, newCode, stompRef: stompClient, roomId, username, setters });
        }
    };

    const handleLanguageSelect = (e) => {
        handleLanguageSelectHelper({ e, isHost, activeFile, files, ydocRef, setPendingLangChange, setIsLangChangeModalOpen, applyLanguageChange });
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

    const runCode = async () => {
        const setters = { setIsRunning, setIsBottomPanelOpen, setActiveBottomTab, setOutput, setEditorErrors };
        await runCodeHelper({ activeFile, files, ydoc: ydocRef.current, secrets, userInput, currentProblem, activeBottomTab, activeTestCaseId, setters });
    };

    const handleSubmit = async () => {
        const setters = { setIsSubmitting, setIsBottomPanelOpen, setSubmissionResult, setActiveBottomTab };
        await handleSubmitHelper({ activeFile, currentProblem, files, ydoc: ydocRef.current, secrets, setters });
    };

    const saveWorkspace = async () => {
        await saveWorkspaceHelper({ isHost, files, ydoc: ydocRef.current, roomId, username, roomName, setIsSaving });
    };

    const handleJumpToLine = (fileName, lineNumber) => {
        handleJumpToLineHelper({ fileName, lineNumber, files, activeFile, handleFileOpen: (f) => setOpenFiles(prev => (prev.includes(f) ? prev : [...prev, f])), editorRef });
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

    const handleExitWorkspace = async (saveBeforeLeave = false) => {
        setIsLeaveModalOpen(false);
        setIsLeavingWorkspace(true);

        if (saveBeforeLeave) {
            await saveWorkspace();
        }

        await new Promise(resolve => setTimeout(resolve, 1200));
        navigate('/');
    };

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
                handlePushProblem={(id) => handlePushProblemHelper({ id, stompClient, isHost, username, roomId, setCurrentProblem, setIsInterviewMode, setIsQuestionBankOpen })}
                handleClearProblem={() => handleClearProblemHelper({ stompClient, isHost, username, roomId, setCurrentProblem })}
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
                handleFileOpen={(f) => {
                    if (!openFiles.includes(f)) setOpenFiles(prev => [...prev, f]);
                    setActiveFile(f);
                }}
                isOnlineExpanded={isOnlineExpanded}
                setIsOnlineExpanded={setIsOnlineExpanded}
                users={users}
                wsConnected={wsConnected}
                getUserColor={getUserColor}
                isHost={isHost}
                canEdit={canEdit}
                username={username}
                changeUserRole={(tUser, nRole) => {
                    if (stompClient.current?.connected && isHost) {
                        stompClient.current.send(`/app/room/${roomId}/roleChange`, {}, JSON.stringify({ targetUser: tUser, newRole: nRole }));
                    }
                }}
                kickTargetUser={(tUser) => {
                    if (stompClient.current?.connected && isHost) {
                        stompClient.current.send(`/app/room/${roomId}/kick`, {}, JSON.stringify({ targetUser: tUser }));
                    }
                }}
                isChatExpanded={isChatExpanded}
                setIsChatExpanded={setIsChatExpanded}
                messages={messages}
                chatContainerRef={chatContainerRef}
                typingUsers={typingUsers}
                chatMsg={chatMsg}
                handleTypingChange={handleTypingChange}
                sendChat={sendChat}
                copyRoomLink={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/room/${encodeURIComponent(roomId)}`);
                    toast.success("Invite Link Copied!", { icon: '🔗' });
                }}
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
                    downloadWorkspace={() => downloadWorkspaceHelper(files, ydocRef.current, roomName)}
                    handleDeleteIconClick={handleDeleteIconClick}
                    formatCode={() => {
                        if (!canEdit || !activeFile) return;
                        triggerCodeFormat(editorRef.current, files[activeFile]?.language);
                    }}
                    isVimMode={isVimMode}
                    toggleVimMode={() => triggerVimModeToggle(editorRef.current, isVimMode, vimInstanceRef, setIsVimMode)}
                    editorTheme={editorTheme}
                    handleThemeChange={handleThemeChange}
                    handleLanguageSelect={handleLanguageSelect}
                    isRunning={isRunning}
                    runCode={runCode}
                    currentProblem={currentProblem}
                    isSubmitting={isSubmitting}
                    handleSubmit={handleSubmit}
                    getTooltip={(req) => getTooltipHelper(req, isHost, canEdit)}
                    isBottomPanelOpen={isBottomPanelOpen}
                    setIsBottomPanelOpen={setIsBottomPanelOpen}
                />

                <FileTabsBar 
                    openFiles={openFiles}
                    activeFile={activeFile}
                    editorErrors={editorErrors}
                    onSelectFile={setActiveFile}
                    onCloseTab={handleCloseTab}
                />

                {!activeFile ? (
                    <EmptyEditorState 
                        canEdit={canEdit}
                        onOpenCreateModal={() => setIsModalOpen(true)}
                    />
                ) : (
                    <WorkspaceCenterArea 
                        activeFile={activeFile}
                        files={files}
                        currentProblem={currentProblem}
                        isBottomPanelOpen={isBottomPanelOpen}
                        panelSizes={panelSizes}
                        setPanelSizes={setPanelSizes}
                        editorRef={editorRef}
                        showMarkdownPreview={showMarkdownPreview}
                        editorTheme={editorTheme}
                        canEdit={canEdit}
                        handleEditorDidMount={handleEditorDidMount}
                        ydocRef={ydocRef}
                        activeFileErrors={activeFileErrors}
                        handleJumpToLine={handleJumpToLine}
                        setEditorErrors={setEditorErrors}
                        activeBottomTab={activeBottomTab}
                        setActiveBottomTab={setActiveBottomTab}
                        activeTestCaseId={activeTestCaseId}
                        setActiveTestCaseId={setActiveTestCaseId}
                        isSubmitting={isSubmitting}
                        submissionResult={submissionResult}
                        output={output}
                        setOutput={setOutput}
                        userInput={userInput}
                        setUserInput={setUserInput}
                        setIsBottomPanelOpen={setIsBottomPanelOpen}
                        isPanelMaximized={isPanelMaximized}
                        handleToggleMaximize={handleToggleMaximize}
                    />
                )}
            </div>
        </div>
    );
};

export default CodeEditor;