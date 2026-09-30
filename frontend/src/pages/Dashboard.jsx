import React, { useState, useEffect, useCallback } from 'react';
import { StatCard } from '../components/StatCard';
import { TransactionTable } from '../components/TransactionTable';
import { TransactionDetails } from '../components/TransactionDetails';
import { FraudChart } from '../components/FraudChart';
import { RiskChart } from '../components/RiskChart';
import { ActivityChart } from '../components/ActivityChart';
import { AlertToast } from '../components/AlertToast';
import { WS_URL } from '../api';
import { initialMockTransactions, generateMockTransaction } from '../data/mockTransactions';

export function Dashboard({ sharedTransactions, onNewTransaction, wsStatus, setWsStatus }) {
  const [transactions, setTransactions] = useState(sharedTransactions || initialMockTransactions);
  // Default selected transaction to TX-1003/TX-1027 (so the docked panel is populated right on load like Image 1)
  const [selectedTx, setSelectedTx] = useState(() => {
    return (
      (sharedTransactions && sharedTransactions[0]) ||
      initialMockTransactions.find((t) => t.transaction_id === 'TX-1003') ||
      initialMockTransactions[0]
    );
  });
  const [newTxId, setNewTxId] = useState(null);
  const [activeAlert, setActiveAlert] = useState({
    id: 'alert-initial',
    transaction_id: 'TX-1033',
    amount: 72000,
    fraud_probability: 0.89,
    merchant: 'Offshore Gaming',
    location: 'Dubai',
    risk_level: 'CRITICAL',
    prediction: 'FRAUD',
    explanation: ['Unusually high transaction amount', 'Anomalous foreign gateway']
  });
  const [isAutoSim, setIsAutoSim] = useState(true);

  useEffect(() => {
    if (sharedTransactions && sharedTransactions.length > 0) {
      setTransactions(sharedTransactions);
    }
  }, [sharedTransactions]);

  const handleIncomingTx = useCallback(
    (newTx) => {
      setTransactions((prev) => {
        const updated = [newTx, ...prev.filter((t) => t.transaction_id !== newTx.transaction_id)].slice(0, 100);
        if (onNewTransaction) onNewTransaction(updated);
        return updated;
      });

      setNewTxId(newTx.transaction_id);
      setTimeout(() => setNewTxId(null), 2500);

      // If High/Critical, trigger floating toast
      if (newTx.risk_level === 'CRITICAL' || newTx.risk_level === 'HIGH') {
        setActiveAlert({
          ...newTx,
          id: `alert-${Date.now()}`
        });
      }
    },
    [onNewTransaction]
  );

  // WebSocket connection
  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;

    function connect() {
      try {
        ws = new WebSocket(WS_URL);

        ws.onopen = () => {
          setWsStatus('live');
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.event === 'transaction_created' && payload.data) {
              handleIncomingTx(payload.data);
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        };

        ws.onerror = () => {
          setWsStatus('disconnected');
        };

        ws.onclose = () => {
          setWsStatus('disconnected');
          reconnectTimeout = setTimeout(connect, 6000);
        };
      } catch (err) {
        setWsStatus('disconnected');
      }
    }

    connect();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [handleIncomingTx, setWsStatus]);

  // Auto-simulation ticker (every 4 seconds)
  useEffect(() => {
    if (!isAutoSim) return;

    const interval = setInterval(() => {
      const mockTx = generateMockTransaction();
      handleIncomingTx(mockTx);
    }, 4000);

    return () => clearInterval(interval);
  }, [isAutoSim, handleIncomingTx]);

  const totalBase = 12552;
  const fraudBase = 152;
  const highRiskBase = 89;

  const currentFraudCount = transactions.filter((t) => t.prediction === 'FRAUD').length;
  const currentHighRiskCount = transactions.filter((t) => t.risk_level === 'HIGH' || t.risk_level === 'CRITICAL').length;

  const dynamicTotal = totalBase + transactions.length;
  const dynamicFraud = fraudBase + currentFraudCount;
  const dynamicHighRisk = highRiskBase + currentHighRiskCount;

  return (
    <div className="secops-dashboard-wrapper">
      {/* Sub-header Controls Bar */}
      <div className="secops-header-banner">
        <div className="banner-left">
          <div className="banner-title-line">
            <h1 className="banner-main-title">Fraud Detection & Transaction Risk Agent</h1>
          </div>
          <div className="banner-subline">
            <span className="banner-desc">Real-time telemetry, probabilistic scoring, and autonomous rule intervention</span>
          </div>
        </div>

        <div className="banner-right">
          <div className="system-online-badge">
            <span className="online-emerald-dot" />
            <span className="online-label">SYSTEM ONLINE</span>
          </div>

          <button
            className={`btn-auto-simulation ${isAutoSim ? 'sim-on' : 'sim-off'}`}
            onClick={() => setIsAutoSim((prev) => !prev)}
            title="Toggle dummy transaction stream"
          >
            <span className="sim-toggle-bullet" />
            AUTO-SIMULATION: <strong>{isAutoSim ? 'ON' : 'OFF'}</strong>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <section className="secops-kpi-row" aria-label="Key Risk Metrics">
        <StatCard
          label="TOTAL TRANSACTIONS"
          value={dynamicTotal.toLocaleString()}
          badgeText="+12 today"
          badgeType="green"
          iconType="total"
          cardTheme="default"
        />

        <StatCard
          label="FRAUD DETECTED"
          value={dynamicFraud.toLocaleString()}
          badgeText="+4 today"
          badgeType="red"
          iconType="fraud"
          cardTheme="fraud"
        />

        <StatCard
          label="HIGH RISK TRANSACTIONS"
          value={dynamicHighRisk.toLocaleString()}
          badgeText="+8 today"
          badgeType="amber"
          iconType="high-risk"
          cardTheme="high-risk"
        />

        <StatCard
          label="AVG RISK SCORE"
          value="18.4%"
          badgeText="↓ 2.3% vs y'day"
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
            onBlock={(tx) => {
              alert(`[Intervention] Transaction ${tx.transaction_id} is quarantined and blocked across foreign payment gateways.`);
            }}
            onMarkSafe={(tx) => {
              alert(`[Intervention] Transaction ${tx.transaction_id} cleared and added to safe verification baseline.`);
            }}
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
          <span>© 2025 FRAUDGUARD AUTONOMOUS RISK ENGINE.</span>
          <span className="soc2-badge">SOC-2 Type II Certified</span>
        </div>

        <div className="footer-right">
          <span>Cluster ID: <code>secops-prod-us-east-1</code></span>
          <span className="bullet-sep">|</span>
          <span>API Latency: <strong>18ms</strong></span>
        </div>
      </footer>
    </div>
  );
}
