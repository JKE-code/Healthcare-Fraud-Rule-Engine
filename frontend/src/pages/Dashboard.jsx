import React, { useState, useEffect, useCallback } from 'react';
import { StatCard } from '../components/StatCard';
import { TransactionTable } from '../components/TransactionTable';
import { TransactionDetails } from '../components/TransactionDetails';
import { FraudChart } from '../components/FraudChart';
import { RiskChart } from '../components/RiskChart';
import { ActivityChart } from '../components/ActivityChart';
import { AlertToast } from '../components/AlertToast';
import { WS_URL, fetchTransactions } from '../api';

export function Dashboard({ sharedTransactions, onNewTransaction, wsStatus, setWsStatus }) {
  const [transactions, setTransactions] = useState(sharedTransactions || []);
  const [selectedTx, setSelectedTx] = useState(null);
  const [newTxId, setNewTxId] = useState(null);
  const [activeAlert, setActiveAlert] = useState(null);

  // Load real transactions from SQLite backend on mount
  useEffect(() => {
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

  const handleIncomingTx = useCallback(
    (newTx) => {
      setTransactions((prev) => {
        const updated = [newTx, ...prev.filter((t) => t.transaction_id !== newTx.transaction_id)].slice(0, 150);
        if (onNewTransaction) onNewTransaction(updated);
        return updated;
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
    },
    [onNewTransaction]
  );

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

        <div className="banner-right">
          <div className="system-online-badge">
            <span className="online-emerald-dot" />
            <span className="online-label">RULE ENGINE ONLINE</span>
          </div>
        </div>
      </div>

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
