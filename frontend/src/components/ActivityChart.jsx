import React, { useState } from 'react';

export function ActivityChart({ transactions = [], selectedTx = null }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Take the last 7 transactions
  const recentPoints = transactions.slice(0, 7).reverse();

  // If selectedTx is provided and not in recent, prepend/include it
  const points = recentPoints.map((tx, idx) => {
    const isSelected = selectedTx && selectedTx.transaction_id === tx.transaction_id;
    const scoreVal = Math.round(((tx.risk_score != null ? tx.risk_score : tx.fraud_probability) || 0.15) * 100);
    return {
      x: 20 + idx * 45,
      y: Math.max(20, 100 - (scoreVal / 100) * 80),
      score: scoreVal,
      id: tx.transaction_id || `TX-${idx}`,
      time: tx.timestamp ? tx.timestamp.slice(11, 16) : `T-${7 - idx}m`,
      isSelected
    };
  });

  // Build SVG path
  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} 115 L ${points[0].x} 115 Z`;

  return (
    <div className="secops-chart-card interactive-chart-card">
      <div className="chart-card-top-bar">
        <div className="chart-card-heading">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <h3>Real-Time Threat Waveform</h3>
        </div>
        <span className="card-window-pill pill-scan" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span className="scan-mini-dot" style={{ background: '#10b981', width: '6px', height: '6px', borderRadius: '50%' }} /> 
          STREAMING
        </span>
      </div>

      <div className="activity-wave-container" style={{ position: 'relative', height: '130px', marginTop: '6px' }}>
        <svg viewBox="0 0 320 120" className="activity-wave-svg" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
          <defs>
            <linearGradient id="waveGradientInteractive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path d={areaD} fill="url(#waveGradientInteractive)" />

          {/* Grid lines */}
          <line x1="10" y1="35" x2="310" y2="35" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="10" y1="75" x2="310" y2="75" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />

          {/* Main animated line */}
          <path
            d={pathD}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((pt, idx) => {
            const isAlert = pt.score >= 50;
            const isHovered = hoveredPoint && hoveredPoint.id === pt.id;
            const isSelected = pt.isSelected;
            return (
              <g key={idx} style={{ cursor: 'pointer' }} onMouseEnter={() => setHoveredPoint(pt)} onMouseLeave={() => setHoveredPoint(null)}>
                {isSelected && (
                  <circle cx={pt.x} cy={pt.y} r="12" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="3 3">
                    <animateTransform attributeName="transform" type="rotate" from={`0 ${pt.x} ${pt.y}`} to={`360 ${pt.x} ${pt.y}`} dur="4s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? 7 : (isHovered ? 6 : (isAlert ? 4.5 : 3.5))}
                  fill={isSelected ? '#38bdf8' : (isAlert ? '#dc2626' : '#2563eb')}
                  stroke="#ffffff"
                  strokeWidth="2"
                  style={{ transition: 'all 0.2s' }}
                />
                {(isAlert || isSelected) && (
                  <circle cx={pt.x} cy={pt.y} r={isSelected ? 14 : 8} fill="none" stroke={isSelected ? '#38bdf8' : '#dc2626'} strokeWidth="1.5" opacity="0.6">
                    <animate attributeName="r" values={isSelected ? "8;16" : "5;14"} dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(4px)',
            color: '#ffffff',
            padding: '5px 9px',
            borderRadius: '6px',
            fontSize: '11px',
            pointerEvents: 'none',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
          }}>
            <strong style={{ color: hoveredPoint.score > 50 ? '#ef4444' : '#38bdf8' }}>
              Risk: {hoveredPoint.score}%
            </strong>
            <div style={{ color: '#94a3b8', fontSize: '10px' }}>{hoveredPoint.id} • {hoveredPoint.time}</div>
          </div>
        )}
      </div>

      <div className="activity-bottom-axis" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
        <span>T-5m</span>
        <span>T-3m</span>
        <span>T-1m</span>
        <span className="live-marker-text" style={{ color: '#10b981', fontWeight: 700 }}>STREAMING LIVE</span>
      </div>
    </div>
  );
}
