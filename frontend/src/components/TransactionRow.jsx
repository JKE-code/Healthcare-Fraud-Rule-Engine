import React from 'react';

export function TransactionRow({ tx, isNew, onClick, isSelected }) {
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(tx.amount);

  const fraudPercent = ((tx.risk_score || tx.fraud_probability || 0) * 100).toFixed(1);
  const isCritical = tx.risk_level === 'CRITICAL';
  const isHigh = tx.risk_level === 'HIGH';
  const isFraud = tx.prediction === 'FRAUD';

  const reviewStatus = tx.review_status || (tx.is_flagged ? 'FLAGGED' : 'CLEARED');

  const statusStyleMap = {
    FLAGGED: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' },
    REVIEWED: { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' },
    CLEARED: { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' },
    PENDING: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }
  };

  const statusStyle = statusStyleMap[reviewStatus] || statusStyleMap.PENDING;

  // Format timestamp for clean display
  let displayTime = tx.timestamp || '';
  if (displayTime.includes('T')) {
    const parts = displayTime.split('T');
    displayTime = parts[1].slice(0, 8);
  }

  return (
    <tr
      onClick={() => onClick(tx)}
      className={`secops-tx-row ${isNew ? 'row-highlight' : ''} ${isSelected ? 'row-active-selected' : ''}`}
    >
      <td className="cell-txid">
        <div className="tx-id-badge-wrap">
          <span className={`tx-signal-dot ${isCritical || isHigh ? 'dot-crimson' : 'dot-emerald'}`} />
          <span className="tx-id-code">{tx.transaction_id}</span>
          {(tx.channel === 'KAGGLE_DATASET' || tx.channel === 'KAGGLE_LIVE') ? (
            <span
              style={{
                fontSize: '8.5px',
                padding: '1px 4px',
                borderRadius: '3px',
                fontWeight: 800,
                background: 'rgba(2, 132, 199, 0.25)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                letterSpacing: '0.03em',
              }}
              title="Authentic transaction from Kaggle dataset (kartik2112/fraud-detection)"
            >
              KAGGLE
            </span>
          ) : (
            <span
              style={{
                fontSize: '8.5px',
                padding: '1px 4px',
                borderRadius: '3px',
                fontWeight: 700,
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                letterSpacing: '0.03em',
              }}
              title="Procedural synthetic persona baseline"
            >
              SYNTH
            </span>
          )}
          {tx.aws_alert_sent && (
            <span
              className="scp-badge"
              style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)' }}
              title="AWS SES/SNS High-Risk Alert Dispatched"
            >
              AWS 🚨
            </span>
          )}
          {(isCritical || isHigh) && !tx.aws_alert_sent && <span className="scp-badge">SCP</span>}
        </div>
      </td>

      <td className="cell-time">{displayTime}</td>

      <td className="cell-amount">{formattedAmount}</td>

      <td className="cell-merchant">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <span className="merchant-truncated" title={`${tx.merchant} (${tx.location || 'Unknown'})`}>
            {tx.merchant}
          </span>
          {tx.flags && tx.flags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
              {tx.flags.map((flag, idx) => {
                const shortCode = flag.rule_code ? flag.rule_code.replace('RULE_', '') : 'RULE';
                const isCrit = flag.severity === 'CRITICAL';
                return (
                  <span
                    key={idx}
                    style={{
                      fontSize: '9px',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      fontWeight: 700,
                      backgroundColor: isCrit ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                      color: isCrit ? '#fca5a5' : '#fde047',
                      border: `1px solid ${isCrit ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                      letterSpacing: '0.02em',
                    }}
                    title={flag.reason || flag.rule_name}
                  >
                    {shortCode}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </td>

      <td className="cell-fraudscore">
        <span className={`fraud-score-num ${isCritical || isHigh ? 'score-red' : 'score-green'}`}>
          {fraudPercent}%
        </span>
      </td>

      <td className="cell-risk">
        <span className={`risk-pill-chip ${isCritical ? 'chip-critical' : isHigh ? 'chip-high' : tx.risk_level === 'MEDIUM' ? 'chip-medium' : 'chip-low'}`}>
          {tx.risk_level || 'LOW'}
        </span>
      </td>

      <td className="cell-prediction">
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            backgroundColor: statusStyle.bg,
            color: statusStyle.text,
            border: statusStyle.border,
          }}
        >
          {reviewStatus}
        </span>
      </td>

      <td className="cell-action">
        <button
          className="btn-inspect-action"
          onClick={(e) => {
            e.stopPropagation();
            onClick(tx);
          }}
        >
          Inspect
        </button>
      </td>
    </tr>
  );
}
