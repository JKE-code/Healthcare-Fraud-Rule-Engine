Send him this **exact frontend specification**. It is designed so he can build the entire UI without waiting for the backend or ML.

---

# FRONTEND SPEC — FRAUD DETECTION & TRANSACTION RISK AGENT

## 1. Frontend goal

Build a **real-time fraud monitoring dashboard** plus a **fake payment interface**.

There are only **2 routes**:

```text
/dashboard
/pay
```

The frontend must work completely with mock data first. Backend integration happens only after the UI is finished.

Tech:

```text
React + Vite
```

Use whatever CSS approach you already work fastest with.

---

# 2. Overall UI style

Make it look like a **modern fintech security operations dashboard**, not a generic college project.

Theme:

```text
Background: near-white / very light gray
Cards: white
Primary: dark navy
Danger: red
Warning: orange
Success: green
Text: dark gray
```

Visual priorities:

```text
clean
dense but readable
professional
real-time monitoring feel
```

Avoid huge rounded cards everywhere and excessive gradients. This is supposed to look like a financial security product.

---

# 3. GLOBAL NAVBAR

Both pages use the same navbar.

```text
┌──────────────────────────────────────────────────────────────┐
│ Shield/Fraud Logo   FraudGuard       Dashboard   Pay       │
│                                                        ● LIVE│
└──────────────────────────────────────────────────────────────┘
```

Items:

```text
FraudGuard
Dashboard
Make Payment
Live status
```

Live indicator:

```text
● LIVE
```

Use a small animated pulse.

---

# 4. `/dashboard`

This is the main judge-facing page.

## Header

```text
Fraud Detection & Transaction Risk Agent

Real-time transaction monitoring and fraud analysis
                                      ● SYSTEM ONLINE
```

---

# 5. KPI CARDS

Four cards directly under the header.

```text
┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│ TOTAL          │ │ FRAUD          │ │ HIGH RISK      │ │ AVG RISK       │
│ TRANSACTIONS   │ │ DETECTED       │ │ TRANSACTIONS   │ │ SCORE          │
│                │ │                │ │                │ │                │
│ 12,492         │ │ 127            │ │ 89             │ │ 18.4%          │
│ +12 today      │ │ +4 today       │ │ +8 today       │ │ ↓ 2.3%         │
└────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘
```

Numbers should change when new transactions arrive.

---

# 6. LIVE TRANSACTION FEED

This is the most important component.

Title:

```text
Live Transaction Monitoring
● Receiving transactions
```

Table:

```text
┌────────┬──────────┬────────────┬────────────┬─────────────┬────────────┐
│ ID     │ TIME     │ AMOUNT     │ MERCHANT   │ FRAUD SCORE │ RISK       │
├────────┼──────────┼────────────┼────────────┼─────────────┼────────────┤
│ TX1029 │ 10:51:32 │ ₹450       │ Amazon     │ 2.1%        │ LOW        │
│ TX1028 │ 10:51:29 │ ₹8,500     │ Unknown    │ 68.2%       │ HIGH       │
│ TX1027 │ 10:51:25 │ ₹95,000    │ Unknown    │ 94.1%       │ CRITICAL   │
└────────┴──────────┴────────────┴────────────┴─────────────┴────────────┘
```

Columns:

```text
Transaction ID
Time
Amount
Merchant
Location
Fraud Probability
Anomaly Score
Risk
Prediction
```

Don't necessarily show every column at desktop width. Put less important details inside the transaction detail panel.

Rows should be clickable.

Newest transaction appears at the top.

When a new transaction arrives:

```text
new row appears
↓
brief highlight animation
↓
table updates
↓
KPI counters update
```

---

# 7. RISK BADGES

Use these exact levels:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

Visual treatment:

```text
LOW       → green
MEDIUM    → yellow/orange
HIGH      → orange/red
CRITICAL  → red
```

Also prediction:

```text
FRAUD
LEGITIMATE
```

---

# 8. DASHBOARD CHARTS

Under the transaction table.

### Chart 1

```text
Fraud vs Legitimate Transactions
```

A donut/pie chart is enough.

Example:

```text
LEGITIMATE 98.9%
FRAUD       1.1%
```

### Chart 2

```text
Risk Distribution
```

Bar chart:

```text
LOW        ███████████████████
MEDIUM     ███████
HIGH       ███
CRITICAL   ██
```

### Chart 3

```text
Fraud Detection Activity
```

A line chart across the last few minutes.

This should visually look like the system is continuously analyzing transactions.

---

# 9. TRANSACTION DETAILS PANEL

Clicking a transaction should open a right-side drawer or modal.

Example:

```text
┌──────────────────────────────────────┐
│ TRANSACTION DETAILS             ×    │
│                                      │
│ TX-1027                              │
│                                      │
│ Amount                               │
│ ₹95,000                              │
│                                      │
│ Merchant                             │
│ Unknown Merchant                     │
│                                      │
│ Location                             │
│ Dubai, UAE                           │
│                                      │
│ Device                               │
│ New Device                           │
│                                      │
│ Payment Method                       │
│ CARD                                 │
│                                      │
│ Fraud Probability                    │
│ 94.1%                                 │
│ ███████████████████░                 │
│                                      │
│ Anomaly Score                        │
│ 88.7%                                │
│                                      │
│ Risk                                 │
│ [ CRITICAL ]                         │
│                                      │
│ Prediction                           │
│ [ FRAUD ]                            │
├──────────────────────────────────────┤
│ WHY WAS THIS FLAGGED?                │
│                                      │
│ • unusually high transaction amount  │
│ • new device detected                │
│ • unusual location                   │
│ • anomalous transaction pattern      │
│                                      │
│ RECOMMENDED ACTION                   │
│                                      │
│ [ BLOCK TRANSACTION ]                │
│ [ MARK AS SAFE ]                     │
└──────────────────────────────────────┘
```

Buttons don't need real functionality for the first demo.

---

# 10. `/pay`

This is the fake payment interface.

It should look like an actual payment checkout.

```text
                 SECURE PAYMENT

             Pay with FraudGuard

Amount
[ ₹ 95000                           ]

Merchant
[ Unknown Merchant                  ]

Location
[ Dubai                             ]

Device
[ New Device                        ]

Payment Method
[ Credit Card ▼                     ]

Card Number
[ 4242 4242 4242 4242              ]

                  [ PAY NOW ]
```

Make it believable but clearly a **demo/sandbox**, not a real payment gateway.

Add:

```text
Demo environment — no real transaction will be processed
```

---

# 11. PAYMENT FLOW

When the user clicks:

```text
PAY NOW
```

show:

```text
Analyzing transaction...

        ●
    AI ANALYSIS
    IN PROGRESS
```

Then after the API response:

### Safe transaction

```text
Payment Successful

Fraud Probability
4.2%

Risk Level
LOW

Transaction ID
TX-1032
```

### Fraud transaction

```text
Transaction Flagged

Fraud Probability
94.1%

Risk Level
CRITICAL

Transaction blocked for security review.
```

Make the transition visually obvious.

---

# 12. THE IMPORTANT REAL-TIME FLOW

Frontend must support this exact flow:

```text
PAY PAGE
   │
   │ POST /api/transactions
   ▼
BACKEND
   │
   ▼
ML MODEL
   │
   ▼
RESULT
   │
   ├──────────────→ PAYMENT PAGE
   │
   └── WebSocket ─→ DASHBOARD
```

Therefore the frontend needs **two communication methods**.

### REST

```javascript
POST /api/transactions
```

### WebSocket

```javascript
ws://localhost:8000/ws
```

---

# 13. API CONFIGURATION

Create:

```text
src/api.js
```

Use:

```javascript
const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

const WS_URL =
  import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws";

export { API_URL, WS_URL };
```

Then nobody needs to modify random files when backend URL changes.

---

# 14. POST TRANSACTION

The frontend sends:

```json
{
  "amount": 95000,
  "merchant": "Unknown Merchant",
  "location": "Dubai",
  "device": "new_device",
  "payment_method": "CARD"
}
```

Endpoint:

```text
POST /api/transactions
```

Response:

```json
{
  "transaction_id": "TX-1027",
  "timestamp": "2026-09-15T10:51:32",
  "amount": 95000,
  "merchant": "Unknown Merchant",
  "location": "Dubai",
  "device": "new_device",
  "payment_method": "CARD",
  "fraud_probability": 0.941,
  "anomaly_score": 0.887,
  "risk_score": 0.925,
  "risk_level": "CRITICAL",
  "is_suspicious": true,
  "prediction": "FRAUD",
  "explanation": [
    "Transaction amount is unusually high",
    "Transaction originated from a new device",
    "Transaction location differs from normal activity",
    "Transaction pattern is highly anomalous"
  ]
}
```

Frontend must simply render this object.

---

# 15. WEBSOCKET

Connect when Dashboard mounts:

```javascript
const ws = new WebSocket(WS_URL);
```

Expected event:

```json
{
  "event": "transaction_created",
  "data": {
    "transaction_id": "TX-1033",
    "timestamp": "2026-09-15T10:52:01",
    "amount": 72000,
    "merchant": "Unknown",
    "location": "Delhi",
    "device": "new_device",
    "payment_method": "CARD",
    "fraud_probability": 0.89,
    "anomaly_score": 0.82,
    "risk_score": 0.87,
    "risk_level": "CRITICAL",
    "is_suspicious": true,
    "prediction": "FRAUD",
    "explanation": [
      "Unusually high amount",
      "New device detected"
    ]
  }
}
```

On receiving it:

```text
prepend transaction
update counters
update charts
show live alert
```

---

# 16. MOCK DATA

Before backend exists, use this:

```javascript
const mockTransactions = [
  {
    transaction_id: "TX-1001",
    timestamp: "10:48:12",
    amount: 450,
    merchant: "Amazon",
    location: "Mumbai",
    device: "mobile",
    payment_method: "UPI",
    fraud_probability: 0.02,
    anomaly_score: 0.05,
    risk_score: 0.03,
    risk_level: "LOW",
    is_suspicious: false,
    prediction: "LEGITIMATE",
    explanation: []
  },
  {
    transaction_id: "TX-1002",
    timestamp: "10:48:18",
    amount: 8500,
    merchant: "Unknown",
    location: "Delhi",
    device: "desktop",
    payment_method: "CARD",
    fraud_probability: 0.68,
    anomaly_score: 0.61,
    risk_score: 0.66,
    risk_level: "HIGH",
    is_suspicious: true,
    prediction: "FRAUD",
    explanation: [
      "Unusual transaction amount",
      "Unknown merchant",
      "Anomalous transaction pattern"
    ]
  },
  {
    transaction_id: "TX-1003",
    timestamp: "10:48:24",
    amount: 95000,
    merchant: "Unknown",
    location: "Dubai",
    device: "new_device",
    payment_method: "CARD",
    fraud_probability: 0.94,
    anomaly_score: 0.88,
    risk_score: 0.92,
    risk_level: "CRITICAL",
    is_suspicious: true,
    prediction: "FRAUD",
    explanation: [
      "Transaction amount is unusually high",
      "New device detected",
      "Unusual transaction location",
      "Highly anomalous transaction pattern"
    ]
  }
];
```

Dashboard should work entirely from these until backend integration.

---

# 17. AUTO-GENERATED MOCK TRANSACTIONS

Before backend integration, make dummy transactions appear automatically every 3–5 seconds.

Something like:

```text
TX-1001
TX-1002
TX-1003
TX-1004
...
```

This lets us demonstrate "real-time" even if backend has a problem.

Once WebSocket works, turn this off.

---

# 18. COMPONENT STRUCTURE

Use something like:

```text
src/
│
├── pages/
│   ├── Dashboard.jsx
│   └── Payment.jsx
│
├── components/
│   ├── Navbar.jsx
│   ├── StatCard.jsx
│   ├── TransactionTable.jsx
│   ├── TransactionRow.jsx
│   ├── TransactionDetails.jsx
│   ├── RiskBadge.jsx
│   ├── FraudChart.jsx
│   ├── RiskChart.jsx
│   ├── LiveIndicator.jsx
│   └── AlertToast.jsx
│
├── data/
│   └── mockTransactions.js
│
├── api.js
└── App.jsx
```

Don't make 50 components. This is enough.

---

# 19. IMPORTANT UI BEHAVIOUR

### New transaction

```text
WebSocket event
↓
new row
↓
fade/highlight
↓
counter increments
↓
if HIGH/CRITICAL:
show alert toast
```

Example toast:

```text
⚠ Critical Fraud Detected

TX-1033
₹72,000
Fraud probability: 89%
```

### Critical transaction

Make it impossible to miss.

The table row should have a strong risk indicator.

---

# 20. RESPONSIVE REQUIREMENT

Desktop is the priority because the judge will probably use a laptop.

Still make:

```text
desktop ≥ 1200px
tablet ≥ 768px
```

Don't spend time making perfect mobile UI.

---

# 21. LOADING / ERROR STATES

Need these three states:

```text
Analyzing...
```

```text
Backend disconnected
```

```text
No transactions yet
```

If WebSocket dies:

```text
● LIVE → ● DISCONNECTED
```

And the dashboard should continue showing existing data.

---

# 22. FINAL FRONTEND DEFINITION OF DONE

Frontend is finished when all of this works:

```text
[✓] /dashboard loads
[✓] /pay loads
[✓] Navbar works
[✓] KPI cards
[✓] Transaction table
[✓] Risk badges
[✓] Transaction details drawer
[✓] Charts
[✓] Live indicator
[✓] Mock transactions
[✓] New rows animate in
[✓] Payment form
[✓] POST /api/transactions integration
[✓] WebSocket integration
[✓] Fraud result displayed
[✓] Critical fraud alert
```

---

# 23. MOST IMPORTANT RULE FOR HIM

**Do not wait for backend.**

Build everything using:

```text
mockTransactions.js
```

and a fake:

```javascript
mockAnalyzeTransaction()
```

Then, during the final 30 minutes, replace:

```javascript
mockAnalyzeTransaction()
```

with:

```javascript
fetch(`${API_URL}/api/transactions`, ...)
```

Everything else should remain unchanged.

The frontend should therefore be **90% complete before the backend exists**.

---

## SEND HIM THIS ONE-LINE CONTRACT

> **You own only `frontend/`; build `/dashboard` + `/pay` entirely against the JSON contract above using mock data, and make the frontend integration depend only on `POST /api/transactions` + `WS /ws`. Do not wait for backend or ML.**