# Fraud Rule Engine with Review Console
**Hackathon Problem Statement & Project Foundation Document**

---

## 1. Problem Statement Overview

* **Title**: Fraud Rule Engine with Review Console
* **Domain**: FinTech / Fraud Detection
* **Track / Problem Type**: Python Backend + React Full-Stack Architecture
* **Target Audience**: Financial Institutions, Payment Gateways, Compliance & Fraud Operations (SecOps) Analysts
* **Tags**: `Python`, `React`, `Rule Engine`, `PostgreSQL/SQLite`, `AWS SNS/SES`

### Problem Description
> Financial systems need to identify potentially fraudulent transactions based on different risk indicators. A flexible rule engine can evaluate transactions and allow reviewers to investigate suspicious activity.

---

## 2. Core Minimum Requirements (Strict Compliance)

| Requirement | Description & Technical Boundary |
| :--- | :--- |
| **1. Rule Engine for Transaction Risk Evaluation** | Modular risk evaluation subsystem capable of executing multiple business rules against real-time incoming transactions, yielding composite risk scores, risk levels (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), and explainable trigger lists. |
| **2. At Least Three Independent Rules** | Must implement at least 3 distinct evaluation heuristics: <br>• **Transaction Velocity**: Detects abnormal transaction frequency per user/card within sliding time windows (e.g., > 3 transactions in 60s).<br>• **Unusual Transaction Amount**: Detects statistical anomalies or extreme spikes against threshold limits or customer baseline spending.<br>• **Impossible Geographical Location**: Calculates physical distance and time delta between sequential transactions to flag impossible travel speeds (e.g., > 800 km/h between locations). |
| **3. Extensibility Without Core Modification** | Architecture must adhere strictly to the **Open-Closed Principle (OCP)**. New rules can be plugged into the engine via a unified rule interface / decorator / registry without editing the core engine dispatch loop. |
| **4. Persistence of Transactions and Fraud Flags** | Storage of all incoming transactions, evaluation outputs, triggered rule IDs, and active fraud flags in a relational database (**SQLite** or **PostgreSQL**). |
| **5. React-Based Reviewer Console** | A dedicated web console allowing fraud analysts to oversee transactions in real-time. |
| **6. Display Flagged Transactions** | Dedicated filter or queue that isolates flagged/suspicious transactions from normal traffic for triage. |
| **7. Reviewer Status Management** | Interactive actions allowing reviewers to update transaction state: mark as **Reviewed** or **Cleared** (with timestamps and reviewer notes). |
| **8. AWS SES / SNS Alerting** | Automated notification dispatch via **AWS SES** (email alert) and/or **AWS SNS** (topic/SMS alert) when a transaction crosses a high-risk threshold (e.g. Risk Score ≥ 0.70 / HIGH or CRITICAL). |

---

## 3. High-Level Architecture & Interaction Flow

```
                      Incoming Payment / Transaction
                      (amount, location, timestamp,
                       customer_id, payment_method)
                                   │
                                   ▼
             ┌───────────────────────────────────────────┐
             │       FastAPI Ingestion Endpoint          │
             │         POST /api/transactions            │
             └─────────────────────┬─────────────────────┘
                                   │
                                   ▼
             ┌───────────────────────────────────────────┐
             │          Extensible Rule Engine           │
             │   (Plug-and-play Abstract BaseRule)       │
             └───────┬─────────────┬─────────────┬───────┘
                     │             │             │
        ┌────────────┴─────┐ ┌─────┴───────┐ ┌───┴──────────────┐
        │  Velocity Rule   │ │ Amount Rule │ │ Geo-Location Rule│
        │(Sliding Window)  │ │ (Deviation) │ │ (Speed / Distance│
        └────────────┬─────┘ └─────┬───────┘ └───┬──────────────┘
                     │             │             │
                     └─────────────┼─────────────┘
                                   │
                                   ▼
             ┌───────────────────────────────────────────┐
             │      Risk Scoring & Decision Engine       │
             │  (Score, Level, Flags, Explanations)      │
             └─────────────────────┬─────────────────────┘
                                   │
                     ┌─────────────┴─────────────┐
                     ▼                           ▼
        ┌────────────────────────┐  ┌───────────────────────────┐
        │ Database Persistence   │  │   High-Risk Threshold?    │
        │ (SQLite/PostgreSQL)    │  │       (Score ≥ 0.70)      │
        │ • transactions         │  └─────────────┬─────────────┘
        │ • fraud_flags          │                │ YES
        │ • review_audit_logs    │                ▼
        └────────────┬───────────┘  ┌───────────────────────────┐
                     │              │   AWS SES / SNS Service   │
                     │              │ (Email + SNS Topic Alert) │
                     │              └───────────────────────────┘
                     │
                     ▼ (WebSocket Broadcast & REST APIs)
        ┌───────────────────────────────────────────────────────┐
        │                 React Reviewer Console                │
        │ • Flagged Transactions Triage Queue                   │
        │ • Triggered Rules & Geographic Distance Breakdown     │
        │ • One-Click Actions: "Mark Reviewed" & "Mark Cleared" │
        │ • AWS Notification Delivery Status Confirmation       │
        └───────────────────────────────────────────────────────┘
```

---

## 4. Value-Add ("Good to Add") Features Beyond Minimum Requirements

To provide a distinct competitive edge during evaluation, the following features complement the core requirements:

1. **Dynamic Rule Configuration & Parameter Tuning (UI-Driven)**:
   - Allow reviewers/admins to adjust rule thresholds (e.g. velocity count, maximum travel speed km/h, amount multiplier) directly from the console without redeploying code.
2. **Reviewer Audit Trail & Incident Dossier**:
   - Maintain a chronological review log (`review_audit_logs`) recording who reviewed the transaction, the timestamp, justification note, and the before/after status.
   - 1-click export of a structured JSON/PDF compliance forensic dossier.
3. **AWS SES/SNS Smart Dry-Run & Local Mock Fallback**:
   - A dual-mode AWS client: when live AWS credentials (`AWS_ACCESS_KEY_ID`, `AWS_REGION`, etc.) are provided, it dispatches real emails/SNS messages. When running locally without credentials, it falls back to a sandbox logger that records delivery payloads and notifies the UI with mock confirmation, preventing evaluation crashes.
4. **Interactive Fraud Scenario Simulator**:
   - A built-in simulation panel in the UI that injects instant test attack vectors with one click:
     - *Velocity Attack* (5 rapid transactions in 5 seconds).
     - *Impossible Travel* (Mumbai to London within 10 minutes).
     - *Unusual Amount Spike* (₹1,50,000 transaction against a ₹2,500 baseline).
5. **Secondary ML & SHAP Explainability Fusion**:
   - Retain the existing pre-trained Random Forest + SHAP attribution engine as an analytical complement to the rule engine, giving analysts both deterministic rule triggers and machine learning confidence scores.
6. **Live Real-Time WebSocket Streaming**:
   - Push newly evaluated transactions and status updates instantly to the React frontend over WebSockets without manual page refresh.
