import React from 'react';
import { 
  Code2, 
  X, 
  ChevronRight, 
  FolderTree, 
  Users, 
  MessageSquare, 
  Send, 
  Copy, 
  LogOut,
  Plus
} from 'lucide-react';
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
  canEdit,
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
  setIsModalOpen,
  navigate
}) => {
  return (
    <div className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="editor-brand-badge">
          <Code2 className="w-4 h-4" />
          <span>Vylop</span>
        </div>
        <button className="btn-glass btn-glass-icon" onClick={() => setIsSidebarOpen(false)}>
          <X className="w-4 h-4" />
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* 1. Files Explorer */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: isExplorerExpanded ? '1 1 0%' : '0 0 auto', minHeight: 0 }}>
          <div 
            className="sidebar-section-header"
            onClick={() => setIsExplorerExpanded(!isExplorerExpanded)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExplorerExpanded ? 'rotate-90' : ''}`} />
              <FolderTree className="w-3.5 h-3.5" />
              <span>Explorer</span>
            </div>
            {canEdit && (
              <button 
                className="btn-glass btn-glass-icon" 
                style={{ width: '22px', height: '22px', padding: 0 }}
                onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}
                title="Add New File"
              >
                <Plus className="w-3 h-3" />
              </button>
            )}
          </div>
          {isExplorerExpanded && (
            <div style={{ overflowY: 'auto', flex: 1, padding: '4px 10px 10px 10px' }}>
              <FileExplorer files={files} activeFile={activeFile} onFileClick={handleFileOpen} />
            </div>
          )}
        </div>

        {/* 2. Online Users */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: isOnlineExpanded ? '0 1 auto' : '0 0 auto', maxHeight: '35%', minHeight: 0 }}>
          <div 
            className="sidebar-section-header"
            onClick={() => setIsOnlineExpanded(!isOnlineExpanded)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isOnlineExpanded ? 'rotate-90' : ''}`} />
              <Users className="w-3.5 h-3.5" />
              <span>Online ({users.length})</span>
            </div>
            <span className={`status-dot ${wsConnected ? 'connected' : 'disconnected'}`}></span>
          </div>
          {isOnlineExpanded && (
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 14px' }}>
              {users.map((u, i) => (
                <div key={i} className="user-card-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: getUserColor(u.username), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: '#fff', fontSize: '13px' }}>
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.username}
                      </span>
                      <span className={`user-role-badge ${u.role === 'HOST' ? 'role-host' : u.role === 'EDITOR' ? 'role-editor' : 'role-readonly'}`}>
                        {u.role}
                      </span>
                    </div>
                  </div>
                  {isHost && u.username !== username && (
                    <div style={{ display: 'flex', gap: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      {u.role === 'READ_ONLY'
                        ? <button onClick={() => changeUserRole(u.username, 'EDITOR')} className="btn-glass" style={{ flex: 1, height: '26px', fontSize: '0.72rem' }}>Promote</button>
                        : <button onClick={() => changeUserRole(u.username, 'READ_ONLY')} className="btn-glass" style={{ flex: 1, height: '26px', fontSize: '0.72rem' }}>Demote</button>
                      }
                      <button onClick={() => kickTargetUser(u.username)} className="btn-glass" style={{ height: '26px', fontSize: '0.72rem', color: '#f87171' }}>Kick</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Live Chat */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: isChatExpanded ? '1 1 0%' : '0 0 auto', minHeight: 0 }}>
          <div 
            className="sidebar-section-header"
            onClick={() => setIsChatExpanded(!isChatExpanded)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isChatExpanded ? 'rotate-90' : ''}`} />
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Workspace Chat</span>
            </div>
          </div>
          {isChatExpanded && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div className="chat-messages" ref={chatContainerRef}>
                {messages.map((msg, i) => (
                  <div key={i} className={`message ${msg.sender === username ? 'self' : 'other'}`}>
                    <span className="msg-meta">{msg.sender}</span>
                    <div className="msg-bubble">{msg.content}</div>
                  </div>
                ))}
              </div>
              {typingUsers.length > 0 && (
                <div style={{ padding: '0 14px 4px', fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic' }}>
                  {typingUsers.join(', ')} typing...
                </div>
              )}
              <div className="chat-input-area">
                <input 
                  className="dash-styled-input" 
                  style={{ height: '34px', padding: '0 12px', fontSize: '0.85rem' }}
                  value={chatMsg} 
                  onChange={handleTypingChange} 
                  onKeyDown={(e) => e.key === 'Enter' && sendChat()} 
                  placeholder="Send a message..." 
                />
                <button className="btn-glass btn-glass-icon" onClick={sendChat}>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Footer Controls */}
      <div style={{ flexShrink: 0, borderTop: '1px solid var(--border-editor)', padding: '12px 14px', display: 'flex', gap: '8px' }}>
        <button className="btn-glass" style={{ flex: 1 }} onClick={copyRoomLink}>
          <Copy className="w-3.5 h-3.5 mr-1.5" />
          <span>Copy Link</span>
        </button>
        <button className="btn-glass" style={{ color: '#f87171' }} onClick={() => isHost ? setIsLeaveModalOpen(true) : navigate('/')}>
          <LogOut className="w-3.5 h-3.5 mr-1.5" />
          <span>Leave</span>
        </button>
      </div>
    </div>
  );
};

export default EditorSidebar;