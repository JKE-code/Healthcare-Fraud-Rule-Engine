import React, { useState } from 'react';

const INITIAL_RULES = [
  {
    id: 'RULE-GEO-04',
    name: 'Cross-Border Location Dissonance',
    category: 'Geolocation & IP',
    description: 'Intercepts transactions originating from foreign IPs when cardholder SIM or primary device was active domestically within the last 15 minutes.',
    condition: "location != 'home_country' && velocity_delta_minutes < 15 && amount > 5000",
    action: 'AUTONOMOUS BLOCK',
    actionType: 'block',
    enabled: true,
    triggeredToday: 38,
    falsePositiveRate: '0.4%',
    confidence: '99.4%'
  },
  {
    id: 'RULE-VEL-01',
    name: 'High-Frequency Velocity Surge',
    category: 'Velocity & Volume',
    description: 'Flags anomalous transaction bursts exceeding 3 card authorization requests within a 30-second sliding window across online merchants.',
    condition: 'transaction_count_30s >= 3 && is_online_gateway == true',
    action: 'QUARANTINE & STEP-UP OTP',
    actionType: 'challenge',
    enabled: true,
    triggeredToday: 84,
    falsePositiveRate: '1.2%',
    confidence: '96.8%'
  },
  {
    id: 'RULE-AMT-09',
    name: 'Extreme Baseline Outlier (+400%)',
    category: 'Velocity & Volume',
    description: 'Detects single transactions exceeding 4x the cardholder 90-day moving average authorization volume.',
    condition: 'amount > (cardholder_90d_avg * 4.0) && amount >= 50000',
    action: 'AUTONOMOUS BLOCK',
    actionType: 'block',
    enabled: true,
    triggeredToday: 19,
    falsePositiveRate: '0.2%',
    confidence: '99.8%'
  },
  {
    id: 'RULE-DEV-08',
    name: 'Zero-Trust Device Fingerprint Mismatch',
    category: 'Device & Identity',
    description: 'Triggers when a transaction originates from an unrecognized hardware hash with zero prior authentication history on high-risk merchant categories.',
    condition: "device == 'new_device' && merchant_risk_tier >= 'HIGH'",
    action: 'MANUAL REVIEW',
    actionType: 'review',
    enabled: true,
    triggeredToday: 52,
    falsePositiveRate: '2.1%',
    confidence: '94.5%'
  },
  {
    id: 'RULE-ML-99',
    name: 'Ensemble Neural Anomaly Threshold (≥85%)',
    category: 'Machine Learning',
    description: 'Composite risk score fusion: XGBoost classification probability (≥85%) combined with Isolation Forest outlier anomaly score (≥80%).',
    condition: 'xgb_fraud_prob >= 0.85 && isoforest_score >= 0.80',
    action: 'AUTONOMOUS BLOCK',
    actionType: 'block',
    enabled: true,
    triggeredToday: 27,
    falsePositiveRate: '0.1%',
    confidence: '99.9%'
  },
  {
    id: 'RULE-MERCH-02',
    name: 'Offshore Crypto & Virtual Asset Intercept',
    category: 'Merchant & Gateway',
    description: 'Shadow monitoring of peer-to-peer cryptocurrency on-ramp transactions initiated during non-habitual nocturnal hours.',
    condition: "merchant_mcc in ['6051', '6211'] && hour_of_day in [1,2,3,4,5]",
    action: 'SHADOW MONITOR',
    actionType: 'shadow',
    enabled: false,
    triggeredToday: 11,
    falsePositiveRate: '4.8%',
    confidence: '88.2%'
  }
];

export function PolicyRules() {
  const [rules, setRules] = useState(INITIAL_RULES);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  const categories = ['All', 'Velocity & Volume', 'Geolocation & IP', 'Device & Identity', 'Machine Learning', 'Merchant & Gateway'];

  const toggleRule = (id) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const newState = !r.enabled;
          showToast(`Rule ${r.id} ${newState ? 'Enabled' : 'Disabled'}`);
          return { ...r, enabled: newState };
        }
        return r;
      })
    );
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredRules = rules.filter((rule) => {
    const matchesCat = activeCategory === 'All' || rule.category === activeCategory;
    const matchesSearch =
      rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const activeCount = rules.filter((r) => r.enabled).length;
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    category: 'Velocity & Volume',
    description: '',
    condition: '',
    action: 'AUTONOMOUS BLOCK',
    actionType: 'block'
  });

  const handleCreateRule = (e) => {
    e.preventDefault();
    if (!newRule.name.trim() || !newRule.condition.trim()) {
      showToast('Please enter a rule name and condition expression.');
      return;
    }

    const created = {
      id: `RULE-CUST-${String(rules.length + 1).padStart(2, '0')}`,
      name: newRule.name.trim(),
      category: newRule.category,
      description: newRule.description.trim() || 'Custom policy rule defined by analyst.',
      condition: newRule.condition.trim(),
      action: newRule.action,
      actionType: newRule.actionType,
      enabled: true,
      triggeredToday: 0,
      falsePositiveRate: '0.1%',
      confidence: '99.5%'
    };

    setRules([created, ...rules]);
    setIsCreateModalOpen(false);
    setNewRule({
      name: '',
      category: 'Velocity & Volume',
      description: '',
      condition: '',
      action: 'AUTONOMOUS BLOCK',
      actionType: 'block'
    });
    showToast(`Successfully created rule ${created.id}!`);
  };

  return (
    <div className="rules-page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="rules-mini-toast">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Create Rule Modal */}
      {isCreateModalOpen && (
        <div className="drawer-overlay" style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card-inner-pad" style={{
            background: 'var(--color-bg-secondary, #1e293b)',
            borderRadius: '12px',
            border: '1px solid var(--color-border, #334155)',
            padding: '24px',
            maxWidth: '520px',
            width: '90%',
            color: '#fff',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Create New Risk Rule</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRule}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                  RULE NAME
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Block High-Value Night Crypto"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                  CATEGORY
                </label>
                <select
                  value={newRule.category}
                  onChange={(e) => setNewRule({ ...newRule, category: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }}
                >
                  <option value="Velocity & Volume">Velocity & Volume</option>
                  <option value="Geolocation & IP">Geolocation & IP</option>
                  <option value="Device & Identity">Device & Identity</option>
                  <option value="Merchant & Gateway">Merchant & Gateway</option>
                  <option value="Machine Learning">Machine Learning</option>
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                  TRIGGER CONDITION (EXPRESSION)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. amount > 50000 && location != 'home_country'"
                  value={newRule.condition}
                  onChange={(e) => setNewRule({ ...newRule, condition: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#38bdf8', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                  AUTONOMOUS ACTION
                </label>
                <select
                  value={newRule.action}
                  onChange={(e) => {
                    const act = e.target.value;
                    const type = act.includes('BLOCK') ? 'block' : (act.includes('CHALLENGE') ? 'challenge' : 'review');
                    setNewRule({ ...newRule, action: act, actionType: type });
                  }}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }}
                >
                  <option value="AUTONOMOUS BLOCK">AUTONOMOUS BLOCK (Reject 403)</option>
                  <option value="QUARANTINE & STEP-UP OTP">QUARANTINE & STEP-UP OTP (Challenge 302)</option>
                  <option value="MANUAL REVIEW">MANUAL SOC REVIEW</option>
                  <option value="SHADOW MONITOR">SHADOW MONITOR (Silent Alert)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', background: '#334155', border: 'none', color: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', borderRadius: '6px', background: '#2563eb', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  Save & Enable Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="rules-header-strip">
        <div className="rules-title-group">
          <h1 className="rules-main-heading">Fraud Policy Rules & Risk Thresholds</h1>
          <p className="rules-sub-heading">
            Configure real-time algorithmic heuristics, threshold barriers, and automated intervention actions.
          </p>
        </div>

        <div className="rules-header-metrics">
          <div className="metric-pill-box">
            <span className="m-label">ACTIVE RULES</span>
            <span className="m-val text-emerald">{activeCount} / {rules.length}</span>
          </div>
          <button
            className="btn-create-rule"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create New Rule
          </button>
        </div>
      </div>

      {/* Filters and Search Toolbar */}
      <div className="rules-toolbar-card">
        <div className="category-tabs-scroll">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`cat-tab-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="rules-search-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="search-icon-svg">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="rules-search-input"
            placeholder="Search rules by ID, condition, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Rules Grid */}
      <div className="rules-cards-grid">
        {filteredRules.map((rule) => (
          <div key={rule.id} className={`rule-item-card ${!rule.enabled ? 'rule-disabled' : ''}`}>
            <div className="rule-card-top">
              <div className="rule-id-cluster">
                <span className="rule-id-tag">{rule.id}</span>
                <span className="rule-category-tag">{rule.category}</span>
              </div>

              <div className="rule-toggle-wrap">
                <span className={`toggle-status-label ${rule.enabled ? 'label-active' : 'label-inactive'}`}>
                  {rule.enabled ? 'ACTIVE' : 'DISABLED'}
                </span>
                <button
                  type="button"
                  className={`switch-track ${rule.enabled ? 'track-on' : 'track-off'}`}
                  onClick={() => toggleRule(rule.id)}
                  aria-label={`Toggle ${rule.name}`}
                >
                  <span className="switch-thumb" />
                </button>
              </div>
            </div>

            <div className="rule-card-mid">
              <h3 className="rule-name">{rule.name}</h3>
              <p className="rule-desc">{rule.description}</p>
            </div>

            {/* Condition Logic Box */}
            <div className="rule-logic-box">
              <div className="logic-label-bar">
                <span className="code-kicker">EXPRESSION FILTER:</span>
                <span className="code-engine">AST Evaluator</span>
              </div>
              <code className="logic-code-text">{rule.condition}</code>
            </div>

            {/* Footer Stats & Action Badge */}
            <div className="rule-card-footer">
              <div className="action-tag-wrap">
                <span className={`action-badge badge-act-${rule.actionType}`}>
                  {rule.action}
                </span>
              </div>

              <div className="rule-telemetry-stats">
                <div className="telemetry-item" title="Triggered authorizations today">
                  <span className="t-label">Hits Today:</span>
                  <strong className="t-val">{rule.triggeredToday}</strong>
                </div>
                <div className="telemetry-item" title="False positive rate">
                  <span className="t-label">FPR:</span>
                  <strong className="t-val">{rule.falsePositiveRate}</strong>
                </div>
                <div className="telemetry-item" title="Neural model confidence">
                  <span className="t-label">Confidence:</span>
                  <strong className="t-val text-emerald">{rule.confidence}</strong>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
