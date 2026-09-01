import React from 'react';
import { 
    ChevronDown, 
    ChevronRight, 
    Folder, 
    Users, 
    MessageSquare, 
    Send, 
    Crown, 
    Shield, 
    Eye, 
    UserMinus, 
    Share2, 
    LogOut, 
    Plus 
} from 'lucide-react';
import FileExplorer from './FileExplorer';
import './EditorSidebar.css';

const renderUserRoleBadge = (role) => {
    if (role === 'HOST') {
        return (
            <span className="user-role-badge role-host">
                <Crown className="w-3 h-3 mr-1 text-amber-400" />
                <span>Host</span>
            </span>
        );
    }
    if (role === 'EDITOR') {
        return (
            <span className="user-role-badge role-editor">
                <Shield className="w-3 h-3 mr-1 text-emerald-400" />
                <span>Editor</span>
            </span>
        );
    }
    return (
        <span className="user-role-badge role-viewer">
            <Eye className="w-3 h-3 mr-1 text-blue-400" />
            <span>Viewer</span>
        </span>
    );
};

const EditorSidebar = ({
    isSidebarOpen,
    isExplorerExpanded,
    setIsExplorerExpanded,
    files,
    activeFile,
    handleFileOpen,
    isOnlineExpanded,
    setIsOnlineExpanded,
    users = [],
    wsConnected,
    getUserColor,
    isHost,
    canEdit,
    username,
    changeUserRole,
    kickTargetUser,
    isChatExpanded,
    setIsChatExpanded,
    messages = [],
    chatContainerRef,
    typingUsers = [],
    chatMsg,
    handleTypingChange,
    sendChat,
    copyRoomLink,
    setIsLeaveModalOpen,
    setIsModalOpen
}) => {
    if (!isSidebarOpen) return null;

    return (
        <aside className="editor-sidebar-container">
            {/* Header & Explorer Section */}
            <div className="sidebar-section">
                <div className="sidebar-section-header-wrapper">
                    <button
                        type="button"
                        className="sidebar-section-toggle-btn"
                        onClick={() => setIsExplorerExpanded(!isExplorerExpanded)}
                        aria-expanded={isExplorerExpanded}
                    >
                        {isExplorerExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <Folder className="w-4 h-4 text-amber-400" />
                        <span>Explorer</span>
                    </button>
                    {canEdit && (
                        <button
                            type="button"
                            className="sidebar-action-icon-btn"
                            onClick={() => setIsModalOpen(true)}
                            title="New File"
                            aria-label="New File"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {isExplorerExpanded && (
                    <div className="sidebar-section-content">
                        <FileExplorer
                            files={files}
                            activeFile={activeFile}
                            onFileSelect={handleFileOpen}
                            canEdit={canEdit}
                        />
                    </div>
                )}
            </div>

            {/* Online Collaborators Section */}
            <div className="sidebar-section">
                <div className="sidebar-section-header-wrapper">
                    <button
                        type="button"
                        className="sidebar-section-toggle-btn"
                        onClick={() => setIsOnlineExpanded(!isOnlineExpanded)}
                        aria-expanded={isOnlineExpanded}
                    >
                        {isOnlineExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <Users className="w-4 h-4 text-emerald-400" />
                        <span>Online Users ({users.length})</span>
                    </button>
                    <span className={`ws-status-indicator ${wsConnected ? 'connected' : 'disconnected'}`} title={wsConnected ? 'Connected' : 'Disconnected'} />
                </div>

                {isOnlineExpanded && (
                    <ul className="sidebar-user-list">
                        {users.map((u) => {
                            const isMe = u.username === username;
                            const userColor = getUserColor ? getUserColor(u.username) : '#10b981';

                            return (
                                <li key={`user-row-${u.username}`} className="sidebar-user-item">
                                    <div className="user-info-left">
                                        <span 
                                            className="user-avatar-dot" 
                                            style={{ backgroundColor: userColor }} 
                                        />
                                        <span className="user-name-text">
                                            {u.username} {isMe && '(You)'}
                                        </span>
                                    </div>

                                    <div className="user-info-right">
                                        {renderUserRoleBadge(u.role)}

                                        {isHost && !isMe && (
                                            <div className="host-controls">
                                                <select
                                                    value={u.role}
                                                    onChange={(e) => changeUserRole(u.username, e.target.value)}
                                                    className="role-select-dropdown"
                                                    aria-label={`Change role for ${u.username}`}
                                                >
                                                    <option value="EDITOR">Editor</option>
                                                    <option value="READ_ONLY">Viewer</option>
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={() => kickTargetUser(u.username)}
                                                    className="user-kick-btn"
                                                    title={`Kick ${u.username}`}
                                                    aria-label={`Kick ${u.username}`}
                                                >
                                                    <UserMinus className="w-3.5 h-3.5 text-rose-400" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {/* Chat Room Section */}
            <div className="sidebar-section sidebar-chat-section">
                <div className="sidebar-section-header-wrapper">
                    <button
                        type="button"
                        className="sidebar-section-toggle-btn"
                        onClick={() => setIsChatExpanded(!isChatExpanded)}
                        aria-expanded={isChatExpanded}
                    >
                        {isChatExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <MessageSquare className="w-4 h-4 text-sky-400" />
                        <span>Room Chat</span>
                    </button>
                </div>

                {isChatExpanded && (
                    <div className="sidebar-chat-container">
                        <div ref={chatContainerRef} className="chat-messages-scroll-area">
                            {messages.map((m) => (
                                <div 
                                    key={m.id || `msg-${m.sender}-${m.timestamp || m.content}`} 
                                    className={`chat-bubble-wrapper ${m.sender === username ? 'outgoing' : 'incoming'}`}
                                >
                                    <span className="chat-sender-label">{m.sender}</span>
                                    <div className="chat-bubble-content">{m.content}</div>
                                </div>
                            ))}
                            {typingUsers.length > 0 && (
                                <div className="chat-typing-indicator">
                                    {typingUsers.join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing...
                                </div>
                            )}
                        </div>

                        <div className="chat-input-bar">
                            <input
                                type="text"
                                className="chat-text-input"
                                value={chatMsg}
                                onChange={handleTypingChange}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        sendChat();
                                    }
                                }}
                                placeholder="Send a message..."
                            />
                            <button
                                type="button"
                                className="chat-send-btn"
                                onClick={sendChat}
                                title="Send Message"
                                aria-label="Send Message"
                            >
                                <Send className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Workspace Action Buttons */}
            <div className="sidebar-footer-controls">
                <button
                    type="button"
                    className="sidebar-footer-btn"
                    onClick={copyRoomLink}
                >
                    <Share2 className="w-4 h-4 mr-2 text-indigo-400" />
                    <span>Invite Link</span>
                </button>
                <button
                    type="button"
                    className="sidebar-footer-btn leave-btn"
                    onClick={() => setIsLeaveModalOpen(true)}
                >
                    <LogOut className="w-4 h-4 mr-2 text-rose-400" />
                    <span>Leave</span>
                </button>
            </div>
        </aside>
    );
};

export default EditorSidebar;