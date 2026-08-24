import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Tag, Copy, Check, Code2, AlertCircle, Terminal } from 'lucide-react';

const ProblemDescriptionPanel = ({ currentProblem }) => {
    const [copiedIndex, setCopiedIndex] = useState(null);

    if (!currentProblem) return null;

    const copyExampleInput = (text, index) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const getDifficultyStyle = (diff) => {
        switch (diff?.toLowerCase()) {
            case 'easy':
                return { bg: 'rgba(16, 185, 129, 0.12)', text: '#34d399', border: 'rgba(16, 185, 129, 0.25)' };
            case 'medium':
                return { bg: 'rgba(245, 158, 11, 0.12)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.25)' };
            case 'hard':
                return { bg: 'rgba(244, 63, 94, 0.12)', text: '#f87171', border: 'rgba(244, 63, 94, 0.25)' };
            default:
                return { bg: 'rgba(56, 189, 248, 0.12)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.25)' };
        }
    };

    const diffStyle = getDifficultyStyle(currentProblem.difficulty);

    // Cleanly separate description text from I/O specification
    const parseDescription = (desc) => {
        if (!desc) return { mainText: "", ioLines: [] };

        const ioIndex = desc.search(/\*{0,2}I\/O Format/i);
        if (ioIndex === -1) {
            return { mainText: desc, ioLines: [] };
        }

        const mainText = desc.substring(0, ioIndex).trim();
        const rawIoSection = desc.substring(ioIndex);

        // Strip the header and split into individual lines
        const ioContent = rawIoSection
            .replace(/\*{0,2}I\/O Format[^\n:]*:\*{0,2}/i, '')
            .replace(/\*\*/g, '');

        const ioLines = ioContent
            .split(/(?=Line \d+:)/g)
            .map(l => l.trim())
            .filter(Boolean);

        return { mainText, ioLines };
    };

    const { mainText, ioLines } = parseDescription(currentProblem.description);

    return (
        <div className="problem-description-wrapper">
            {/* Header & Difficulty Badge */}
            <div className="problem-header-container">
                <div className="problem-title-row">
                    <h2 className="problem-title-text">{currentProblem.title}</h2>
                </div>

                <div className="problem-badges-strip">
                    <span 
                        className="problem-pill-badge"
                        style={{ 
                            backgroundColor: diffStyle.bg, 
                            color: diffStyle.text, 
                            borderColor: diffStyle.border 
                        }}
                    >
                        {currentProblem.difficulty || 'Easy'}
                    </span>

                    {currentProblem.topic && (
                        <span className="problem-pill-badge problem-topic-badge">
                            <Tag className="w-3 h-3 mr-1 opacity-70" />
                            {currentProblem.topic}
                        </span>
                    )}
                </div>
            </div>

            {/* Problem Body Content */}
            <div className="problem-body-content">
                
                {/* Main Problem Statement */}
                <div className="problem-markdown-view">
                    <ReactMarkdown>{mainText}</ReactMarkdown>
                </div>

                {/* Dedicated I/O Format Section */}
                {ioLines.length > 0 && (
                    <div className="problem-section-group">
                        <div className="problem-section-title">
                            <Terminal className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                            <span>I/O Format</span>
                        </div>
                        <div className="problem-io-format-card">
                            {ioLines.map((line, i) => (
                                <div key={i} className="problem-io-format-row">
                                    <ReactMarkdown>{line}</ReactMarkdown>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Examples Section */}
                {currentProblem.examples && currentProblem.examples.length > 0 && (
                    <div className="problem-section-group">
                        <div className="problem-section-title">
                            <Code2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                            <span>Examples</span>
                        </div>

                        <div className="problem-examples-stack">
                            {currentProblem.examples.map((ex, i) => (
                                <div key={i} className="problem-example-card">
                                    <div className="example-card-header">
                                        <span className="example-label">Example {i + 1}</span>
                                        <button 
                                            className="example-copy-btn"
                                            onClick={() => copyExampleInput(ex.input, i)}
                                            title="Copy Input"
                                        >
                                            {copiedIndex === i ? (
                                                <>
                                                    <Check className="w-3 h-3 text-emerald-400 mr-1" />
                                                    <span className="text-emerald-400">Copied</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="w-3 h-3 mr-1" />
                                                    <span>Copy</span>
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    <div className="example-block-content">
                                        <div className="example-io-row">
                                            <span className="example-io-label">Input:</span>
                                            <code className="example-io-code">{ex.input}</code>
                                        </div>

                                        <div className="example-io-row">
                                            <span className="example-io-label">Output:</span>
                                            <code className="example-io-code">{ex.output}</code>
                                        </div>

                                        {ex.explanation && (
                                            <div className="example-explanation-row">
                                                <span className="example-io-label">Explanation:</span>
                                                <span className="example-explanation-text">{ex.explanation}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Constraints Section */}
                {currentProblem.constraints && currentProblem.constraints.length > 0 && (
                    <div className="problem-section-group">
                        <div className="problem-section-title">
                            <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-400" />
                            <span>Constraints</span>
                        </div>

                        <div className="problem-constraints-card">
                            <ul className="problem-constraints-list">
                                {currentProblem.constraints.map((c, i) => (
                                    <li key={i} className="problem-constraint-item">
                                        <code>{c}</code>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProblemDescriptionPanel;