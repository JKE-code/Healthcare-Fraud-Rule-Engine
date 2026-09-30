import React, { useState, useEffect, useCallback } from 'react';
import { StatCard } from '../components/StatCard';
import { TransactionTable } from '../components/TransactionTable';
import { TransactionDetails } from '../components/TransactionDetails';
import { FraudChart } from '../components/FraudChart';
import { RiskChart } from '../components/RiskChart';
import { ActivityChart } from '../components/ActivityChart';
import { AlertToast } from '../components/AlertToast';
import { WS_URL, fetchTransactions, resetSimulatorData, fetchSimulatorStatus, setSimulatorMode } from '../api';

export function Dashboard({ wsStatus, setWsStatus }) {
  const [transactions, setTransactions] = useState([]);
  const [selectedTx, setSelectedTx] = useState(null);
  const [newTxId, setNewTxId] = useState(null);
  const [activeAlert, setActiveAlert] = useState(null);
  const [streamMode, setStreamMode] = useState('synthetic'); // 'synthetic' or 'kaggle'
  const [isTogglingStream, setIsTogglingStream] = useState(false);
  const [streamToast, setStreamToast] = useState(null);

  // Load real transactions and stream mode from SQLite backend on mount
  useEffect(() => {
    fetchSimulatorStatus()
      .then((status) => {
        if (status && status.mode) {
          setStreamMode(status.mode);
        }
      })
      .catch((err) => console.warn('Simulator status fetch warning:', err));

    fetchTransactions({ limit: 100 })
      .then((res) => {
        if (res && res.transactions && res.transactions.length > 0) {
          setTransactions(res.transactions);
          if (!selectedTx) {
            // Prefer selecting a flagged transaction by default
            const firstFlagged = res.transactions.find((t) => t.is_flagged || t.review_status === 'FLAGGED');
            setSelectedTx(firstFlagged || res.transactions[0]);
          }
        }
      })
      .catch((err) => {
        console.warn('Initial transaction fetch warning:', err);
      });
  }, []);

  const handleToggleStreamMode = async (targetMode) => {
    if (streamMode === targetMode || isTogglingStream) return;
    setIsTogglingStream(true);
    try {
      const res = await setSimulatorMode(targetMode);
      setStreamMode(res.mode || targetMode);
      setStreamToast({
        mode: res.mode || targetMode,
        text: targetMode === 'kaggle'
          ? 'Switched to Real Kaggle Credit Card Dataset (kartik2112/fraud-detection)'
          : 'Switched to Procedural Synthetic Persona Stream (Normal baseline + Attack spikes)'
      });
      setTimeout(() => setStreamToast(null), 4000);
    } catch (err) {
      console.error('Failed to change stream mode:', err);
    } finally {
      setIsTogglingStream(false);
    }
  };

  const handleIncomingTx = useCallback((newTx) => {
    setTransactions((prev) => {
      const exists = prev.some((t) => t.transaction_id === newTx.transaction_id);
      if (exists) {
        return prev.map((t) => (t.transaction_id === newTx.transaction_id ? newTx : t));
      }
      return [newTx, ...prev].slice(0, 150);
    });

    setNewTxId(newTx.transaction_id);
    setTimeout(() => setNewTxId(null), 2500);

    // If High/Critical risk, trigger floating SecOps toast
    if (newTx.risk_level === 'CRITICAL' || newTx.risk_level === 'HIGH' || newTx.is_flagged) {
      setActiveAlert({
        ...newTx,
        id: `alert-${Date.now()}`
      });
    }
  }, []);

  const handleUpdateTx = useCallback((updatedTx) => {
    setTransactions((prev) =>
      prev.map((t) => (t.transaction_id === updatedTx.transaction_id ? updatedTx : t))
    );
    setSelectedTx((prev) => (prev && prev.transaction_id === updatedTx.transaction_id ? updatedTx : prev));
  }, []);

  // WebSocket connection for real-time live events
  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;

    function connect() {
      try {
        ws = new WebSocket(WS_URL);

        ws.onopen = () => {
          if (setWsStatus) setWsStatus('live');
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.event === 'transaction_created' && payload.data) {
              handleIncomingTx(payload.data);
            } else if (payload.event === 'transaction_reviewed' && payload.data) {
              handleUpdateTx(payload.data);
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        };

        ws.onerror = () => {
          if (setWsStatus) setWsStatus('disconnected');
        };

        ws.onclose = () => {
          if (setWsStatus) setWsStatus('disconnected');
          reconnectTimeout = setTimeout(connect, 4000);
        };
      } catch (err) {
        if (setWsStatus) setWsStatus('disconnected');
      }
    }

    connect();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [handleIncomingTx, handleUpdateTx, setWsStatus]);

  // Periodic SQLite sync: Keeps queue synchronized even if browser was inactive or backgrounded
  useEffect(() => {
    const syncInterval = setInterval(() => {
      fetchTransactions({ limit: 100 })
        .then((res) => {
          if (res && res.transactions && res.transactions.length > 0) {
            setTransactions((prev) => {
              const map = new Map();
              // Retain in-memory items first
              prev.forEach((t) => map.set(t.transaction_id, t));
              // Merge newly fetched transactions
              res.transactions.forEach((t) => {
                if (!map.has(t.transaction_id)) {
                  map.set(t.transaction_id, t);
                }
              });
              return Array.from(map.values())
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 150);
            });
          }
        })
        .catch(() => {});
    }, 5000);

    return () => clearInterval(syncInterval);
  }, []);

  // Aggregate KPI numbers from real SQLite transaction list
  const totalCount = transactions.length;
  const flaggedCount = transactions.filter((t) => t.is_flagged || t.review_status === 'FLAGGED').length;
  const highRiskCount = transactions.filter((t) => t.risk_level === 'HIGH' || t.risk_level === 'CRITICAL').length;
  const reviewedCount = transactions.filter((t) => t.review_status === 'REVIEWED' || t.review_status === 'CLEARED').length;

  const avgRisk = totalCount > 0
    ? (transactions.reduce((acc, t) => acc + (t.risk_score || 0), 0) / totalCount) * 100
    : 0;

  return (
    <div className="secops-dashboard-wrapper">
      {/* Sub-header Controls Bar */}
      <div className="secops-header-banner">
        <div className="banner-left">
          <div className="banner-title-line">
            <h1 className="banner-main-title">Acentra Fraud Rule Engine & Review Console</h1>
          </div>
          <div className="banner-subline">
            <span className="banner-desc">
              Extensible Rule Engine • SQLite Persistence • Reviewer Triage Queue • AWS SES/SNS Alerting
            </span>
          </div>
        </div>

        <div className="banner-right" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Live Ingest Mode Switcher Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              padding: '2px',
              gap: '2px',
            }}
            title="Toggle live background transaction stream between Synthetic Personas and Authentic Kaggle Dataset"
          >
            <button
              type="button"
              disabled={isTogglingStream}
              onClick={() => handleToggleStreamMode('synthetic')}
              style={{
                padding: '5px 11px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.2s ease',
                background: streamMode === 'synthetic' ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                color: streamMode === 'synthetic' ? '#34d399' : '#94a3b8',
                boxShadow: streamMode === 'synthetic' ? 'inset 0 0 0 1px rgba(16, 185, 129, 0.5)' : 'none',
              }}
            >
              <span style={{ fontSize: '10px' }}>🟢</span>
              <span>Synthetic Feed</span>
            </button>
            <button
              type="button"
              disabled={isTogglingStream}
              onClick={() => handleToggleStreamMode('kaggle')}
              style={{
                padding: '5px 11px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.2s ease',
                background: streamMode === 'kaggle' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                color: streamMode === 'kaggle' ? '#38bdf8' : '#94a3b8',
                boxShadow: streamMode === 'kaggle' ? 'inset 0 0 0 1px rgba(56, 189, 248, 0.5)' : 'none',
              }}
            >
              <span style={{ fontSize: '10px' }}>🔵</span>
              <span>Kaggle Real Dataset</span>
            </button>
          </div>

          <button
            type="button"
            onClick={async () => {
              try {
                await resetSimulatorData();
                const res = await fetchTransactions({ limit: 100 });
                if (res && res.transactions) {
                  setTransactions(res.transactions);
                  const firstFlagged = res.transactions.find((t) => t.is_flagged || t.review_status === 'FLAGGED');
                  setSelectedTx(firstFlagged || res.transactions[0]);
                }
              } catch (err) {
                console.error('Reset error:', err);
              }
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              color: '#38bdf8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
            title="Reset database to realistic baseline (Normal Swiggy/Amazon cleared in green, only genuine attacks flagged)"
          >
            <span>🔄</span>
            <span>Reset Demo Baseline</span>
          </button>

          <div className="system-online-badge">
            <span className="online-emerald-dot" />
            <span className="online-label">RULE ENGINE ONLINE</span>
          </div>
        </div>
      </div>

      {/* Stream Mode Switch Notification Toast Banner */}
      {streamToast && (
        <div
          style={{
            margin: '0 0 16px 0',
            padding: '10px 16px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: streamToast.mode === 'kaggle' ? 'rgba(2, 132, 199, 0.2)' : 'rgba(16, 185, 129, 0.2)',
            border: `1px solid ${streamToast.mode === 'kaggle' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(52, 211, 153, 0.4)'}`,
            color: streamToast.mode === 'kaggle' ? '#7dd3fc' : '#6ee7b7',
            fontSize: '12px',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px' }}>{streamToast.mode === 'kaggle' ? '📊' : '🤖'}</span>
            <span>{streamToast.text}</span>
          </div>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
            Active Live Ingest
          </span>
        </div>
      )}

      {/* 4 KPI Cards */}
      <section className="secops-kpi-row" aria-label="Key Risk Metrics">
        <StatCard
          label="TOTAL TRANSACTIONS"
          value={totalCount.toLocaleString()}
          badgeText="Persisted in SQLite"
          badgeType="green"
          iconType="total"
          cardTheme="default"
        />

        <StatCard
          label="FLAGGED FOR REVIEW"
          value={flaggedCount.toLocaleString()}
          badgeText="Pending Analyst Triage"
          badgeType="red"
          iconType="fraud"
          cardTheme="fraud"
        />

        <StatCard
          label="HIGH RISK ALERTS"
          value={highRiskCount.toLocaleString()}
          badgeText="AWS SES/SNS Triggered"
          badgeType="amber"
          iconType="high-risk"
          cardTheme="high-risk"
        />

        <StatCard
          label="TRIAGED / CLEARED"
          value={reviewedCount.toLocaleString()}
          badgeText="Audited by SecOps"
          badgeType="green"
          iconType="avg-risk"
          cardTheme="default"
        />
      </section>

      {/* Main Docked Split Section (Table on Left, Details on Right) */}
      <section className="secops-monitoring-split-layout">
        <div className="split-table-column">
          <TransactionTable
            transactions={transactions}
            newTxId={newTxId}
            selectedTx={selectedTx}
            onSelectTx={(tx) => setSelectedTx(tx)}
          />
        </div>

        <div className="split-details-column">
          <TransactionDetails
            tx={selectedTx}
            isDocked={true}
            onClose={() => {}}
            onUpdateTx={handleUpdateTx}
          />
        </div>
      </section>

      {/* 3 Bottom Charts */}
      <section className="secops-charts-row" aria-label="Analytical Telemetry">
        <FraudChart transactions={transactions} />
        <RiskChart transactions={transactions} />
        <ActivityChart transactions={transactions} selectedTx={selectedTx} />
      </section>

      {/* Floating Alert Toast (bottom-right) */}
      {activeAlert && (
        <AlertToast
          alert={activeAlert}
          onDismiss={() => setActiveAlert(null)}
          onInvestigate={(alertTx) => {
            setSelectedTx(alertTx);
            setActiveAlert(null);
          }}
        />
      )}

      {/* Compliance & Telemetry Footer */}
      <footer className="secops-footer-bar">
        <div className="footer-left">
          <span>ACENTRA HIRING HACKATHON — FRAUD RULE ENGINE WITH REVIEW CONSOLE.</span>
          <span className="soc2-badge">SQLite Persistent • AWS SES/SNS Notifier</span>
        </div>

        <div className="footer-right">
          <span>Engine Status: <strong>Active (4 Rules)</strong></span>
          <span className="bullet-sep">|</span>
          <span>Rule Latency: <strong>&lt; 5ms</strong></span>
        </div>
      </footer>
    </div>
  );
}
