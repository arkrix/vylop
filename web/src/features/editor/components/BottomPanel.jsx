import React from 'react';
import SubmissionReport from '../../evaluation/SubmissionReport';

const BottomPanel = ({
    currentProblem,
    activeBottomTab,
    setActiveBottomTab,
    activeTestCaseId,
    setActiveTestCaseId,
    isSubmitting,
    submissionResult,
    output,
    setOutput,
    renderFormattedOutput,
    userInput,
    setUserInput
}) => {
    return (
        <div className="io-wrapper" style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-dark)' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', backgroundColor: '#161b22', padding: '0 10px' }}>
                {currentProblem && (
                    <button 
                        style={{ 
                            background: 'transparent', 
                            border: 'none', 
                            color: activeBottomTab === 'testcases' ? '#58a6ff' : 'var(--text-muted)', 
                            borderBottom: activeBottomTab === 'testcases' ? '2px solid #58a6ff' : '2px solid transparent', 
                            padding: '10px 15px', 
                            cursor: 'pointer', 
                            fontWeight: 'bold', 
                            fontSize: '0.85rem' 
                        }}
                        onClick={() => setActiveBottomTab('testcases')}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'text-bottom' }}>
                            <polyline points="9 11 12 14 22 4"></polyline>
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                        </svg>
                        Testcases
                    </button>
                )}
                
                <button 
                    style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        color: activeBottomTab === 'console' ? '#58a6ff' : 'var(--text-muted)', 
                        borderBottom: activeBottomTab === 'console' ? '2px solid #58a6ff' : '2px solid transparent', 
                        padding: '10px 15px', 
                        cursor: 'pointer', 
                        fontWeight: 'bold', 
                        fontSize: '0.85rem' 
                    }}
                    onClick={() => setActiveBottomTab('console')}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'text-bottom' }}>
                        <polyline points="4 17 10 11 4 5"></polyline>
                        <line x1="12" y1="19" x2="20" y2="19"></line>
                    </svg>
                    Test Result
                </button>

                {currentProblem && (
                    <button 
                        style={{ 
                            background: 'transparent', 
                            border: 'none', 
                            color: activeBottomTab === 'submission' ? '#3fb950' : 'var(--text-muted)', 
                            borderBottom: activeBottomTab === 'submission' ? '2px solid #3fb950' : '2px solid transparent', 
                            padding: '10px 15px', 
                            cursor: 'pointer', 
                            fontWeight: 'bold', 
                            fontSize: '0.85rem' 
                        }}
                        onClick={() => setActiveBottomTab('submission')}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'text-bottom' }}>
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        Submission
                    </button>
                )}
                
                <button 
                    style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        color: activeBottomTab === 'custom' ? '#58a6ff' : 'var(--text-muted)', 
                        borderBottom: activeBottomTab === 'custom' ? '2px solid #58a6ff' : '2px solid transparent', 
                        padding: '10px 15px', 
                        cursor: 'pointer', 
                        fontWeight: 'bold', 
                        fontSize: '0.85rem' 
                    }}
                    onClick={() => setActiveBottomTab('custom')}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'text-bottom' }}>
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                    </svg>
                    Custom Input
                </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
                {activeBottomTab === 'testcases' && currentProblem && (
                    <div>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                            {(currentProblem.testcases || []).map(tc => (
                                <div 
                                    key={tc.id} 
                                    onClick={() => setActiveTestCaseId(tc.id)} 
                                    style={{ 
                                        padding: '6px 12px', 
                                        borderRadius: '6px', 
                                        cursor: 'pointer', 
                                        backgroundColor: activeTestCaseId === tc.id ? 'rgba(88,166,255,0.1)' : 'rgba(255,255,255,0.05)', 
                                        color: activeTestCaseId === tc.id ? '#58a6ff' : '#8b949e', 
                                        fontWeight: 'bold', 
                                        fontSize: '0.85rem' 
                                    }}
                                >
                                    {tc.name}
                                </div>
                            ))}
                        </div>
                        
                        {(currentProblem.testcases || []).filter(tc => tc.id === activeTestCaseId).map(tc => (
                            <div key={tc.id}>
                                <div style={{ marginBottom: '15px' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 'bold' }}>
                                        Input Variables:
                                    </div>
                                    <pre style={{ backgroundColor: '#0d1117', padding: '12px', borderRadius: '6px', margin: 0, fontFamily: 'JetBrains Mono, monospace', color: '#e1e4e8', fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        {tc.displayInput}
                                    </pre>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 'bold' }}>
                                        Expected Output:
                                    </div>
                                    <pre style={{ backgroundColor: '#0d1117', padding: '12px', borderRadius: '6px', margin: 0, fontFamily: 'JetBrains Mono, monospace', color: '#e1e4e8', fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        {tc.expectedOutput}
                                    </pre>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeBottomTab === 'submission' && currentProblem && (
                    <div style={{ height: '100%', padding: '10px' }}>
                        <SubmissionReport 
                            isSubmitting={isSubmitting} 
                            result={submissionResult} 
                        />
                    </div>
                )}

                {activeBottomTab === 'console' && (
                    <div className={`terminal-output ${!output ? 'placeholder' : ''}`} style={{ height: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                                Standard Output / Errors
                            </span>
                            <button className="btn btn-secondary" style={{ fontSize: '0.7rem', height: '24px', padding: '0 8px' }} onClick={() => setOutput("")}>
                                Clear
                            </button>
                        </div>
                        {renderFormattedOutput(output)}
                    </div>
                )}

                {activeBottomTab === 'custom' && (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 'bold' }}>
                            Raw Standard Input (STDIN):
                        </div>
                        <textarea 
                            className="terminal-input" 
                            style={{ flex: 1 }} 
                            value={userInput} 
                            onChange={(e) => setUserInput(e.target.value)} 
                            placeholder="Type raw input here..." 
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default BottomPanel;