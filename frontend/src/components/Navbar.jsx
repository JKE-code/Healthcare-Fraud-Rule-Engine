import React from 'react';

export function Navbar({ currentRoute, onNavigate, wsStatus, modelStatus, modelName }) {
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
            <span className="brand-name">Acentra</span>
            <span className="brand-subtext">FRAUD RULE ENGINE</span>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="navbar-nav">
          <button
            id="nav-dashboard-btn"
            className={`nav-link ${currentRoute === '/dashboard' ? 'active' : ''}`}
            onClick={() => onNavigate('/dashboard')}
          >
            REVIEWER CONSOLE
          </button>

          <button
            id="nav-pay-btn"
            className={`nav-link ${currentRoute === '/pay' ? 'active' : ''}`}
            onClick={() => onNavigate('/pay')}
          >
            ATTACK SIMULATOR
          </button>

          <button
            id="nav-rules-btn"
            className={`nav-link ${currentRoute === '/rules' ? 'active' : ''}`}
            onClick={() => onNavigate('/rules')}
          >
            RULE POLICIES
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
          {/* Dual-Engine ML Status Pill */}
          <div
            className="system-live-pill"
            style={{
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
            }}
            title="Active Dual-Engine ML Classifier & SHAP Explainability Engine"
          >
            <span style={{ fontSize: '11px' }}>🧠</span>
            <span className="live-pill-text" style={{ color: '#38bdf8' }}>
              ML {modelStatus === 'live' ? 'ONLINE' : 'ACTIVE'}
            </span>
            <span className="live-pill-divider" />
            <span className="live-pill-status" style={{ color: '#bae6fd' }}>
              {modelName || 'RandomForest'}
            </span>
          </div>

          <div className="system-live-pill">
            <span className="live-dot-pulse">
              <span className="dot-ping" />
              <span className="dot-core" style={{ background: '#10b981' }} />
            </span>
            <span className="live-pill-text">ONLINE</span>
            <span className="live-pill-divider" />
            <span className="live-pill-status">
              Rule Engine: 4 Active Rules
            </span>
          </div>

          <div
            className="user-avatar-btn"
            title="Lead Reviewer: Vikas (SecOps Operations)"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', width: 'auto' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8' }}>Vikas (Reviewer)</span>
          </div>
        </div>
      </div>
    </header>
  );
}
