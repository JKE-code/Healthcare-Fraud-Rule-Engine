import React from 'react';

export function StatCard({
  label,
  value,
  badgeText,
  badgeType = 'neutral',
  leftStat,
  rightStat,
  iconType,
  cardTheme = 'default'
}) {
  return (
    <div className={`secops-stat-card theme-${cardTheme}`}>
      <div className="card-top-accent" />
      <div className="card-inner-pad">
        <div className="stat-header-row">
          <div className="stat-title-wrap">
            {cardTheme === 'fraud' && <span className="status-dot dot-red" />}
            {cardTheme === 'high-risk' && <span className="status-dot dot-amber" />}
            <span className="stat-label-text">{label}</span>
          </div>
          <div className="stat-icon-wrap">{renderIcon(iconType)}</div>
        </div>

        <div className="stat-value-row">
          <span className={`stat-big-number ${cardTheme === 'fraud' ? 'text-red' : ''}`}>
            {value}
          </span>
          {badgeText && (
            <span className={`stat-pill-badge badge-${badgeType}`}>
              {badgeText}
            </span>
          )}
        </div>

        {(leftStat || rightStat) && (
          <div className="stat-footer-metrics">
            <span className="footer-metric-left">{leftStat}</span>
            <span className="footer-metric-right">{rightStat}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function renderIcon(type) {
  switch (type) {
    case 'total':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
          <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
          <line x1="6" y1="6" x2="6.01" y2="6" />
          <line x1="6" y1="18" x2="6.01" y2="18" />
        </svg>
      );
    case 'fraud':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <circle cx="12" cy="11" r="3" />
        </svg>
      );
    case 'high-risk':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case 'avg-risk':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      );
    default:
      return null;
  }
}
