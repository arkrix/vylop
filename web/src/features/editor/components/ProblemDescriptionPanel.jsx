import React from 'react';
import ReactMarkdown from 'react-markdown';

const ProblemDescriptionPanel = ({ currentProblem }) => {
    if (!currentProblem) return null;

    return (
        <div className="problem-wrapper" style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-dark)', color: 'var(--text-main)', height: '100%', overflowY: 'auto', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{currentProblem.title}</h2>
                <span style={{ 
                    padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px',
                    backgroundColor: currentProblem.difficulty === 'Easy' ? 'rgba(46,160,67,0.15)' : currentProblem.difficulty === 'Medium' ? 'rgba(210,153,34,0.15)' : 'rgba(218,54,51,0.15)',
                    color: currentProblem.difficulty === 'Easy' ? '#3fb950' : currentProblem.difficulty === 'Medium' ? '#d29922' : '#da3633'
                }}>
                    {currentProblem.difficulty}
                </span>
            </div>
            
            <div className="markdown-preview" style={{ fontSize: '0.95rem', lineHeight: '1.6', borderBottom: '1px solid var(--border)', paddingBottom: '15px' }}>
                <ReactMarkdown>{currentProblem.description}</ReactMarkdown>
            </div>
            
            <div style={{ marginTop: '20px' }}>
                {currentProblem.examples?.map((ex, i) => (
                    <div key={i} style={{ marginBottom: '20px' }}>
                        <strong style={{ fontSize: '0.9rem', color: '#e1e4e8' }}>Example {i + 1}:</strong>
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderLeft: '3px solid var(--border)', padding: '12px', borderRadius: '0 8px 8px 0', marginTop: '8px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem' }}>
                            <div style={{ marginBottom: '4px' }}><span style={{ opacity: 0.6 }}>Input:</span> <span style={{ color: '#e1e4e8' }}>{ex.input}</span></div>
                            <div style={{ marginBottom: ex.explanation ? '4px' : '0' }}><span style={{ opacity: 0.6 }}>Output:</span> <span style={{ color: '#e1e4e8' }}>{ex.output}</span></div>
                            {ex.explanation && <div><span style={{ opacity: 0.6 }}>Explanation:</span> <span style={{ color: '#e1e4e8' }}>{ex.explanation}</span></div>}
                        </div>
                    </div>
                ))}
            </div>
            
            <div style={{ marginTop: '10px' }}>
                <strong style={{ fontSize: '0.9rem', color: '#e1e4e8' }}>Constraints:</strong>
                <ul style={{ paddingLeft: '20px', marginTop: '10px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {currentProblem.constraints?.map((c, i) => (
                        <li key={i} style={{ marginBottom: '6px' }}>
                            <code style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '3px 6px', borderRadius: '4px', color: '#e1e4e8', fontFamily: 'JetBrains Mono, monospace' }}>{c}</code>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default ProblemDescriptionPanel;