import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { 
  Code2, 
  Users, 
  Trophy, 
  ArrowRight, 
  Plus, 
  Terminal, 
  Copy, 
  Trash2, 
  ExternalLink,
  Sparkles,
  LogOut,
  X,
  Loader2,
  FolderCode
} from 'lucide-react';
import PageLoader from '../../components/common/PageLoader';
import './Home.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const Home = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState(() => localStorage.getItem('username') || '');
  const [workspaces, setWorkspaces] = useState([]);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(true);

  // Transition Page Loader State
  const [pageTransition, setPageTransition] = useState({
    active: false,
    message: "Initializing Workspace...",
    subtext: "Preparing isolated Docker container sandbox..."
  });

  // Modals & Popovers
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  
  const [joinRoomId, setJoinRoomId] = useState("");
  const [customRoomName, setCustomRoomName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [interviewRole, setInterviewRole] = useState("Frontend Engineer");

  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (!username) {
      navigate('/auth');
      return;
    }

    const fetchWorkspaces = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/workspace/user/${encodeURIComponent(username)}`);
        setWorkspaces(response.data || []);
      } catch (err) {
        setWorkspaces([]);
      } finally {
        setIsLoadingWorkspaces(false);
      }
    };

    fetchWorkspaces();
  }, [username, navigate]);

  const handleLogout = async () => {
    setIsProfileMenuOpen(false);
    setPageTransition({
      active: true,
      message: "Signing out...",
      subtext: "Terminating session tokens and clearing local cache..."
    });

    await new Promise(resolve => setTimeout(resolve, 1200));
    localStorage.removeItem('username');
    localStorage.removeItem('token');
    toast.success("Signed out successfully");
    navigate('/auth');
  };

  const handleCreateRoom = async () => {
    const roomId = uuidv4();
    const finalRoomName = customRoomName.trim() || `${username}'s Workspace`;
    setIsCreateModalOpen(false);
    
    setPageTransition({
      active: true,
      message: "Spinning up sandbox...",
      subtext: `Allocating environment resources for "${finalRoomName}"...`
    });

    await new Promise(resolve => setTimeout(resolve, 1300));

    navigate(`/room/${roomId}`, { 
      state: { 
        username, 
        roomName: finalRoomName, 
        mode: 'SANDBOX' 
      } 
    });
  };

  const handleJoinRoom = async () => {
    if (!joinRoomId.trim()) {
      toast.error("Please enter a valid Room ID or link.");
      return;
    }

    let parsedId = joinRoomId.trim();
    if (parsedId.includes('/room/')) {
      parsedId = parsedId.split('/room/').pop();
    }

    setIsJoinModalOpen(false);

    setPageTransition({
      active: true,
      message: "Connecting to room...",
      subtext: `Joining peer session [${parsedId.substring(0, 8)}...]...`
    });

    await new Promise(resolve => setTimeout(resolve, 1300));

    navigate(`/room/${parsedId}`, { 
      state: { 
        username, 
        mode: 'SANDBOX' 
      } 
    });
  };

  const handleCreateInterview = async () => {
    const roomId = uuidv4();
    const interviewTitle = `Interview: ${interviewRole} (${candidateEmail || 'Candidate'})`;
    setIsInterviewModalOpen(false);

    setPageTransition({
      active: true,
      message: "Configuring interview room...",
      subtext: "Loading problem set modules and candidate scoring boards..."
    });

    await new Promise(resolve => setTimeout(resolve, 1400));

    navigate(`/room/${roomId}`, { 
      state: { 
        username, 
        roomName: interviewTitle, 
        mode: 'INTERVIEW' 
      } 
    });
  };

  const handleOpenWorkspace = async (ws) => {
    setPageTransition({
      active: true,
      message: "Restoring workspace...",
      subtext: `Syncing files from cloud archive for "${ws.name || 'Workspace'}"...`
    });

    await new Promise(resolve => setTimeout(resolve, 1300));

    navigate(`/room/${ws.roomId}`, {
      state: {
        username,
        roomName: ws.name || "Cloud Workspace",
        mode: ws.roomType || 'SANDBOX'
      }
    });
  };

  const confirmDeleteWorkspace = async () => {
    if (!deleteTargetId) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/workspace/${deleteTargetId}/delete?username=${encodeURIComponent(username)}`);
      setWorkspaces(prev => prev.filter(w => w.roomId !== deleteTargetId));
      toast.success("Workspace deleted");
    } catch (e) {
      toast.error("Failed to delete workspace");
    } finally {
      setIsDeleteModalOpen(false);
      setDeleteTargetId(null);
    }
  };

  if (pageTransition.active) {
    return (
      <PageLoader 
        message={pageTransition.message}
        subtext={pageTransition.subtext}
      />
    );
  }

  return (
    <div className="dash-wrapper">
      <div className="dash-ambient-glow glow-top-left" />
      <div className="dash-ambient-glow glow-top-right" />
      <div className="dash-ambient-glow glow-bottom-center" />

      {/* Navigation Header */}
      <header className="dash-navbar">
        <div className="dash-brand-badge">
          <Terminal className="dash-brand-icon" />
          <span>Vylop</span>
        </div>

        <div className="dash-profile-menu">
          <button 
            className={`dash-avatar-btn ${isProfileMenuOpen ? 'active' : ''}`}
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          >
            <span className="dash-avatar-letter">
              {username ? username.charAt(0).toUpperCase() : 'U'}
            </span>
          </button>

          {isProfileMenuOpen && (
            <div className="dash-popover">
              <div className="dash-popover-header">
                <div className="dash-popover-avatar">
                  {username ? username.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="dash-popover-meta">
                  <span className="dash-popover-username">{username}</span>
                  <span className="dash-popover-status">Online</span>
                </div>
              </div>
              <div className="dash-popover-divider" />
              <button className="dash-popover-item" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="dash-container">
        <section className="dash-hero">
          <div className="dash-hero-pill">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Workspace Hub</span>
          </div>
          <h1 className="dash-hero-title">
            Welcome back to <span className="text-gradient-cyan">Vylop</span>.
          </h1>
          <p className="dash-hero-subtitle">
            Create an isolated sandbox, host structured technical interviews, or battle in competitive coding arenas.
          </p>
        </section>

        {/* Feature Cards Grid */}
        <div className="dash-cards-grid">
          {/* 1. Dev Sandbox */}
          <div className="dash-mode-card card-cyan">
            <div className="card-ambient-tint tint-cyan" />
            <div className="mode-card-top">
              <div className="mode-icon-wrapper icon-cyan">
                <Code2 className="w-5 h-5" />
              </div>
              <span className="mode-pill pill-cyan">CRDT Sync</span>
            </div>
            <h3 className="mode-card-title">Dev Sandbox</h3>
            <p className="mode-card-desc">
              Spin up a live peer-synchronized code editor with Docker execution. Ideal for pair programming and rapid prototyping.
            </p>
            <div className="mode-card-actions">
              <button className="btn-solid-emerald" onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="w-4 h-4 mr-1.5" />
                <span>Create Room</span>
              </button>
              <button className="btn-glass-secondary" onClick={() => setIsJoinModalOpen(true)}>
                <ArrowRight className="w-4 h-4 mr-1.5" />
                <span>Join ID</span>
              </button>
            </div>
          </div>

          {/* 2. Host Interview */}
          <div className="dash-mode-card card-amber">
            <div className="card-ambient-tint tint-amber" />
            <div className="mode-card-top">
              <div className="mode-icon-wrapper icon-amber">
                <Users className="w-5 h-5" />
              </div>
              <span className="mode-pill pill-amber">Host Managed</span>
            </div>
            <h3 className="mode-card-title">Host Interview</h3>
            <p className="mode-card-desc">
              Run structured technical interviews with host-only test validation, hidden constraints, and candidate scoring boards.
            </p>
            <div className="mode-card-actions">
              <button className="btn-glass-amber" onClick={() => setIsInterviewModalOpen(true)}>
                <span>Configure Interview</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </button>
            </div>
          </div>

          {/* 3. Join Competition */}
          <div className="dash-mode-card card-purple">
            <div className="card-ambient-tint tint-purple" />
            <div className="mode-card-top">
              <div className="mode-icon-wrapper icon-purple">
                <Trophy className="w-5 h-5" />
              </div>
              <span className="mode-pill pill-purple">Arena</span>
            </div>
            <h3 className="mode-card-title">Join Competition</h3>
            <p className="mode-card-desc">
              Enter a competitive coding arena with strict timers, automated algorithmic scoring, and live leaderboards.
            </p>
            <div className="mode-card-actions">
              <button className="btn-glass-purple" onClick={() => toast("Competitive Arenas coming in the next release!", { icon: '🏆' })}>
                <span>View Active Arenas</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Saved Cloud Workspaces Section */}
        <section className="dash-saved-section">
          <div className="dash-section-divider">
            <div className="dash-divider-line" />
            <div className="dash-divider-badge">
              <FolderCode className="w-4 h-4 mr-2" />
              <span>Saved Cloud Workspaces</span>
            </div>
            <div className="dash-divider-line" />
          </div>

          {isLoadingWorkspaces ? (
            <div className="dash-workspaces-loading">
              <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
              <span>Retrieving cloud workspaces...</span>
            </div>
          ) : workspaces.length === 0 ? (
            <div className="dash-workspaces-empty">
              <div className="editor-empty-icon-box" style={{ width: '48px', height: '48px', marginBottom: '12px' }}>
                <FolderCode className="w-6 h-6 text-emerald-400" />
              </div>
              <h3>No saved workspaces yet</h3>
              <p>Create a sandbox room, write your code, and it will be saved to your cloud directory.</p>
              <button 
                className="btn-solid-emerald" 
                style={{ marginTop: '16px' }}
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                <span>Create Workspace</span>
              </button>
            </div>
          ) : (
            <div className="dash-workspaces-grid">
              {workspaces.map((ws) => (
                <div 
                  key={ws.roomId} 
                  className="dash-workspace-card"
                  onClick={() => handleOpenWorkspace(ws)}
                >
                  <div className="card-left-edge-cyan" />
                  <div className="ws-card-header">
                    <h4 className="ws-card-title">{ws.name || "Untitled Workspace"}</h4>
                    <div className="ws-card-buttons" onClick={(e) => e.stopPropagation()}>
                      <button 
                        className="ws-action-btn copy"
                        title="Copy Room Link"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/room/${ws.roomId}`);
                          toast.success("Workspace link copied!");
                        }}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        className="ws-action-btn delete"
                        title="Delete Workspace"
                        onClick={() => {
                          setDeleteTargetId(ws.roomId);
                          setIsDeleteModalOpen(true);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="ws-card-meta">
                    <span>ID: {ws.roomId.substring(0, 8)}...</span>
                  </div>

                  <div className="ws-card-footer">
                    <span className="ws-role-pill">
                      {ws.roomType || 'SANDBOX'}
                    </span>
                    <span className="ws-open-cue">
                      <span>Open</span>
                      <ExternalLink className="w-3.5 h-3.5 ml-1" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* 1. Create Room Modal */}
      {isCreateModalOpen && (
        <div className="dash-modal-backdrop" onClick={() => setIsCreateModalOpen(false)}>
          <div className="dash-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h3>Create Dev Sandbox</h3>
              <button className="dash-modal-close" onClick={() => setIsCreateModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="dash-modal-sub">
              Give your workspace a name or launch immediately with default configuration.
            </p>
            <div className="dash-modal-input-box">
              <input 
                type="text"
                className="dash-styled-input"
                placeholder="Workspace Title (e.g. Distributed Algorithm Solver)"
                value={customRoomName}
                onChange={(e) => setCustomRoomName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
                autoFocus
              />
            </div>
            <div className="dash-modal-actions">
              <button className="btn-modal-cancel" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
              <button className="btn-modal-submit" onClick={handleCreateRoom}>Launch Workspace</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Join Room Modal */}
      {isJoinModalOpen && (
        <div className="dash-modal-backdrop" onClick={() => setIsJoinModalOpen(false)}>
          <div className="dash-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h3>Join Existing Workspace</h3>
              <button className="dash-modal-close" onClick={() => setIsJoinModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="dash-modal-sub">
              Paste the room invitation URL or UUID token provided by the host.
            </p>
            <div className="dash-modal-input-box">
              <input 
                type="text"
                className="dash-styled-input"
                placeholder="e.g. 5630f4a7-7ea9-4a6f-9969-7fb57a5fbd3c"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                autoFocus
              />
            </div>
            <div className="dash-modal-actions">
              <button className="btn-modal-cancel" onClick={() => setIsJoinModalOpen(false)}>Cancel</button>
              <button className="btn-modal-submit" onClick={handleJoinRoom}>Connect to Room</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Configure Interview Modal */}
      {isInterviewModalOpen && (
        <div className="dash-modal-backdrop" onClick={() => setIsInterviewModalOpen(false)}>
          <div className="dash-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h3>Configure Technical Interview</h3>
              <button className="dash-modal-close" onClick={() => setIsInterviewModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="dash-modal-sub">
              Setup a structured interview room with problem assignments and evaluation criteria.
            </p>
            <div className="dash-modal-input-group">
              <input 
                type="text"
                className="dash-styled-input"
                placeholder="Target Role (e.g. Senior Backend Engineer)"
                value={interviewRole}
                onChange={(e) => setInterviewRole(e.target.value)}
              />
              <input 
                type="email"
                className="dash-styled-input"
                placeholder="Candidate Email (optional)"
                value={candidateEmail}
                onChange={(e) => setCandidateEmail(e.target.value)}
              />
            </div>
            <div className="dash-modal-actions">
              <button className="btn-modal-cancel" onClick={() => setIsInterviewModalOpen(false)}>Cancel</button>
              <button className="btn-modal-submit" onClick={handleCreateInterview}>Start Interview</button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="dash-modal-backdrop" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="dash-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h3>Delete Workspace</h3>
              <button className="dash-modal-close" onClick={() => setIsDeleteModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="dash-modal-sub">
              Are you sure you want to remove this saved workspace from the cloud? This action cannot be undone.
            </p>
            <div className="dash-modal-actions">
              <button className="btn-modal-cancel" onClick={() => setIsDeleteModalOpen(false)}>Cancel</button>
              <button className="btn-modal-danger" onClick={confirmDeleteWorkspace}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;