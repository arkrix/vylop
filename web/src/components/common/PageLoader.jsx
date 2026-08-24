import React, { useState, useEffect } from 'react';
import { Terminal } from 'lucide-react';
import './PageLoader.css';

const DEFAULT_MESSAGES = [
  "Spinning up isolated execution sandbox...",
  "Synchronizing CRDT document state...",
  "Connecting to peer WebSocket mesh...",
  "Mounting language syntax parser...",
  "Allocating secure runtime resources..."
];

const PageLoader = ({ message = "Loading Workspace...", subtext = null }) => {
  const [currentMsgIndex, setCurrentMsgIndex] = useState(0);

  useEffect(() => {
    if (subtext) return;

    const interval = setInterval(() => {
      setCurrentMsgIndex((prev) => (prev + 1) % DEFAULT_MESSAGES.length);
    }, 1800);

    return () => clearInterval(interval);
  }, [subtext]);

  return (
    <div className="page-loader-overlay">
      <div className="loader-ambient-glow" />

      <div className="loader-content-box">
        {/* Animated Scanner & Radar Core */}
        <div className="loader-radar-wrapper">
          <div className="loader-pulse-ring" />
          <div className="loader-pulse-ring delay-1" />
          <div className="loader-pulse-ring delay-2" />

          <div className="loader-icon-core">
            <div className="loader-scan-line" />
            <Terminal className="loader-brand-icon" />
          </div>
        </div>

        {/* Status Indicators */}
        <div className="loader-text-group">
          <div className="loader-main-status">
            <div className="loader-status-dot" />
            <span>{message}</span>
          </div>

          <div className="loader-dynamic-msg">
            {subtext || DEFAULT_MESSAGES[currentMsgIndex]}
          </div>

          <div className="loader-progress-track">
            <div className="loader-progress-bar" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageLoader;