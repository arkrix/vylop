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
import FileExplorer from '../FileExplorer';

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
        <span className="user-role-badge role-readonly">
            <Eye className="w-3 h-3 mr-1 text-blue-400" />
            <span>Viewer</span>
        </span>
    );
};

const CollaboratorList = (props) => {
    const { users, username, getUserColor, isHost, changeUserRole, kickTargetUser } = props;

    return (
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
    );
};

const ChatMessagesPane = (props) => {
    const { messages, username, chatContainerRef, typingUsers, chatMsg, handleTypingChange, sendChat } = props;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <div ref={chatContainerRef} className="chat-messages">
                {messages.map((m) => (
                    <div 
                        key={m.id || `msg-${m.sender}-${m.timestamp || m.content}`} 
                        className={`message ${m.sender === username ? 'self' : 'other'}`}
                    >
                        <span className="msg-meta">{m.sender}</span>
                        <div className="msg-bubble">{m.content}</div>
                    </div>
                ))}
            </div>

            {typingUsers.length > 0 && (
                <div className="chat-typing">
                    {typingUsers.join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing...
                </div>
            )}

            <div className="chat-input-area">
                <input
                    type="text"
                    className="chat-input"
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
    );
};

const EditorSidebar = (props) => {
    const {
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
    } = props;

    if (!isSidebarOpen) return null;

    return (
        <aside className="sidebar">
            {/* Explorer Header */}
            <div className="sidebar-section-header">
                <button
                    type="button"
                    className="sidebar-section-toggle-btn"
                    onClick={() => setIsExplorerExpanded(!isExplorerExpanded)}
                    aria-expanded={isExplorerExpanded}
                >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        {isExplorerExpanded ? (
                            <ChevronDown style={{ width: 14, height: 14, flexShrink: 0 }} />
                        ) : (
                            <ChevronRight style={{ width: 14, height: 14, flexShrink: 0, color: '#fbbf24' }} />
                        )}
                        <Folder style={{ width: 14, height: 14, flexShrink: 0, color: '#fbbf24' }} />
                    </span>
                    <span>Explorer</span>
                </button>
                {canEdit && (
                    <button
                        type="button"
                        className="sidebar-action-icon-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsModalOpen(true);
                        }}
                        title="New File"
                        aria-label="New File"
                    >
                        <Plus style={{ width: 14, height: 14 }} />
                    </button>
                )}
            </div>

            {isExplorerExpanded && (
                <div style={{ flexShrink: 0, overflowY: 'auto' }}>
                    <FileExplorer
                        files={files}
                        activeFile={activeFile}
                        onFileSelect={handleFileOpen}
                        canEdit={canEdit}
                    />
                </div>
            )}

            {/* Online Collaborators Header */}
            <div className="sidebar-section-header">
                <button
                    type="button"
                    className="sidebar-section-toggle-btn"
                    onClick={() => setIsOnlineExpanded(!isOnlineExpanded)}
                    aria-expanded={isOnlineExpanded}
                >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        {isOnlineExpanded ? (
                            <ChevronDown style={{ width: 14, height: 14, flexShrink: 0 }} />
                        ) : (
                            <ChevronRight style={{ width: 14, height: 14, flexShrink: 0, color: '#34d399' }} />
                        )}
                        <Users style={{ width: 14, height: 14, flexShrink: 0, color: '#34d399' }} />
                    </span>
                    <span>Online Users ({users.length})</span>
                </button>
                <span className={`status-dot ${wsConnected ? 'connected' : 'disconnected'}`} title={wsConnected ? 'Connected' : 'Disconnected'} />
            </div>

            {isOnlineExpanded && (
                <CollaboratorList 
                    users={users}
                    username={username}
                    getUserColor={getUserColor}
                    isHost={isHost}
                    changeUserRole={changeUserRole}
                    kickTargetUser={kickTargetUser}
                />
            )}

            {/* Chat Room Header */}
            <div className="sidebar-section-header">
                <button
                    type="button"
                    className="sidebar-section-toggle-btn"
                    onClick={() => setIsChatExpanded(!isChatExpanded)}
                    aria-expanded={isChatExpanded}
                >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        {isChatExpanded ? (
                            <ChevronDown style={{ width: 14, height: 14, flexShrink: 0 }} />
                        ) : (
                            <ChevronRight style={{ width: 14, height: 14, flexShrink: 0, color: '#38bdf8' }} />
                        )}
                        <MessageSquare style={{ width: 14, height: 14, flexShrink: 0, color: '#38bdf8' }} />
                    </span>
                    <span>Room Chat</span>
                </button>
            </div>

            {isChatExpanded && (
                <ChatMessagesPane 
                    messages={messages}
                    username={username}
                    chatContainerRef={chatContainerRef}
                    typingUsers={typingUsers}
                    chatMsg={chatMsg}
                    handleTypingChange={handleTypingChange}
                    sendChat={sendChat}
                />
            )}

            {/* Footer Controls */}
            <div className="sidebar-footer">
                <button
                    type="button"
                    className="sidebar-footer-btn"
                    onClick={copyRoomLink}
                >
                    <Share2 className="w-4 h-4 text-indigo-400" />
                    <span>Invite Link</span>
                </button>
                <button
                    type="button"
                    className="sidebar-footer-btn leave-btn"
                    onClick={() => setIsLeaveModalOpen(true)}
                >
                    <LogOut className="w-4 h-4 text-rose-400" />
                    <span>Leave</span>
                </button>
            </div>
        </aside>
    );
};

export default EditorSidebar;