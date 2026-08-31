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
  AlertTriangle
} from 'lucide-react';
import { MOCK_PROBLEMS, getExtension } from '../editorConstants';

const getDifficultyStyle = (difficulty) => {
  switch (difficulty) {
    case 'Easy':
      return {
        backgroundColor: 'rgba(16,185,129,0.15)',
        color: '#34d399'
      };
    case 'Medium':
      return {
        backgroundColor: 'rgba(245,158,11,0.15)',
        color: '#fbbf24'
      };
    default:
      return {
        backgroundColor: 'rgba(244,63,94,0.15)',
        color: '#f87171'
      };
  }
};

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
        <div className="modal-overlay">
          <dialog open className="custom-modal modal-large" aria-labelledby="modal-question-bank-title">
            <div className="modal-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen className="w-5 h-5 text-amber-400" />
                <h3 id="modal-question-bank-title">Interview Question Bank</h3>
              </div>
              <button 
                type="button" 
                className="btn-glass btn-glass-icon" 
                onClick={() => setIsQuestionBankOpen(false)}
                aria-label="Close question bank modal"
              >
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
                    .map((problem) => {
                      const diffStyle = getDifficultyStyle(problem.difficulty);
                      return (
                        <tr key={problem.id} style={{ borderBottom: '1px solid var(--border-editor)' }}>
                          <td style={{ padding: '14px 18px', color: '#f1f5f9', fontWeight: '600', whiteSpace: 'nowrap' }}>{problem.title}</td>
                          <td style={{ padding: '14px 18px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{problem.topic}</td>
                          <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                            <span style={{ 
                              padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase',
                              backgroundColor: diffStyle.backgroundColor,
                              color: diffStyle.color
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
                                type="button"
                                className="btn-solid-emerald" 
                                style={{ height: '30px', minHeight: '30px', padding: '0 14px', fontSize: '0.78rem' }} 
                                onClick={() => handlePushProblem(problem.id)}
                              >
                                Push to Room
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Candidate's editor updates in real time.</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                {currentProblem && (
                  <button type="button" className="btn-glass" onClick={handleClearProblem}>Clear Active Problem</button>
                )}
                <button type="button" className="btn-glass" onClick={() => setIsQuestionBankOpen(false)}>Close</button>
              </div>
            </div>
          </dialog>
        </div>
      )}

      {/* 2. LANGUAGE SWITCH WARNING MODAL */}
      {isLangChangeModalOpen && (
        <div className="modal-overlay">
          <dialog open className="custom-modal" aria-labelledby="modal-lang-title">
            <div className="modal-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 id="modal-lang-title">Change File Language</h3>
              </div>
              <button 
                type="button" 
                className="btn-glass btn-glass-icon" 
                onClick={() => setIsLangChangeModalOpen(false)}
                aria-label="Close language change modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="modal-sub">
              You have written or modified code in <strong>{activeFile}</strong>. 
              <br /><br />
              Switching the language to <strong style={{ color: '#38bdf8', textTransform: 'capitalize' }}>{pendingLangChange}</strong> will overwrite the current file content with the default {pendingLangChange} template.
            </p>
            <div className="modal-actions" style={{ marginTop: '10px' }}>
              <button type="button" className="btn-glass" onClick={() => setIsLangChangeModalOpen(false)}>
                Keep Current Code
              </button>
              <button type="button" className="btn-danger-action" onClick={confirmLanguageChange}>
                Switch & Overwrite
              </button>
            </div>
          </dialog>
        </div>
      )}

      {/* 3. SECRETS MODAL */}
      {isSecretsModalOpen && (
        <div className="modal-overlay">
          <dialog open className="custom-modal" aria-labelledby="modal-secrets-title">
            <div className="modal-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key className="w-5 h-5 text-emerald-400" />
                <h3 id="modal-secrets-title">Environment Secrets</h3>
              </div>
              <button 
                type="button" 
                className="btn-glass btn-glass-icon" 
                onClick={() => setIsSecretsModalOpen(false)}
                aria-label="Close secrets modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="modal-sub">
              Key-value pairs injected securely into the Docker runtime during code execution.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
              {secrets.map((secret, index) => {
                const uniqueSecretKey = `secret-field-${secret.key || index}`;
                return (
                  <div key={uniqueSecretKey} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                      type="button"
                      className="btn-glass btn-glass-icon" 
                      onClick={() => { 
                        const n = secrets.filter((_, i) => i !== index); 
                        setSecrets(n.length ? n : [{ key: '', value: '' }]); 
                      }}
                      style={{ color: '#f87171' }}
                      aria-label={`Delete secret variable at index ${index}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
            
            <button 
              type="button"
              className="btn-glass" 
              onClick={() => setSecrets([...secrets, { key: '', value: '' }])} 
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Plus className="w-4 h-4" />
              <span>Add Variable</span>
            </button>
            
            <div className="modal-actions">
              <button type="button" className="btn-glass" onClick={() => setIsSecretsModalOpen(false)}>Cancel</button>
              <button type="button" className="btn-solid-emerald" onClick={() => { toast.success("Secrets stored for execution session"); setIsSecretsModalOpen(false); }}>Save Secrets</button>
            </div>
          </dialog>
        </div>
      )}

      {/* 4. ADD FILE MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <dialog open className="custom-modal" aria-labelledby="modal-add-file-title">
            <div className="modal-header-row">
              <h3 id="modal-add-file-title">Create New File</h3>
              <button 
                type="button" 
                className="btn-glass btn-glass-icon" 
                onClick={() => setIsModalOpen(false)}
                aria-label="Close add file modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="modal-field">
              <label htmlFor="modal-file-lang-select">Language</label>
              <select 
                id="modal-file-lang-select"
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
              <label htmlFor="modal-file-path-input">File Path</label>
              <input 
                id="modal-file-path-input"
                type="text" 
                className="modern-input" 
                value={newFileName} 
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder={`e.g. src/Solution.${getExtension(newFileLang)}`} 
                onKeyDown={(e) => e.key === 'Enter' && handleCreateNewFile()} 
                autoFocus 
              />
            </div>
            
            <button 
              type="button"
              className="btn-solid-emerald" 
              style={{ width: '100%', marginTop: '6px' }} 
              onClick={handleCreateNewFile}
            >
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
            <button 
              type="button" 
              className="btn-glass" 
              style={{ width: '100%', display: 'flex', gap: '8px' }} 
              onClick={() => fileInputRef.current.click()}
            >
              <Upload className="w-4 h-4" />
              <span>Upload Local Source Files</span>
            </button>
          </dialog>
        </div>
      )}

      {/* 5. DELETE FILE MODAL */}
      {isDeleteModalOpen && (
        <div className="modal-overlay">
          <dialog open className="custom-modal" aria-labelledby="modal-delete-file-title">
            <div className="modal-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <h3 id="modal-delete-file-title">Delete File</h3>
              </div>
              <button 
                type="button" 
                className="btn-glass btn-glass-icon" 
                onClick={() => setIsDeleteModalOpen(false)}
                aria-label="Close delete file modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="modal-sub">
              Are you sure you want to delete <strong>{fileToDelete}</strong>? This file will be removed for everyone in this room.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn-glass" onClick={() => setIsDeleteModalOpen(false)}>Cancel</button>
              <button type="button" className="btn-danger-action" onClick={confirmDeleteFile}>Delete File</button>
            </div>
          </dialog>
        </div>
      )}

      {/* 6. LEAVE CONFIRMATION MODAL */}
      {isLeaveModalOpen && (
        <div className="modal-overlay">
          <dialog open className="custom-modal" aria-labelledby="modal-leave-title">
            <div className="modal-header-row">
              <h3 id="modal-leave-title">Leave Workspace</h3>
              <button 
                type="button" 
                className="btn-glass btn-glass-icon" 
                onClick={() => setIsLeaveModalOpen(false)}
                aria-label="Close leave modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="modal-sub">
              Would you like to save this workspace to the cloud before exiting? Temporary rooms without saved files will be discarded.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              <button 
                type="button"
                className="btn-solid-emerald" 
                style={{ width: '100%' }} 
                onClick={async () => { 
                  await saveWorkspace(); 
                  navigate('/'); 
                }}
              >
                Save to Cloud & Exit
              </button>
              
              <button 
                type="button"
                className="btn-danger-action" 
                style={{ width: '100%' }} 
                onClick={async () => {
                  try {
                    await axios.delete(`${API_BASE_URL}/api/workspace/${roomId}/delete?username=${encodeURIComponent(username)}`);
                    toast.success("Workspace discarded");
                  } catch (e) { 
                    console.warn("Failed to discard workspace:", e); 
                  }
                  navigate('/');
                }}
              >
                Discard & Exit
              </button>
              
              <button 
                type="button"
                className="btn-glass" 
                style={{ width: '100%' }} 
                onClick={() => setIsLeaveModalOpen(false)}
              >
                Stay in Workspace
              </button>
            </div>
          </dialog>
        </div>
      )}
    </>
  );
};

export default EditorModals;