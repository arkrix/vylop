import React from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { 
  X, 
  Key, 
  Plus, 
  Trash2, 
  Upload, 
  BookOpen, 
  CheckCircle2, 
  AlertTriangle,
  Code2
} from 'lucide-react';
import { MOCK_PROBLEMS, getExtension } from '../editorConstants';

const EditorModals = ({
  isQuestionBankOpen,
  setIsQuestionBankOpen,
  isHost,
  problemSearch,
  setProblemSearch,
  currentProblem,
  handlePushProblem,
  handleClearProblem,
  isLeaveModalOpen,
  setIsLeaveModalOpen,
  saveWorkspace,
  navigate,
  roomId,
  username,
  API_BASE_URL,
  isSecretsModalOpen,
  setIsSecretsModalOpen,
  secrets,
  setSecrets,
  isModalOpen,
  setIsModalOpen,
  newFileLang,
  setNewFileLang,
  newFileName,
  setNewFileName,
  handleCreateNewFile,
  fileInputRef,
  handleFileUpload,
  isDeleteModalOpen,
  setIsDeleteModalOpen,
  fileToDelete,
  confirmDeleteFile,
  isLangChangeModalOpen,
  setIsLangChangeModalOpen,
  pendingLangChange,
  confirmLanguageChange,
  activeFile
}) => {
  return (
    <>
      {/* 1. QUESTION BANK MODAL */}
      {isQuestionBankOpen && isHost && (
        <div className="modal-overlay" onClick={() => setIsQuestionBankOpen(false)}>
          <div className="custom-modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen className="w-5 h-5 text-amber-400" />
                <h3>Interview Question Bank</h3>
              </div>
              <button className="btn-glass btn-glass-icon" onClick={() => setIsQuestionBankOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <input 
              type="text" 
              className="modern-input" 
              placeholder="Search problems by title or algorithm topic..." 
              value={problemSearch}
              onChange={(e) => setProblemSearch(e.target.value)}
            />

            <div style={{ maxHeight: '380px', overflowY: 'auto', border: '1px solid var(--border-editor)', borderRadius: '10px', backgroundColor: '#08090c' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)', textAlign: 'left', color: '#94a3b8' }}>
                    <th style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-editor)', width: '38%' }}>Title</th>
                    <th style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-editor)', width: '28%' }}>Topic</th>
                    <th style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-editor)', width: '16%' }}>Difficulty</th>
                    <th style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-editor)', width: '18%', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(MOCK_PROBLEMS)
                    .filter(p => p.title.toLowerCase().includes(problemSearch.toLowerCase()) || p.topic.toLowerCase().includes(problemSearch.toLowerCase()))
                    .map((problem) => (
                      <tr key={problem.id} style={{ borderBottom: '1px solid var(--border-editor)' }}>
                        <td style={{ padding: '14px 18px', color: '#f1f5f9', fontWeight: '600', whiteSpace: 'nowrap' }}>{problem.title}</td>
                        <td style={{ padding: '14px 18px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{problem.topic}</td>
                        <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                          <span style={{ 
                            padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase',
                            backgroundColor: problem.difficulty === 'Easy' ? 'rgba(16,185,129,0.15)' : problem.difficulty === 'Medium' ? 'rgba(245,158,11,0.15)' : 'rgba(244,63,94,0.15)',
                            color: problem.difficulty === 'Easy' ? '#34d399' : problem.difficulty === 'Medium' ? '#fbbf24' : '#f87171'
                          }}>
                            {problem.difficulty}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {currentProblem?.id === problem.id ? (
                            <span style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                              <CheckCircle2 className="w-4 h-4" /> Active
                            </span>
                          ) : (
                            <button 
                              className="btn-solid-emerald" 
                              style={{ height: '30px', minHeight: '30px', padding: '0 14px', fontSize: '0.78rem' }} 
                              onClick={() => handlePushProblem(problem.id)}
                            >
                              Push to Room
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Candidate's editor updates in real time.</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                {currentProblem && (
                  <button className="btn-glass" onClick={handleClearProblem}>Clear Active Problem</button>
                )}
                <button className="btn-glass" onClick={() => setIsQuestionBankOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. LANGUAGE SWITCH WARNING MODAL */}
      {isLangChangeModalOpen && (
        <div className="modal-overlay" onClick={() => setIsLangChangeModalOpen(false)}>
          <div className="custom-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3>Change File Language</h3>
              </div>
              <button className="btn-glass btn-glass-icon" onClick={() => setIsLangChangeModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="modal-sub">
              You have written or modified code in <strong>{activeFile}</strong>. 
              <br /><br />
              Switching the language to <strong style={{ color: '#38bdf8', textTransform: 'capitalize' }}>{pendingLangChange}</strong> will overwrite the current file content with the default {pendingLangChange} template.
            </p>
            <div className="modal-actions" style={{ marginTop: '10px' }}>
              <button className="btn-glass" onClick={() => setIsLangChangeModalOpen(false)}>
                Keep Current Code
              </button>
              <button className="btn-danger-action" onClick={confirmLanguageChange}>
                Switch & Overwrite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. SECRETS MODAL */}
      {isSecretsModalOpen && (
        <div className="modal-overlay" onClick={() => setIsSecretsModalOpen(false)}>
          <div className="custom-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key className="w-5 h-5 text-emerald-400" />
                <h3>Environment Secrets</h3>
              </div>
              <button className="btn-glass btn-glass-icon" onClick={() => setIsSecretsModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="modal-sub">
              Key-value pairs injected securely into the Docker runtime during code execution.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
              {secrets.map((secret, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    className="modern-input" 
                    placeholder="KEY" 
                    value={secret.key}
                    onChange={(e) => { 
                      const n = [...secrets]; 
                      n[index].key = e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''); 
                      setSecrets(n); 
                    }}
                    style={{ flex: 1 }} 
                  />
                  <input 
                    type="password" 
                    className="modern-input" 
                    placeholder="VALUE" 
                    value={secret.value}
                    onChange={(e) => { 
                      const n = [...secrets]; 
                      n[index].value = e.target.value; 
                      setSecrets(n); 
                    }}
                    style={{ flex: 1 }} 
                  />
                  <button 
                    className="btn-glass btn-glass-icon" 
                    onClick={() => { 
                      const n = secrets.filter((_, i) => i !== index); 
                      setSecrets(n.length ? n : [{ key: '', value: '' }]); 
                    }}
                    style={{ color: '#f87171' }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            
            <button 
              className="btn-glass" 
              onClick={() => setSecrets([...secrets, { key: '', value: '' }])} 
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Plus className="w-4 h-4" />
              <span>Add Variable</span>
            </button>
            
            <div className="modal-actions">
              <button className="btn-glass" onClick={() => setIsSecretsModalOpen(false)}>Cancel</button>
              <button className="btn-solid-emerald" onClick={() => { toast.success("Secrets stored for execution session"); setIsSecretsModalOpen(false); }}>Save Secrets</button>
            </div>
          </div>
        </div>
      )}

      {/* 4. ADD FILE MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="custom-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Create New File</h3>
              <button className="btn-glass btn-glass-icon" onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="modal-field">
              <label>Language</label>
              <select 
                className="modern-input" 
                value={newFileLang} 
                onChange={(e) => { 
                  setNewFileLang(e.target.value); 
                  if (!newFileName || newFileName.includes('.')) {
                    setNewFileName(`src/NewFile.${getExtension(e.target.value)}`); 
                  }
                }}
              >
                <option value="java">Java</option>
                <option value="python">Python</option>
                <option value="cpp">C++</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
                <option value="markdown">Markdown</option>
              </select>
            </div>
            
            <div className="modal-field">
              <label>File Path</label>
              <input 
                type="text" 
                className="modern-input" 
                value={newFileName} 
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder={`e.g. src/Solution.${getExtension(newFileLang)}`} 
                onKeyDown={(e) => e.key === 'Enter' && handleCreateNewFile()} 
                autoFocus 
              />
            </div>
            
            <button className="btn-solid-emerald" style={{ width: '100%', marginTop: '6px' }} onClick={handleCreateNewFile}>
              Create File
            </button>

            <div style={{ display: 'flex', alignItems: 'center', margin: '6px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }}></div>
              <span style={{ padding: '0 10px', color: '#64748b', fontSize: '0.75rem', fontWeight: '700' }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }}></div>
            </div>

            <input 
              type="file" 
              multiple 
              accept=".java,.py,.cpp,.js,.ts,.go,.rs,.md,.txt"
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileUpload} 
            />
            <button className="btn-glass" style={{ width: '100%', display: 'flex', gap: '8px' }} onClick={() => fileInputRef.current.click()}>
              <Upload className="w-4 h-4" />
              <span>Upload Local Source Files</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. DELETE FILE MODAL */}
      {isDeleteModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="custom-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <h3>Delete File</h3>
              </div>
              <button className="btn-glass btn-glass-icon" onClick={() => setIsDeleteModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="modal-sub">
              Are you sure you want to delete <strong>{fileToDelete}</strong>? This file will be removed for everyone in this room.
            </p>
            <div className="modal-actions">
              <button className="btn-glass" onClick={() => setIsDeleteModalOpen(false)}>Cancel</button>
              <button className="btn-danger-action" onClick={confirmDeleteFile}>Delete File</button>
            </div>
          </div>
        </div>
      )}

      {/* 6. LEAVE CONFIRMATION MODAL */}
      {isLeaveModalOpen && (
        <div className="modal-overlay" onClick={() => setIsLeaveModalOpen(false)}>
          <div className="custom-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Leave Workspace</h3>
              <button className="btn-glass btn-glass-icon" onClick={() => setIsLeaveModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="modal-sub">
              Would you like to save this workspace to the cloud before exiting? Temporary rooms without saved files will be discarded.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              <button className="btn-solid-emerald" style={{ width: '100%' }} onClick={async () => { 
                await saveWorkspace(); 
                navigate('/'); 
              }}>
                Save to Cloud & Exit
              </button>
              
              <button className="btn-danger-action" style={{ width: '100%' }} onClick={async () => {
                try {
                  await axios.delete(`${API_BASE_URL}/api/workspace/${roomId}/delete?username=${encodeURIComponent(username)}`);
                  toast.success("Workspace discarded");
                } catch (e) { 
                  console.error(e); 
                }
                navigate('/');
              }}>
                Discard & Exit
              </button>
              
              <button className="btn-glass" style={{ width: '100%' }} onClick={() => setIsLeaveModalOpen(false)}>
                Stay in Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EditorModals;