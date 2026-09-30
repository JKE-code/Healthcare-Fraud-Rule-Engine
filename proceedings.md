# Proceedings & Final Implementation Blueprint
**Acentra Hiring Hackathon: Fraud Rule Engine with Review Console**

---

## 1. Team Allocation & Branching Strategy

To guarantee rapid, conflict-free parallel development, the work is divided cleanly between backend architecture and frontend interface:

```text
                        ┌──────────────────────────────────────────┐
                        │               GIT REPO                   │
                        └────────────────────┬─────────────────────┘
                                             │
                     ┌───────────────────────┴───────────────────────┐
                     ▼                                               ▼
         ┌────────────────────────┐                     ┌────────────────────────┐
         │      main branch       │                     │    vikas/frontend      │
         │      LEAD: JK (Me)     │                     │     LEAD: VIKAS        │
         ├────────────────────────┤                     ├────────────────────────┤
         │ • Rule Engine Core     │                     │ • Minimalist UI Theme  │
         │ • 3 Mandatory Rules    │                     │ • Reviewer Queue View  │
         │ • SQLite Persistence   │                     │ • Triage Action Bar    │
         │ • AWS SES/SNS Notifier │                     │ • Rule Trigger Badges  │
         │ • REST & WebSocket API │                     │ • Attack Simulator UI  │
         │ • Automated Tests      │                     │ • Zero Backend Blocker │
         └───────────┬────────────┘                     └───────────┬────────────┘
                     │                                              │
                     └───────────────────────┬──────────────────────┘
                                             │ Final Merge & Demo
                                             ▼
                                ┌────────────────────────┐
                                │   Submission Release   │
                                └────────────────────────┘
```

### Role Ownership Matrix

| Feature Area | Owner | Branch | Scope & Deliverables |
| :--- | :--- | :--- | :--- |
| **Rule Engine Core & Extensibility** | **JK** | `main` | `backend/rules/`: `BaseRule`, `RuleEngine` registry, `@register_rule`, dynamic rule loading. |
| **Mandatory Rules** | **JK** | `main` | `VelocityRule` (sliding window), `UnusualAmountRule` (outlier/multiplier), `ImpossibleLocationRule` (Haversine speed km/h), `NewDeviceRule`. |
| **Persistence Layer** | **JK** | `main` | `backend/db/`: SQLite + SQLAlchemy ORM tables (`transactions`, `fraud_flags`, `review_audit_logs`). |
| **AWS SES & SNS Alerting** | **JK** | `main` | `backend/services/aws_notifier.py`: Live SES/SNS dispatch with smart mock sandbox fallback. |
| **Backend Endpoints & WebSocket** | **JK** | `main` | `backend/routes/`: Transaction ingestion, review triage endpoints, and WebSocket broadcasting. |
| **Automated Test Suite** | **JK** | `main` | `backend/test_rule_engine.py`: Unit and end-to-end integration tests. |
| **Minimalist Reviewer Console** | **Vikas** | `vikas/frontend` | `frontend/src/`: Clean, professional, uncluttered design; reviewer queue with triage filters. |
| **Reviewer Actions & Details Card** | **Vikas** | `vikas/frontend` | Hooking "Mark as Reviewed" and "Mark as Cleared" buttons to API with optimistic feedback. |
| **Attack Simulator Page** | **Vikas** | `vikas/frontend` | Clean 1-click scenario triggers (Velocity Surge, Impossible Flight, Amount Spike). |

---

## 2. Frozen API & Data Contract (Vikas's Mock Contract)

Vikas can build the entire frontend independently without waiting for backend changes by relying on this frozen contract:

### Ingest Transaction: `POST /api/transactions`
```json
// Request
{
  "amount": 125000.0,
  "merchant": "Luxury Watches",
  "location": "Dubai",
  "device": "new_device",
  "payment_method": "CARD",
  "customer_id": "CUST-1001",
  "channel": "UPI"
}

// Response
{
  "transaction_id": "TX-A1B2C3D4",
  "timestamp": "2026-09-30T13:30:00Z",
  "customer_id": "CUST-1001",
  "amount": 125000.0,
  "currency": "INR",
  "merchant": "Luxury Watches",
  "location": "Dubai",
  "device": "new_device",
  "payment_method": "CARD",
  "channel": "UPI",
  "risk_score": 0.95,
  "risk_level": "CRITICAL",
  "is_flagged": true,
  "review_status": "FLAGGED",
  "decision": "BLOCK",
  "prediction": "FRAUD",
  "aws_alert_sent": true,
  "aws_message_id": "AWS-SES-12345",
  "flags": [
    {
      "rule_code": "RULE_UNUSUAL_AMOUNT",
      "rule_name": "Unusual Transaction Amount",
      "severity": "CRITICAL",
      "reason": "Amount INR 125,000 exceeds threshold (50x customer average).",
      "metrics": { "amount": 125000, "baseline": 2500, "multiplier": 50 }
    }
  ],
  "explanation": ["Amount INR 125,000 exceeds threshold (50x customer average)."]
}
```

### Reviewer Triage Action: `PATCH /api/transactions/{id}/review`
```json
// Request
{
  "action": "REVIEWED", // or "CLEARED"
  "reviewer": "Vikas Analyst",
  "notes": "Verified cardholder identity via two-factor step-up."
}

// Response
{
  "transaction_id": "TX-A1B2C3D4",
  "review_status": "REVIEWED",
  "reviewed_by": "Vikas Analyst",
  "reviewed_at": "2026-09-30T13:35:00Z",
  "reviewer_notes": "Verified cardholder identity via two-factor step-up."
}
```

---

## 3. Technology Stack & Software Boundaries

### Backend (Owner: JK)
* **Language & Runtime**: Python 3.10+ (tested on Python 3.14).
* **API Framework**: FastAPI + Uvicorn (async, high-throughput, auto-generated Swagger at `/docs`).
* **Data Persistence**: SQLAlchemy 2.0 + SQLite (`fraud_rules.db`). Zero external daemon needed; 100% compliant with PS tag `PostgreSQL/SQLite`.
* **Cloud Alerting**: AWS SES & SNS via `boto3` (with sandbox mock mode for offline testing).
* **Real-Time Streaming**: Native WebSockets (`/ws`) for instant push to reviewer console.
* **Testing**: Pytest for automated unit and contract tests.

### Frontend (Owner: Vikas)
* **Framework**: React 19 + Vite 8.
* **Design Philosophy**: Minimalist, clean, executive-ready enterprise SecOps console (sleek dark mode, crisp typography, subtle accent highlights, zero clutter).
* **Communication**: REST API client (`api.js`) + live WebSocket auto-reconnect listener.

---

## 4. Phase-by-Phase Execution Plan

### Part 1: JK Core Execution (`main` Branch)
1. **Rule Engine & Rules**:
   - `backend/rules/base.py`: Abstract `BaseRule` interface.
   - `backend/rules/registry.py`: `RuleEngine` registry with auto-discovery.
   - `backend/rules/velocity_rule.py`: Sliding window count ($\ge 3$ tx in 60s).
   - `backend/rules/unusual_amount_rule.py`: High threshold ($> ₹50,000$) & baseline multiplier.
   - `backend/rules/impossible_location_rule.py`: Haversine physical speed ($> 850\text{ km/h}$).
   - `backend/rules/new_device_rule.py`: Proof of zero-core-modification extensibility.
2. **Database Persistence**:
   - SQLAlchemy tables: `transactions`, `fraud_flags`, `review_audit_logs`.
   - SQLite auto-initialization on startup.
3. **AWS SES & SNS Service**:
   - `backend/services/aws_notifier.py`: Dual-mode (Live AWS + Sandbox Mock).
4. **FastAPI Endpoints**:
   - `POST /api/transactions` (Ingest + Evaluate + Persist + Alert + Broadcast).
   - `GET /api/transactions` and `GET /api/transactions/flagged` (Reviewer queue).
   - `PATCH /api/transactions/{id}/review` (Status update + Audit log).
   - `GET /api/rules` (Active rules metadata).
5. **Automated Verification**:
   - `backend/test_rule_engine.py`: 5/5 automated test pass.

---

### Part 2: Vikas Frontend Execution (`vikas/frontend` Branch)
1. **Branch Setup**:
   ```bash
   git checkout -b vikas/frontend
   ```
2. **Minimalist Design Refinement**:
   - Ensure the layout is clean, legible, and professional.
   - Highlight the **Reviewer Queue** as the central workflow.
3. **Reviewer Queue Navigation**:
   - Tabs: `All Transactions`, `Flagged Queue` (with red pill count), `Reviewed`, `Cleared`.
4. **Transaction Details & Action Dock**:
   - Interactive `Mark as Reviewed` and `Mark as Cleared` buttons with optional analyst note input.
   - Distinct cards showing triggered rules (Velocity burst, Haversine travel speed, Amount multiplier).
   - AWS SES/SNS alert delivery receipt badge.
5. **Attack Scenario Simulator**:
   - Clean 1-click test buttons in `Payment.jsx`:
     - ⚡ *Velocity Surge Attack*
     - ✈️ *Impossible Travel (London 10m later)*
     - 💰 *Extreme Amount Spike*
     - 📱 *New Device High Value*
     - ✓ *Normal Baseline*

---

### Part 3: Integration & Final Merge
1. Merge `vikas/frontend` into `main`.
2. Run end-to-end verification (`python -m pytest backend/test_rule_engine.py` and `npm run build`).
3. Prepare live demonstration checklist:
   - Show SQLite database records.
   - Ingest attack scenarios -> View instant rule flags.
   - Show AWS SES/SNS notification receipt.
   - Demonstrate reviewer triage action (Flagged -> Reviewed -> Cleared).
