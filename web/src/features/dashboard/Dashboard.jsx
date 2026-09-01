import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Code2, ArrowRight, Trash2, Folder, Clock, LogOut, Search } from 'lucide-react';
import './Dashboard.css';

const API_BASE_URL = 'https://vylop.onrender.com';

const renderEmptyState = (handleCreateWorkspace) => (
    <div className="dashboard-empty-state">
        <div className="empty-icon-box">
            <Folder className="w-8 h-8 text-emerald-400" />
        </div>
        <h3>No Workspaces Found</h3>
        <p>Create a new workspace or join an existing session with a Room ID.</p>
        <button 
            type="button" 
            className="btn-primary"
            onClick={handleCreateWorkspace}
        >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Create Workspace</span>
        </button>
    </div>
);

const renderWorkspaceList = (workspaces, handleOpenWorkspace, handleDeleteWorkspace) => (
    <div className="workspace-grid">
        {workspaces.map((ws) => (
            <div key={ws.roomId || ws.id || ws.name} className="workspace-card-wrapper">
                <button
                    type="button"
                    className="workspace-card"
                    onClick={() => handleOpenWorkspace(ws.roomId || ws.id, ws.name)}
                    title={`Open ${ws.name || 'Workspace'}`}
                >
                    <div className="workspace-card-header">
                        <div className="workspace-icon">
                            <Code2 className="w-5 h-5 text-emerald-400" />
                        </div>
                        <span className="workspace-date">
                            <Clock className="w-3.5 h-3.5 mr-1" />
                            {ws.updatedAt ? new Date(ws.updatedAt).toLocaleDateString() : 'Recent'}
                        </span>
                    </div>
                    <h4 className="workspace-title">{ws.name || 'Untitled Workspace'}</h4>
                    <p className="workspace-room-id">ID: {ws.roomId || ws.id}</p>
                    <div className="workspace-card-footer">
                        <span className="open-link">
                            Launch Workspace <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </span>
                    </div>
                </button>

                {handleDeleteWorkspace && (
                    <button
                        type="button"
                        className="workspace-delete-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWorkspace(ws.roomId || ws.id);
                        }}
                        title="Delete Workspace"
                        aria-label={`Delete workspace ${ws.name || ws.roomId}`}
                    >
                        <Trash2 className="w-4 h-4 text-rose-400" />
                    </button>
                )}
            </div>
        ))}
    </div>
);

const Dashboard = () => {
    const navigate = useNavigate();
    const [workspaces, setWorkspaces] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [joinRoomId, setJoinRoomId] = useState("");
    const [newRoomName, setNewRoomName] = useState("");
    const [username] = useState(() => localStorage.getItem('username') || '');

    const fetchWorkspaces = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/workspace/list`, {
                params: { username: username || localStorage.getItem('username') }
            });
            if (Array.isArray(res.data)) {
                setWorkspaces(res.data);
            } else {
                setWorkspaces([]);
            }
        } catch (error) {
            console.debug("Failed to fetch workspaces from server:", error);
            setWorkspaces([]);
        } finally {
            setIsLoading(false);
        }
    }, [username]);

    useEffect(() => {
        fetchWorkspaces();
    }, [fetchWorkspaces]);

    const handleCreateWorkspace = () => {
        const roomId = uuidv4().slice(0, 8);
        const name = newRoomName.trim() || `Workspace-${roomId}`;
        navigate(`/room/${encodeURIComponent(roomId)}`, {
            state: {
                roomName: name,
                username: username || 'Developer',
                mode: 'COLLAB'
            }
        });
    };

    const handleJoinWorkspace = (e) => {
        e.preventDefault();
        if (!joinRoomId.trim()) {
            toast.error("Please enter a valid Room ID");
            return;
        }
        navigate(`/room/${encodeURIComponent(joinRoomId.trim())}`, {
            state: {
                username: username || 'Developer'
            }
        });
    };

    const handleOpenWorkspace = (roomId, roomName) => {
        navigate(`/room/${encodeURIComponent(roomId)}`, {
            state: {
                roomName: roomName || `Workspace-${roomId}`,
                username: username || 'Developer'
            }
        });
    };

    const handleDeleteWorkspace = async (roomId) => {
        try {
            await axios.delete(`${API_BASE_URL}/api/workspace/${encodeURIComponent(roomId)}`);
            setWorkspaces((prev) => prev.filter((ws) => (ws.roomId || ws.id) !== roomId));
            toast.success("Workspace deleted");
        } catch (error) {
            console.debug("Delete workspace error:", error);
            toast.error("Could not delete workspace");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        navigate('/auth');
    };

    // Extracted independent rendering function to avoid nested ternaries (S3358)
    const renderWorkspaceContent = () => {
        if (isLoading) {
            return (
                <div className="dashboard-loading-state">
                    <div className="spinner" />
                    <p>Loading workspaces...</p>
                </div>
            );
        }
        if (workspaces.length === 0) {
            return renderEmptyState(handleCreateWorkspace);
        }
        return renderWorkspaceList(workspaces, handleOpenWorkspace, handleDeleteWorkspace);
    };

    return (
        <div className="dashboard-layout">
            <header className="dashboard-navbar">
                <div className="navbar-left">
                    <Code2 className="w-6 h-6 text-emerald-400 mr-2" />
                    <span className="navbar-brand">Vylop IDE</span>
                </div>
                <div className="navbar-right">
                    <span className="user-badge">{username || 'Developer'}</span>
                    <button 
                        type="button" 
                        className="btn-logout" 
                        onClick={handleLogout}
                        title="Sign Out"
                    >
                        <LogOut className="w-4 h-4 mr-1.5" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </header>

            <main className="dashboard-main-content">
                <section className="dashboard-hero-section">
                    <div className="hero-create-card">
                        <h2>Create Workspace</h2>
                        <p>Start a new collaborative editor session with live CRDT syncing.</p>
                        <div className="create-input-group">
                            <input
                                type="text"
                                placeholder="Workspace Name (optional)"
                                value={newRoomName}
                                onChange={(e) => setNewRoomName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreateWorkspace();
                                }}
                            />
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={handleCreateWorkspace}
                            >
                                <Plus className="w-4 h-4 mr-1.5" />
                                <span>Create</span>
                            </button>
                        </div>
                    </div>

                    <div className="hero-join-card">
                        <h2>Join Existing Session</h2>
                        <p>Enter a shared Room ID to collaborate in real-time.</p>
                        <form onSubmit={handleJoinWorkspace} className="join-input-group">
                            <input
                                type="text"
                                placeholder="Enter Room ID"
                                value={joinRoomId}
                                onChange={(e) => setJoinRoomId(e.target.value)}
                            />
                            <button type="submit" className="btn-secondary">
                                <Search className="w-4 h-4 mr-1.5" />
                                <span>Join</span>
                            </button>
                        </form>
                    </div>
                </section>

                <section className="dashboard-recent-section">
                    <div className="recent-header">
                        <h3>Your Saved Workspaces</h3>
                    </div>
                    {renderWorkspaceContent()}
                </section>
            </main>
        </div>
    );
};

export default Dashboard;