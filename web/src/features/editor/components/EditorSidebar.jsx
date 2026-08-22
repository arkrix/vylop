import React from 'react';
import FileExplorer from '../FileExplorer';

const EditorSidebar = ({
    isSidebarOpen,
    setIsSidebarOpen,
    isExplorerExpanded,
    setIsExplorerExpanded,
    files,
    activeFile,
    handleFileOpen,
    isOnlineExpanded,
    setIsOnlineExpanded,
    users,
    wsConnected,
    getUserColor,
    isHost,
    username,
    changeUserRole,
    kickTargetUser,
    isChatExpanded,
    setIsChatExpanded,
    messages,
    chatContainerRef,
    typingUsers,
    chatMsg,
    handleTypingChange,
    sendChat,
    copyRoomLink,
    setIsLeaveModalOpen,
    navigate
}) => {
    return (
        <div className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="sidebar-header" style={{ flexShrink: 0 }}>
                <div className="brand-logo">
                    <span className="brand-prompt">&gt;</span><span>Vylop</span><span className="brand-cursor"></span>
                </div>
                <button className="btn btn-secondary btn-icon" onClick={() => setIsSidebarOpen(false)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div style={{ padding: '12px 15px 4px', fontSize: '0.7rem', color: '#8b949e', letterSpacing: '1px', flexShrink: 0 }}>
                EXPLORER
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Files Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: isExplorerExpanded ? '1 1 0%' : '0 0 auto', minHeight: 0 }}>
                    <div 
                        onClick={() => setIsExplorerExpanded(!isExplorerExpanded)}
                        style={{ padding: '4px 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--text-main)', letterSpacing: '0.5px', textTransform: 'uppercase', userSelect: 'none' }}
                    >
                        <svg style={{ marginRight: '4px', transform: isExplorerExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.1s' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                        FILES
                    </div>
                    {isExplorerExpanded && (
                        <div style={{ overflowY: 'auto', flex: 1, paddingBottom: '10px' }}>
                            <FileExplorer files={files} activeFile={activeFile} onFileClick={handleFileOpen} />
                        </div>
                    )}
                </div>

                {/* Online Users Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: isOnlineExpanded ? '0 1 auto' : '0 0 auto', maxHeight: '35%', minHeight: 0 }}>
                    <div 
                        onClick={() => setIsOnlineExpanded(!isOnlineExpanded)}
                        style={{ padding: '4px 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--text-main)', letterSpacing: '0.5px', textTransform: 'uppercase', userSelect: 'none', borderTop: '1px solid transparent' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <svg style={{ marginRight: '4px', transform: isOnlineExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.1s' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                            ONLINE ({users.length})
                        </div>
                        <span className={`status-dot ${wsConnected ? 'connected' : 'disconnected'}`}></span>
                    </div>
                    {isOnlineExpanded && (
                        <div className="users-container" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 15px' }}>
                            {users.map((u, i) => (
                                <div key={i} style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '30px', height: '30px', borderRadius: '6px', backgroundColor: getUserColor(u.username), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff', fontSize: '14px', flexShrink: 0 }}>
                                            {u.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#e1e4e8', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {u.username}
                                                </span>
                                                <span style={{ width: '6px', height: '6px', backgroundColor: '#2ea043', borderRadius: '50%', flexShrink: 0 }}></span>
                                            </div>
                                            <span style={{ fontSize: '0.6rem', fontWeight: '700', padding: '2px 4px', borderRadius: '3px', backgroundColor: u.role === 'HOST' ? 'rgba(210,153,34,0.15)' : u.role === 'EDITOR' ? 'rgba(46,160,67,0.15)' : 'rgba(139,148,158,0.15)', color: u.role === 'HOST' ? '#d29922' : u.role === 'EDITOR' ? '#3fb950' : '#8b949e' }}>
                                                {u.role}
                                            </span>
                                        </div>
                                    </div>
                                    {isHost && u.username !== username && (
                                        <div style={{ display: 'flex', gap: '6px', paddingTop: '8px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                                            {u.role === 'READ_ONLY'
                                                ? <button onClick={() => changeUserRole(u.username, 'EDITOR')} style={{ flex: 1, fontSize: '0.7rem', padding: '4px', background: 'rgba(46,160,67,0.1)', color: '#3fb950', border: '1px solid rgba(46,160,67,0.3)', borderRadius: '4px', cursor: 'pointer' }}>↑ Promote</button>
                                                : <button onClick={() => changeUserRole(u.username, 'READ_ONLY')} style={{ flex: 1, fontSize: '0.7rem', padding: '4px', background: 'rgba(210,153,34,0.1)', color: '#d29922', border: '1px solid rgba(210,153,34,0.3)', borderRadius: '4px', cursor: 'pointer' }}>↓ Demote</button>
                                            }
                                            <button onClick={() => kickTargetUser(u.username)} style={{ flex: 0.6, fontSize: '0.7rem', padding: '4px', background: 'rgba(218,54,51,0.1)', color: '#da3633', border: '1px solid rgba(218,54,51,0.3)', borderRadius: '4px', cursor: 'pointer' }}>✕ Kick</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Chat Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: isChatExpanded ? '1 1 0%' : '0 0 auto', minHeight: 0 }}>
                    <div 
                        onClick={() => setIsChatExpanded(!isChatExpanded)}
                        style={{ padding: '4px 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--text-main)', letterSpacing: '0.5px', textTransform: 'uppercase', userSelect: 'none', borderTop: '1px solid transparent' }}
                    >
                        <svg style={{ marginRight: '4px', transform: isChatExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.1s' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                        CHAT
                    </div>
                    {isChatExpanded && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <div className="chat-messages" ref={chatContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '10px 15px' }}>
                                {messages.map((msg, i) => (
                                    <div key={i} className={`message ${msg.sender === username ? 'self' : 'other'}`}>
                                        <span className="msg-meta">{msg.sender}</span>
                                        <div className="msg-bubble">{msg.content}</div>
                                    </div>
                                ))}
                            </div>
                            {typingUsers.length > 0 && (
                                <div style={{ padding: '0 15px 5px', fontSize: '0.75rem', color: '#8b949e', fontStyle: 'italic', flexShrink: 0 }}>
                                    {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                                </div>
                            )}
                            <div className="chat-input-area" style={{ padding: '10px 15px', flexShrink: 0 }}>
                                <input 
                                    className="modern-input" 
                                    value={chatMsg} 
                                    onChange={handleTypingChange} 
                                    onKeyDown={(e) => e.key === 'Enter' && sendChat()} 
                                    placeholder="Type a message..." 
                                />
                                <button className="btn btn-primary btn-icon" onClick={sendChat}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div style={{ flexShrink: 0, marginTop: 'auto', borderTop: '1px solid var(--border)', padding: '15px', display: 'flex', gap: '10px' }}>
                <button className="btn btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }} onClick={copyRoomLink}>
                    Copy Link
                </button>
                <button className="btn btn-danger" style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }} onClick={() => isHost ? setIsLeaveModalOpen(true) : navigate('/')}>
                    Leave
                </button>
            </div>
        </div>
    );
};

export default EditorSidebar;