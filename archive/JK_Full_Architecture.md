# Final Architecture, Design & Logic

## 1. Project Definition

**FraudGuard** is an AI-powered, real-time transaction risk and fraud monitoring platform for financial institutions.

It analyzes transactions across **Credit Card, Debit Card and UPI channels**, builds customer-specific behavioural profiles, combines supervised fraud classification with anomaly detection, produces an explainable **0–100 risk score**, and helps fraud analysts investigate suspicious activity through an integrated **AI Investigation Copilot**.

### Core objective

> Detect potentially fraudulent transactions, identify why they are suspicious, prioritize risk, and support analysts in investigating the transaction.

### What FraudGuard is NOT

- Not a consumer payment app
- Not a Paytm/PhonePe clone
- Not a payment gateway
- Not merely a chatbot
- Not a simple `dataset → classifier → dashboard` demo

---

# 2. Final High-Level Architecture Flow

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         TRANSACTION SOURCES                         │
│                                                                     │
│        CREDIT CARD       DEBIT CARD          UPI                    │
│        Transactions      Transactions        P2P / P2M / QR        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    TRANSACTION INGESTION LAYER                      │
│                                                                     │
│      CSV / JSON / API / Simulated Live Transaction Stream           │
│                                                                     │
│      Validate → Normalize → Timestamp → Assign Transaction ID      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FEATURE ENGINE / CONTEXT                         │
│                                                                     │
│  Transaction Features                                               │
│  • Amount • Channel • Merchant • Location • Device • Time           │
│                                                                     │
│  Behavioural Features                                                │
│  • Historical average amount                                         │
│  • Amount deviation                                                  │
│  • Location familiarity                                              │
│  • Device familiarity                                                │
│  • Typical transaction hours                                         │
│  • Transaction velocity                                              │
│  • Merchant / beneficiary familiarity                                │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                 ┌─────────────┴─────────────┐
                 ▼                           ▼
┌──────────────────────────────┐   ┌──────────────────────────────────┐
│     FRAUD CLASSIFIER         │   │       ANOMALY DETECTOR            │
│                              │   │                                    │
│          XGBoost             │   │        Isolation Forest            │
│                              │   │                                    │
│ Learns known fraud patterns │   │ Finds unusual/deviating behaviour │
└──────────────┬───────────────┘   └────────────────┬───────────────────┘
               │                                    │
               └────────────────┬───────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         RISK ENGINE                                 │
│                                                                     │
│  Combines:                                                         │
│  • Fraud model output                                               │
│  • Anomaly score                                                    │
│  • Behavioural deviations                                           │
│  • Transaction context                                              │
│  • Channel-specific signals                                         │
│                                                                     │
│                       ↓                                             │
│                 NORMALIZED RISK SCORE                               │
│                       0–100                                          │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    RISK-LEVEL CLASSIFICATION                        │
│                                                                     │
│       0–30          31–60          61–80          81–100            │
│        LOW          MEDIUM          HIGH          CRITICAL           │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
           APPROVE           REVIEW            BLOCK
              │                │                │
              └────────────────┼────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    EXPLAINABILITY ENGINE                            │
│                                                                     │
│  • Top contributing features                                        │
│  • Behavioural deviation                                            │
│  • Model evidence                                                   │
│  • Risk factors                                                     │
│  • Human-readable explanation                                       │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FRAUD OPERATIONS DASHBOARD                       │
│                                                                     │
│  Overview | Transactions | Customers | Investigations              │
│                                                                     │
│                  + AI Investigation Copilot                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

# 3. Transaction Channel Design

FraudGuard supports three primary transaction categories:

## Credit Card

Example fields:

```text
transaction_id
customer_id
channel = CREDIT_CARD
amount
merchant
merchant_category
location
device_id
timestamp
card_present / card_not_present
domestic / international
```

## Debit Card

Uses the same common transaction structure, with debit-specific context where available.

## UPI

Example fields:

```text
transaction_id
customer_id
channel = UPI
amount
merchant / beneficiary
transaction_type = P2P / P2M
location
device_id
timestamp
transaction_method = QR / transfer / collect
```

### Important architecture decision

These channels **do not get separate fraud systems**.

They are normalized into a common transaction representation and passed through the same core fraud engine.

Channel-specific features remain available where useful.

```text
Credit Card ─┐
Debit Card ──┼──→ Normalized Transaction ─→ Common Risk Engine
UPI ─────────┘
```

---

# 4. Transaction Data Model

A normalized transaction can conceptually look like:

```json
{
  "transaction_id": "TX-84921",
  "customer_id": "CUST-1024",
  "channel": "UPI",
  "transaction_type": "P2M",
  "amount": 84500,
  "merchant": "ABC Electronics",
  "location": "Mumbai",
  "device_id": "DEV-9921",
  "timestamp": "2026-09-15T02:43:00"
}
```

The system then enriches it with behavioural features.

Example:

```text
historical_avg_amount = 3240
amount_deviation = 26.1x
known_device = false
known_location = false
unusual_time = true
velocity_10min = 8
```

---

# 5. Customer Behaviour Engine

The system maintains a behavioural baseline for each customer.

## Historical profile

Example:

```text
CUSTOMER: CUST-1024

Average transaction        ₹3,240
Typical transaction range  ₹500 – ₹7,500
Usual locations             Hyderabad
Known devices               2
Typical active hours        09:00 – 22:30
Average daily transactions  4.2
Typical velocity             1–2 / 10 min
```

## New transaction

```text
Amount          ₹84,500
Location        Mumbai
Device          DEV-9921
Time            02:43 AM
Velocity        8 / 10 min
```

## Behavioural comparison

```text
                    NORMAL              CURRENT
Amount              ₹3,240              ₹84,500
Location            Hyderabad           Mumbai
Device              Known               NEW
Time                09:00–22:30         02:43 AM
Velocity            1–2 / 10 min        8 / 10 min
```

This creates contextual signals such as:

```text
amount_anomaly
location_anomaly
device_anomaly
time_anomaly
velocity_anomaly
merchant_or_beneficiary_anomaly
```

### Key principle

A transaction is not considered suspicious merely because its absolute value is high.

The system asks:

> **"How unusual is this transaction for this customer?"**

---

# 6. ML Architecture

## Model 1 — XGBoost Fraud Classifier

Purpose:

**Fraud classification**

Input:

```text
Transaction features
+
Relevant historical/context features
```

Output:

```text
fraud model score
```

XGBoost is appropriate because transaction data is primarily structured/tabular data and tree-based models work well with heterogeneous numerical and categorical-derived features.

---

## Model 2 — Isolation Forest

Purpose:

**Anomaly detection**

It identifies observations that are unusual compared with the learned normal pattern.

Output:

```text
anomaly score
```

This complements supervised classification.

### Why two models?

```text
XGBoost asks:

"Does this resemble known fraudulent behaviour?"

Isolation Forest asks:

"Does this look unusual?"
```

This gives the system coverage for both known fraud patterns and unusual behaviour that may not match a labelled fraud example.

---

# 7. Risk Engine Logic

The risk engine combines the available signals.

Conceptually:

```text
                 XGBoost
              Fraud Signal
                    │
                    │
                    ▼
              ┌───────────┐
              │           │
Behaviour ───→│   RISK    │←── Anomaly
 Signals      │  ENGINE   │    Score
              │           │
Context ─────→│           │
              └─────┬─────┘
                    │
                    ▼
             Risk Score 0–100
```

The prototype should use clearly documented and tested weights/rules rather than arbitrary numbers.

Example conceptual components:

```text
Fraud model contribution
+
Anomaly contribution
+
Behavioural deviation
+
Contextual signals
        ↓
Final Risk Score
```

### Risk levels

```text
0–30      LOW
31–60     MEDIUM
61–80     HIGH
81–100    CRITICAL
```

### Important terminology

Unless the model is properly calibrated, the UI should preferably say:

> **Risk Score: 94/100**

rather than:

> **94% probability of fraud**

The internal model probability and the final normalized risk score should not be treated as automatically identical.

---

# 8. Decision Logic

```text
Risk Score
    │
    ├── 0–30 ───────→ APPROVE
    │
    ├── 31–60 ──────→ MONITOR / APPROVE
    │
    ├── 61–80 ──────→ REVIEW
    │
    └── 81–100 ─────→ BLOCK / INVESTIGATE
```

For the prototype, the exact operational decision can be configurable.

The system should not imply that every high-risk prediction automatically represents confirmed fraud.

### Important distinction

```text
MODEL PREDICTION
       ≠
CONFIRMED FRAUD
```

A critical transaction can be:

```text
BLOCKED / HELD
        ↓
INVESTIGATION
        ↓
CONFIRMED FRAUD
        OR
FALSE POSITIVE
```

This makes the workflow realistic.

---

# 9. Explainability Logic

For every suspicious transaction, the dashboard should answer:

> **"Why was this flagged?"**

Example:

```text
TX-84921

Risk Score: 94 / 100
Severity: CRITICAL
Decision: BLOCKED

TOP RISK FACTORS

Amount anomaly            ██████████  96
New device                █████████   87
Transaction velocity      ████████    81
Location anomaly          ████████    78
Unusual transaction time  ██████      62
```

The explanation layer should use actual model-derived signals.

Where feasible, SHAP can be used for model-level feature contribution.

---

# 10. AI Investigation Copilot

The dashboard includes an integrated AI assistant specifically for fraud investigation.

It is **not** the fraud classifier.

### Architecture

```text
                 Analyst
                    │
                    ▼
          AI Investigation Copilot
                    │
             Retrieve context
                    │
       ┌────────────┼────────────┐
       ▼            ▼            ▼
Transaction     Customer      Model
   Data          History      Evidence
       │            │            │
       └────────────┼────────────┘
                    ▼
                 LLM API
                    │
                    ▼
          Grounded AI Response
```

The LLM receives structured evidence from FraudGuard.

It does not independently decide whether the transaction is fraudulent.

---

# 11. AI Copilot Capabilities

The analyst can ask:

### Transaction questions

```text
Why was TX-84921 blocked?
What are the strongest risk factors?
Could this be a false positive?
Explain this transaction in simple terms.
```

### Customer questions

```text
What changed in this customer's behaviour today?
Show unusual activity for this customer.
How does today's activity compare with the customer's normal behaviour?
```

### Investigation questions

```text
Summarize this case.
What evidence supports the fraud decision?
Which transactions should I investigate next?
```

The assistant should answer using the application's actual data and model evidence.

---

# 12. Dashboard Design

## Navigation

```text
┌──────────────────────────────────┐
│ FRAUDGUARD                       │
│                                  │
│ Overview                         │
│ Transactions                     │
│ Customers                        │
│ Investigations                   │
│                                  │
│ ─────────────────────────────    │
│ AI Investigation Copilot         │
└──────────────────────────────────┘
```

---

## Screen 1 — Overview

Primary KPIs:

```text
TOTAL TRANSACTIONS ANALYZED
TRANSACTIONS PROTECTED
SUSPICIOUS TRANSACTIONS
BLOCKED TRANSACTIONS
AMOUNT AT RISK
```

Visuals:

- Fraud/risk trend
- Risk distribution
- Channel distribution
- Recent high-risk transactions
- Live transaction feed

---

## Screen 2 — Transactions

Filters:

```text
Channel
  All / Credit / Debit / UPI

Risk
  Low / Medium / High / Critical

Decision
  Approved / Review / Blocked

Date / Time
Customer
```

Transaction table:

```text
TX ID      Customer     Channel    Amount     Risk      Decision
-------------------------------------------------------------------
TX-84921   CUST-1024    UPI        ₹84,500    94        BLOCKED
TX-84920   CUST-4831    CREDIT     ₹12,200    67        REVIEW
TX-84919   CUST-8271    DEBIT      ₹3,400     12        APPROVED
```

---

# 13. Transaction Investigation Page

When an analyst selects a transaction:

```text
TRANSACTION TX-84921

₹84,500

94 / 100
CRITICAL

STATUS
BLOCKED
```

Then sections:

### Transaction Details

```text
Customer
Channel
Merchant / Beneficiary
Amount
Timestamp
Location
Device
Transaction Type
```

### Risk Analysis

```text
Fraud Classification
Anomaly Detection
Behavioural Risk
Final Risk Score
```

### Behavioural Comparison

```text
Normal vs Current
```

### Top Risk Factors

```text
Amount anomaly
Device anomaly
Location anomaly
Velocity anomaly
Time anomaly
```

### AI Investigation

```text
AI-generated evidence-backed explanation
```

### Analyst Actions

```text
Confirm Fraud
Release Transaction
Mark False Positive
Escalate Investigation
```

---

# 14. Customer Intelligence Page

Customer list:

```text
CUSTOMER ID    TRANSACTIONS    TOTAL VALUE    RISK
---------------------------------------------------
CUST-1024      247             ₹4.8L          HIGH
CUST-4831      182             ₹2.1L          LOW
CUST-8271      391             ₹8.4L          MEDIUM
```

Customer profile:

```text
CUSTOMER: CUST-1024

Behavioural Profile
────────────────────────────

Average Amount        ₹3,240
Typical Range         ₹500–₹7,500
Known Locations       Hyderabad
Known Devices         2
Typical Hours         09:00–22:30
Daily Transactions    4.2
```

Then:

- transaction history
- risk trend
- behavioural deviations
- suspicious activity
- investigations involving customer

---

# 15. Investigation / Case Management

Suspicious transactions can become investigation cases.

```text
CASE #FRD-2048

Customer: CUST-1024
Transaction: TX-84921

Risk: 94 / 100
Severity: CRITICAL
Status: UNDER INVESTIGATION
```

Sections:

```text
Detection Evidence
Behavioural Evidence
Transaction Timeline
AI Investigation Summary
Analyst Notes
```

Actions:

```text
CONFIRM FRAUD
RELEASE
MARK FALSE POSITIVE
ESCALATE
```

---

# 16. Real-Time Demonstration Architecture

For the CodeAthon, we do not need a real bank integration.

Use a controlled transaction stream.

```text
Prepared Transaction Dataset
             │
             ▼
      Transaction Stream
             │
       one event at a time
             │
             ▼
        FastAPI API
             │
             ▼
        Fraud Engine
             │
             ▼
      Risk Decision
             │
             ▼
     WebSocket / Polling
             │
             ▼
       Live Dashboard
```

The demo can replay transactions every few seconds.

This allows the judge to see:

```text
Normal transaction
      ↓
LOW
      ↓
Normal transaction
      ↓
MEDIUM
      ↓
Suspicious transaction
      ↓
CRITICAL
      ↓
BLOCKED
      ↓
Investigation created
```

---

# 17. Strongest Demo Scenario

Use the **same transaction amount for two different customers**.

## Customer A

```text
Normal amount: ₹20,000–₹80,000
Known device
Known location
Normal time

Transaction: ₹60,000

Risk: 18/100
Decision: APPROVED
```

## Customer B

```text
Normal amount: ₹500–₹4,000
New device
New location
03:00 AM
8 transactions / 2 minutes

Transaction: ₹60,000

Risk: 94/100
Decision: BLOCKED
```

### Key message

> The system does not rely on a fixed amount threshold. It evaluates the transaction against the customer's behavioural context.

This is one of the most important demonstrations in the entire project.

---

# 18. Example End-to-End Transaction Logic

```text
1. Receive transaction
        ↓
2. Validate transaction
        ↓
3. Identify customer
        ↓
4. Retrieve customer history
        ↓
5. Generate transaction features
        ↓
6. Calculate behavioural deviations
        ↓
7. Run XGBoost fraud classifier
        ↓
8. Run Isolation Forest anomaly detector
        ↓
9. Combine model + behavioural signals
        ↓
10. Generate 0–100 risk score
        ↓
11. Assign LOW / MEDIUM / HIGH / CRITICAL
        ↓
12. Determine APPROVE / REVIEW / BLOCK
        ↓
13. Generate explainability evidence
        ↓
14. Store transaction + risk assessment
        ↓
15. Display in dashboard
        ↓
16. Make evidence available to AI Copilot
```

---

# 19. Backend API Structure

Suggested FastAPI endpoints:

```text
POST /transactions/analyze
GET  /transactions
GET  /transactions/{transaction_id}

GET  /customers
GET  /customers/{customer_id}
GET  /customers/{customer_id}/transactions
GET  /customers/{customer_id}/behaviour

GET  /investigations
GET  /investigations/{case_id}
POST /investigations

POST /ai/investigate
```

For a 4-hour build, these do not all need to be separate microservices.

Use one FastAPI application.

---

# 20. Technology Stack

## Frontend

```text
React
Vite
Tailwind CSS
Recharts / equivalent charting library
```

## Backend

```text
Python
FastAPI
Uvicorn
Pandas
NumPy
scikit-learn
XGBoost
```

## Explainability

```text
SHAP
```

Use SHAP if the core system is already stable.

## Database

```text
SQLite
```

or PostgreSQL if already prepared.

## AI

```text
External LLM API
```

Used only for:

- investigation
- explanation
- summarization
- analyst assistance

---

# 21. Data Strategy

Separate **training/evaluation data** from **demo data**.

### Training / evaluation

Use a suitable public labelled transaction-fraud dataset.

### Demo

Use controlled/synthetic transaction histories to guarantee reproducible scenarios.

Do not claim synthetic demo transactions are real banking transactions.

The presentation should explicitly say:

> "The prototype uses public labelled data for model development/evaluation and controlled synthetic data to reproduce realistic investigation scenarios."

---

# 22. Four-Hour Implementation Priority

## Priority 1 — Core ML pipeline

```text
Dataset
↓
Feature preparation
↓
XGBoost
↓
Isolation Forest
↓
Risk engine
```

## Priority 2 — Dashboard

```text
Overview
Transactions
Transaction details
Customers
```

## Priority 3 — Explainability

```text
Risk factors
Behaviour comparison
Model evidence
```

## Priority 4 — AI Copilot

```text
Transaction context
Customer context
LLM API
Grounded responses
```

## Priority 5 — Polish

```text
Animations
Charts
Loading states
Empty states
Responsive layout
Demo data
```

### Do NOT spend the 4 hours on:

- Real bank integration
- Real payment processing
- Paytm reverse engineering
- Authentication/authorization systems
- Complex microservices
- Blockchain
- Custom deep-learning models
- Huge database architecture
- Mobile app
- Consumer payment UI

---

# 23. Final Product Logic

```text
                 "WHAT HAPPENED?"
                       │
                       ▼
                 TRANSACTION
                       │
                       ▼
                 "IS IT FRAUD?"
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
        XGBoost             Isolation Forest
        Known Fraud          Unknown/Unusual
             │                   │
             └─────────┬─────────┘
                       ▼
                "IS IT UNUSUAL
                 FOR THIS USER?"
                       │
                       ▼
              Behaviour Engine
                       │
                       ▼
               "HOW RISKY IS IT?"
                       │
                       ▼
                 Risk Engine
                       │
                       ▼
                 0–100 SCORE
                       │
                       ▼
              APPROVE / REVIEW / BLOCK
                       │
                       ▼
                 "WHY?"
                       │
                       ▼
               Explainable AI
                       │
                       ▼
                "WHAT NEXT?"
                       │
                       ▼
             AI INVESTIGATION COPILOT
                       │
                       ▼
             ANALYST INVESTIGATION
```

---

# 24. Final One-Line Architecture

> **Multi-channel transaction ingestion → normalization → customer behavioural profiling → XGBoost fraud classification + Isolation Forest anomaly detection → contextual risk engine → 0–100 risk score → risk-level classification → approve/review/block → explainable evidence → fraud operations dashboard → AI Investigation Copilot.**

# 25. Final Product Positioning

### Problem

Financial institutions process enormous transaction volumes, making manual identification of suspicious activity difficult, especially when fraudulent transactions resemble legitimate behaviour.

### Solution

FraudGuard continuously evaluates transaction and customer behavioural patterns to identify suspicious activity, prioritize risk, explain why a transaction was flagged, and assist fraud analysts in investigating potential fraud.

### Core PS Coverage

| PS Requirement | FraudGuard Implementation |
|---|---|
| Transaction data processing | Transaction ingestion + normalization |
| Fraud classification | XGBoost |
| Anomaly detection | Isolation Forest |
| Fraud probability/score | Model output + normalized 0–100 risk score |
| Risk-level classification | Low / Medium / High / Critical |
| Suspicious transaction identification | Automated risk-based flagging |
| Explainable prediction | Feature contributions + behavioural evidence |
| Additional capability | Customer profiling + investigation workflow + AI Copilot |

---

## Final Architecture Principle

**Keep the ML decision layer deterministic and evidence-based.**

**Use the LLM as an investigation and explanation layer, not as the fraud detector.**

This keeps the project aligned with the PS, technically defensible, visually strong, and realistic enough to survive judge questioning.
