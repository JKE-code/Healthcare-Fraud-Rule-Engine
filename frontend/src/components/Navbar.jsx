import React from 'react';

export function Navbar({ currentRoute, onNavigate, wsStatus, modelStatus }) {
  return (
    <header className="navbar-container">
      <div className="navbar-inner">
        {/* Brand Logo & Title */}
        <div className="navbar-brand" onClick={() => onNavigate('/dashboard')}>
          <div className="brand-logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <div className="brand-title-wrap">
            <span className="brand-name">FraudGuard</span>
            <span className="brand-subtext">SECOPS CONSOLE</span>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="navbar-nav">
          <button
            id="nav-dashboard-btn"
            className={`nav-link ${currentRoute === '/dashboard' ? 'active' : ''}`}
            onClick={() => onNavigate('/dashboard')}
          >
            DASHBOARD
          </button>

          <button
            id="nav-pay-btn"
            className={`nav-link ${currentRoute === '/pay' ? 'active' : ''}`}
            onClick={() => onNavigate('/pay')}
          >
            MAKE PAYMENT
          </button>

          <button
            id="nav-rules-btn"
            className={`nav-link ${currentRoute === '/rules' ? 'active' : ''}`}
            onClick={() => onNavigate('/rules')}
          >
            POLICY RULES
          </button>

          <button
            id="nav-logs-btn"
            className={`nav-link ${currentRoute === '/logs' ? 'active' : ''}`}
            onClick={() => onNavigate('/logs')}
          >
            AUDIT LOGS
          </button>
        </nav>

        {/* Right Status & User Avatar */}
        <div className="navbar-right">
          <div className="system-live-pill">
            <span className="live-dot-pulse">
              <span className="dot-ping" />
              <span className="dot-core" style={
                modelStatus === 'live' ? {} :
                modelStatus === 'mock' ? { background: '#f59e0b' } :
                { background: '#ef4444' }
              } />
            </span>
            <span className="live-pill-text">
              {modelStatus === 'live' ? 'LIVE' : modelStatus === 'mock' ? 'MOCK' : 'OFFLINE'}
            </span>
            <span className="live-pill-divider" />
            <span className="live-pill-status">
              {modelStatus === 'live' ? 'Model: Live ML' :
               modelStatus === 'mock' ? 'Model: Mock Mode' : 'Model: Offline'}
            </span>
          </div>

          <div className="user-avatar-btn" title="SecOps Admin (nishanth@fraudguard)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        </div>
      </div>
    </header>
  );
}
