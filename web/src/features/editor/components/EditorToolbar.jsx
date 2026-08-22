import React from 'react';

const EditorToolbar = ({
    roomName,
    isSidebarOpen,
    setIsSidebarOpen,
    isHost,
    canEdit,
    activeFile,
    files,
    isQuestionBankOpen,
    setIsQuestionBankOpen,
    showMarkdownPreview,
    setShowMarkdownPreview,
    setIsModalOpen,
    setIsSecretsModalOpen,
    isSaving,
    saveWorkspace,
    downloadWorkspace,
    handleDeleteIconClick,
    formatCode,
    isVimMode,
    toggleVimMode,
    editorTheme,
    handleThemeChange,
    handleLanguageSelect,
    isRunning,
    runCode,
    currentProblem,
    isSubmitting,
    handleSubmit,
    getTooltip
}) => {
    return (
        <div className="toolbar">
            <div className="toolbar-group">
                <button className="btn btn-secondary btn-icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-main)' }}>{roomName}</span>
            </div>
            
            <div className="toolbar-group right-controls">
                {isHost && (
                    <button className={`btn btn-icon ${isQuestionBankOpen ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setIsQuestionBankOpen(true)} title="Open Question Bank" style={{ marginRight: '10px' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                    </button>
                )}

                {files[activeFile]?.language === "markdown" && (
                    <button className={`btn btn-icon ${showMarkdownPreview ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowMarkdownPreview(!showMarkdownPreview)} title="Toggle Markdown Preview" style={{ marginRight: '10px' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                )}
                
                <button className={`btn btn-secondary btn-icon ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={() => canEdit && setIsModalOpen(true)} title={!canEdit ? getTooltip('EDITOR') : "Add File"} disabled={!canEdit}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12h14"></path>
                    </svg>
                </button>
                
                <button className={`btn btn-secondary btn-icon ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={() => canEdit && setIsSecretsModalOpen(true)} title={!canEdit ? getTooltip('EDITOR') : "Environment Secrets"} disabled={!canEdit}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                </button>
                
                <button className={`btn btn-secondary btn-icon ${(!isHost || isSaving) ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={() => isHost && saveWorkspace()} disabled={!isHost || isSaving} title={!isHost ? getTooltip('HOST') : "Save to Cloud"}>
                    {isSaving ? (
                        <svg className="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                        </svg>
                    ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2-2z"></path>
                            <polyline points="17 21 17 13 7 13 7 21"></polyline>
                            <polyline points="7 3 7 8 15 8"></polyline>
                        </svg>
                    )}
                </button>
                
                <button className="btn btn-secondary btn-icon" onClick={downloadWorkspace} title="Export as .zip">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                </button>
                
                <div className="toolbar-divider"></div>
                
                <button className={`btn btn-secondary btn-icon ${(!canEdit || !activeFile) ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={(e) => canEdit && activeFile && handleDeleteIconClick(e, activeFile)} disabled={!canEdit || !activeFile} title={!canEdit ? getTooltip('EDITOR') : "Delete Current File"}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
                
                <button className={`btn btn-secondary btn-icon ${(!canEdit || !activeFile) ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={() => canEdit && activeFile && formatCode()} disabled={!canEdit || !activeFile} title={!canEdit ? getTooltip('EDITOR') : "Format Code"}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="21" y1="10" x2="3" y2="10"></line>
                        <line x1="21" y1="6" x2="3" y2="6"></line>
                        <line x1="21" y1="14" x2="3" y2="14"></line>
                        <line x1="21" y1="18" x2="3" y2="18"></line>
                    </svg>
                </button>
                
                <button className={`btn btn-icon ${isVimMode ? 'btn-primary' : 'btn-secondary'}`} onClick={toggleVimMode} title={isVimMode ? "Disable Vim Mode" : "Enable Vim Mode"}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="4 17 10 11 4 5"></polyline>
                        <line x1="12" y1="19" x2="20" y2="19"></line>
                    </svg>
                </button>
                
                <div className="toolbar-divider"></div>
                
                <select className="lang-select" value={editorTheme} onChange={handleThemeChange} title="Select Theme" style={{ marginRight: '10px' }}>
                    <option value="vs-dark">Dark Theme</option>
                    <option value="light">Light Theme</option>
                    <option value="hc-black">High Contrast</option>
                </select>
                
                <select className={`lang-select ${(!isHost || !activeFile) ? 'opacity-50 cursor-not-allowed' : ''}`} value={activeFile ? files[activeFile]?.language : "java"} onChange={handleLanguageSelect} disabled={!isHost || !activeFile} title={!isHost ? getTooltip('HOST') : "Select Language"}>
                    <option value="java">Java</option>
                    <option value="python">Python</option>
                    <option value="cpp">C++</option>
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="go">Go</option>
                    <option value="rust">Rust</option>
                    <option value="markdown">Markdown</option>
                </select>
                
                <button className="btn btn-secondary btn-icon" onClick={runCode} disabled={isRunning || !activeFile} title="Run Code" style={{ marginRight: '5px' }}>
                    {isRunning ? (
                        <svg className="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                        </svg>
                    ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    )}
                </button>

                {currentProblem && (
                    <button 
                        className="btn btn-primary" 
                        onClick={handleSubmit} 
                        disabled={isSubmitting || !activeFile} 
                        title="Submit Code" 
                        style={{ 
                            backgroundColor: '#2ea043', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '5px', 
                            padding: '0 15px', 
                            fontSize: '0.85rem' 
                        }}
                    >
                        {isSubmitting ? (
                            <><svg className="spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" /></svg> Evaluating...</>
                        ) : (
                            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Submit</>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

export default EditorToolbar;