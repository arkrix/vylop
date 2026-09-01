import React, { useState } from 'react';
import { VscFolder, VscFolderOpened, VscMarkdown } from "react-icons/vsc";
import { DiJava, DiPython, DiJavascript1, DiGo } from "react-icons/di";
import { SiCplusplus, SiTypescript, SiRust } from "react-icons/si";
import { FiFile, FiTrash2 } from "react-icons/fi";
import './FileExplorer.css';

export const getFileIcon = (fileName = '') => {
    const ext = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';
    switch (ext) {
        case 'java':
            return <DiJava color="#b07219" size={18} />;
        case 'py':
            return <DiPython color="#3572A5" size={18} />;
        case 'cpp':
        case 'c':
        case 'cc':
        case 'cxx':
            return <SiCplusplus color="#f34b7d" size={18} />;
        case 'js':
        case 'jsx':
            return <DiJavascript1 color="#f1e05a" size={18} />;
        case 'ts':
        case 'tsx':
            return <SiTypescript color="#3178c6" size={18} />;
        case 'go':
            return <DiGo color="#00ADD8" size={18} />;
        case 'rs':
            return <SiRust color="#dea584" size={18} />;
        case 'md':
            return <VscMarkdown color="#42a5f5" size={18} />;
        default:
            return <FiFile color="#94a3b8" size={16} />;
    }
};

const FileExplorer = ({ files = {}, activeFile, onFileSelect, onDeleteFile, canEdit = true }) => {
    const [isFolderOpen, setIsFolderOpen] = useState(true);
    const fileList = Object.keys(files);

    return (
        <div className="file-explorer-container">
            <div className="file-explorer-header">
                <button 
                    type="button" 
                    className="folder-toggle-btn"
                    onClick={() => setIsFolderOpen(!isFolderOpen)}
                    aria-expanded={isFolderOpen}
                >
                    {isFolderOpen ? (
                        <VscFolderOpened className="folder-icon text-amber-400" size={18} />
                    ) : (
                        <VscFolder className="folder-icon text-amber-400" size={18} />
                    )}
                    <span className="folder-name">src</span>
                </button>
            </div>

            {isFolderOpen && (
                <ul className="file-tree-list">
                    {fileList.map((fileName) => {
                        const isActive = activeFile === fileName;
                        const displayName = fileName.startsWith('src/') ? fileName.replace('src/', '') : fileName;

                        return (
                            <li 
                                key={fileName} 
                                className={`file-item-row ${isActive ? 'active' : ''}`}
                            >
                                <button
                                    type="button"
                                    className="file-item-btn"
                                    onClick={() => onFileSelect?.(fileName)}
                                    aria-current={isActive ? 'true' : undefined}
                                >
                                    <span className="file-item-icon">{getFileIcon(fileName)}</span>
                                    <span className="file-item-label">{displayName}</span>
                                </button>

                                {onDeleteFile && canEdit && fileList.length > 1 && (
                                    <button
                                        type="button"
                                        className="file-item-delete-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteFile(e, fileName);
                                        }}
                                        aria-label={`Delete ${displayName}`}
                                        title="Delete File"
                                    >
                                        <FiTrash2 size={14} />
                                    </button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default FileExplorer;