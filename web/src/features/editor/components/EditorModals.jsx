import React from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
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
    confirmDeleteFile
}) => {
    return (
        <>
            {/* QUESTION BANK MODAL */}
            {isQuestionBankOpen && isHost && (
                <div className="modal-overlay" style={{ zIndex: 3000 }}>
                    <div className="custom-modal" style={{ width: '700px', maxWidth: '95%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                    <polyline points="10 9 9 9 8 9"></polyline>
                                </svg>
                                Interview Question Bank
                            </h3>
                            <button className="btn btn-icon" onClick={() => setIsQuestionBankOpen(false)} style={{ background: 'transparent', color: 'var(--text-muted)' }}>&times;</button>
                        </div>
                        
                        <div style={{ marginBottom: '15px' }}>
                            <input 
                                type="text" 
                                className="modern-input" 
                                placeholder="Search problems by title or topic..." 
                                value={problemSearch}
                                onChange={(e) => setProblemSearch(e.target.value)}
                            />
                        </div>

                        <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-dark)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ backgroundColor: 'rgba(255,255,255,0.05)', textAlign: 'left', color: 'var(--text-muted)' }}>
                                        <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>Title</th>
                                        <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>Topic</th>
                                        <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>Difficulty</th>
                                        <th style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.values(MOCK_PROBLEMS)
                                        .filter(p => p.title.toLowerCase().includes(problemSearch.toLowerCase()) || p.topic.toLowerCase().includes(problemSearch.toLowerCase()))
                                        .map((problem) => (
                                        <tr key={problem.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }} 
                                            onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'} 
                                            onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <td style={{ padding: '12px 15px', color: '#e1e4e8', fontWeight: '500' }}>{problem.title}</td>
                                            <td style={{ padding: '12px 15px', color: 'var(--text-muted)' }}>{problem.topic}</td>
                                            <td style={{ padding: '12px 15px' }}>
                                                <span style={{ 
                                                    padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase',
                                                    backgroundColor: problem.difficulty === 'Easy' ? 'rgba(46,160,67,0.15)' : problem.difficulty === 'Medium' ? 'rgba(210,153,34,0.15)' : 'rgba(218,54,51,0.15)',
                                                    color: problem.difficulty === 'Easy' ? '#3fb950' : problem.difficulty === 'Medium' ? '#d29922' : '#da3633'
                                                }}>
                                                    {problem.difficulty}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 15px', textAlign: 'right' }}>
                                                {currentProblem?.id === problem.id ? (
                                                    <span style={{ fontSize: '0.8rem', color: '#3fb950', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px' }}>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="20 6 9 17 4 12"></polyline>
                                                        </svg> 
                                                        Active
                                                    </span>
                                                ) : (
                                                    <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handlePushProblem(problem.id)}>
                                                        Push to Room
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Candidate's editor will update instantly.</p>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {currentProblem && (
                                    <button className="btn btn-secondary" onClick={handleClearProblem}>
                                        Clear Active Problem
                                    </button>
                                )}
                                <button className="btn btn-secondary" onClick={() => setIsQuestionBankOpen(false)}>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* LEAVE CONFIRMATION MODAL */}
            {isLeaveModalOpen && (
                <div className="modal-overlay" style={{ zIndex: 2000 }}>
                    <div className="custom-modal" style={{ width: '420px' }}>
                        <h3 style={{ margin: '0 0 15px 0' }}>Leave Workspace</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: '5px 0 20px 0', lineHeight: '1.5' }}>
                            Do you want to explicitly save this workspace to the cloud before you leave? <br/><br/>
                            If you leave without saving, this temporary room and all its files will be permanently discarded.
                        </p>
                        <div className="modal-actions" style={{ flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                            <button className="btn btn-primary" style={{ width: '100%', padding: '12px' }} onClick={async () => { 
                                await saveWorkspace(); 
                                navigate('/'); 
                            }}>
                                Save & Leave
                            </button>
                            
                            <button className="btn btn-danger" style={{ width: '100%', padding: '12px' }} onClick={async () => {
                                try {
                                    await axios.delete(`${API_BASE_URL}/api/workspace/${roomId}/delete?username=${encodeURIComponent(username)}`);
                                    toast.success("Temporary workspace discarded.");
                                } catch (e) { 
                                    console.error(e); 
                                }
                                navigate('/');
                            }}>
                                Leave Without Saving (Discard Room)
                            </button>
                            
                            <button className="btn btn-secondary" style={{ width: '100%', padding: '12px' }} onClick={() => setIsLeaveModalOpen(false)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SECRETS MODAL */}
            {isSecretsModalOpen && (
                <div className="modal-overlay">
                    <div className="custom-modal" style={{ width: '450px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                </svg>
                                Environment Secrets
                            </h3>
                            <button className="btn btn-icon" onClick={() => setIsSecretsModalOpen(false)} style={{ background: 'transparent', color: 'var(--text-muted)' }}>&times;</button>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.4' }}>
                            Add environment variables here. They will be securely injected when you run your code and won't be saved in your files.
                        </p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', marginBottom: '15px', paddingRight: '5px' }}>
                            {secrets.map((secret, index) => (
                                <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input 
                                        type="text" 
                                        className="modal-input modern-input" 
                                        placeholder="KEY" 
                                        value={secret.key}
                                        onChange={(e) => { 
                                            const n = [...secrets]; 
                                            n[index].key = e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''); 
                                            setSecrets(n); 
                                        }}
                                        style={{ flex: 1, fontSize: '0.85rem' }} 
                                    />
                                    <input 
                                        type="password" 
                                        className="modal-input modern-input" 
                                        placeholder="VALUE" 
                                        value={secret.value}
                                        onChange={(e) => { 
                                            const n = [...secrets]; 
                                            n[index].value = e.target.value; 
                                            setSecrets(n); 
                                        }}
                                        style={{ flex: 1, fontSize: '0.85rem' }} 
                                    />
                                    <button 
                                        className="btn btn-icon" 
                                        onClick={() => { 
                                            const n = secrets.filter((_, i) => i !== index); 
                                            setSecrets(n.length ? n : [{ key: '', value: '' }]); 
                                        }}
                                        style={{ color: '#ff6b6b', background: 'transparent', padding: '4px' }}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                        
                        <button className="btn btn-secondary" onClick={() => setSecrets([...secrets, { key: '', value: '' }])} style={{ width: '100%', marginBottom: '20px', fontSize: '0.85rem' }}>
                            + Add Variable
                        </button>
                        
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setIsSecretsModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={() => { toast.success("Secrets ready!", { icon: '🔐' }); setIsSecretsModalOpen(false); }}>Done</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD FILE MODAL */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="custom-modal">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0 }}>Add File</h3>
                            <button className="btn btn-icon" onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', color: 'var(--text-muted)' }}>&times;</button>
                        </div>

                        <div className="modal-field">
                            <label>Language</label>
                            <select 
                                className="modal-input modern-input" 
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
                            <label>File Name</label>
                            <input 
                                type="text" 
                                className="modal-input modern-input" 
                                value={newFileName} 
                                onChange={(e) => setNewFileName(e.target.value)}
                                placeholder={`e.g. src/utils/script.${getExtension(newFileLang)}`} 
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateNewFile()} 
                                autoFocus 
                            />
                        </div>
                        
                        <div className="modal-actions" style={{ marginBottom: '15px' }}>
                            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleCreateNewFile}>
                                Create New File
                            </button>
                        </div>

                        <div style={{ margin: '15px 0', borderBottom: '1px solid var(--border)', textAlign: 'center', lineHeight: '0.1em' }}>
                            <span style={{ background: 'var(--bg-overlay)', padding: '0 10px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>OR</span>
                        </div>

                        <div className="modal-field" style={{ textAlign: 'center' }}>
                            <input 
                                type="file" 
                                multiple 
                                accept=".java,.py,.cpp,.js,.ts,.go,.rs,.md,.txt"
                                ref={fileInputRef} 
                                style={{ display: 'none' }} 
                                onChange={handleFileUpload} 
                            />
                            <button className="btn btn-secondary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }} onClick={() => fileInputRef.current.click()}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="17 8 12 3 7 8"></polyline>
                                    <line x1="12" y1="3" x2="12" y2="15"></line>
                                </svg>
                                Upload File(s) from Computer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE FILE MODAL */}
            {isDeleteModalOpen && (
                <div className="modal-overlay">
                    <div className="custom-modal">
                        <h3>Delete File</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '5px 0 15px 0', lineHeight: '1.4' }}>
                            Are you sure you want to delete <strong>{fileToDelete}</strong>?<br/><br/>
                            This action cannot be undone and will delete the file for everyone in the room.
                        </p>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>Cancel</button>
                            <button className="btn btn-danger" onClick={confirmDeleteFile}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default EditorModals;