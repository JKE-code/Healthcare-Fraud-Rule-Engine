import React, { useState } from 'react';

export function FraudChart({ transactions = [] }) {
  const [hoveredSlice, setHoveredSlice] = useState(null);

  const total = transactions.length || 1;
  const fraudCount = transactions.filter((t) => t.prediction === 'FRAUD' || t.risk_level === 'CRITICAL').length;
  const legitCount = total - fraudCount;

  const fraudPercent = ((fraudCount / total) * 100).toFixed(1);
  const legitPercent = (100 - parseFloat(fraudPercent)).toFixed(1);

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const legitStrokeDash = ((100 - parseFloat(fraudPercent)) / 100) * circumference;
  const fraudStrokeDash = (parseFloat(fraudPercent) / 100) * circumference;

  return (
    <div className="secops-chart-card interactive-chart-card">
      <div className="chart-card-top-bar">
        <div className="chart-card-heading">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
          <h3>Fraud vs Legitimate Flow</h3>
        </div>
        <span className="card-window-pill">LIVE TELEMETRY</span>
      </div>

      <div className="donut-body-wrapper">
        <div className="donut-ring-container" style={{ position: 'relative' }}>
          <svg width="150" height="150" viewBox="0 0 110 110" className="donut-svg-element">
            {/* Background track */}
            <circle cx="55" cy="55" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="14" />

            {/* Legitimate green arc */}
            <circle
              cx="55"
              cy="55"
              r={radius}
              fill="none"
              stroke="#059669"
              strokeWidth={hoveredSlice === 'legit' ? "18" : "14"}
              strokeDasharray={`${legitStrokeDash} ${circumference}`}
              strokeDashoffset="0"
              transform="rotate(-90 55 55)"
              strokeLinecap="round"
              style={{ cursor: 'pointer', transition: 'stroke-width 0.25s cubic-bezier(0.4, 0, 0.2, 1)' }}
              onMouseEnter={() => setHoveredSlice('legit')}
              onMouseLeave={() => setHoveredSlice(null)}
            />

            {/* Fraud red arc */}
            <circle
              cx="55"
              cy="55"
              r={radius}
              fill="none"
              stroke="#dc2626"
              strokeWidth={hoveredSlice === 'fraud' ? "18" : "14"}
              strokeDasharray={`${fraudStrokeDash} ${circumference}`}
              strokeDashoffset={-legitStrokeDash}
              transform="rotate(-90 55 55)"
              strokeLinecap="round"
              style={{ cursor: 'pointer', transition: 'stroke-width 0.25s cubic-bezier(0.4, 0, 0.2, 1)' }}
              onMouseEnter={() => setHoveredSlice('fraud')}
              onMouseLeave={() => setHoveredSlice(null)}
            />
          </svg>

          {/* Dynamic center metric on hover */}
          <div className="donut-center-content">
            <span className="clean-percentage" style={{
              color: hoveredSlice === 'fraud' ? '#dc2626' : (hoveredSlice === 'legit' ? '#059669' : 'inherit'),
              transition: 'color 0.2s ease'
            }}>
              {hoveredSlice === 'fraud' ? `${fraudPercent}%` : `${legitPercent}%`}
            </span>
            <span className="clean-flow-tag">
              {hoveredSlice === 'fraud' ? 'FRAUD RATE' : 'CLEAN TRAFFIC'}
            </span>
          </div>
        </div>

        {/* Interactive Legend with Hover Highlights */}
        <div className="donut-legend-bottom" style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <div
            className={`legend-item-legit ${hoveredSlice === 'legit' ? 'legend-active' : ''}`}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              cursor: 'pointer',
              background: hoveredSlice === 'legit' ? 'rgba(5, 150, 105, 0.1)' : 'transparent',
              transition: 'all 0.2s'
            }}
            onMouseEnter={() => setHoveredSlice('legit')}
            onMouseLeave={() => setHoveredSlice(null)}
          >
            <span className="legend-dot dot-emerald" />
            Legit: <strong>{legitCount.toLocaleString()}</strong> ({legitPercent}%)
          </div>

          <div
            className={`legend-item-fraud ${hoveredSlice === 'fraud' ? 'legend-active' : ''}`}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              cursor: 'pointer',
              background: hoveredSlice === 'fraud' ? 'rgba(220, 38, 38, 0.1)' : 'transparent',
              transition: 'all 0.2s'
            }}
            onMouseEnter={() => setHoveredSlice('fraud')}
            onMouseLeave={() => setHoveredSlice(null)}
          >
            <span className="legend-dot dot-crimson" />
            Fraud: <strong>{fraudCount.toLocaleString()}</strong> ({fraudPercent}%)
          </div>
        </div>
      </div>
    </div>
  );
}
