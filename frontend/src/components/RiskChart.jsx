import React, { useState } from 'react';

export function RiskChart({ transactions = [] }) {
  const [activeTier, setActiveTier] = useState(null);

  const total = transactions.length || 1;
  const lowCount = transactions.filter((t) => t.risk_level === 'LOW').length;
  const medCount = transactions.filter((t) => t.risk_level === 'MEDIUM').length;
  const highCount = transactions.filter((t) => t.risk_level === 'HIGH').length;
  const critCount = transactions.filter((t) => t.risk_level === 'CRITICAL').length;

  const lowPct = ((lowCount / total) * 100).toFixed(1);
  const medPct = ((medCount / total) * 100).toFixed(1);
  const highPct = ((highCount / total) * 100).toFixed(1);
  const critPct = ((critCount / total) * 100).toFixed(1);

  const tiers = [
    { id: 'low', label: 'LOW (0-20%)', count: lowCount, percent: `${lowPct}%`, color: '#059669', colorClass: 'tier-emerald', width: `${Math.max(8, parseFloat(lowPct))}%` },
    { id: 'med', label: 'MEDIUM (21-50%)', count: medCount, percent: `${medPct}%`, color: '#d97706', colorClass: 'tier-amber', width: `${Math.max(6, parseFloat(medPct))}%` },
    { id: 'high', label: 'HIGH (51-84%)', count: highCount, percent: `${highPct}%`, color: '#ea580c', colorClass: 'tier-orange', width: `${Math.max(4, parseFloat(highPct))}%` },
    { id: 'crit', label: 'CRITICAL (≥85%)', count: critCount, percent: `${critPct}%`, color: '#dc2626', colorClass: 'tier-crimson', width: `${Math.max(3, parseFloat(critPct))}%` }
  ];

  return (
    <div className="secops-chart-card interactive-chart-card">
      <div className="chart-card-top-bar">
        <div className="chart-card-heading">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <h3>Risk Tier Distribution</h3>
        </div>
        <span className="card-window-pill">HOVER TIERS</span>
      </div>

      <div className="risk-bars-container">
        {tiers.map((tier) => {
          const isHovered = activeTier === tier.id;
          return (
            <div
              key={tier.id}
              className="risk-progress-row"
              style={{
                cursor: 'pointer',
                padding: '4px 6px',
                borderRadius: '6px',
                background: isHovered ? 'rgba(241, 245, 249, 0.8)' : 'transparent',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={() => setActiveTier(tier.id)}
              onMouseLeave={() => setActiveTier(null)}
            >
              <div className="risk-label-group">
                <span className="tier-name-label" style={{ fontWeight: isHovered ? 700 : 500 }}>
                  <span className={`tier-indicator-bullet ${tier.colorClass}`} />
                  {tier.label}
                </span>
                <span className="tier-percent-number" style={{ color: isHovered ? tier.color : 'inherit', fontWeight: isHovered ? 800 : 600 }}>
                  {tier.percent} <span style={{ fontSize: '10px', color: '#64748b' }}>({tier.count} tx)</span>
                </span>
              </div>
              <div className="risk-progress-track" style={{ height: isHovered ? '9px' : '6px', transition: 'height 0.2s' }}>
                <div
                  className={`risk-progress-fill ${tier.colorClass}`}
                  style={{
                    width: tier.width,
                    boxShadow: isHovered ? `0 0 8px ${tier.color}` : 'none',
                    transition: 'all 0.3s ease'
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="risk-card-footer-notes" style={{ marginTop: '12px' }}>
        <span className="auto-action-text">
          {activeTier ? (
            <span>Selected Tier: <strong style={{ textTransform: 'uppercase' }}>{activeTier}</strong></span>
          ) : (
            <span>Auto-Intervention: <strong>≥85% Auto-Reject</strong></span>
          )}
        </span>
        <span className="adaptive-tuning-tag">
          Adaptive Engine: <strong>ACTIVE</strong>
        </span>
      </div>
    </div>
  );
}
