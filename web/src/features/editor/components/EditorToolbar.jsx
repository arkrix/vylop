import React from 'react';
import { 
  Menu, 
  FilePlus, 
  Key, 
  Cloud, 
  Download, 
  Trash2, 
  AlignLeft, 
  Terminal, 
  BookOpen, 
  Eye, 
  Play, 
  CheckCircle2, 
  Loader2,
  SlidersHorizontal
} from 'lucide-react';

const EditorToolbar = ({
  roomName,
  isSidebarOpen,
  setIsSidebarOpen,
  isHost,
  canEdit,
  isInterviewMode,
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
  getTooltip,
  isBottomPanelOpen,
  setIsBottomPanelOpen
}) => {
  return (
    <div className="toolbar">
      {/* Left Group */}
      <div className="toolbar-group">
        <button 
          className="btn-glass btn-glass-icon" 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          title="Toggle Sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>
        <span className="room-title-breadcrumb">{roomName}</span>
      </div>
      
      {/* Right Controls */}
      <div className="toolbar-group right-controls">
        {/* Only show Question Bank in Interview Mode for the Host */}
        {isHost && isInterviewMode && (
          <button 
            className={`btn-glass ${isQuestionBankOpen ? 'active' : ''}`} 
            onClick={() => setIsQuestionBankOpen(true)} 
            title="Interview Question Bank"
          >
            <BookOpen className="w-4 h-4 mr-1.5 text-amber-400" />
            <span>Questions</span>
          </button>
        )}

        {files[activeFile]?.language === "markdown" && (
          <button 
            className={`btn-glass btn-glass-icon ${showMarkdownPreview ? 'active' : ''}`} 
            onClick={() => setShowMarkdownPreview(!showMarkdownPreview)} 
            title="Toggle Markdown Preview"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}
        
        <button 
          className="btn-glass btn-glass-icon" 
          onClick={() => canEdit && setIsModalOpen(true)} 
          title={!canEdit ? getTooltip('EDITOR') : "Add File"} 
          disabled={!canEdit}
        >
          <FilePlus className="w-4 h-4" />
        </button>
        
        <button 
          className="btn-glass btn-glass-icon" 
          onClick={() => canEdit && setIsSecretsModalOpen(true)} 
          title={!canEdit ? getTooltip('EDITOR') : "Environment Secrets"} 
          disabled={!canEdit}
        >
          <Key className="w-4 h-4" />
        </button>
        
        <button 
          className="btn-glass btn-glass-icon" 
          onClick={() => isHost && saveWorkspace()} 
          disabled={!isHost || isSaving} 
          title={!isHost ? getTooltip('HOST') : "Save to Cloud"}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <Cloud className="w-4 h-4" />}
        </button>
        
        <button 
          className="btn-glass btn-glass-icon" 
          onClick={downloadWorkspace} 
          title="Export as .zip"
        >
          <Download className="w-4 h-4" />
        </button>
        
        <div className="toolbar-divider"></div>
        
        <button 
          className="btn-glass btn-glass-icon" 
          onClick={(e) => canEdit && activeFile && handleDeleteIconClick(e, activeFile)} 
          disabled={!canEdit || !activeFile} 
          title={!canEdit ? getTooltip('EDITOR') : "Delete File"}
        >
          <Trash2 className="w-4 h-4 text-rose-400" />
        </button>
        
        <button 
          className="btn-glass btn-glass-icon" 
          onClick={() => canEdit && activeFile && formatCode()} 
          disabled={!canEdit || !activeFile} 
          title={!canEdit ? getTooltip('EDITOR') : "Format Code"}
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        
        <button 
          className={`btn-glass btn-glass-icon ${isVimMode ? 'active' : ''}`} 
          onClick={toggleVimMode} 
          title={isVimMode ? "Disable Vim Mode" : "Enable Vim Mode"}
        >
          <Terminal className="w-4 h-4" />
        </button>

        {/* Console / Input Drawer Toggle Button */}
        <button 
          className={`btn-glass ${isBottomPanelOpen ? 'active' : ''}`}
          onClick={() => setIsBottomPanelOpen(!isBottomPanelOpen)}
          title="Toggle Terminal & Input Panel"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
          <span>Console</span>
        </button>
        
        <div className="toolbar-divider"></div>
        
        <select 
          className="editor-select" 
          value={editorTheme} 
          onChange={(e) => handleThemeChange(e.target.value)} 
          title="Select Theme"
        >
          <option value="vs-dark">Dark Theme</option>
          <option value="light">Light Theme</option>
          <option value="hc-black">High Contrast</option>
        </select>
        
        <select 
          className="editor-select" 
          value={activeFile ? files[activeFile]?.language : "java"} 
          onChange={handleLanguageSelect} 
          disabled={!isHost || !activeFile} 
          title={!isHost ? getTooltip('HOST') : "Language"}
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
        
        {/* Run Action */}
        <button 
          className="btn-run-action" 
          onClick={runCode} 
          disabled={isRunning || !activeFile} 
          title="Run Code"
        >
          {isRunning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4 fill-white" />
          )}
          <span>Run</span>
        </button>

        {currentProblem && (
          <button 
            className="btn-glass active" 
            onClick={handleSubmit} 
            disabled={isSubmitting || !activeFile} 
            title="Submit Solution"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-400" />
            )}
            <span>Submit</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default EditorToolbar;