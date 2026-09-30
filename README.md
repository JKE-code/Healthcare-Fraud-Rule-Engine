# FraudGuard: Autonomous Real-Time Fraud Detection & Risk Agent

> **Enterprise-grade pre-authorization fraud scoring and autonomous intervention engine for UPI, cards, and digital payment networks.**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat&logo=react)](https://react.dev)
[![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-1.4+-F7931E?style=flat&logo=scikit-learn)](https://scikit-learn.org)
[![WebSockets](https://img.shields.io/badge/WebSockets-Realtime-blue?style=flat)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=flat&logo=vite)](https://vitejs.dev)

---

## 1. Executive Summary

Traditional financial fraud detection relies on **post-transaction batch processing**, taking hours or days before suspicious activities are caught and chargebacks initiated.

**FraudGuard** flips this model by intercepting transactions **pre-authorization** in **sub-20 milliseconds**:
1. Every payment authorization payload is ingested in real-time.
2. An ensemble of **Supervised Machine Learning** (`RandomForestClassifier`), **Unsupervised Anomaly Detection** (`IsolationForest`), and **Contextual Heuristics** evaluates risk.
3. High-risk attacks (`CRITICAL` / `HIGH`) are blocked or challenged before money leaves the account.
4. An **Explainable AI (XAI)** module produces plain-English, regulatory-ready justifications for compliance and security analysts.

---

## 2. Core Architecture & Pipeline

```
                               Incoming Authorization
                     (Amount, Location, Timing, Device, Rail)
                                        │
                                        ▼
                      ┌───────────────────────────────────┐
                      │  FraudGuard Fast ML Engine        │
                      └─────────────────┬─────────────────┘
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             ▼                          ▼                          ▼
   1. Supervised Classifier   2. Unsupervised Anomaly   3. Behavioral Heuristics
      (Random Forest)            (Isolation Forest)        (Context Engine)
             │                          │                          │
             └──────────────────────────┼──────────────────────────┘
                                        │
                                        ▼
                           Hybrid Risk Evaluator (0.0 - 1.0)
                                        │
                                        ▼
                     Decision Engine & Explainable AI (XAI)
                    ┌───────────────────┬───────────────────┐
                    ▼                                       ▼
             APPROVED (Pass 200)                    BLOCKED (Reject 403)
                    │                                       │
                    └───────────────────┬───────────────────┘
                                        │
                                        ▼
                       FastAPI Real-Time WebSocket Bus
                                        │
                                        ▼
                       SecOps Live React Dashboard
```

---

## 3. Technology Stack

### Machine Learning (`ml_engine/`)
* **Python 3.12**
* **Scikit-Learn**:
  * `RandomForestClassifier`: Trained on 284,000+ real transaction records to recognize subtle fraud vectors.
  * `IsolationForest`: Unsupervised statistical outlier detector flagging zero-day fraud.
* **Contextual Heuristic Engine**: Real-time evaluation of transaction magnitudes, foreign geolocations, unrecognized device hardware entropy, and late-night hour activity (12 AM – 5 AM).
* **Explainability Module**: Plain-English factor decomposition for RBI / NPCI compliance without black-box opacity.

### Backend API (`backend/`)
* **FastAPI**: Asynchronous REST framework serving high-throughput endpoints.
* **Uvicorn**: ASGI web server handling persistent WebSocket channels.
* **Pydantic v2**: Strict schema validation for transaction authorization payloads.
* **In-Memory Store & Generator**: High-speed thread-safe buffer with background live transaction simulation for interactive demos.

### Frontend Dashboard (`frontend/`)
* **React 19 & Vite 8**: Modern UI layer.
* **WebSocket Ingestion**: Real-time event streaming updating dashboard cards and tables with zero polling.
* **Responsive CSS**: Dark-mode console styling with glassmorphism effects and SVG waveform animations.

---

## 4. Key Platform Features

### Real-Time SecOps Dashboard (`/dashboard`)
* **Live KPI Bar**: Real-time metrics tracking Total Transactions, Fraud Intercepted, High-Risk Flags, and Average Risk Score.
* **Streaming Monitoring Table**: Color-coded transaction telemetry (`LOW`, `MEDIUM`, `CRITICAL`) updating via WebSockets.
* **Customer Behavioral Profile Comparison**: Contrasts the selected transaction against the customer's typical spending profile (amount range, home location, trusted mobile).
* **Interactive Waveform Chart**: Glowing SVG threat timeline with rotating radar beacons locked onto the selected transaction.
* **1-Click Forensic Incident Dossier**: One-click download of a structured JSON incident report (`Forensic_Dossier_<TX>.json`) adhering to compliance standards.

### Transaction Risk Simulator (`/pay`)
* **Custom Parameter Playground**: Test any custom amount (₹), merchant name, city/location, transaction timing (HH:MM), device profile, and payment rail (UPI / Card / NetBanking).
* **Quick Presets**: One-click benchmark attacks (₹450 Safe Coffee, ₹8,500 Elevated Tech, ₹95,000 Dubai Luxury Attack).
* **Interactive Semi-Circular Threat Gauge**: Live animated radial arc and comparative spectrum bars displaying Amount Outlier %, Device Authentication Trust %, and Geo-Perimeter Alignment.

### Policy Firewall Rules (`/rules`)
* **Algorithmic Rule Engine**: View active heuristics across Geolocation, Velocity, Device Fingerprints, and ML thresholds.
* **Interactive Rule Creator**: Create and enable custom rules with AST condition expressions and automated actions (`BLOCK`, `CHALLENGE OTP`, `REVIEW`, `SHADOW`).

### Compliance Audit Logs (`/logs`)
* Immutable historical record of flagged incidents and actions taken.

---

## 5. Quick Start Guide

### Prerequisites
* **Python 3.10+**
* **Node.js 18+** & **npm**

### Step 1: Clone Repository
```bash
git clone https://github.com/JKE-code/Code-A-Thon.git
cd Code-A-Thon
```

### Step 2: Set Up Backend & Machine Learning
```powershell
# Create virtual environment
python -m venv venv

# Activate virtual environment (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Install ML and Backend dependencies
pip install -r requirements.txt
pip install -r backend/requirements.txt

# Run automated test suites
python ml_engine/test_predictor.py
python backend/test_api.py

# Launch Backend Server
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
* **API Endpoint**: `http://localhost:8000`
* **Interactive API Docs (Swagger)**: `http://localhost:8000/docs`
* **WebSocket**: `ws://localhost:8000/ws`

### Step 3: Set Up & Launch Frontend
In a second terminal:
```powershell
cd frontend
npm install
npm run dev
```
* **Console UI**: `http://localhost:5173`

---

## 6. Project Structure

```
Code-A-Thon/
├── ml_engine/                      # Machine Learning Core
│   ├── models/                     # Serialized Model Artifacts (.pkl)
│   ├── predictor.py                # Single-point prediction interface
│   ├── features.py                 # Vector normalization & PCA projection
│   ├── risk.py                     # Contextual risk engine
│   ├── explain.py                  # Plain-English XAI factor generation
│   └── test_predictor.py           # ML test suite
│
├── backend/                        # FastAPI Service
│   ├── main.py                     # App setup & WebSocket broadcaster
│   ├── models.py                   # Pydantic schemas
│   ├── store.py                    # Thread-safe in-memory transaction store
│   ├── routes/
│   │   ├── transactions.py         # REST transaction ingestion routes
│   │   └── dashboard.py            # KPI aggregation routes
│   └── test_api.py                 # API contract test suite
│
├── frontend/                       # React 19 Frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx       # SecOps monitoring console
│   │   │   ├── Payment.jsx         # Gateway risk simulator with radial gauge
│   │   │   ├── PolicyRules.jsx     # Rule engine with interactive creator
│   │   │   └── AuditLogs.jsx       # Incident ledger
│   │   ├── components/             # Reusable UI cards, tables & SVG charts
│   │   │   ├── ActivityChart.jsx   # Threat waveform with selectedTx beacon
│   │   │   ├── FraudChart.jsx      # Interactive donut flow chart
│   │   │   ├── RiskChart.jsx       # Risk tier distribution bars
│   │   │   └── TransactionDetails.jsx # Forensics drawer & dossier export
│   │   └── api.js                  # WebSocket & HTTP connectors
│   └── package.json
│
├── README.md                       # Documentation
└── requirements.txt                # Root dependencies
```

---

## 7. License & Compliance
Built for Hackathon Demo & Research. Compliant with simulated RBI/NPCI cyber-fraud prevention telemetry guidelines.
