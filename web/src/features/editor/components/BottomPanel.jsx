import React from 'react';
import { Terminal, CheckCircle2, SlidersHorizontal, Trash2, X, Maximize2, Minimize2 } from 'lucide-react';
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
  setUserInput,
  onClose,
  isMaximized,
  onToggleMaximize
}) => {
  return (
    <div className="io-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-editor-base)' }}>
      {/* Tab Switcher & Panel Controls */}
      <div className="io-tab-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex' }}>
          {currentProblem && (
            <button 
              type="button"
              className={`io-tab-btn ${activeBottomTab === 'testcases' ? 'active' : ''}`}
              onClick={() => setActiveBottomTab('testcases')}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              <span>Testcases</span>
            </button>
          )}
          
          <button 
            type="button"
            className={`io-tab-btn ${activeBottomTab === 'console' ? 'active' : ''}`}
            onClick={() => setActiveBottomTab('console')}
          >
            <Terminal className="w-3.5 h-3.5 mr-1.5" />
            <span>Output / Terminal</span>
          </button>

          {currentProblem && (
            <button 
              type="button"
              className={`io-tab-btn ${activeBottomTab === 'submission' ? 'active' : ''}`}
              onClick={() => setActiveBottomTab('submission')}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
              <span>Submission</span>
            </button>
          )}
          
          <button 
            type="button"
            className={`io-tab-btn ${activeBottomTab === 'custom' ? 'active' : ''}`}
            onClick={() => setActiveBottomTab('custom')}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
            <span>Custom Input</span>
          </button>
        </div>

        {/* Maximize & Close Drawer Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingRight: '8px' }}>
          {onToggleMaximize && (
            <button 
              type="button"
              className="btn-glass btn-glass-icon" 
              style={{ width: '26px', height: '26px', padding: 0 }} 
              onClick={onToggleMaximize}
              title={isMaximized ? "Restore Panel Height" : "Maximize Panel"}
              aria-label={isMaximized ? "Restore Panel Height" : "Maximize Panel"}
            >
              {isMaximized ? (
                <Minimize2 className="w-3.5 h-3.5 text-zinc-400 hover:text-white" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5 text-zinc-400 hover:text-white" />
              )}
            </button>
          )}

          <button 
            type="button"
            className="btn-glass btn-glass-icon" 
            style={{ width: '26px', height: '26px', padding: 0 }} 
            onClick={onClose}
            title="Hide Terminal"
            aria-label="Hide Terminal"
          >
            <X className="w-3.5 h-3.5 text-zinc-400 hover:text-white" />
          </button>
        </div>
      </div>
      
      {/* Panel Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        
        {activeBottomTab === 'testcases' && currentProblem && (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              {(currentProblem.testcases || []).map((tc) => (
                <button 
                  type="button"
                  key={tc.id} 
                  onClick={() => setActiveTestCaseId(tc.id)} 
                  className={`btn-glass ${activeTestCaseId === tc.id ? 'active' : ''}`}
                  style={{ padding: '4px 10px', fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  {tc.name}
                </button>
              ))}
            </div>
            
            {(currentProblem.testcases || []).filter((tc) => tc.id === activeTestCaseId).map((tc) => (
              <div key={tc.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '700', textTransform: 'uppercase' }}>
                    Input Variables:
                  </div>
                  <pre style={{ backgroundColor: '#090b10', padding: '10px 14px', borderRadius: '8px', margin: 0, fontFamily: 'JetBrains Mono, monospace', color: '#e2e8f0', fontSize: '0.82rem', border: '1px solid var(--border-editor)' }}>
                    {tc.displayInput}
                  </pre>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '700', textTransform: 'uppercase' }}>
                    Expected Output:
                  </div>
                  <pre style={{ backgroundColor: '#090b10', padding: '10px 14px', borderRadius: '8px', margin: 0, fontFamily: 'JetBrains Mono, monospace', color: '#e2e8f0', fontSize: '0.82rem', border: '1px solid var(--border-editor)' }}>
                    {tc.expectedOutput}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeBottomTab === 'submission' && currentProblem && (
          <div style={{ height: '100%' }}>
            <SubmissionReport isSubmitting={isSubmitting} result={submissionResult} />
          </div>
        )}

        {activeBottomTab === 'console' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>
                Standard Output / Sandbox Log
              </span>
              {output && (
                <button 
                  type="button"
                  className="btn-glass" 
                  style={{ height: '24px', padding: '0 8px', fontSize: '0.72rem' }} 
                  onClick={() => setOutput("")}
                >
                  <Trash2 className="w-3 h-3 mr-1 text-rose-400" />
                  <span>Clear</span>
                </button>
              )}
            </div>
            <div className="terminal-box" style={{ flex: 1, borderRadius: '8px', border: '1px solid var(--border-editor)' }}>
              {renderFormattedOutput(output)}
            </div>
          </div>
        )}

        {activeBottomTab === 'custom' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase' }}>
              Standard Input (STDIN):
            </div>
            <textarea 
              className="terminal-box" 
              style={{ flex: 1, borderRadius: '8px', border: '1px solid var(--border-editor)' }} 
              value={userInput} 
              onChange={(e) => setUserInput(e.target.value)} 
              placeholder="Type or paste input variables to be sent to STDIN when running..." 
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default BottomPanel;