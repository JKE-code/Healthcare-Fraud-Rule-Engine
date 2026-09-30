import React from 'react';
import { RiskBadge, PredictionBadge } from './RiskBadge';

export function TransactionDetails({ tx, onClose, onBlock, onMarkSafe, isDocked = false }) {
  if (!tx) return null;

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(tx.amount);

  const fraudPercent = (tx.fraud_probability * 100).toFixed(1);
  const anomalyPercent = (tx.anomaly_score * 100).toFixed(1);
  const isCritical = tx.risk_level === 'CRITICAL';
  const isHigh = tx.risk_level === 'HIGH';

  // Segmented visual bar (10 segments)
  const segments = Array.from({ length: 10 }).map((_, i) => {
    const threshold = (i + 1) * 0.1;
    const isActive = tx.fraud_probability >= threshold - 0.05;
    let color = '#10b981'; // green
    if (i >= 4) color = '#f59e0b'; // yellow/amber
    if (i >= 7) color = '#ea580c'; // orange
    if (i >= 8) color = '#dc2626'; // red
    return { isActive, color };
  });

  const content = (
    <div className="docked-details-card">
      {/* Header */}
      <div className="details-card-header">
        <div className="details-header-title-group">
          <div className="details-kicker-row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>TRANSACTION DETAILS</span>
          </div>
          <div className="details-tx-headline">
            <span className="details-tx-id">{tx.transaction_id}</span>
            <span className={`details-tag-flag ${tx.prediction === 'FRAUD' ? 'tag-fraud' : 'tag-legit'}`}>
              {tx.prediction || 'FRAUD'}
            </span>
            {isCritical && (
              <span className="details-tag-quarantine">QUARANTINED</span>
            )}
          </div>
        </div>

        {onClose && (
          <button className="details-close-btn" onClick={onClose} aria-label="Close details">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      <div className="details-card-body">
        {/* Top Flagged Amount Hero Box */}
        <div className="flagged-amount-box">
          <div className="amount-headline-row">
            <div className="amount-label-wrap">
              <span className="flagged-label">FLAGGED AMOUNT</span>
              <span className="flagged-sub">Pre-authorization rule active</span>
            </div>
            <span className="flagged-hero-amount">{formattedAmount}</span>
          </div>

          <div className="prob-meter-section">
            <div className="prob-text-row">
              <span className="prob-label">
                <span className="square-dot" /> Fraud Probability
              </span>
              <span className="prob-badge">{fraudPercent}%</span>
            </div>

            {/* Segmented Gradient Bar */}
            <div className="segmented-gauge">
              {segments.map((seg, idx) => (
                <div
                  key={idx}
                  className={`gauge-segment ${seg.isActive ? 'active' : 'inactive'}`}
                  style={{ backgroundColor: seg.isActive ? seg.color : '#e2e8f0' }}
                />
              ))}
            </div>

            <div className="score-sub-row">
              <span className="sub-stat">Anomaly Score: <strong>{anomalyPercent}%</strong></span>
              <span className="sub-stat">Risk Level: <strong className={isCritical ? 'text-critical' : ''}>{tx.risk_level}</strong></span>
            </div>
          </div>
        </div>

        {/* Context Key-Values */}
        <div className="context-spec-table">
          <div className="context-spec-row">
            <span className="spec-key">Merchant</span>
            <span className="spec-val font-semibold">{tx.merchant}</span>
          </div>

          <div className="context-spec-row">
            <span className="spec-key">Geographic Origin</span>
            <span className="spec-val location-pin-val">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {tx.location}
            </span>
          </div>

          <div className="context-spec-row">
            <span className="spec-key">Device Identity</span>
            <span className="spec-val">
              {tx.device === 'new_device' ? (
                <span className="device-mismatch-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2a10 10 0 0 0-10 10c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69" />
                  </svg>
                  Fingerprint Mismatch
                </span>
              ) : (
                <span className="device-normal-badge">Verified Device ({tx.device})</span>
              )}
            </span>
          </div>

          <div className="context-spec-row">
            <span className="spec-key">Payment Instrument</span>
            <span className="spec-val card-token-val">
              {tx.payment_method}
            </span>
          </div>
        </div>

        {/* Customer Historical Pattern vs Current Transaction Analysis */}
        <div style={{
          marginTop: '14px',
          padding: '12px',
          borderRadius: '8px',
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(51, 65, 85, 0.8)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.5">
              <path d="M12 20v-6M6 20V10M18 20V4" />
            </svg>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#94a3b8' }}>
              CUSTOMER BEHAVIORAL PROFILE COMPARISON
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
            <div style={{ padding: '8px', borderRadius: '6px', background: 'rgba(30, 41, 59, 0.5)' }}>
              <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Normal Baseline</span>
              <strong style={{ color: '#10b981' }}>₹450 - ₹4,500</strong>
              <div style={{ color: '#94a3b8', fontSize: '10px', marginTop: '2px' }}>Domestic • Trusted Mobile</div>
            </div>

            <div style={{ padding: '8px', borderRadius: '6px', background: 'rgba(30, 41, 59, 0.5)' }}>
              <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Current Attempt</span>
              <strong style={{ color: tx.amount > 10000 ? '#ef4444' : '#38bdf8' }}>
                ₹{tx.amount?.toLocaleString()}
              </strong>
              <div style={{ color: '#94a3b8', fontSize: '10px', marginTop: '2px' }}>
                {tx.location} • {tx.device}
              </div>
            </div>
          </div>

          {/* Anomaly verdict comparison tag */}
          <div style={{
            marginTop: '8px',
            padding: '6px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            background: tx.risk_level === 'CRITICAL' || tx.risk_level === 'HIGH' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
            color: tx.risk_level === 'CRITICAL' || tx.risk_level === 'HIGH' ? '#fca5a5' : '#86efac',
            border: `1px solid ${tx.risk_level === 'CRITICAL' || tx.risk_level === 'HIGH' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`
          }}>
            {tx.risk_level === 'CRITICAL' || tx.risk_level === 'HIGH' ? (
              <span>⚠️ <strong>Anomaly Detected:</strong> Transaction diverges from the customer's typical spending baseline, device fingerprint, or geographic perimeter.</span>
            ) : (
              <span>✓ <strong>Within Baseline:</strong> Matches the customer's usual transaction velocity and authenticated device signature.</span>
            )}
          </div>
        </div>

        {/* Why was this flagged? (Explainability Box) */}
        <div className="flagged-reasons-card">
          <div className="reasons-header">
            <div className="reasons-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              WHY WAS THIS FLAGGED?
            </div>
            <span className="confidence-pill">HIGH CONFIDENCE</span>
          </div>

          <ul className="reasons-bullet-list">
            {(!tx.explanation || tx.explanation.length === 0) ? (
              <li className="reason-bullet safe-bullet">
                ✓ No anomalous indicators found. Fits established baseline.
              </li>
            ) : (
              tx.explanation.map((item, idx) => (
                <li key={idx} className="reason-bullet">
                  <span className="red-dot-bullet">•</span>
                  <span>{item}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Recommended Actions */}
        <div className="details-actions-bar" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button className="btn-block-tx" onClick={() => onBlock && onBlock(tx)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
            Block TX
          </button>
          <button className="btn-safe-tx" onClick={() => onMarkSafe && onMarkSafe(tx)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Mark as Safe
          </button>
        </div>

        {/* Unique Feature: 1-Click Export Forensic Dossier */}
        <button
          type="button"
          onClick={() => {
            const dossier = {
              incident_id: `INC-${tx.transaction_id}`,
              timestamp: tx.timestamp || new Date().toISOString(),
              target: {
                amount: `INR ${tx.amount}`,
                merchant: tx.merchant,
                location: tx.location,
                device: tx.device,
                instrument: tx.payment_method
              },
              ml_verdict: {
                prediction: tx.prediction,
                risk_level: tx.risk_level,
                fraud_probability: `${(tx.fraud_probability * 100).toFixed(1)}%`,
                anomaly_score: `${(tx.anomaly_score * 100).toFixed(1)}%`,
                explainability: tx.explanation || []
              },
              compliance_standard: "RBI / NPCI Cyber-Fraud Intercept Mandate v4.2"
            };
            const blob = new Blob([JSON.stringify(dossier, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Forensic_Dossier_${tx.transaction_id}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          style={{
            marginTop: '10px',
            width: '100%',
            padding: '8px 12px',
            borderRadius: '6px',
            background: 'rgba(30, 41, 59, 0.7)',
            border: '1px solid #334155',
            color: '#38bdf8',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s ease'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export Compliance Incident Dossier
        </button>
      </div>
    </div>
  );

  if (isDocked) {
    return <div className="details-docked-wrapper">{content}</div>;
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        {content}
      </aside>
    </div>
  );
}
