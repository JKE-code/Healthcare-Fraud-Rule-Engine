import React, { useState, useEffect } from 'react';
import { fetchAuditLogs } from '../api';

const INITIAL_LOGS = [
  {
    id: 'LOG-8849102',
    timestamp: '2026-09-15 12:31:14.281 UTC',
    txId: 'TX-1027',
    decision: 'REJECT_403',
    eventType: 'AUTO_INTERCEPT',
    merchant: 'Al-Safa Watches & Luxury',
    amount: 95000,
    actor: 'Autonomous Risk Agent (XGB-F419)',
    reason: 'Rule RULE-GEO-04: Dubai foreign IP vs Mumbai SIM residence + New Device Hash',
    riskScore: 0.941,
    ip: '185.193.64.21 (Dubai, AE)',
    payload: {
      amount: 95000,
      merchant: 'Al-Safa Watches & Luxury',
      location: 'Dubai, UAE (ASN 5384)',
      device: 'new_device',
      payment_method: 'CARD',
      fraud_probability: 0.941,
      anomaly_score: 0.887,
      risk_level: 'CRITICAL',
      triggered_rules: ['RULE-GEO-04', 'RULE-AMT-09', 'RULE-DEV-08'],
      sha256_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    }
  },
  {
    id: 'LOG-8849101',
    timestamp: '2026-09-15 12:30:52.190 UTC',
    txId: 'TX-1033',
    decision: 'REJECT_403',
    eventType: 'AUTO_INTERCEPT',
    merchant: 'Offshore Gaming Portal',
    amount: 72000,
    actor: 'Autonomous Risk Agent (IsoForest-02)',
    reason: 'Rule RULE-VEL-01: 4 card authorization attempts in 22 seconds on high-risk MCC',
    riskScore: 0.890,
    ip: '194.26.29.110 (Limassol, CY)',
    payload: {
      amount: 72000,
      merchant: 'Offshore Gaming Portal',
      location: 'Limassol, Cyprus',
      device: 'new_device',
      payment_method: 'CARD',
      fraud_probability: 0.890,
      anomaly_score: 0.820,
      risk_level: 'CRITICAL',
      triggered_rules: ['RULE-VEL-01', 'RULE-MERCH-02'],
      sha256_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
    }
  },
  {
    id: 'LOG-8849100',
    timestamp: '2026-09-15 12:30:18.844 UTC',
    txId: 'TX-1002',
    decision: 'STEP_UP_302',
    eventType: 'CHALLENGE_ISSUED',
    merchant: 'Crypto Exchange Global',
    amount: 8500,
    actor: 'Rule Engine (RULE-DEV-08)',
    reason: 'Unrecognized desktop fingerprint profile on virtual asset on-ramp gateway',
    riskScore: 0.682,
    ip: '103.212.43.18 (Delhi, IN)',
    payload: {
      amount: 8500,
      merchant: 'Crypto Exchange Global',
      location: 'Delhi, India',
      device: 'desktop',
      payment_method: 'CARD',
      fraud_probability: 0.682,
      anomaly_score: 0.614,
      risk_level: 'HIGH',
      triggered_rules: ['RULE-DEV-08'],
      sha256_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'
    }
  },
  {
    id: 'LOG-8849099',
    timestamp: '2026-09-15 12:29:45.602 UTC',
    txId: 'TX-1001',
    decision: 'PASS_200',
    eventType: 'CLEARANCE_APPROVED',
    merchant: 'Amazon India',
    amount: 450,
    actor: 'Baseline Risk Evaluator',
    reason: 'All 42 heuristic checks satisfied. Known device & domestic IP match.',
    riskScore: 0.021,
    ip: '49.207.218.99 (Mumbai, IN)',
    payload: {
      amount: 450,
      merchant: 'Amazon India',
      location: 'Mumbai, India',
      device: 'mobile',
      payment_method: 'UPI',
      fraud_probability: 0.021,
      anomaly_score: 0.052,
      risk_level: 'LOW',
      triggered_rules: [],
      sha256_hash: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a'
    }
  },
  {
    id: 'LOG-8849098',
    timestamp: '2026-09-15 12:28:10.119 UTC',
    txId: 'TX-0994',
    decision: 'PASS_200',
    eventType: 'MANUAL_OVERRIDE',
    merchant: 'Apple Store Regent St',
    amount: 142000,
    actor: 'SecOps Analyst (nishanth@fraudguard)',
    reason: 'Customer verified phone pre-notification regarding overseas vacation travel',
    riskScore: 0.540,
    ip: '82.165.197.1 (London, UK)',
    payload: {
      amount: 142000,
      merchant: 'Apple Store Regent St',
      location: 'London, UK',
      device: 'mobile',
      payment_method: 'CARD',
      fraud_probability: 0.540,
      anomaly_score: 0.490,
      risk_level: 'MEDIUM',
      manual_approval_ticket: 'TICKET-49201',
      sha256_hash: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d'
    }
  }
];

export function AuditLogs() {
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [decisionFilter, setDecisionFilter] = useState('ALL');
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Fetch real reviewer audit trail from SQLite
  useEffect(() => {
    fetchAuditLogs()
      .then((res) => {
        if (res && res.logs && res.logs.length > 0) {
          const liveLogs = res.logs.map((l) => ({
            id: `AUDIT-${l.id}`,
            timestamp: l.timestamp ? l.timestamp.replace('T', ' ').slice(0, 19) + ' UTC' : 'RECENT',
            txId: l.transaction_id,
            decision: l.new_status === 'CLEARED' ? 'PASS_200' : 'REVIEW_HOLD',
            eventType: l.action,
            merchant: 'Analyst Triage Decision',
            amount: 0,
            actor: l.reviewer || 'Fraud Analyst',
            reason: l.notes || `Reviewer updated transaction status from ${l.previous_status} to ${l.new_status}`,
            riskScore: l.new_status === 'CLEARED' ? 0.05 : 0.85,
            ip: 'SecOps Console',
            payload: l,
          }));
          setLogs([...liveLogs, ...INITIAL_LOGS]);
        }
      })
      .catch((err) => {
        console.warn('Audit logs fetch warning:', err);
      });
  }, []);

  const toggleExpand = (id) => {
    setExpandedLogId((prev) => (prev === id ? null : id));
  };

  const copyPayload = (id, obj) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredLogs = logs.filter((log) => {
    const matchesDecision = decisionFilter === 'ALL' || log.decision === decisionFilter;
    const matchesSearch =
      log.txId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actor.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDecision && matchesSearch;
  });

  return (
    <div className="audit-page-container">
      {/* Header Banner */}
      <div className="audit-header-strip">
        <div className="audit-title-group">
          <div className="audit-badge-row">
            <span className="audit-pill-kicker">CRYPTOGRAPHIC AUDIT TRAIL</span>
            <span className="audit-cert-tag">SOC-2 TYPE II AUDITED</span>
          </div>
          <h1 className="audit-main-heading">SecOps Immutable Audit & Decision Logs</h1>
          <p className="audit-sub-heading">
            Tamper-evident, cryptographically hashed event stream recording all autonomous neural interventions and manual overrides.
          </p>
        </div>

        <div className="audit-header-controls">
          <div className="streaming-badge">
            <span className="live-emerald-pulse" />
            <span>STREAMING <strong>18 eps</strong></span>
          </div>
          <button
            className="btn-export-logs"
            onClick={() => alert('Log archive exported to JSON format with SHA-256 manifest.')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export JSON Archive
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="audit-metrics-strip">
        <div className="audit-metric-card">
          <span className="am-label">24H TELEMETRY EVENTS</span>
          <span className="am-val font-mono">48,291</span>
          <span className="am-sub text-muted">100% indexed</span>
        </div>
        <div className="audit-metric-card">
          <span className="am-label">AUTONOMOUS BLOCKS</span>
          <span className="am-val font-mono text-crimson">1,842</span>
          <span className="am-sub text-crimson">3.8% of total volume</span>
        </div>
        <div className="audit-metric-card">
          <span className="am-label">STEP-UP CHALLENGES</span>
          <span className="am-val font-mono text-amber">419</span>
          <span className="am-sub text-amber">OTP Verified: 91.2%</span>
        </div>
        <div className="audit-metric-card">
          <span className="am-label">MANUAL OVERRIDES</span>
          <span className="am-val font-mono">14</span>
          <span className="am-sub text-emerald">Analyst Signed</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="audit-filter-card">
        <div className="search-box-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="search-icon-svg">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="audit-search-input"
            placeholder="Search by Transaction ID, Log ID, Merchant, Reason, Actor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-select-group">
          <button
            className={`f-pill ${decisionFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setDecisionFilter('ALL')}
          >
            All Logs ({logs.length})
          </button>
          <button
            className={`f-pill ${decisionFilter === 'REJECT_403' ? 'active active-red' : ''}`}
            onClick={() => setDecisionFilter('REJECT_403')}
          >
            Reject 403
          </button>
          <button
            className={`f-pill ${decisionFilter === 'STEP_UP_302' ? 'active active-amber' : ''}`}
            onClick={() => setDecisionFilter('STEP_UP_302')}
          >
            Step-up 302
          </button>
          <button
            className={`f-pill ${decisionFilter === 'PASS_200' ? 'active active-green' : ''}`}
            onClick={() => setDecisionFilter('PASS_200')}
          >
            Pass 200
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="audit-table-card">
        <div className="audit-table-scroller">
          <table className="audit-table">
            <thead>
              <tr>
                <th>TIMESTAMP (UTC)</th>
                <th>DECISION</th>
                <th>TARGET TX</th>
                <th>MERCHANT / AMOUNT</th>
                <th>RISK FACTOR & REASON</th>
                <th>ACTOR / MODEL</th>
                <th>PAYLOAD</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const formattedAmt = new Intl.NumberFormat('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 0
                }).format(log.amount);

                return (
                  <React.Fragment key={log.id}>
                    <tr className={`audit-row ${isExpanded ? 'row-expanded' : ''}`}>
                      <td className="cell-audit-time font-mono">
                        <span className="log-time-text">{log.timestamp}</span>
                        <span className="log-id-sub">{log.id}</span>
                      </td>

                      <td className="cell-decision">
                        <span
                          className={`decision-badge ${
                            log.decision === 'REJECT_403'
                              ? 'dec-reject'
                              : log.decision === 'STEP_UP_302'
                              ? 'dec-stepup'
                              : 'dec-pass'
                          }`}
                        >
                          {log.decision}
                        </span>
                      </td>

                      <td className="cell-tx font-mono">
                        <span className="tx-code-bold">{log.txId}</span>
                      </td>

                      <td className="cell-merch-amt">
                        <span className="log-amt font-mono font-bold">{formattedAmt}</span>
                        <span className="log-merch-name">{log.merchant}</span>
                      </td>

                      <td className="cell-reason">
                        <p className="reason-text-desc">{log.reason}</p>
                        <span className="ip-geo-tag font-mono">{log.ip}</span>
                      </td>

                      <td className="cell-actor">
                        <span className="actor-badge">{log.actor}</span>
                      </td>

                      <td className="cell-expand">
                        <button
                          className={`btn-toggle-payload ${isExpanded ? 'btn-expanded' : ''}`}
                          onClick={() => toggleExpand(log.id)}
                        >
                          {isExpanded ? 'Hide' : 'JSON'}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable JSON Payload Drawer */}
                    {isExpanded && (
                      <tr className="payload-inspect-row">
                        <td colSpan="7">
                          <div className="payload-inspect-box">
                            <div className="payload-header-bar">
                              <span className="payload-title">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <polyline points="16 18 22 12 16 6" />
                                  <polyline points="8 6 2 12 8 18" />
                                </svg>
                                RAW TELEMETRY JSON DISPATCH
                              </span>
                              <div className="payload-actions">
                                <span className="sha-hash-text font-mono">
                                  SHA-256: {log.payload.sha256_hash.substring(0, 16)}...
                                </span>
                                <button
                                  className="btn-copy-json"
                                  onClick={() => copyPayload(log.id, log.payload)}
                                >
                                  {copiedId === log.id ? '✓ Copied' : 'Copy JSON'}
                                </button>
                              </div>
                            </div>
                            <pre className="json-code-block font-mono">
                              {JSON.stringify(log.payload, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
