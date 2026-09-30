# Acentra Fraud Rule Engine with Review Console

> **Production-grade financial fraud detection engine featuring an extensible plug-and-play rule architecture, SQLite relational persistence, AWS SES/SNS automated incident alerting, and a real-time React reviewer triage console.**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat&logo=react)](https://react.dev)
[![SQLite](https://img.shields.io/badge/SQLite-SQLAlchemy_2.0-003B57?style=flat&logo=sqlite)](https://www.sqlite.org)
[![AWS SES / SNS](https://img.shields.io/badge/AWS-SES_%26_SNS-FF9900?style=flat&logo=amazon-aws)](https://aws.amazon.com)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=flat&logo=vite)](https://vitejs.dev)
[![WebSockets](https://img.shields.io/badge/WebSockets-Realtime-blue?style=flat)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

---

## Table of Contents
1. [Problem Statement Alignment](#1-problem-statement-alignment)
2. [Architecture Overview](#2-architecture-overview)
3. [The Three Independent Rules & Extensibility](#3-the-three-independent-rules--extensibility)
4. [Persistence Schema (SQLite / PostgreSQL)](#4-persistence-schema-sqlite--postgresql)
5. [AWS SES & SNS Alerting Subsystem](#5-aws-ses--sns-alerting-subsystem)
6. [React Reviewer Console](#6-react-reviewer-console)
7. [Quick Start & Verification](#7-quick-start--verification)
8. [API Reference](#8-api-reference)

---

## 1. Problem Statement Alignment

| Requirement | Implementation in this Repository | Verification Status |
| :--- | :--- | :--- |
| **Rule engine for risk evaluation** | [`backend/rules/registry.py`](backend/rules/registry.py) executes registered rules, calculates composite risk scores (0.00–1.00), determines actions (`APPROVE`, `REVIEW`, `BLOCK`). | ✅ Implemented & Tested |
| **At least three independent rules** | 1. **Velocity Surge** ([`velocity_rule.py`](backend/rules/velocity_rule.py))<br>2. **Unusual Amount** ([`unusual_amount_rule.py`](backend/rules/unusual_amount_rule.py))<br>3. **Impossible Geographical Location** ([`impossible_location_rule.py`](backend/rules/impossible_location_rule.py)) | ✅ Implemented & Tested |
| **Extensible without core modification** | Adheres to **Open-Closed Principle (OCP)**. New rules subclass [`BaseRule`](backend/rules/base.py) and use `@register_rule`. Shown via [`new_device_rule.py`](backend/rules/new_device_rule.py). | ✅ Implemented & Tested |
| **Persist transactions & fraud flags** | Relational database via **SQLAlchemy + SQLite** (`fraud_rules.db`) storing `transactions`, `fraud_flags`, and `review_audit_logs`. | ✅ Implemented & Tested |
| **React-based reviewer console** | Real-time React 19 console with dark theme SecOps UI, live WebSockets, and triage queues. | ✅ Implemented & Tested |
| **Display flagged transactions** | Filter tab in [`TransactionTable.jsx`](frontend/src/components/TransactionTable.jsx) and dedicated backend route (`GET /api/transactions/flagged`). | ✅ Implemented & Tested |
| **Mark as reviewed or cleared** | Interactive action bar in [`TransactionDetails.jsx`](frontend/src/components/TransactionDetails.jsx) linked to `PATCH /api/transactions/{id}/review`. | ✅ Implemented & Tested |
| **AWS SES email / SNS notification** | [`backend/services/aws_notifier.py`](backend/services/aws_notifier.py) dispatches email (SES) and SMS/Topic (SNS) when risk score $\ge 0.70$ with auto sandbox fallback. | ✅ Implemented & Tested |

---

## 2. Architecture Overview

```text
                     Incoming Transaction
             (amount, location, customer_id, etc.)
                              │
                              ▼
                FastAPI Ingestion Endpoint
                 (POST /api/transactions)
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │          Extensible Rule Engine           │
        │             (backend/rules/)              │
        └───────┬─────────────┬─────────────┬───────┘
                │             │             │
   ┌────────────┴─────┐ ┌─────┴───────┐ ┌───┴──────────────┐
   │  Velocity Rule   │ │ Amount Rule │ │ Geo-Location Rule│
   │ (Sliding Window) │ │(Outlier/Dev)│ │(Haversine Speed) │
   └────────────┬─────┘ └─────┬───────┘ └───┬──────────────┘
                │             │             │
                └─────────────┼─────────────┘
                              │
                   Composite Rule Results
               (Score, Level, Triggered Flags)
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
  ┌───────────────────────────┐ ┌───────────────────────────┐
  │  SQLite Persistence Layer │ │   Risk Score ≥ 0.70 ?     │
  │       (backend/db/)       │ └─────────────┬─────────────┘
  │  • transactions           │               │ YES
  │  • fraud_flags            │               ▼
  │  • review_audit_logs      │ ┌───────────────────────────┐
  └─────────────┬─────────────┘ │   AWS SES / SNS Service   │
                │               │ • SES Email to SecOps     │
                │               │ • SNS Topic Broadcast     │
                │               │ • Sandbox Mock Fallback   │
                │               └───────────────────────────┘
                ▼
   WebSocket Broadcast & REST APIs
                │
                ▼
  ┌─────────────────────────────────────────────────────────┐
  │                 React Reviewer Console                  │
  │ • Triage Queue: Filter Flagged / Reviewed / Cleared     │
  │ • Granular Rule Triggers (Speed km/h, Deviation Mult.) │
  │ • Action Bar: "Mark as Reviewed" & "Mark as Cleared"   │
  │ • AWS Notification Delivery Status Confirmation         │
  └─────────────────────────────────────────────────────────┘
```

---

## 3. The Three Independent Rules & Extensibility

### Rule 1: Transaction Velocity Surge (`RULE_VELOCITY`)
* **File**: [`backend/rules/velocity_rule.py`](backend/rules/velocity_rule.py)
* **Logic**: Queries customer history from SQLite within a rolling sliding window (default 60 seconds).
* **Trigger**: Flags transaction if total count in the window $\ge 3$. Severity elevates to `CRITICAL` if $\ge 4$ or rapid burst occurs in $< 15$ seconds.

### Rule 2: Unusual Transaction Amount (`RULE_UNUSUAL_AMOUNT`)
* **File**: [`backend/rules/unusual_amount_rule.py`](backend/rules/unusual_amount_rule.py)
* **Logic**: Compares amount against absolute ceiling (₹50,000) and historical customer baseline spending average.
* **Trigger**: Flags if `amount >= 50,000` or `amount >= baseline * 3.5`. Escalates to `CRITICAL` if multiplier exceeds $10\times$ baseline.

### Rule 3: Impossible Geographical Location & Travel Speed (`RULE_IMPOSSIBLE_LOCATION`)
* **File**: [`backend/rules/impossible_location_rule.py`](backend/rules/impossible_location_rule.py)
* **Logic**: Fetches coordinates for current location and the customer's prior transaction location. Computes great-circle distance using the **Haversine formula**:
  $$\text{speed (km/h)} = \frac{\text{distance (km)}}{\Delta t \text{ (hours)}}$$
* **Trigger**: Flags as `CRITICAL` if required velocity $> 850\text{ km/h}$ (faster than a commercial flight) or distance $> 50\text{ km}$ traversed in $< 5$ minutes.

### Extensibility Without Core Engine Modification
To add a new rule, create a new class inheriting from `BaseRule` and decorate it with `@register_rule`:
```python
from backend.rules.base import BaseRule, RuleResult
from backend.rules.registry import register_rule

@register_rule
class MyCustomRule(BaseRule):
    rule_code = "RULE_CUSTOM"
    rule_name = "Custom Merchant Watchlist"
    description = "Custom rule added with zero core changes."
    weight = 1.0

    def evaluate(self, transaction, history) -> RuleResult:
        if "sanctioned" in str(transaction.get("merchant", "")).lower():
            return RuleResult(rule_code=self.rule_code, rule_name=self.rule_name, triggered=True, risk_score=0.9, severity="CRITICAL", reason="Sanctioned merchant.")
        return RuleResult(rule_code=self.rule_code, rule_name=self.rule_name, triggered=False)
```

---

## 4. Persistence Schema (SQLite / PostgreSQL)

Database tables defined in [`backend/db/models.py`](backend/db/models.py):
1. **`transactions`**: Complete transaction record, risk score, decision, review status (`FLAGGED`, `REVIEWED`, `CLEARED`), reviewer metadata, and AWS alert status.
2. **`fraud_flags`**: Normalized one-to-many records for every rule that fired on a transaction (code, name, severity, reason, and JSON metrics).
3. **`review_audit_logs`**: Chronological audit trail of all analyst triage decisions with reviewer ID, previous status, new status, timestamp, and notes.

---

## 5. AWS SES & SNS Alerting Subsystem

* **File**: [`backend/services/aws_notifier.py`](backend/services/aws_notifier.py)
* **Trigger Condition**: When composite risk score is $\ge 0.70$ (or risk level `HIGH` / `CRITICAL`).
* **AWS SES**: Sends formatted HTML and text email to SecOps with full incident details and direct reviewer links.
* **AWS SNS**: Publishes JSON payload to the configured SNS Topic ARN.
* **Smart Dry-Run Sandbox Fallback**: If AWS keys are not configured in `.env`, the service runs in sandbox mode, logging the exact alert payload and returning simulated delivery receipts. **The application never crashes or blocks transaction processing.**

---

## 6. React Reviewer Console

The frontend ([`frontend/src/`](frontend/src/)) provides:
* **Reviewer Triage Queue**: Quick filters for "All Transactions", "Flagged Queue" (with live counter), "Reviewed", and "Cleared".
* **Granular Rule Explanations**: Inspect exactly why a transaction was flagged (Velocity count, Travel speed in km/h, Amount deviation multiplier).
* **Interactive Analyst Actions**: Real-time **"Mark as Reviewed"** and **"Mark as Cleared"** buttons that persist the decision to SQLite and log audit trails.
* **Attack Scenario Simulator**: 1-click test scenarios in [`Payment.jsx`](frontend/src/pages/Payment.jsx) to trigger Velocity surges, Impossible travel, or Amount spikes.

---

## 7. Quick Start & Verification

### 7.1 Backend Setup & Automated Test Suite
```bash
# Install backend dependencies
pip install -r backend/requirements.txt

# Run automated unit test suite (All 5 tests)
python -m pytest backend/test_rule_engine.py

# Start FastAPI server (Port 8000)
python -m uvicorn backend.main:app --reload --port 8000
```

### 7.2 Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 8. API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/transactions` | Ingests transaction, evaluates via Rule Engine, saves to SQLite, dispatches AWS alert if high risk, and broadcasts to WebSocket. |
| `GET` | `/api/transactions` | Returns transactions with optional query filters (`?flagged=true`, `?status=FLAGGED`, `?limit=100`). |
| `GET` | `/api/transactions/flagged` | Returns all flagged transactions pending reviewer triage. |
| `GET` | `/api/transactions/{id}` | Returns individual transaction details with triggered rule flags. |
| `PATCH` | `/api/transactions/{id}/review` | Reviewer action: updates status to `REVIEWED` or `CLEARED`, persists audit log. |
| `GET` | `/api/rules` | Returns list of registered rules, descriptions, weights, and active status. |
| `GET` | `/api/dashboard/stats` | Aggregated statistics from SQLite database. |
| `WS` | `/ws` | Real-time bi-directional streaming pipe for live transaction and review events. |

---

## Project Documentation Links
* [project_idea.md](project_idea.md) — Problem Statement analysis & requirement mapping.
* [proceedings.md](proceedings.md) — Phased architecture refactoring and engineering plan.
