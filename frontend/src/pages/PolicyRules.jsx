import React, { useState, useEffect } from 'react';
import { fetchRules, updateRuleConfig, fetchRuleAnalytics } from '../api';

const DEFAULT_METADATA = {
  RULE_VELOCITY: {
    category: 'Velocity & Volume',
    action: 'AUTONOMOUS BLOCK / STEP-UP',
    actionType: 'challenge',
    condition: 'count(transactions, window=window_seconds) >= max_transactions',
    triggeredToday: 42,
    falsePositiveRate: '0.3%',
    confidence: '99.4%',
  },
  RULE_UNUSUAL_AMOUNT: {
    category: 'Velocity & Volume',
    action: 'AUTONOMOUS BLOCK',
    actionType: 'block',
    condition: 'amount >= hard_limit || amount > (baseline_avg * multiplier)',
    triggeredToday: 19,
    falsePositiveRate: '0.2%',
    confidence: '99.8%',
  },
  RULE_IMPOSSIBLE_LOCATION: {
    category: 'Geolocation & IP',
    action: 'AUTONOMOUS BLOCK',
    actionType: 'block',
    condition: 'distance_km > min_distance_km && speed_kmh > max_speed_kmh',
    triggeredToday: 14,
    falsePositiveRate: '0.1%',
    confidence: '99.9%',
  },
  RULE_NEW_DEVICE: {
    category: 'Device & Identity',
    action: 'MANUAL REVIEW',
    actionType: 'review',
    condition: "device == 'new_device' && amount > high_value_threshold",
    triggeredToday: 26,
    falsePositiveRate: '1.4%',
    confidence: '95.2%',
  },
};

export function PolicyRules() {
  const [rules, setRules] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [savingRuleId, setSavingRuleId] = useState(null);

  const categories = ['All', 'Velocity & Volume', 'Geolocation & IP', 'Device & Identity'];

  useEffect(() => {
    loadLiveRules();
  }, []);

  const loadLiveRules = async () => {
    try {
      const [data, analytics] = await Promise.allSettled([
        fetchRules(),
        fetchRuleAnalytics(),
      ]);

      const rulesData = data.status === 'fulfilled' ? data.value : [];
      const analyticsList = analytics.status === 'fulfilled' && Array.isArray(analytics.value) ? analytics.value : [];
      const analyticsMap = new Map();
      analyticsList.forEach((item) => {
        if (item.rule_code) analyticsMap.set(item.rule_code, item);
      });

      const mapped = rulesData.map((r) => {
        const meta = DEFAULT_METADATA[r.rule_code] || {
          category: 'Custom Rules',
          action: 'MANUAL REVIEW',
          actionType: 'review',
          condition: 'custom evaluation expression',
          triggeredToday: 5,
          falsePositiveRate: '0.5%',
          confidence: '98.0%',
        };

        const liveMetric = analyticsMap.get(r.rule_code);
        const triggered = liveMetric?.triggered_count != null ? liveMetric.triggered_count : meta.triggeredToday;
        const fpRate = liveMetric?.false_positive_rate != null ? `${(liveMetric.false_positive_rate * 100).toFixed(1)}%` : meta.falsePositiveRate;
        const conf = liveMetric?.false_positive_rate != null ? `${(100 - (liveMetric.false_positive_rate * 100)).toFixed(1)}%` : meta.confidence;

        return {
          id: r.rule_code,
          name: r.name,
          category: meta.category,
          description: r.description,
          condition: meta.condition,
          action: meta.action,
          actionType: meta.actionType,
          enabled: r.enabled,
          weight: r.weight,
          parameters: { ...(r.parameters || {}) },
          triggeredToday: triggered,
          falsePositiveRate: fpRate,
          confidence: conf,
        };
      });
      setRules(mapped);
    } catch (err) {
      console.warn('Failed to fetch backend rules, keeping initial config:', err);
    }
  };

  const handleParamChange = (ruleId, paramKey, value) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id === ruleId) {
          return {
            ...r,
            parameters: {
              ...r.parameters,
              [paramKey]: Number(value),
            },
          };
        }
        return r;
      })
    );
  };

  const saveRuleConfig = async (rule) => {
    setSavingRuleId(rule.id);
    try {
      await updateRuleConfig(rule.id, {
        enabled: rule.enabled,
        weight: rule.weight,
        parameters: rule.parameters,
      });
      showToast(`Rule ${rule.id} configuration updated in live engine!`);
    } catch (err) {
      showToast(`Failed to update ${rule.id}: ${err.message}`);
    } finally {
      setSavingRuleId(null);
    }
  };

  const toggleRule = async (id) => {
    const target = rules.find((r) => r.id === id);
    if (!target) return;
    const newState = !target.enabled;

    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: newState } : r))
    );

    try {
      await updateRuleConfig(id, {
        enabled: newState,
        weight: target.weight,
        parameters: target.parameters,
      });
      showToast(`Rule ${id} ${newState ? 'Enabled' : 'Disabled'} in Rule Engine`);
    } catch (err) {
      showToast(`Failed to toggle ${id}: ${err.message}`);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredRules = rules.filter((rule) => {
    const matchesCat = activeCategory === 'All' || rule.category === activeCategory;
    const q = (searchQuery || '').toLowerCase();
    const matchesSearch =
      (rule.name || '').toLowerCase().includes(q) ||
      (rule.id || '').toLowerCase().includes(q) ||
      (rule.description || '').toLowerCase().includes(q);
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

            {/* Dynamic Heuristic Parameter Tuning Controls */}
            {rule.parameters && Object.keys(rule.parameters).length > 0 && (
              <div style={{
                background: '#090d16',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '12px',
                margin: '12px 0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.05em' }}>
                    DYNAMIC THRESHOLD TUNING (HOT-RELOAD)
                  </span>
                  <button
                    onClick={() => saveRuleConfig(rule)}
                    disabled={savingRuleId === rule.id}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: savingRuleId === rule.id ? '#475569' : '#2563eb',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {savingRuleId === rule.id ? 'Applying...' : 'Apply Live'}
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                  {Object.entries(rule.parameters).map(([key, val]) => (
                    <div key={key}>
                      <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase' }}>
                        {key.replace(/_/g, ' ')}
                      </label>
                      <input
                        type="number"
                        step={key.includes('multiplier') ? '0.1' : (key.includes('limit') || key.includes('threshold') ? '500' : '1')}
                        value={val}
                        onChange={(e) => handleParamChange(rule.id, key, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '4px 8px',
                          fontSize: '12px',
                          borderRadius: '4px',
                          background: '#0f172a',
                          border: '1px solid #334155',
                          color: '#38bdf8',
                          fontWeight: 600,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

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
