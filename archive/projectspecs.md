# 2-HOUR HACKATHON BUILD SPEC

You have three people and two hours. The goal is **parallel development with zero dependency until the final merge**.

Do not build microservices. Do not build a database-heavy architecture. Do not waste time on authentication, production deployment, message queues, Kafka, Docker orchestration, etc.

Build one monorepo with three isolated modules that snap together through a frozen API contract.

---

# 1. FINAL PRODUCT

You are building:

```text
                 ┌──────────────────────┐
                 │   PAYMENT DEMO UI    │
                 │  "Make Transaction"  │
                 └──────────┬───────────┘
                            │
                            │ POST /api/transactions
                            ▼
                 ┌──────────────────────┐
                 │       FASTAPI        │
                 │     API SERVER       │
                 └──────────┬───────────┘
                            │
                  ┌─────────▼─────────┐
                  │    ML ENGINE      │
                  │                   │
                  │ Fraud Classifier  │
                  │ Anomaly Detector  │
                  │ Risk Engine        │
                  │ Explanation       │
                  └─────────┬─────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │ Transaction Result  │
                 │ fraud_probability   │
                 │ anomaly_score       │
                 │ risk_level           │
                 │ explanation          │
                 └──────────┬───────────┘
                            │
                       WebSocket
                            │
                            ▼
                 ┌──────────────────────┐
                 │   FRAUD DASHBOARD    │
                 │                      │
                 │ Live transactions    │
                 │ Fraud alerts         │
                 │ Risk statistics      │
                 │ Transaction details  │
                 └──────────────────────┘
```

The judge can:

```text
1. Open dashboard
2. See dummy transactions arriving
3. Open payment page
4. Enter amount/merchant/etc.
5. Click PAY
6. Transaction immediately appears on dashboard
7. ML result appears
8. Dashboard says LOW / MEDIUM / HIGH / CRITICAL
9. Click transaction
10. See why it was flagged
```

That is your entire demo.

---

# 2. MONOREPO STRUCTURE

Freeze this structure before anyone starts coding.

```text
fraud-detection-agent/
│
├── backend/
│   ├── main.py
│   ├── routes/
│   │   ├── transactions.py
│   │   └── dashboard.py
│   ├── websocket.py
│   └── mock_data.py
│
├── ml_engine/
│   ├── __init__.py
│   ├── predictor.py
│   ├── train.py
│   ├── features.py
│   ├── risk.py
│   └── models/
│       ├── fraud_model.pkl
│       └── anomaly_model.pkl
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   └── Payment.jsx
│   │   ├── components/
│   │   │   ├── TransactionTable.jsx
│   │   │   ├── RiskCard.jsx
│   │   │   ├── FraudChart.jsx
│   │   │   └── TransactionDetails.jsx
│   │   └── api.js
│   └── package.json
│
├── contracts/
│   └── api.md
│
├── requirements.txt
└── README.md
```

### Ownership

| Person     | Owns                    |
| ---------- | ----------------------- |
| You        | `ml_engine/`            |
| Teammate 1 | `backend/`              |
| Teammate 2 | `frontend/`             |
| Shared     | `contracts/api.md` only |

**Nobody edits another person's directory.**

This is the most important rule.

---

# 3. TECHNOLOGY STACK

Use boring technology.

### Backend

```text
Python
FastAPI
Uvicorn
Pydantic
```

### ML

```text
scikit-learn
pandas
numpy
joblib
```

Use:

```text
XGBoost
```

only if it is already installed or installation is painless.

Do **not** burn 30 minutes debugging CUDA.

Your RTX 3050 6 GB is more than enough for this project, but the model you are training does not need the GPU. The bottleneck is your fucking clock, not your GPU.

### Frontend

Whatever your teammate already knows:

```text
React + Vite
```

or

```text
Next.js
```

Do not change framework halfway through.

### Real-time

Use:

```text
WebSocket
```

Not Kafka.

Not Redis.

Not Socket.IO unless your teammate already has it working.

---

# 4. THE FROZEN API CONTRACT

This is what allows all three of you to work independently.

Everything below should be treated as immutable.

---

## `POST /api/transactions`

Payment frontend sends:

```json
{
  "amount": 12500,
  "merchant": "Amazon",
  "location": "Mumbai",
  "device": "mobile",
  "payment_method": "UPI"
}
```

Backend creates:

```text
transaction_id
timestamp
```

and passes it to your ML engine.

---

# 5. ML OUTPUT CONTRACT

Your ML function MUST return exactly this shape:

```json
{
  "transaction_id": "TX-10291",
  "fraud_probability": 0.91,
  "anomaly_score": 0.87,
  "risk_score": 0.90,
  "risk_level": "CRITICAL",
  "is_suspicious": true,
  "prediction": "FRAUD",
  "explanation": [
    "Transaction amount is unusually high",
    "Transaction pattern is highly anomalous",
    "Transaction resembles previously detected fraudulent activity"
  ]
}
```

The backend does not care how you calculated it.

The frontend does not care how you calculated it.

That's the whole point.

---

# 6. YOUR ML MODULE

Your only requirement to the other two developers:

```python
from ml_engine.predictor import predict_transaction
```

Then:

```python
result = predict_transaction(transaction)
```

That's your interface.

They shouldn't know anything about your models.

---

# 7. YOUR `predict_transaction()` FUNCTION

Build exactly this:

```python
def predict_transaction(transaction: dict) -> dict:
    ...
```

Input:

```python
{
    "transaction_id": "TX-123",
    "amount": 5000,
    "merchant": "Amazon",
    "location": "Mumbai",
    "device": "mobile",
    "payment_method": "UPI",
    "timestamp": "2026-09-15T10:30:00"
}
```

Output:

```python
{
    "transaction_id": "TX-123",
    "fraud_probability": 0.82,
    "anomaly_score": 0.76,
    "risk_score": 0.80,
    "risk_level": "HIGH",
    "is_suspicious": True,
    "prediction": "FRAUD",
    "explanation": [
        "Unusually large transaction amount",
        "Anomalous transaction pattern",
        "High fraud probability"
    ]
}
```

---

# 8. YOUR ML STRATEGY

Because you have only two hours, don't build some academic monstrosity.

Use two models.

```text
                    Transaction
                         │
             ┌───────────┴───────────┐
             ▼                       ▼
      Fraud Classifier        Isolation Forest
             │                       │
             ▼                       ▼
       fraud_probability        anomaly_score
             │                       │
             └───────────┬───────────┘
                         ▼
                    Risk Engine
```

### Classifier

Use:

```text
RandomForestClassifier
```

or XGBoost.

Random Forest is safer under a two-hour deadline because you almost certainly already have scikit-learn.

### Anomaly detection

```python
IsolationForest()
```

---

# 9. FEATURE ENGINEERING

The payment frontend should provide:

```text
amount
merchant
location
device
payment_method
```

You convert these into numerical features.

Minimum:

```text
amount
merchant_frequency
location_risk
device_risk
payment_method_risk
amount_deviation
```

You can create synthetic historical statistics.

For example:

```python
merchant_frequency = {
    "Amazon": 0.2,
    "Flipkart": 0.15,
    "Unknown": 0.02
}
```

And:

```text
normal_amount ≈ 2500
```

Then:

```python
amount_deviation = amount / 2500
```

A transaction of:

```text
₹80
```

looks normal.

A transaction of:

```text
₹85,000
```

looks fucking suspicious.

---

# 10. VERY IMPORTANT: DEMO DATA

You don't need a huge realistic banking dataset to demonstrate the pipeline.

Create synthetic transactions that deliberately generate obvious examples.

### Legitimate

```json
{
  "amount": 450,
  "merchant": "Amazon",
  "location": "Mumbai",
  "device": "mobile",
  "payment_method": "UPI"
}
```

### Medium

```json
{
  "amount": 8500,
  "merchant": "Unknown",
  "location": "Delhi",
  "device": "desktop",
  "payment_method": "CARD"
}
```

### Critical

```json
{
  "amount": 95000,
  "merchant": "Unknown",
  "location": "Dubai",
  "device": "new_device",
  "payment_method": "CARD"
}
```

This lets the judges immediately see the system behaving differently.

---

# 11. RISK ENGINE

Use this:

```python
def calculate_risk(fraud_probability, anomaly_score):

    score = (
        0.7 * fraud_probability +
        0.3 * anomaly_score
    )

    if score >= 0.85:
        level = "CRITICAL"
    elif score >= 0.65:
        level = "HIGH"
    elif score >= 0.35:
        level = "MEDIUM"
    else:
        level = "LOW"

    return score, level
```

Then:

```python
is_suspicious = score >= 0.65
prediction = "FRAUD" if is_suspicious else "LEGITIMATE"
```

---

# 12. EXPLANATIONS

Do not waste time making SHAP work unless your model is already finished.

Make an explanation engine based on feature contributions.

```python
explanations = []

if amount > 20000:
    explanations.append("Transaction amount is unusually high")

if device == "new_device":
    explanations.append("Transaction originated from a new device")

if location not in common_locations:
    explanations.append("Transaction location differs from normal activity")

if fraud_probability > 0.8:
    explanations.append("Model detects strong similarity to fraudulent transactions")

if anomaly_score > 0.7:
    explanations.append("Transaction pattern is highly anomalous")
```

This satisfies explainability in the actual demo.

---

# 13. BACKEND TEAMMATE

Backend owns the entire `backend/` directory.

Their job is ridiculously simple.

### Endpoints

```text
GET  /api/health
POST /api/transactions
GET  /api/transactions
GET  /api/transactions/{id}
WS   /ws
```

---

## `GET /api/health`

```json
{
  "status": "ok"
}
```

Used to prove backend is running.

---

## `POST /api/transactions`

Flow:

```text
request
 ↓
validate
 ↓
generate transaction_id
 ↓
call predict_transaction()
 ↓
store transaction in memory
 ↓
broadcast WebSocket event
 ↓
return result
```

No database.

Use:

```python
transactions = []
```

or a dictionary.

At 2-hour hackathon scale, that's perfectly adequate.

---

# 14. WEB SOCKET CONTRACT

Every new transaction broadcasts:

```json
{
  "event": "transaction_created",
  "data": {
    "transaction_id": "TX-12931",
    "timestamp": "2026-09-15T10:43:11",
    "amount": 85000,
    "merchant": "Unknown",
    "location": "Delhi",
    "device": "new_device",
    "payment_method": "CARD",
    "fraud_probability": 0.94,
    "anomaly_score": 0.88,
    "risk_score": 0.92,
    "risk_level": "CRITICAL",
    "is_suspicious": true,
    "prediction": "FRAUD",
    "explanation": [
      "Transaction amount is unusually high",
      "Transaction originated from a new device"
    ]
  }
}
```

Frontend receives this and immediately updates the dashboard.

---

# 15. BACKEND DUMMY STREAM

The backend should generate dummy transactions automatically.

Something like:

```python
async def generate_transactions():
    while True:
        transaction = random_transaction()
        result = predict_transaction(transaction)
        await broadcast(result)
        await asyncio.sleep(3)
```

So even when nobody touches the payment screen:

```text
TX-001
TX-002
TX-003
TX-004
TX-005
...
```

keep appearing.

That makes the dashboard look alive.

---

# 16. FRONTEND TEAMMATE

Their entire world is:

```text
frontend/
```

They don't wait for the backend.

They build against the frozen JSON above.

Use mock data initially.

---

# 17. DASHBOARD PAGE

Route:

```text
/dashboard
```

Layout:

```text
┌─────────────────────────────────────────────────────────────┐
│ FRAUD DETECTION & TRANSACTION RISK AGENT                   │
├─────────────┬─────────────┬─────────────┬───────────────────┤
│ Transactions│ Fraud       │ High Risk   │ Avg Risk          │
│   12,492    │    127      │     89      │     18.4%         │
├─────────────┴─────────────┴─────────────┴───────────────────┤
│                                                             │
│              LIVE TRANSACTION FEED                          │
│                                                             │
│ ID       Amount       Merchant    Probability    Risk       │
│ TX91     ₹500         Amazon      2%             LOW        │
│ TX92     ₹32K         Unknown     73%            HIGH       │
│ TX93     ₹91K         Unknown     96%            CRITICAL   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│               RISK / FRAUD CHARTS                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

# 18. TRANSACTION DETAIL PANEL

Click a row:

```text
TRANSACTION TX-10291

Amount
₹95,000

Fraud Probability
94.2%

Anomaly Score
88.7%

Risk
CRITICAL

Prediction
FRAUD

WHY?

• Transaction amount is unusually high
• New device detected
• Location differs from historical activity
• Strong similarity to fraudulent transactions

ACTION

[ BLOCK TRANSACTION ]
[ MARK SAFE ]
```

The buttons don't actually need to do anything meaningful.

They're demo UI.

---

# 19. PAYMENT PAGE

Route:

```text
/pay
```

UI:

```text
┌──────────────────────────────┐
│       SECURE PAYMENT         │
│                              │
│ Amount                       │
│ [ ₹________________ ]        │
│                              │
│ Merchant                     │
│ [ Amazon____________ ]       │
│                              │
│ Location                     │
│ [ Mumbai____________ ]       │
│                              │
│ Device                       │
│ [ Mobile____________ ]       │
│                              │
│ Payment Method               │
│ [ UPI______________ ]        │
│                              │
│       [ PAY NOW ]            │
└──────────────────────────────┘
```

When `PAY NOW`:

```text
POST /api/transactions
```

Then display:

```text
Payment Processing...

Fraud Risk Analysis
██████████████████░░ 91%

CRITICAL RISK

Transaction flagged for review
```

Then dashboard receives it in real time.

This is your strongest demo moment.

---

# 20. DO NOT MAKE TWO SEPARATE FRONTEND PROJECTS

Make two routes in the same frontend:

```text
/dashboard
/pay
```

Visually, they can look like separate applications.

This avoids:

```text
frontend1
frontend2
deployment hell
CORS hell
routing bullshit
```

---

# 21. HOW THE THREE PEOPLE WORK INDEPENDENTLY

## YOU — ML

You start immediately.

Your branch:

```text
feature/ml
```

You only modify:

```text
ml_engine/
```

Your final deliverable:

```text
ml_engine/
├── predictor.py
├── train.py
├── features.py
├── risk.py
└── models/
```

Most important file:

```text
predictor.py
```

must expose:

```python
predict_transaction(transaction)
```

---

## TEAMMATE 1 — API

Branch:

```text
feature/api
```

They build:

```text
backend/
```

Initially they use:

```python
def predict_transaction(transaction):
    return MOCK_RESULT
```

Then at merge replace that import with your actual function.

They can build the complete API without your model existing.

---

## TEAMMATE 2 — UI

Branch:

```text
feature/frontend
```

They build:

```text
frontend/
```

They use static mock data:

```javascript
const mockTransaction = {
    transaction_id: "TX-001",
    amount: 45000,
    fraud_probability: 0.82,
    anomaly_score: 0.76,
    risk_score: 0.80,
    risk_level: "HIGH",
    prediction: "FRAUD",
    is_suspicious: true
}
```

Their dashboard works completely before backend exists.

---

# 22. GIT STRATEGY

At the start:

```bash
git checkout -b feature/ml
```

You.

Teammate 1:

```bash
git checkout -b feature/api
```

Teammate 2:

```bash
git checkout -b feature/frontend
```

Nobody touches the same files.

At the final merge:

```bash
git checkout main

git merge feature/ml
git merge feature/api
git merge feature/frontend
```

Because directories are isolated, merge conflicts should be essentially nonexistent.

---

# 23. THE CONTRACT FILE

Create:

```text
contracts/api.md
```

Put this inside:

```text
POST /api/transactions

INPUT

{
  "amount": number,
  "merchant": string,
  "location": string,
  "device": string,
  "payment_method": string
}

OUTPUT

{
  "transaction_id": string,
  "timestamp": string,
  "amount": number,
  "merchant": string,
  "location": string,
  "device": string,
  "payment_method": string,
  "fraud_probability": number,
  "anomaly_score": number,
  "risk_score": number,
  "risk_level": "LOW | MEDIUM | HIGH | CRITICAL",
  "is_suspicious": boolean,
  "prediction": "FRAUD | LEGITIMATE",
  "explanation": string[]
}

WEBSOCKET

/ws

EVENT:

{
  "event": "transaction_created",
  "data": TRANSACTION_OBJECT
}
```

**Nobody changes this after work starts.**

---

# 24. FINAL 30-MINUTE MERGE PLAN

This part needs discipline.

## T - 30 min

Everybody stops adding features.

No:

```text
"just one more chart"
"let me improve the model"
"let me redesign the card"
```

No.

Freeze.

---

## T - 30 → 25

Merge ML.

Backend changes:

```python
from ml_engine.predictor import predict_transaction
```

Delete mock predictor.

Run:

```bash
python -c "from ml_engine.predictor import predict_transaction; print(predict_transaction(TEST_TRANSACTION))"
```

If that works, ML is connected.

---

## T - 25 → 20

Start backend:

```bash
uvicorn backend.main:app --reload
```

Test:

```text
GET /api/health
```

Then:

```text
POST /api/transactions
```

Verify JSON.

---

## T - 20 → 15

Start frontend:

```bash
npm run dev
```

Make sure:

```text
/dashboard
/pay
```

load.

---

## T - 15 → 10

Connect WebSocket.

Flow:

```text
PAY NOW
   ↓
POST /api/transactions
   ↓
Backend
   ↓
ML
   ↓
result
   ↓
WebSocket broadcast
   ↓
Dashboard updates
```

Test exactly that.

---

## T - 10 → 5

Kill anything broken.

Use fallback dummy data if necessary.

Do not debug obscure shit.

---

## T - 5 → 0

Practice the demo once.

Your demo sequence:

```text
OPEN DASHBOARD

"These are live transactions being analyzed."

↓

OPEN PAYMENT PAGE

Enter:

₹95,000
Unknown merchant
Dubai
New device
CARD

↓

PAY NOW

↓

"Transaction is being analyzed..."

↓

CRITICAL
94% FRAUD PROBABILITY

↓

SWITCH TO DASHBOARD

↓

New transaction appears at top

↓

Click transaction

↓

Show explanation
```

That's enough.

---

# 25. WHAT YOU SHOULD HAVE RUNNING AT THE END

Three processes:

```text
Terminal 1

uvicorn backend.main:app --reload

Terminal 2

npm run dev

Terminal 3

optional dummy transaction generator
```

Frontend:

```text
http://localhost:5173
```

Backend:

```text
http://localhost:8000
```

WebSocket:

```text
ws://localhost:8000/ws
```

---

# 26. ENVIRONMENT VARIABLES

Frontend:

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
```

Backend:

```env
ML_MODEL_PATH=ml_engine/models/fraud_model.pkl
ANOMALY_MODEL_PATH=ml_engine/models/anomaly_model.pkl
```

Keep configuration out of hardcoded frontend code.

---

# 27. FALLBACK MODE

This is critical.

Add:

```python
DEMO_MODE = True
```

The backend can generate dummy transactions even if the ML model fucks up.

But your ML module itself should also have a deterministic fallback:

```python
if model is unavailable:
    use_demo_prediction(transaction)
```

That means:

```text
Model crashes
   ↓
Demo still works
```

Judges don't care that your `joblib` file died internally. They care that the dashboard works.

---

# 28. WHAT YOU SHOULD PERSONALLY DO RIGHT NOW

Your priority order:

```text
1. Get dataset / create training data
2. Train classifier
3. Train Isolation Forest
4. Save models
5. Write predictor.py
6. Test predictor.py
7. Stop touching ML
```

Do **not** spend 70 minutes optimizing F1 from:

```text
0.81 → 0.84
```

Nobody is giving you a Nobel Prize for fraud detection in a two-hour codeathon.

The judge needs to see:

```text
input
→ prediction
→ probability
→ anomaly
→ risk
→ explanation
→ real-time dashboard
```

Your RTX 3050 is completely sufficient for this. The winning architecture here is not the one with the fanciest model; it's the one where three people can independently build shit for 90 minutes and then connect it without discovering that everybody implemented a different API.