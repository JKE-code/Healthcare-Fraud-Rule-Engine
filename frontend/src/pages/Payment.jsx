import React, { useState } from 'react';
import { API_URL } from '../api';
import { mockAnalyzeTransaction } from '../data/mockTransactions';

export function Payment({ onTransactionCreated, onNavigate }) {
  const scenarios = [
    {
      id: 'safe',
      amount: '450',
      label: 'Amazon / Safe Baseline',
      merchant: 'Amazon India',
      location: 'Mumbai',
      timing: '14:30',
      device: 'mobile',
      payment_method: 'UPI',
      fingerprint: 'iOS 17 (Safari) • Verified Mobile'
    },
    {
      id: 'elevated',
      amount: '8500',
      label: 'Electronics / Elevated',
      merchant: 'Croma Electronics',
      location: 'Delhi',
      timing: '23:45',
      device: 'desktop',
      payment_method: 'CARD',
      fingerprint: 'Windows 11 (Edge) • Known Desktop'
    },
    {
      id: 'critical',
      amount: '95000',
      label: 'Dubai Luxury / Critical',
      merchant: 'Al-Safa Watches & Luxury',
      location: 'Dubai',
      timing: '03:15',
      device: 'new_device',
      payment_method: 'CARD',
      fingerprint: 'MacOS (Chrome) • Unrecognized Device'
    }
  ];

  const [selectedScenario, setSelectedScenario] = useState('critical');
  const [formData, setFormData] = useState({
    amount: '95000',
    merchant: 'Al-Safa Watches & Luxury',
    location: 'Dubai',
    timing: '03:15',
    device: 'new_device',
    payment_method: 'CARD',
    fingerprint: 'MacOS (Chrome) • Unrecognized Device'
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [verdict, setVerdict] = useState({
    status: 'BLOCKED',
    decision: 'REJECT 403',
    fraudLikelihood: 94.5,
    threatCategory: 'CRITICAL Threat Category',
    modelId: 'Ensemble ML (RF + IsoForest)',
    latency: '18.2ms',
    refId: 'TX-INITIAL',
    timestamp: 'JUST NOW',
    riskFactors: [
      {
        title: 'High Amount Outlier',
        detail: 'Transaction amount (Rs.95,000) is extremely high compared to normal history.'
      },
      {
        title: 'Unrecognized Device Signature',
        detail: 'Transaction originated from a new or unrecognized device.'
      },
      {
        title: 'Foreign / Anomalous Location',
        detail: 'Transaction location (Dubai) differs from regular geographic baseline.'
      },
      {
        title: 'Unusual Transaction Timing',
        detail: 'Initiated during high-risk late-night hours (03:15 AM).'
      }
    ]
  });

  const handleScenarioSelect = (scenario) => {
    setSelectedScenario(scenario.id);
    setFormData({
      amount: scenario.amount,
      merchant: scenario.merchant,
      location: scenario.location,
      timing: scenario.timing,
      device: scenario.device,
      payment_method: scenario.payment_method,
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
      
      const latencyMs = (performance.now() - startTime).toFixed(1);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Convert backend ML explanation list to riskFactors format
      const explanations = (data.explanation && data.explanation.length > 0)
        ? data.explanation.map((item, idx) => ({
            title: `Factor #${idx + 1}`,
            detail: item
          }))
        : [];

      const isBlocked = data.risk_level === 'CRITICAL' || data.risk_level === 'HIGH';
      const fraudPct = ((data.fraud_probability || 0) * 100).toFixed(1);

      setVerdict({
        status: isBlocked ? 'BLOCKED' : 'APPROVED',
        decision: isBlocked ? (data.risk_level === 'CRITICAL' ? 'REJECT 403' : 'CHALLENGE 302') : 'PASS 200',
        fraudLikelihood: fraudPct,
        threatCategory: `${data.risk_level} Risk Category`,
        modelId: 'Ensemble ML (RF + IsoForest)',
        latency: `${latencyMs}ms`,
        refId: data.transaction_id,
        timestamp: 'JUST NOW',
        riskFactors: explanations
      });

      if (onTransactionCreated) onTransactionCreated(data);
    } catch (err) {
      // Offline fallback
      const mockResult = mockAnalyzeTransaction(payload);
      const isBlocked = mockResult.risk_level === 'CRITICAL' || mockResult.risk_level === 'HIGH';
      
      setVerdict({
        status: isBlocked ? 'BLOCKED' : 'APPROVED',
        decision: isBlocked ? 'REJECT 403' : 'PASS 200',
        fraudLikelihood: ((mockResult.fraud_probability || 0) * 100).toFixed(1),
        threatCategory: `${mockResult.risk_level} Risk Category`,
        modelId: 'ML Risk Engine (Offline)',
        latency: '15.4ms',
        refId: mockResult.transaction_id,
        timestamp: 'JUST NOW',
        riskFactors: (mockResult.explanation || []).map((exp, i) => ({
          title: `Triggered Signal #${i + 1}`,
          detail: exp
        }))
      });

      if (onTransactionCreated) onTransactionCreated(mockResult);
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
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              fontWeight: 600
            }}>
              LIVE MODEL PREDICTION
            </span>
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

          {/* TRIGGERED RISK FACTORS */}
          <div className="risk-factors-container">
            <span className="section-micro-heading">EXPLAINABLE AI FACTORS</span>

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
