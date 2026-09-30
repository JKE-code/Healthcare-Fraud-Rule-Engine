import React, { useState } from 'react';
import { TransactionRow } from './TransactionRow';

export function TransactionTable({
  transactions = [],
  newTxId,
  selectedTx,
  onSelectTx
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [reviewFilter, setReviewFilter] = useState('ALL'); // ALL, FLAGGED, REVIEWED, CLEARED
  const [riskFilter, setRiskFilter] = useState('ALL');

  const flaggedCount = transactions.filter(
    (t) => t.review_status === 'FLAGGED' || t.is_flagged
  ).length;

  const filtered = transactions.filter((tx) => {
    const matchesSearch =
      tx.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.location && tx.location.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    // Review Status Filter
    const currentStatus = tx.review_status || (tx.is_flagged ? 'FLAGGED' : 'CLEARED');
    if (reviewFilter === 'FLAGGED' && currentStatus !== 'FLAGGED') return false;
    if (reviewFilter === 'REVIEWED' && currentStatus !== 'REVIEWED') return false;
    if (reviewFilter === 'CLEARED' && currentStatus !== 'CLEARED') return false;

    // Risk Level Filter
    if (riskFilter !== 'ALL' && tx.risk_level !== riskFilter) return false;

    return true;
  });

  return (
    <div className="secops-table-card">
      {/* Table Header Bar */}
      <div className="table-top-toolbar" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div className="toolbar-left">
          <div className="title-with-beacon">
            <span className="live-emerald-beacon" />
            <h2 className="toolbar-headline">Reviewer Monitoring Queue</h2>
          </div>
          <div className="receiving-chip">
            <span className="pulse-mini-dot" />
            <span>SQLite Persisted Stream</span>
          </div>
        </div>

        <div className="toolbar-right" style={{ gap: '8px' }}>
          {/* Search Box */}
          <div className="table-search-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="search-icon">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="table-search-input"
              placeholder="Search ID, Merchant, City..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Risk Level Filter Select */}
          <div className="risk-dropdown-wrap">
            <select
              className="risk-select-filter"
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
            >
              <option value="ALL">All Risk Levels</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="HIGH">High Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="LOW">Low Risk</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reviewer Queue Tab Filter Row */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          padding: '8px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
          background: 'rgba(15, 23, 42, 0.6)',
        }}
      >
        <button
          type="button"
          onClick={() => setReviewFilter('ALL')}
          style={{
            padding: '4px 12px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            border: reviewFilter === 'ALL' ? '1px solid #38bdf8' : '1px solid transparent',
            background: reviewFilter === 'ALL' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: reviewFilter === 'ALL' ? '#38bdf8' : '#94a3b8',
          }}
        >
          All ({transactions.length})
        </button>

        <button
          type="button"
          onClick={() => setReviewFilter('FLAGGED')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            border: reviewFilter === 'FLAGGED' ? '1px solid #ef4444' : '1px solid transparent',
            background: reviewFilter === 'FLAGGED' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
            color: reviewFilter === 'FLAGGED' ? '#f87171' : '#94a3b8',
          }}
        >
          <span>Flagged Queue</span>
          {flaggedCount > 0 && (
            <span
              style={{
                backgroundColor: '#dc2626',
                color: '#fff',
                fontSize: '10px',
                padding: '1px 6px',
                borderRadius: '10px',
              }}
            >
              {flaggedCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setReviewFilter('REVIEWED')}
          style={{
            padding: '4px 12px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            border: reviewFilter === 'REVIEWED' ? '1px solid #38bdf8' : '1px solid transparent',
            background: reviewFilter === 'REVIEWED' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: reviewFilter === 'REVIEWED' ? '#38bdf8' : '#94a3b8',
          }}
        >
          Reviewed
        </button>

        <button
          type="button"
          onClick={() => setReviewFilter('CLEARED')}
          style={{
            padding: '4px 12px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            border: reviewFilter === 'CLEARED' ? '1px solid #10b981' : '1px solid transparent',
            background: reviewFilter === 'CLEARED' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
            color: reviewFilter === 'CLEARED' ? '#34d399' : '#94a3b8',
          }}
        >
          Cleared
        </button>
      </div>

      {/* Table Content */}
      <div className="secops-table-scroller">
        <table className="secops-table">
          <thead>
            <tr>
              <th>TRANSACTION ID</th>
              <th>TIME</th>
              <th>AMOUNT</th>
              <th>MERCHANT</th>
              <th>RISK SCORE</th>
              <th>RISK LEVEL</th>
              <th>REVIEW STATUS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-row-td">
                  No transactions found matching active filter.
                </td>
              </tr>
            ) : (
              filtered.map((tx) => (
                <TransactionRow
                  key={tx.transaction_id}
                  tx={tx}
                  isNew={tx.transaction_id === newTxId}
                  isSelected={selectedTx && selectedTx.transaction_id === tx.transaction_id}
                  onClick={onSelectTx}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
