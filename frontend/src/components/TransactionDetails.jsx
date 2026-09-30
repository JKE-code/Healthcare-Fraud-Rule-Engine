import React, { useState } from 'react';
import { reviewTransaction } from '../api';

export function TransactionDetails({
  tx,
  onClose,
  onUpdateTx,
  isDocked = false
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analystNotes, setAnalystNotes] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  if (!tx) return null;

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(tx.amount);

  const riskPercent = (((tx.risk_score || tx.fraud_probability || 0)) * 100).toFixed(1);
  const isCritical = tx.risk_level === 'CRITICAL';
  const isHigh = tx.risk_level === 'HIGH';

  const reviewStatus = tx.review_status || (tx.is_flagged ? 'FLAGGED' : 'CLEARED');

  const statusColorMap = {
    FLAGGED: { bg: 'rgba(239, 68, 68, 0.2)', text: '#fca5a5', border: '1px solid #ef4444' },
    REVIEWED: { bg: 'rgba(56, 189, 248, 0.2)', text: '#7dd3fc', border: '1px solid #38bdf8' },
    CLEARED: { bg: 'rgba(16, 185, 129, 0.2)', text: '#6ee7b7', border: '1px solid #10b981' },
    PENDING: { bg: 'rgba(245, 158, 11, 0.2)', text: '#fde68a', border: '1px solid #f59e0b' }
  };
  const activeStatusColor = statusColorMap[reviewStatus] || statusColorMap.PENDING;

  // Segmented visual bar (10 segments)
  const segments = Array.from({ length: 10 }).map((_, i) => {
    const threshold = (i + 1) * 0.1;
    const isActive = (tx.risk_score || tx.fraud_probability || 0) >= threshold - 0.05;
    let color = '#10b981'; // green
    if (i >= 4) color = '#f59e0b'; // yellow/amber
    if (i >= 7) color = '#ea580c'; // orange
    if (i >= 8) color = '#dc2626'; // red
    return { isActive, color };
  });

  const handleReviewAction = async (action) => {
    setIsSubmitting(true);
    setFeedbackMsg(null);
    try {
      const updated = await reviewTransaction(
        tx.transaction_id,
        action,
        'SecOps Analyst (Lead)',
        analystNotes || `Marked as ${action} from Reviewer Console.`
      );
      if (onUpdateTx) onUpdateTx(updated);
      setFeedbackMsg({ type: 'success', text: `Transaction successfully marked as ${action}!` });
      setTimeout(() => setFeedbackMsg(null), 3500);
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to update review status.' });
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <span>REVIEW CONSOLE DOSSIER</span>
          </div>
          <div className="details-tx-headline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="details-tx-id">{tx.transaction_id}</span>
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: activeStatusColor.bg,
                color: activeStatusColor.text,
                border: activeStatusColor.border,
              }}
            >
              {reviewStatus}
            </span>
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
        {/* AWS SES/SNS Alert Banner if triggered */}
        {tx.aws_alert_sent && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '6px',
              marginBottom: '12px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              fontSize: '11px',
            }}
          >
            <span style={{ fontSize: '14px' }}>🚨</span>
            <div>
              <strong>AWS SES & SNS Alert Dispatched:</strong> High-risk security threshold crossed.
              <div style={{ fontSize: '10px', color: '#cbd5e1' }}>
                Ref ID: <code>{tx.aws_message_id || 'AWS-DELIVERY-OK'}</code>
              </div>
            </div>
          </div>
        )}

        {/* Top Flagged Amount Hero Box */}
        <div className="flagged-amount-box">
          <div className="amount-headline-row">
            <div className="amount-label-wrap">
              <span className="flagged-label">AUTHORIZATION AMOUNT</span>
              <span className="flagged-sub">Evaluated by Extensible Rule Engine</span>
            </div>
            <span className="flagged-hero-amount">{formattedAmount}</span>
          </div>

          <div className="prob-meter-section">
            <div className="prob-text-row">
              <span className="prob-label">
                <span className="square-dot" /> Composite Risk Score
              </span>
              <span className="prob-badge">{riskPercent}%</span>
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
              <span className="sub-stat">Decision: <strong>{tx.decision || 'REVIEW'}</strong></span>
              <span className="sub-stat">Risk Level: <strong className={isCritical ? 'text-critical' : ''}>{tx.risk_level || 'LOW'}</strong></span>
            </div>
          </div>
        </div>

        {/* Context Key-Values */}
        <div className="context-kv-section">
          <div className="kv-row">
            <span className="kv-key">Customer ID:</span>
            <span className="kv-val">{tx.customer_id || 'CUST-1001'}</span>
          </div>
          <div className="kv-row">
            <span className="kv-key">Merchant:</span>
            <span className="kv-val">{tx.merchant}</span>
          </div>
          <div className="kv-row">
            <span className="kv-key">Location:</span>
            <span className="kv-val">{tx.location}</span>
          </div>
          <div className="kv-row">
            <span className="kv-key">Payment Method:</span>
            <span className="kv-val">{tx.payment_method} ({tx.channel || 'UPI'})</span>
          </div>
          <div className="kv-row">
            <span className="kv-key">Device:</span>
            <span className="kv-val">{tx.device}</span>
          </div>
        </div>

        {/* Reviewer Audit Info if already reviewed */}
        {tx.reviewed_by && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid #334155',
              fontSize: '11px',
              color: '#94a3b8',
              margin: '8px 0',
            }}
          >
            <div style={{ color: '#38bdf8', fontWeight: 700, marginBottom: '2px' }}>
              Reviewed by: {tx.reviewed_by}
            </div>
            {tx.reviewed_at && <div>Time: {new Date(tx.reviewed_at).toLocaleTimeString()}</div>}
            {tx.reviewer_notes && <div style={{ marginTop: '4px', color: '#f1f5f9' }}>Notes: "{tx.reviewer_notes}"</div>}
          </div>
        )}

        {/* Triggered Fraud Rules Breakdown Card */}
        <div className="flagged-reasons-card">
          <div className="reasons-header">
            <div className="reasons-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              TRIGGERED RULE ENGINE HEURISTICS
            </div>
            <span className="confidence-pill">
              {tx.flags && tx.flags.length > 0 ? `${tx.flags.length} RULES FIRED` : 'CLEARED'}
            </span>
          </div>

          <ul className="reasons-bullet-list">
            {(!tx.flags || tx.flags.length === 0) && (!tx.explanation || tx.explanation.length === 0) ? (
              <li className="reason-bullet safe-bullet">
                ✓ No fraud rules triggered. Within normal velocity and amount baseline.
              </li>
            ) : tx.flags && tx.flags.length > 0 ? (
              tx.flags.map((flag, idx) => (
                <li key={idx} className="reason-bullet" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="red-dot-bullet">•</span>
                    <strong style={{ color: flag.severity === 'CRITICAL' ? '#f87171' : '#fde047' }}>
                      [{flag.rule_code}] {flag.rule_name}
                    </strong>
                  </div>
                  <div style={{ paddingLeft: '14px', fontSize: '11px', color: '#cbd5e1' }}>
                    {flag.reason}
                  </div>
                  {flag.metrics && Object.keys(flag.metrics).length > 0 && (
                    <div style={{ paddingLeft: '14px', display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                      {Object.entries(flag.metrics).map(([k, v]) => (
                        <span
                          key={k}
                          style={{
                            fontSize: '10px',
                            padding: '1px 6px',
                            borderRadius: '3px',
                            background: 'rgba(15, 23, 42, 0.8)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#94a3b8',
                            fontFamily: 'monospace'
                          }}
                        >
                          {k}: <strong style={{ color: '#e2e8f0' }}>{typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(1)) : String(v)}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))
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

        {/* Reviewer Action Form */}
        <div style={{ marginTop: '12px' }}>
          <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
            Reviewer Notes / Justification:
          </label>
          <input
            type="text"
            className="table-search-input"
            style={{ width: '100%', marginBottom: '8px', fontSize: '12px' }}
            placeholder="e.g., Verified cardholder via 2FA step-up..."
            value={analystNotes}
            onChange={(e) => setAnalystNotes(e.target.value)}
          />

          {feedbackMsg && (
            <div
              style={{
                fontSize: '11px',
                padding: '6px 8px',
                borderRadius: '4px',
                marginBottom: '8px',
                background: feedbackMsg.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: feedbackMsg.type === 'success' ? '#34d399' : '#f87171',
                border: feedbackMsg.type === 'success' ? '1px solid #10b981' : '1px solid #ef4444',
              }}
            >
              {feedbackMsg.text}
            </div>
          )}

          <div className="details-actions-bar" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              className="btn-block-tx"
              style={{ background: '#3b82f6', borderColor: '#2563eb' }}
              disabled={isSubmitting}
              onClick={() => handleReviewAction('REVIEWED')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Mark as Reviewed
            </button>
            <button
              className="btn-safe-tx"
              disabled={isSubmitting}
              onClick={() => handleReviewAction('CLEARED')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Mark as Cleared
            </button>
          </div>
        </div>

        {/* 1-Click Export Forensic Dossier */}
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
                customer_id: tx.customer_id
              },
              rule_engine_verdict: {
                review_status: tx.review_status,
                risk_score: tx.risk_score,
                risk_level: tx.risk_level,
                triggered_flags: tx.flags || [],
                explanations: tx.explanation || []
              },
              aws_notification: {
                alert_dispatched: tx.aws_alert_sent,
                message_id: tx.aws_message_id
              },
              compliance_standard: "Acentra Hiring Hackathon - Fraud Rule Engine Mandate v1.0"
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
