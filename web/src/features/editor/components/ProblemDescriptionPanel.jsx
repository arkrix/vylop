import React from 'react';
import { BookOpen, Tag, AlertCircle, Layers } from 'lucide-react';

const getDifficultyClass = (difficulty = '') => {
    const diff = difficulty.toLowerCase();
    if (diff === 'easy') return 'difficulty-easy';
    if (diff === 'medium') return 'difficulty-medium';
    if (diff === 'hard') return 'difficulty-hard';
    return 'difficulty-default';
};

const formatDifficultyText = (difficulty = '') => {
    return difficulty.replaceAll('_', ' ');
};

const ProblemDescriptionPanel = ({ currentProblem }) => {
    if (!currentProblem) {
        return (
            <div className="problem-panel-empty">
                <BookOpen className="w-8 h-8 text-zinc-500 mb-2" />
                <p>No problem selected.</p>
            </div>
        );
    }

    const {
        title = 'Untitled Problem',
        difficulty = 'Easy',
        description = '',
        tags = [],
        examples = [],
        constraints = []
    } = currentProblem;

    return (
        <div className="problem-description-panel">
            <div className="problem-header">
                <div className="problem-title-row">
                    <h2 className="problem-title">{title}</h2>
                    <span className={`difficulty-badge ${getDifficultyClass(difficulty)}`}>
                        {formatDifficultyText(difficulty)}
                    </span>
                </div>

                {tags && tags.length > 0 && (
                    <div className="problem-tags-row">
                        <Tag className="w-3.5 h-3.5 mr-1.5 text-zinc-400" />
                        <div className="tags-list">
                            {tags.map((tag) => (
                                <span key={`problem-tag-${tag}`} className="problem-tag">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="problem-body">
                {/* Description */}
                <div className="problem-section-group">
                    <div className="problem-section-title">
                        <BookOpen className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                        <span>Description</span>
                    </div>
                    <div className="problem-description-text">
                        {description}
                    </div>
                </div>

                {/* Examples Section */}
                {examples && examples.length > 0 && (
                    <div className="problem-section-group">
                        <div className="problem-section-title">
                            <Layers className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
                            <span>Examples</span>
                        </div>
                        <div className="problem-examples-list">
                            {examples.map((ex) => (
                                <div 
                                    key={ex.id || `example-${ex.input || ex.output || JSON.stringify(ex)}`} 
                                    className="problem-example-card"
                                >
                                    <div className="example-field">
                                        <span className="example-label">Input:</span>
                                        <code>{ex.input}</code>
                                    </div>
                                    <div className="example-field">
                                        <span className="example-label">Output:</span>
                                        <code>{ex.output}</code>
                                    </div>
                                    {ex.explanation && (
                                        <div className="example-field">
                                            <span className="example-label">Explanation:</span>
                                            <p className="example-explanation">{ex.explanation}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Constraints Section */}
                {constraints && constraints.length > 0 && (
                    <div className="problem-section-group">
                        <div className="problem-section-title">
                            <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-400" />
                            <span>Constraints</span>
                        </div>
                        <div className="problem-constraints-card">
                            <ul className="constraints-list">
                                {constraints.map((constraint) => (
                                    <li key={`constraint-${constraint}`} className="constraint-item">
                                        <code>{constraint}</code>
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