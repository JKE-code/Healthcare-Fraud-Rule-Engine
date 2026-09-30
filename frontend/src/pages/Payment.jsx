import React, { useState } from 'react';
import { API_URL, streamKaggle } from '../api';
import { mockAnalyzeTransaction } from '../data/mockTransactions';

export function Payment({ onTransactionCreated, onNavigate }) {
  const scenarios = [
    {
      id: 'velocity',
      amount: '3500',
      label: '⚡ Velocity Burst / Rapid Surge',
      merchant: 'QuickPay Recharge',
      location: 'Mumbai',
      timing: '14:30',
      device: 'mobile',
      payment_method: 'UPI',
      customer_id: 'CUST-1001',
      fingerprint: 'iOS 17 • High-Frequency Authorization Burst'
    },
    {
      id: 'amount',
      amount: '125000',
      label: '💰 Extreme Amount Spike Outlier',
      merchant: 'Al-Safa Luxury Jewels',
      location: 'Delhi',
      timing: '02:45',
      device: 'desktop',
      payment_method: 'CARD',
      customer_id: 'CUST-1001',
      fingerprint: 'Windows 11 • 50x Baseline Multiplier Outlier'
    },
    {
      id: 'impossible_travel',
      amount: '12500',
      label: '✈️ Impossible Travel (London 10m later)',
      merchant: 'Harrods London',
      location: 'London',
      timing: '14:40',
      device: 'mobile',
      payment_method: 'CARD',
      customer_id: 'CUST-1001',
      fingerprint: 'Android 14 • 7,200 km in 10 mins (43,000 km/h)'
    },
    {
      id: 'new_device',
      amount: '28000',
      label: '📱 New Device on High Value',
      merchant: 'Electronics Hub',
      location: 'Bangalore',
      timing: '19:15',
      device: 'new_device',
      payment_method: 'CARD',
      customer_id: 'CUST-1001',
      fingerprint: 'Unknown Emulator Fingerprint • High Risk'
    },
    {
      id: 'safe',
      amount: '650',
      label: '✓ Normal Legitimate Baseline',
      merchant: 'Swiggy Food',
      location: 'Mumbai',
      timing: '13:00',
      device: 'mobile',
      payment_method: 'UPI',
      customer_id: 'CUST-1001',
      fingerprint: 'iOS 17 (Safari) • Known Habitual Baseline'
    }
  ];

  const [selectedScenario, setSelectedScenario] = useState('amount');
  const [formData, setFormData] = useState({
    amount: '125000',
    merchant: 'Al-Safa Luxury Jewels',
    location: 'Delhi',
    timing: '02:45',
    device: 'desktop',
    payment_method: 'CARD',
    customer_id: 'CUST-1001',
    fingerprint: 'Windows 11 • 50x Baseline Multiplier Outlier'
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [isStreamingKaggle, setIsStreamingKaggle] = useState(false);

  const handleStreamKaggle = async () => {
    setIsStreamingKaggle(true);
    try {
      const res = await streamKaggle(10);
      alert(`Successfully streamed ${res.total_streamed} Kaggle Credit Card transactions into Rule Engine!\nTriggered Flags: ${res.total_flagged} flagged for Reviewer triage.`);
      if (onTransactionCreated && res.transactions?.[0]) {
        onTransactionCreated(res.transactions[0]);
      }
    } catch (err) {
      alert(`Kaggle streaming failed: ${err.message}`);
    } finally {
      setIsStreamingKaggle(false);
    }
  };

  const [verdict, setVerdict] = useState({
    status: 'BLOCKED',
    decision: 'REJECT 403',
    fraudLikelihood: 95.0,
    threatCategory: 'CRITICAL Risk Category',
    modelId: 'Extensible Rule Engine + ML',
    latency: '—',
    serverLatency: null,
    refId: 'TX-INITIAL',
    timestamp: 'JUST NOW',
    modelStatus: 'live',
    shapValues: {},
    shapAvailable: false,
    agentAction: null,
    flags: [
      {
        rule_code: 'RULE_UNUSUAL_AMOUNT',
        rule_name: 'Unusual Transaction Amount',
        severity: 'CRITICAL',
        reason: 'Extreme Amount Spike: ₹125,000 is 50.0x higher than baseline (₹2,500).',
        metrics: { amount: 125000, baseline: 2500, multiplier: 50 }
      }
    ],
    awsAlertSent: true,
    awsMessageId: 'AWS-SES-SANDBOX-DEMO',
    reviewStatus: 'FLAGGED',
    riskScore: 0.95,
    riskLevel: 'CRITICAL',
    riskFactors: [
      {
        title: 'Unusual Amount Outlier',
        detail: 'Authorization amount ₹125,000 crosses statistical anomaly cap.'
      },
      {
        title: 'Unrecognized Device Signature',
        detail: 'Transaction originated from an unverified desktop fingerprint.'
      }
    ]
  });

  const applyVerdictFromResponse = (data, roundTripMs = '15.0') => {
    const isBlocked = data.risk_level === 'CRITICAL' || data.risk_level === 'HIGH' || data.is_flagged;
    const fraudPct = (((data.risk_score != null ? data.risk_score : data.fraud_probability) || 0) * 100).toFixed(1);
    const serverLat = data.inference_latency_ms;
    const displayLatency = serverLat != null ? `${serverLat}ms` : `${roundTripMs}ms (round-trip)`;

    const explanations = (data.explanation && data.explanation.length > 0)
      ? data.explanation.map((item, idx) => ({
          title: data.shap_available ? `SHAP Factor #${idx + 1}` : `Factor #${idx + 1}`,
          detail: item
        }))
      : [];

    setVerdict({
      status: isBlocked ? 'BLOCKED' : 'APPROVED',
      decision: isBlocked ? (data.risk_level === 'CRITICAL' ? 'REJECT 403' : 'CHALLENGE 302') : 'PASS 200',
      fraudLikelihood: fraudPct,
      threatCategory: `${data.risk_level || 'LOW'} Risk Category`,
      modelId: 'Extensible Rule Engine + ML',
      latency: displayLatency,
      serverLatency: serverLat,
      refId: data.transaction_id,
      timestamp: 'JUST NOW',
      modelStatus: data.model_status || 'live',
      shapValues: data.shap_values || {},
      shapAvailable: data.shap_available || false,
      agentAction: data.agent_action || null,
      riskFactors: explanations,
      flags: data.flags || [],
      awsAlertSent: data.aws_alert_sent || false,
      awsMessageId: data.aws_message_id || null,
      reviewStatus: data.review_status || (isBlocked ? 'FLAGGED' : 'CLEARED'),
      riskScore: data.risk_score != null ? data.risk_score : data.fraud_probability,
      riskLevel: data.risk_level || 'LOW'
    });
  };

  const handleScenarioSelect = (scenario) => {
    setSelectedScenario(scenario.id);
    setFormData({
      amount: scenario.amount,
      merchant: scenario.merchant,
      location: scenario.location,
      timing: scenario.timing,
      device: scenario.device,
      payment_method: scenario.payment_method,
      customer_id: scenario.customer_id || 'CUST-1001',
      fingerprint: scenario.fingerprint
    });
  };

  const handleProcessTransaction = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    const amountNum = parseFloat(formData.amount) || 0;
    const now = new Date();
    const [hours, minutes] = formData.timing.includes(':') 
      ? formData.timing.split(':') 
      : [now.getHours(), now.getMinutes()];
    
    const txDate = new Date();
    txDate.setHours(parseInt(hours) || 12, parseInt(minutes) || 0, 0, 0);

    const payload = {
      amount: amountNum,
      merchant: formData.merchant.trim() || 'General Merchant',
      location: formData.location.trim() || 'Mumbai',
      device: formData.device,
      payment_method: formData.payment_method,
      customer_id: formData.customer_id || 'CUST-1001',
      timing: formData.timing,
      timestamp: txDate.toISOString()
    };

    const startTime = performance.now();

    try {
      const res = await fetch(`${API_URL}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const roundTripMs = (performance.now() - startTime).toFixed(1);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      applyVerdictFromResponse(data, roundTripMs);
      if (onTransactionCreated) onTransactionCreated(data);
    } catch (err) {
      // Offline fallback
      const mockResult = mockAnalyzeTransaction(payload);
      applyVerdictFromResponse(mockResult, '10.0');
      if (onTransactionCreated) onTransactionCreated(mockResult);
    } finally {
      setIsProcessing(false);
    }
  };

  // 1-Click Velocity Burst: Injects 3 rapid sequential transactions
  const handleExecuteVelocityBurst = async () => {
    setIsProcessing(true);
    try {
      const now = new Date();
      for (let i = 1; i <= 3; i++) {
        const payload = {
          amount: 3500 + i * 200,
          merchant: `QuickPay Burst #${i}`,
          location: 'Mumbai',
          device: 'mobile',
          payment_method: 'UPI',
          customer_id: 'CUST-1001',
          timestamp: new Date(now.getTime() + i * 300).toISOString()
        };
        const res = await fetch(`${API_URL}/api/transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (i === 3) {
          applyVerdictFromResponse(data);
        }
        if (onTransactionCreated) onTransactionCreated(data);
        await new Promise((r) => setTimeout(r, 200));
      }
    } catch (err) {
      console.error('Velocity burst execution error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // 1-Click Impossible Travel: Injects Mumbai then London 5 mins later
  const handleExecuteImpossibleFlight = async () => {
    setIsProcessing(true);
    try {
      const now = new Date();
      // Tx 1: Mumbai at T - 5 mins
      const payload1 = {
        amount: 1200,
        merchant: 'CCD Bandra',
        location: 'Mumbai',
        device: 'mobile',
        payment_method: 'UPI',
        customer_id: 'CUST-1001',
        timestamp: new Date(now.getTime() - 5 * 60 * 1000).toISOString()
      };
      await fetch(`${API_URL}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload1)
      });

      // Tx 2: London right now (7,200 km in 5 mins -> speed > 85,000 km/h)
      const payload2 = {
        amount: 14500,
        merchant: 'Harrods London Knightsbridge',
        location: 'London',
        device: 'mobile',
        payment_method: 'CARD',
        customer_id: 'CUST-1001',
        timestamp: now.toISOString()
      };
      const res2 = await fetch(`${API_URL}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload2)
      });
      const data2 = await res2.json();
      applyVerdictFromResponse(data2);
      if (onTransactionCreated) onTransactionCreated(data2);
    } catch (err) {
      console.error('Impossible flight execution error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const formattedDisplayAmount = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0
  }).format(formData.amount || 0);

  return (
    <div className="secops-pay-page-wrapper">
      {/* Main 2-Column Split Layout */}
      <div className="pay-two-column-layout">
        {/* ========================================================
            LEFT COLUMN: TRANSACTION SIMULATOR FORM
            ======================================================== */}
        <section className="checkout-form-column" aria-label="Transaction Simulator">
          <div className="checkout-main-card">
            {/* Header */}
            <div className="checkout-header-row">
              <div className="checkout-brand-title">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                <h2>Transaction Risk Simulator</h2>
              </div>
            </div>

            <p className="checkout-subline">
              Enter any custom transaction details below to test the machine learning fraud detection model in real-time.
            </p>

            {/* Kaggle Real-World Dataset Streamer */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8' }}>
                    Kaggle Credit Card Real-World Dataset
                  </span>
                  <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 600 }}>
                    kartik2112/fraud-detection
                  </span>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
                  Injects authentic cardholder GPS, velocity, and amounts directly into the Rule Engine & Console.
                </p>
              </div>
              <button
                type="button"
                onClick={handleStreamKaggle}
                disabled={isStreamingKaggle}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: isStreamingKaggle ? '#475569' : '#0284c7',
                  color: '#fff',
                  border: 'none',
                  cursor: isStreamingKaggle ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {isStreamingKaggle ? 'Streaming...' : '⚡ Stream 10 Kaggle TXs'}
              </button>
            </div>

            {/* Quick Presets */}
            <div className="scenarios-section">
              <span className="section-micro-heading">QUICK PRESET SCENARIOS</span>
              <div className="scenarios-grid">
                {scenarios.map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    className={`scenario-card-btn ${selectedScenario === sc.id ? 'active-scenario' : ''}`}
                    onClick={() => handleScenarioSelect(sc)}
                  >
                    <div className="sc-header">
                      <span className="sc-amount">₹{parseInt(sc.amount).toLocaleString()}</span>
                      <span className={`sc-radio-dot ${selectedScenario === sc.id ? 'dot-active' : ''}`} />
                    </div>
                    <span className="sc-label">{sc.label}</span>
                  </button>
                ))}
              </div>

              {/* 1-Click Multi-Transaction Attack Scenario Demonstrators */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleExecuteVelocityBurst}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#f87171',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                  title="Sends 3 rapid authorizations for CUST-1001 to trigger RULE_VELOCITY in sliding 60s window"
                >
                  <span>⚡ 3x Velocity Burst</span>
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleExecuteImpossibleFlight}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    color: '#38bdf8',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                  title="Sends Mumbai then London 5m later (7,200km at 86,400km/h) to trigger RULE_IMPOSSIBLE_LOCATION"
                >
                  <span>✈️ Mumbai ➔ London</span>
                </button>
              </div>
            </div>

            {/* Checkout Input Fields Form */}
            <form onSubmit={handleProcessTransaction} className="checkout-fields-form">
              {/* AUTHORIZATION AMOUNT */}
              <div className="form-group-wrap">
                <div className="field-label-row">
                  <label className="field-label" htmlFor="pay-amt">TRANSACTION AMOUNT (INR)</label>
                </div>
                <div className="large-amount-input-box">
                  <span className="currency-symbol">₹</span>
                  <input
                    id="pay-amt"
                    type="text"
                    value={formData.amount}
                    placeholder="Enter amount (e.g. 5000)"
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9.]/g, '');
                      setFormData((prev) => ({ ...prev, amount: clean }));
                      setSelectedScenario('custom');
                    }}
                    className="large-amount-field"
                  />
                </div>
              </div>

              {/* Target Merchant & Geo Telemetry */}
              <div className="two-col-inputs">
                <div className="form-group-wrap">
                  <label className="field-label" htmlFor="pay-merch">MERCHANT NAME</label>
                  <div className="icon-input-container">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    <input
                      id="pay-merch"
                      type="text"
                      value={formData.merchant}
                      placeholder="e.g. Swiggy, Amazon, Unknown Merchant"
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, merchant: e.target.value }));
                        setSelectedScenario('custom');
                      }}
                      className="clean-field"
                    />
                  </div>
                </div>

                <div className="form-group-wrap">
                  <label className="field-label" htmlFor="pay-geo">LOCATION / CITY</label>
                  <div className="icon-input-container">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <input
                      id="pay-geo"
                      type="text"
                      value={formData.location}
                      placeholder="e.g. Mumbai, Delhi, Dubai"
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, location: e.target.value }));
                        setSelectedScenario('custom');
                      }}
                      className="clean-field"
                    />
                  </div>
                </div>
              </div>

              {/* Timing & Payment Method */}
              <div className="two-col-inputs">
                <div className="form-group-wrap">
                  <label className="field-label" htmlFor="pay-time">TRANSACTION TIMING</label>
                  <div className="icon-input-container">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <input
                      id="pay-time"
                      type="text"
                      value={formData.timing}
                      placeholder="HH:MM (e.g. 14:30 or 03:00)"
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, timing: e.target.value }));
                        setSelectedScenario('custom');
                      }}
                      className="clean-field font-mono"
                    />
                  </div>
                </div>

                <div className="form-group-wrap">
                  <label className="field-label">PAYMENT METHOD</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[
                      { id: 'UPI', label: 'UPI (GPay/PhonePe)', icon: '⚡' },
                      { id: 'CARD', label: 'Credit/Debit Card', icon: '💳' },
                      { id: 'NETBANKING', label: 'Net Banking', icon: '🏛️' }
                    ].map((pm) => {
                      const isSelected = formData.payment_method === pm.id;
                      return (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, payment_method: pm.id }));
                            setSelectedScenario('custom');
                          }}
                          style={{
                            flex: 1,
                            padding: '8px 6px',
                            borderRadius: '6px',
                            border: `1.5px solid ${isSelected ? '#2563eb' : '#cbd5e1'}`,
                            background: isSelected ? '#eff6ff' : '#ffffff',
                            color: isSelected ? '#1d4ed8' : '#334155',
                            fontWeight: isSelected ? 700 : 500,
                            fontSize: '11px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span>{pm.icon}</span>
                          <span>{pm.id}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Device Profile Selection — Crisp Interactive Cards */}
              <div className="form-group-wrap">
                <label className="field-label">DEVICE PROFILE</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { id: 'mobile', label: 'Verified Mobile', sub: 'iOS / Android', fp: 'iOS 17 (Safari) • Verified Mobile', icon: '📱' },
                    { id: 'desktop', label: 'Known Desktop', sub: 'Windows / Mac', fp: 'Windows 11 (Edge) • Known Desktop', icon: '💻' },
                    { id: 'new_device', label: 'New / Spoofed Device', sub: 'High Risk Alert', fp: 'MacOS (Chrome) • Unrecognized Device', icon: '⚠️' }
                  ].map((dev) => {
                    const isSelected = formData.device === dev.id;
                    const isHighRisk = dev.id === 'new_device';
                    return (
                      <button
                        key={dev.id}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, device: dev.id, fingerprint: dev.fp }));
                          setSelectedScenario('custom');
                        }}
                        style={{
                          padding: '10px 8px',
                          borderRadius: '8px',
                          border: `1.5px solid ${
                            isSelected 
                              ? (isHighRisk ? '#dc2626' : '#2563eb') 
                              : '#cbd5e1'
                          }`,
                          background: isSelected 
                            ? (isHighRisk ? '#fef2f2' : '#eff6ff') 
                            : '#ffffff',
                          color: isSelected 
                            ? (isHighRisk ? '#b91c1c' : '#1d4ed8') 
                            : '#334155',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ fontSize: '16px', marginBottom: '2px' }}>{dev.icon}</div>
                        <div style={{ fontWeight: 700, fontSize: '11px' }}>{dev.label}</div>
                        <div style={{ fontSize: '10px', color: isSelected && isHighRisk ? '#ef4444' : '#64748b' }}>
                          {dev.sub}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CTA Button */}
              <button
                id="process-transaction-btn"
                type="submit"
                disabled={isProcessing}
                className="btn-process-transaction mt-3"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                {isProcessing
                  ? 'ANALYZING TRANSACTION WITH ML...'
                  : `PROCESS TRANSACTION (₹${formattedDisplayAmount})`}
              </button>
            </form>
          </div>
        </section>

        {/* ========================================================
            RIGHT COLUMN: EVALUATION VERDICT INSPECTOR
            ======================================================== */}
        <section className="verdict-inspector-column" aria-label="Evaluation Verdict Inspector">
          {/* Header Row */}
          <div className="inspector-header-strip">
            <h3 className="inspector-heading">ML EVALUATION VERDICT</h3>
            <span className="badge-live-ml" style={{
              fontSize: '11px',
              padding: '3px 8px',
              borderRadius: '12px',
              background: verdict.modelStatus === 'live' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: verdict.modelStatus === 'live' ? '#10b981' : '#f59e0b',
              fontWeight: 600
            }}>
              {verdict.modelStatus === 'live' ? '⚡ LIVE ML' : verdict.modelStatus === 'mock' ? '⚠️ MOCK MODE' : '⚠️ OFFLINE'}
            </span>
            {verdict.shapAvailable && (
              <span style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.15)',
                color: '#818cf8',
                fontWeight: 600,
                marginLeft: '4px'
              }}>
                SHAP
              </span>
            )}
          </div>

          {/* Verdict Banner */}
          {verdict.status === 'BLOCKED' ? (
            <div className="hero-verdict-banner banner-blocked">
              <div className="banner-top-headline">
                <span className="kicker-tag">AUTONOMOUS INTERCEPT</span>
                <span className="decision-code-pill">{verdict.decision}</span>
              </div>
              <div className="banner-title-line">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <h4>TRANSACTION BLOCKED</h4>
              </div>
              <p className="banner-sub-text">High-risk anomalous transaction detected by ML model.</p>
            </div>
          ) : (
            <div className="hero-verdict-banner banner-approved">
              <div className="banner-top-headline">
                <span className="kicker-tag">AUTONOMOUS CLEARANCE</span>
                <span className="decision-code-pill pass-pill">{verdict.decision}</span>
              </div>
              <div className="banner-title-line">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <h4>TRANSACTION APPROVED</h4>
              </div>
              <p className="banner-sub-text">Normal spending behavior verified across behavioral checkpoints.</p>
            </div>
          )}

          {/* Metrics Grid */}
          <div className="verdict-metrics-duo">
            <div className="v-metric-card">
              <span className="metric-micro-label">FRAUD PROBABILITY</span>
              <div className={`metric-primary-figure ${verdict.status === 'BLOCKED' ? 'text-crimson' : 'text-emerald'}`}>
                {verdict.fraudLikelihood}%
              </div>
              <span className="metric-sub-note">{verdict.threatCategory}</span>
            </div>

            <div className="v-metric-card">
              <span className="metric-micro-label">MODEL INFERENCE</span>
              <div className="metric-primary-figure font-mono" style={{ fontSize: '18px', paddingTop: '4px' }}>
                {verdict.modelId}
              </div>
              <span className="metric-sub-note">Latency: {verdict.latency}</span>
            </div>
          </div>

          {/* Visual Behavioral Pattern & Interactive Anomaly Gauge Chart */}
          <div style={{
            margin: '14px 0',
            padding: '16px',
            borderRadius: '10px',
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(51, 65, 85, 0.8)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.5">
                  <path d="M12 20v-6M6 20V10M18 20V4" />
                </svg>
                <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.05em', color: '#94a3b8' }}>
                  ANOMALY PATTERN & THREAT VISUALIZER
                </span>
              </div>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '4px',
                background: verdict.status === 'BLOCKED' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)',
                color: verdict.status === 'BLOCKED' ? '#ef4444' : '#10b981',
                border: `1px solid ${verdict.status === 'BLOCKED' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`
              }}>
                {verdict.status === 'BLOCKED' ? 'CRITICAL ANOMALY' : 'PERFECT / CLEAN PAYMENT'}
              </span>
            </div>

            {/* Interactive Semi-Circular Gauge & Multi-Axis Bar Chart */}
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '14px', alignItems: 'center' }}>
              {/* Semi-Circle SVG Radial Gauge */}
              <div style={{ position: 'relative', textAlign: 'center', width: '130px', height: '85px' }}>
                <svg width="130" height="85" viewBox="0 0 130 85">
                  {/* Gauge background arc */}
                  <path
                    d="M 15 75 A 50 50 0 0 1 115 75"
                    fill="none"
                    stroke="#334155"
                    strokeWidth="12"
                    strokeLinecap="round"
                  />
                  {/* Colored progress arc based on fraudLikelihood */}
                  <path
                    d="M 15 75 A 50 50 0 0 1 115 75"
                    fill="none"
                    stroke={verdict.status === 'BLOCKED' ? 'url(#gaugeRedGrad)' : '#10b981'}
                    strokeWidth="12"
                    strokeDasharray="157"
                    strokeDashoffset={157 - (157 * Math.min(100, parseFloat(verdict.fraudLikelihood || 0))) / 100}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                  />
                  <defs>
                    <linearGradient id="gaugeRedGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                  </defs>
                </svg>
                <div style={{ position: 'absolute', bottom: '6px', left: 0, right: 0 }}>
                  <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'monospace', color: verdict.status === 'BLOCKED' ? '#ef4444' : '#10b981' }}>
                    {verdict.fraudLikelihood}%
                  </div>
                  <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                    {verdict.status === 'BLOCKED' ? 'Fraud Threat' : 'Safe Index'}
                  </div>
                </div>
              </div>

              {/* 3 Parameter Comparative Visual Spectrum */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {/* 1. Transaction Amount Spectrum */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#cbd5e1', marginBottom: '2px' }}>
                    <span>Amount Magnitude</span>
                    <strong style={{ color: parseFloat(formData.amount || 0) > 10000 ? '#ef4444' : '#10b981' }}>
                      ₹{parseInt(formData.amount || 0).toLocaleString()} ({parseFloat(formData.amount || 0) > 10000 ? 'Outlier' : 'Normal'})
                    </strong>
                  </div>
                  <div style={{ height: '6px', background: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, Math.max(8, (parseFloat(formData.amount || 0) / 75000) * 100))}%`,
                      background: parseFloat(formData.amount || 0) > 10000 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : '#10b981',
                      borderRadius: '3px',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>

                {/* 2. Device Fingerprint Integrity */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#cbd5e1', marginBottom: '2px' }}>
                    <span>Device Trust Integrity</span>
                    <strong style={{ color: formData.device === 'new_device' ? '#ef4444' : '#10b981' }}>
                      {formData.device === 'new_device' ? 'Mismatch (0%)' : 'Verified (98%)'}
                    </strong>
                  </div>
                  <div style={{ height: '6px', background: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: formData.device === 'new_device' ? '10%' : '98%',
                      background: formData.device === 'new_device' ? '#ef4444' : '#10b981',
                      borderRadius: '3px',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>

                {/* 3. Geo-Perimeter Alignment */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#cbd5e1', marginBottom: '2px' }}>
                    <span>Geographic Perimeter</span>
                    <strong style={{ color: (formData.location || '').toLowerCase().includes('dubai') || (formData.location || '').toLowerCase().includes('london') ? '#ef4444' : '#10b981' }}>
                      {(formData.location || '').toLowerCase().includes('dubai') || (formData.location || '').toLowerCase().includes('london') ? 'High-Risk Zone' : 'Clear Domestic'}
                    </strong>
                  </div>
                  <div style={{ height: '6px', background: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: (formData.location || '').toLowerCase().includes('dubai') || (formData.location || '').toLowerCase().includes('london') ? '92%' : '14%',
                      background: (formData.location || '').toLowerCase().includes('dubai') || (formData.location || '').toLowerCase().includes('london') ? '#ef4444' : '#10b981',
                      borderRadius: '3px',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AWS SES/SNS Alert Dispatch Receipt Banner */}
          {verdict.awsAlertSent && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: '8px',
                margin: '12px 0',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#fca5a5',
                fontSize: '12px',
              }}
            >
              <span style={{ fontSize: '18px' }}>🚨</span>
              <div>
                <strong>AWS SES & SNS Alert Dispatched:</strong> High-risk security threshold crossed.
                <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '2px' }}>
                  Delivery Reference: <code>{verdict.awsMessageId || 'AWS-DELIVERY-OK'}</code> • Sandbox/SES Dispatched
                </div>
              </div>
            </div>
          )}

          {/* Triggered Rule Engine Heuristics Section */}
          <div style={{
            margin: '12px 0',
            padding: '14px',
            borderRadius: '8px',
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(56, 189, 248, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.05em', color: '#38bdf8' }}>
                TRIGGERED RULE ENGINE HEURISTICS
              </span>
              <span style={{
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '10px',
                fontWeight: 700,
                backgroundColor: verdict.flags && verdict.flags.length > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                color: verdict.flags && verdict.flags.length > 0 ? '#f87171' : '#34d399',
                border: `1px solid ${verdict.flags && verdict.flags.length > 0 ? '#ef4444' : '#10b981'}`
              }}>
                {verdict.flags && verdict.flags.length > 0 ? `${verdict.flags.length} RULES FIRED` : '0 RULES FIRED (SAFE)'}
              </span>
            </div>

            {(!verdict.flags || verdict.flags.length === 0) ? (
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                ✓ No deterministic rule violations. Authorization passed velocity, baseline amount, and geographic checks.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {verdict.flags.map((flag, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: 'rgba(30, 41, 59, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <strong style={{ fontSize: '11px', color: flag.severity === 'CRITICAL' ? '#f87171' : '#fde047' }}>
                        [{flag.rule_code}] {flag.rule_name}
                      </strong>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '3px',
                        backgroundColor: flag.severity === 'CRITICAL' ? '#dc2626' : '#d97706',
                        color: '#fff'
                      }}>
                        {flag.severity}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                      {flag.reason}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SHAP FEATURE ATTRIBUTION */}
          <div className="risk-factors-container">
            <span className="section-micro-heading">
              {verdict.shapAvailable ? 'SHAP FEATURE ATTRIBUTION' : 'RISK FACTORS'}
            </span>

            {verdict.riskFactors.length === 0 ? (
              <div className="factor-clean-card">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <div>
                  <strong>Legitimate Transaction</strong>
                  <p>Matches normal user spending patterns, trusted locations, and recognized devices.</p>
                </div>
              </div>
            ) : (
              <div className="factors-list">
                {verdict.riskFactors.map((factor, idx) => (
                  <div key={idx} className="factor-card-item">
                    <div className="factor-icon-col">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </div>
                    <div className="factor-text-col">
                      <strong>{factor.title}</strong>
                      <p>{factor.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SHAP Value Bars (when available) */}
          {verdict.shapAvailable && Object.keys(verdict.shapValues).length > 0 && (
            <div style={{
              margin: '10px 0',
              padding: '12px',
              borderRadius: '8px',
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(99, 102, 241, 0.3)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.05em', color: '#818cf8' }}>
                  SHAP FEATURE CONTRIBUTIONS
                </span>
              </div>
              {Object.entries(verdict.shapValues)
                .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                .map(([feature, value]) => (
                  <div key={feature} style={{ marginBottom: '5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>
                      <span>{feature.replace(/_/g, ' ')}</span>
                      <span style={{ fontFamily: 'monospace', color: value > 0 ? '#ef4444' : '#10b981' }}>
                        {value > 0 ? '+' : ''}{value.toFixed(4)}
                      </span>
                    </div>
                    <div style={{ height: '4px', background: '#1e293b', borderRadius: '2px', overflow: 'hidden', position: 'relative' }}>
                      <div style={{
                        position: 'absolute',
                        left: value > 0 ? '50%' : `${50 - Math.min(50, Math.abs(value) * 200)}%`,
                        width: `${Math.min(50, Math.abs(value) * 200)}%`,
                        height: '100%',
                        background: value > 0 ? '#ef4444' : '#10b981',
                        borderRadius: '2px',
                        transition: 'all 0.3s ease'
                      }} />
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Agentic Message (CHALLENGE OTP or BLOCK Case Note) */}
          {verdict.agentAction && verdict.agentAction.customer_message && (
            <div style={{
              margin: '10px 0',
              padding: '12px',
              borderRadius: '8px',
              background: verdict.agentAction.action === 'BLOCK'
                ? 'rgba(220, 38, 38, 0.08)'
                : 'rgba(245, 158, 11, 0.08)',
              border: `1px solid ${verdict.agentAction.action === 'BLOCK' ? 'rgba(220, 38, 38, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span style={{
                  fontSize: '10px', fontWeight: 800, letterSpacing: '0.05em',
                  color: verdict.agentAction.action === 'BLOCK' ? '#ef4444' : '#f59e0b'
                }}>
                  {verdict.agentAction.action === 'BLOCK' ? '🛑 AGENT: BLOCK NOTIFICATION' : '🔐 AGENT: OTP CHALLENGE'}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#e2e8f0', lineHeight: 1.5, margin: 0 }}>
                {verdict.agentAction.customer_message}
              </p>
              {verdict.agentAction.analyst_case_note && (
                <details style={{ marginTop: '8px' }}>
                  <summary style={{ fontSize: '10px', color: '#94a3b8', cursor: 'pointer', fontWeight: 600 }}>
                    VIEW ANALYST CASE NOTE
                  </summary>
                  <pre style={{
                    fontSize: '10px', color: '#cbd5e1', marginTop: '6px',
                    padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px',
                    whiteSpace: 'pre-wrap', lineHeight: 1.4
                  }}>
                    {verdict.agentAction.analyst_case_note}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="inspector-actions-row">
            <button
              type="button"
              className="btn-reset-preset"
              onClick={() => handleScenarioSelect(scenarios[0])}
            >
              Reset to Safe Preset
            </button>
            <button
              type="button"
              className="btn-open-forensics"
              onClick={() => onNavigate && onNavigate('/dashboard')}
            >
              View in Live Dashboard
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
