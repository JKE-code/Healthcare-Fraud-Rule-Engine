# Acentra — Real-Time Fraud Rule Engine & SecOps Review Console

> **A high-throughput, low-latency financial fraud detection platform combining deterministic heuristic rule policies, adaptive Dual-Engine Machine Learning (LightGBM / RandomForest) with SHAP explainability, relational persistence, automated AWS alerting, and a real-time SecOps triage console.**

[![Live Demo Console](https://img.shields.io/badge/Live%20Demo-Vercel%20Console-success?style=for-the-badge&logo=vercel)](https://healthcare-fraud-rule-engine.vercel.app/)
[![Cloud API Backend](https://img.shields.io/badge/Render%20Cloud-Backend%20API-informational?style=for-the-badge&logo=render)](https://healthcare-fraud-rule-engine.onrender.com)
[![Swagger API Docs](https://img.shields.io/badge/Swagger%20Docs-Interactive%20API-FF6C37?style=for-the-badge&logo=swagger)](https://healthcare-fraud-rule-engine.onrender.com/docs)

[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.14-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![SQLite](https://img.shields.io/badge/SQLite-SQLAlchemy_2.0-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://www.sqlite.org)
[![AWS SES / SNS](https://img.shields.io/badge/AWS-SES_%26_SNS-FF9900?style=flat-square&logo=amazon-aws&logoColor=white)](https://aws.amazon.com)
[![SHAP](https://img.shields.io/badge/Explainability-SHAP%20TreeExplainer-E25A1C?style=flat-square)](https://github.com/slundberg/shap)
[![Tests](https://img.shields.io/badge/Tests-10%2F10%20Passing-2ea44f?style=flat-square)](backend/test_rule_engine.py)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

---

## 🚀 Live Deployments

| Component | Provider | Live URL | Description |
| :--- | :--- | :--- | :--- |
| **SecOps Reviewer Console** | **Vercel** | [https://healthcare-fraud-rule-engine.vercel.app/](https://healthcare-fraud-rule-engine.vercel.app/) | Production React 19 Frontend with real-time WebSocket feed & Kaggle switch |
| **Cloud API & Rule Engine** | **Render** | [https://healthcare-fraud-rule-engine.onrender.com](https://healthcare-fraud-rule-engine.onrender.com) | FastAPI backend, SQLite persistence, ML inference & rule evaluation |
| **Interactive API Docs** | **Swagger / OpenAPI** | [https://healthcare-fraud-rule-engine.onrender.com/docs](https://healthcare-fraud-rule-engine.onrender.com/docs) | Live interactive endpoint testing & schema exploration |

---

## Overview

Modern payment networks (UPI, Credit Cards, Cross-Border Gateways) require instantaneous fraud interception without degrading checkout latency. **Acentra** is an enterprise-grade risk decisioning engine designed to evaluate authorizations in **< 5ms**.

It pairs deterministic business rules (geospatial travel velocity, sliding-window velocity bursts, amount deviation models) with an **adaptive Dual-Engine Machine Learning pipeline (LightGBM / RandomForest)** and **SHAP (SHapley Additive exPlanations)**. Flagged incidents stream in real-time over WebSockets to a dedicated **SecOps Reviewer Console** for analyst triage, complete with automated **AWS SES/SNS incident notifications** and immutable cryptographic audit logging.

---

## Key Features

### ⚡ Sub-5ms Hybrid Evaluation Pipeline
* **Deterministic Rule Policies**: Evaluates transaction velocity, geospatial speed, amount outliers, and device fingerprints in parallel.
* **LightGBM for Known Historical Patterns**: Supervised gradient boosted trees trained on labeled Kaggle credit card fraud data, learning complex interactions across MCC, amount ranges, and velocity spikes (with automated RandomForest fallback).
* **Isolation Forest for Behavioral Anomalies**: Unsupervised model dedicated to behavioral transaction data, flagging out-of-distribution customer deviations and zero-day anomalies without requiring prior labels.
* **Transparent SHAP Explainability**: Local feature-level **SHAP TreeExplainer** attributions show analysts the exact mathematical justification for every risk score.

### 🛡️ Extensible Rule Engine (Open-Closed Principle)
* **Modular Plug-and-Play**: Register custom detection rules with a simple `@register_rule` decorator without altering core engine logic.
* **Runtime Dynamic Hot-Reload**: Adjust rule thresholds (velocity limits, Haversine speed limits, amount multipliers) and weights via API without server restarts.
* **Live Rule Analytics**: Tracks real-time evaluation counts, positive trigger rates, and false-positive rates per rule directly from SQLite telemetry.

### 🖥️ Real-Time SecOps Reviewer Console
* **Reactive WebSocket Feed**: Live transaction push with sub-second visual signal indicators and high-risk audio/toast alerts.
* **Analyst Triage Queue**: Filter transactions by status (`Flagged`, `Reviewed`, `Cleared`) and risk tier (`Critical`, `High`, `Medium`, `Low`).
* **Interactive Analyst Actions**: One-click **"Mark as Reviewed"** and **"Mark as Cleared"** with mandatory justification notes.
* **Forensic Incident Dossiers**: Generate and download comprehensive, cryptographically verified incident reports per transaction.

### 📊 Multi-Stream Ingestion & Benchmark Dataset
* **Kaggle Dataset Streaming**: Integrated 150-record authentic credit card fraud dataset from the benchmark [kartik2112/fraud-detection](https://www.kaggle.com/datasets/kartik2112/fraud-detection) corpus.
* **Executive Mode Switcher**: Live frontend toggle to switch between **Authentic Kaggle Dataset** and **Procedural Synthetic Personas**.
* **Data Provenance Badges**: Visual indicators (`[KAGGLE]` vs `[SYNTH]`) and feed-specific filter tabs across the monitoring queue.

### ☁️ Automated Cloud Alerting & Compliance
* **Multi-Channel Dispatch**: Automated email notifications via **AWS SES** and SMS/push broadcasts via **AWS SNS** for critical risks ($\ge 0.70$).
* **Zero-Cost Smart Sandbox**: Seamlessly falls back to an internal delivery receipt simulator if AWS keys are not supplied ($0.00 spend).
* **SOC-2 Audit Trail**: Chronological, tamper-evident audit logs recording every human override, exportable to JSON in 1 click.

---

## Architecture

```text
                           Incoming Transaction Stream
                    (Authentic Kaggle Dataset  OR  Synthetic Personas)
                                         │
                                         ▼
                             FastAPI Ingestion Engine
                             (POST /api/transactions)
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │                                               │
                 ▼                                               ▼
   ┌───────────────────────────┐                   ┌───────────────────────────┐
   │  Extensible Rule Engine   │                   │    Dual-Engine ML Model   │
   │      (backend/rules/)     │                   │   (LightGBM / RandomForest)│
   ├───────────────────────────┤                   ├───────────────────────────┤
   │ • RULE_VELOCITY (Window)  │                   │ • Fraud Probability %     │
   │ • RULE_UNUSUAL_AMOUNT     │                   │ • IsolationForest Anomaly │
   │ • RULE_IMPOSSIBLE_LOCATION│                   │ • Local SHAP Feature      │
   │ • RULE_NEW_DEVICE         │                   │   Attribution Breakdown   │
   └─────────────┬─────────────┘                   └─────────────┬─────────────┘
                 │                                               │
                 └───────────────────────┬───────────────────────┘
                                         │
                                         ▼
                            Composite Risk Evaluation
                        (Score: 0.00–1.00  |  Decision)
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
   ┌───────────────────────────┐                   ┌───────────────────────────┐
   │ SQLite Persistence Layer  │                   │    Risk Score ≥ 0.70 ?    │
   │       (backend/db/)       │                   └─────────────┬─────────────┘
   │ • transactions            │                                 │ YES
   │ • fraud_flags (1-to-N)    │                                 ▼
   │ • review_audit_logs       │                   ┌───────────────────────────┐
   └─────────────┬─────────────┘                   │   AWS SES / SNS Service   │
                 │                                 │ • SES Email Notification  │
                 │                                 │ • SNS Topic / SMS Alert   │
                 │                                 │ • Zero-Cost Sandbox Mock  │
                 │                                 └───────────────────────────┘
                 ▼
      WebSocket Broadcast (/ws)
                 │
                 ▼
   ┌───────────────────────────────────────────────────────────────────────────┐
   │                          React 19 Reviewer Console                        │
   ├───────────────────────────────────────────────────────────────────────────┤
   │ • Executive Mode Switcher: [🟢 Synthetic Feed] <-> [🔵 Kaggle Real Dataset]│
   │ • Queue Filters: All (100) | Flagged | Reviewed | Cleared                 │
   │ • Feed Source Filters: All Feeds | Kaggle Real | Synthetic               │
   │ • Provenance Badges: [KAGGLE] cyan pill vs [SYNTH] emerald pill           │
   │ • ML & SHAP Card: Anomaly Score + Feature Impact mini-bars                │
   │ • Triage Action Bar: "Mark as Reviewed" / "Mark as Cleared"               │
   │ • 1-Click Forensic Dossier & SOC-2 Audit Archive JSON Export              │
   └───────────────────────────────────────────────────────────────────────────┘
```

---

## Active Rule Policies

| Rule Code | Rule Name | Detection Methodology | Default Action |
| :--- | :--- | :--- | :--- |
| `RULE_VELOCITY` | **Velocity Surge** | Counts authorizations in a rolling sliding window (default: $\ge 3$ tx in 60s). Escalates to Critical on rapid sub-15s bursts. | Autonomous Challenge / Step-Up |
| `RULE_UNUSUAL_AMOUNT` | **Unusual Amount** | Statistical outlier detection comparing authorization amount against an absolute threshold (₹50,000) and historical multiplier ($3.5\times$). | Autonomous Block |
| `RULE_IMPOSSIBLE_LOCATION`| **Impossible Travel** | Calculates great-circle distance via **Haversine formula** between sequential card taps; flags travel velocity $> 850\text{ km/h}$. | Autonomous Block |
| `RULE_NEW_DEVICE` | **New Device Risk** | Flags transactions originating from unverified device signatures paired with high transaction values ($> ₹15,000$). | Manual Review |

---

## Extensibility Guide: Adding Custom Rules

Acentra follows the **Open-Closed Principle**. You can register a new detection policy in a single file without modifying the core engine:

```python
# backend/rules/custom_watchlist_rule.py
from backend.rules.base import BaseRule, RuleResult
from backend.rules.registry import register_rule

@register_rule
class MerchantWatchlistRule(BaseRule):
    rule_code = "RULE_MERCHANT_WATCHLIST"
    rule_name = "High-Risk Merchant Category"
    description = "Flags transactions directed to known risky merchant categories."
    weight = 1.2

    def evaluate(self, transaction: dict, history: list) -> RuleResult:
        merchant = str(transaction.get("merchant", "")).lower()
        if "crypto" in merchant or "gaming" in merchant:
            return RuleResult(
                rule_code=self.rule_code,
                rule_name=self.rule_name,
                triggered=True,
                risk_score=0.85,
                severity="CRITICAL",
                reason=f"Transaction routed to high-risk merchant '{transaction.get('merchant')}'.",
                metrics={"merchant": transaction.get("merchant")}
            )
        return RuleResult(rule_code=self.rule_code, rule_name=self.rule_name, triggered=False)
```

The new rule is automatically discovered, evaluated, persisted, and surfaced in the Reviewer Console.

---

## Quick Start

### Prerequisites
* Python 3.10+ (tested on Python 3.11 and 3.14)
* Node.js 18+ and npm

### 1. Backend Setup & Automated Tests
```bash
# Clone the repository
git clone https://github.com/JKE-code/Healthcare-Fraud-Rule-Engine.git
cd Healthcare-Fraud-Rule-Engine

# Install Python dependencies
pip install -r backend/requirements.txt

# Run full test suite (10/10 tests pass)
python -m pytest backend/test_rule_engine.py -v

# Start the FastAPI server on port 8000
python -m uvicorn backend.main:app --reload --port 8000
```
* Interactive Swagger Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
* Health Check Endpoint: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### 2. Frontend Review Console Setup
```bash
# In a separate terminal
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## API Reference

### Core Transaction Endpoints
* `POST /api/transactions` — Ingest and evaluate an authorization payload; returns composite risk score, flags, and ML inference.
* `GET /api/transactions` — Retrieve persisted transactions with query filters (`?flagged=true`, `?status=FLAGGED`, `?limit=100`).
* `GET /api/transactions/flagged` — Retrieve pending triage items for the analyst queue.
* `GET /api/transactions/{id}` — Fetch complete transaction details with triggered rule breakdown.
* `PATCH /api/transactions/{id}/review` — Update review status (`REVIEWED` or `CLEARED`) and write to audit trail.
* `GET /api/transactions/{id}/dossier` — Generate forensic compliance incident dossier.

### Rule Engine & Analytics Endpoints
* `GET /api/rules` — List all registered rules, weights, and parameters.
* `PATCH /api/rules/{rule_code}` — **Hot-Reload**: Update rule configuration, thresholds, or enabled state at runtime.
* `GET /api/rules/analytics` — Return SQLite-derived evaluation counts, positive rates, and false-positive rates.

### Audit & Security Endpoints
* `GET /api/audit-logs` — Chronological log of all analyst actions and status changes.
* `GET /api/audit-logs/export` — Downloadable JSON compliance archive with cryptographic identifiers.
* `POST /api/alerts/test` — Test AWS SES email and SNS topic notification dispatch on demand.

### Simulator & Feed Controls
* `GET /api/simulator/status` — Get current stream mode (`synthetic` or `kaggle`) and dataset info.
* `POST /api/simulator/mode` — Switch background stream mode between synthetic and Kaggle.
* `POST /api/scenarios/trigger` — Trigger pre-conditioned attack vectors (Velocity, Travel, Amount Spike).
* `POST /api/scenarios/stream-kaggle` — Batch stream authentic Kaggle records into the pipeline.
* `WS /ws` — Real-time bi-directional WebSocket connection for transaction and review broadcasts.

---

## Deployment Blueprint

* **Frontend (Vercel)**: Deployed at [https://healthcare-fraud-rule-engine.vercel.app/](https://healthcare-fraud-rule-engine.vercel.app/) (`root: frontend`, build command: `npm run build`). Connected via `frontend/.env.production` to the cloud backend.
* **Backend (Render)**: Deployed at [https://healthcare-fraud-rule-engine.onrender.com](https://healthcare-fraud-rule-engine.onrender.com) (FastAPI Web Service with automatic worker lifecycle, SQLite persistence, dual ML models, and real-time WebSocket support).

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
