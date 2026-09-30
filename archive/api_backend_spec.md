# API / BACKEND SPEC — FRAUD DETECTION & TRANSACTION RISK AGENT

Send this directly to the API teammate.

---

## 1. YOUR JOB

You own **only**:

```text
backend/
```

Your job is to build a FastAPI server that:

```text
receives transaction
        ↓
calls ML predictor
        ↓
stores result
        ↓
returns JSON
        ↓
broadcasts result through WebSocket
```

You must be able to run the backend **without the ML model initially** by using a mock predictor.

Do not wait for ML.

Do not build authentication.

Do not build a database.

Do not build Kafka/Redis.

Use an in-memory store.

---

# 2. DIRECTORY

Create:

```text
backend/
├── main.py
├── models.py
├── routes/
│   ├── transactions.py
│   └── dashboard.py
├── websocket.py
├── store.py
└── mock_data.py
```

Keep it simple.

---

# 3. TECH STACK

```text
FastAPI
Uvicorn
Pydantic
Python
```

Install:

```bash
pip install fastapi uvicorn pydantic
```

Later the ML teammate's dependencies will be added.

---

# 4. API ENDPOINTS

Implement exactly these:

```text
GET  /api/health
POST /api/transactions
GET  /api/transactions
GET  /api/transactions/{transaction_id}
WS   /ws
```

---

# 5. `GET /api/health`

Response:

```json
{
  "status": "ok",
  "service": "fraud-detection-api"
}
```

This is just to verify the server is alive.

---

# 6. TRANSACTION INPUT

`POST /api/transactions`

Request:

```json
{
  "amount": 95000,
  "merchant": "Unknown Merchant",
  "location": "Dubai",
  "device": "new_device",
  "payment_method": "CARD"
}
```

Create a Pydantic model:

```python
class TransactionRequest(BaseModel):
    amount: float
    merchant: str
    location: str
    device: str
    payment_method: str
```

Do basic validation:

```text
amount > 0
strings cannot be empty
```

Don't fucking overengineer validation.

---

# 7. BACKEND-GENERATED FIELDS

The backend generates:

```text
transaction_id
timestamp
```

Example:

```json
{
  "transaction_id": "TX-10429",
  "timestamp": "2026-09-15T11:05:32"
}
```

Transaction IDs should be unique.

Simplest:

```python
f"TX-{uuid.uuid4().hex[:8].upper()}"
```

---

# 8. ML INTERFACE

This is the **only dependency you have on the ML teammate**.

Use:

```python
from ml_engine.predictor import predict_transaction
```

Then:

```python
result = predict_transaction(transaction)
```

The backend passes:

```python
{
    "transaction_id": transaction_id,
    "timestamp": timestamp,
    "amount": request.amount,
    "merchant": request.merchant,
    "location": request.location,
    "device": request.device,
    "payment_method": request.payment_method
}
```

The ML function returns:

```json
{
  "transaction_id": "TX-10429",
  "fraud_probability": 0.94,
  "anomaly_score": 0.88,
  "risk_score": 0.92,
  "risk_level": "CRITICAL",
  "is_suspicious": true,
  "prediction": "FRAUD",
  "explanation": [
    "Transaction amount is unusually high",
    "New device detected",
    "Unusual transaction location"
  ]
}
```

The backend combines the original transaction data and ML result.

---

# 9. FINAL RESPONSE OBJECT

`POST /api/transactions` should return:

```json
{
  "transaction_id": "TX-10429",
  "timestamp": "2026-09-15T11:05:32",
  "amount": 95000,
  "merchant": "Unknown Merchant",
  "location": "Dubai",
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
    "New device detected",
    "Unusual transaction location"
  ]
}
```

**Do not rename these fields.**

Frontend is being built against them.

---

# 10. IN-MEMORY STORE

Create:

```python
transactions = {}
```

When transaction arrives:

```python
transactions[transaction_id] = result
```

No database.

Endpoints can read from this dictionary.

Maximum demo traffic is tiny. A database here would be architectural cosplay.

---

# 11. `GET /api/transactions`

Return:

```json
{
  "transactions": [
    {
      "transaction_id": "TX-1001",
      "...": "..."
    }
  ],
  "total": 1
}
```

Newest transactions first.

Example:

```python
list(reversed(transactions.values()))
```

---

# 12. `GET /api/transactions/{transaction_id}`

Return one complete transaction.

If not found:

```text
404
```

Response:

```json
{
  "detail": "Transaction not found"
}
```

---

# 13. WEBSOCKET

Endpoint:

```text
/ws
```

The frontend will connect once and stay connected.

Maintain connected clients:

```python
active_connections = []
```

When a new transaction is created:

```text
POST transaction
        ↓
ML analysis
        ↓
store result
        ↓
broadcast to all WebSocket clients
```

Broadcast:

```json
{
  "event": "transaction_created",
  "data": {
    "transaction_id": "TX-10429",
    "timestamp": "2026-09-15T11:05:32",
    "amount": 95000,
    "merchant": "Unknown Merchant",
    "location": "Dubai",
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
      "New device detected",
      "Unusual transaction location"
    ]
  }
}
```

Frontend should receive this and immediately add the transaction to its table.

---

# 14. WEBSOCKET BEHAVIOUR

When client connects:

```text
accept connection
add to active_connections
```

When it disconnects:

```text
remove connection
```

When broadcasting:

```text
for connection in active_connections:
    await connection.send_json(message)
```

If sending fails, remove the dead connection.

---

# 15. DUMMY LIVE TRANSACTIONS

This is important for the dashboard.

Create a background task that automatically creates fake transactions every ~3 seconds.

Example:

```python
async def generate_dummy_transactions():
    while True:
        transaction = random_transaction()
        ...
        await asyncio.sleep(3)
```

Use 3 categories:

### Normal

```json
{
  "amount": 450,
  "merchant": "Amazon",
  "location": "Mumbai",
  "device": "mobile",
  "payment_method": "UPI"
}
```

### Suspicious

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
  "merchant": "Unknown Merchant",
  "location": "Dubai",
  "device": "new_device",
  "payment_method": "CARD"
}
```

Don't generate purely random garbage. Generate realistic-looking patterns so the dashboard visibly contains LOW, MEDIUM, HIGH and CRITICAL transactions.

---

# 16. IMPORTANT: DON'T DUPLICATE ML LOGIC

The backend should NOT calculate:

```text
fraud probability
anomaly score
risk score
risk level
```

That's ML's job.

Backend only:

```text
receive
validate
identify
call ML
store
broadcast
```

This keeps responsibilities clean.

---

# 17. TEMPORARY MOCK ML

Until the ML teammate finishes, create:

```python
def mock_predict(transaction):
    amount = transaction["amount"]

    if amount > 50000:
        probability = 0.94
        anomaly = 0.88
        risk = "CRITICAL"
    elif amount > 10000:
        probability = 0.72
        anomaly = 0.65
        risk = "HIGH"
    else:
        probability = 0.04
        anomaly = 0.06
        risk = "LOW"

    return {
        "transaction_id": transaction["transaction_id"],
        "fraud_probability": probability,
        "anomaly_score": anomaly,
        "risk_score": probability,
        "risk_level": risk,
        "is_suspicious": probability >= 0.65,
        "prediction": "FRAUD" if probability >= 0.65 else "LEGITIMATE",
        "explanation": []
    }
```

Use this while building.

At final merge:

```python
from ml_engine.predictor import predict_transaction
```

Replace the mock call.

**Don't restructure the backend just because ML arrives.**

---

# 18. CORS

Frontend will probably run:

```text
http://localhost:5173
```

Backend:

```text
http://localhost:8000
```

Therefore add CORS:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

During the hackathon, `allow_origins=["*"]` is also acceptable if you're burning time fighting CORS.

---

# 19. SERVER

Run:

```bash
uvicorn backend.main:app --reload --port 8000
```

Expected:

```text
http://localhost:8000
```

Swagger:

```text
http://localhost:8000/docs
```

The Swagger page is useful for testing the API quickly.

---

# 20. TESTING BEFORE ML EXISTS

He should test:

```text
GET /api/health
```

Then:

```text
POST /api/transactions
```

with:

```json
{
  "amount": 95000,
  "merchant": "Unknown",
  "location": "Dubai",
  "device": "new_device",
  "payment_method": "CARD"
}
```

Expected:

```text
200 OK
```

Then:

```text
GET /api/transactions
```

should contain the transaction.

Then connect:

```text
ws://localhost:8000/ws
```

Create another transaction.

The WebSocket client should receive:

```json
{
  "event": "transaction_created",
  "data": {...}
}
```

---

# 21. API FLOW

The final backend flow is:

```text
                     POST
                      │
                      ▼
              ┌───────────────┐
              │ Pydantic      │
              │ Validation    │
              └───────┬───────┘
                      ▼
              Generate ID
                      │
                      ▼
              Add timestamp
                      │
                      ▼
              ┌───────────────┐
              │ ML predictor  │
              └───────┬───────┘
                      │
                      ▼
              Combine response
                      │
              ┌───────┴────────┐
              ▼                ▼
          In-memory        WebSocket
            store           broadcast
              │                │
              ▼                ▼
           REST API         Dashboard
```

---

# 22. BACKEND DEFINITION OF DONE

Before final merge, these must all work:

```text
[✓] FastAPI starts
[✓] /api/health
[✓] POST /api/transactions
[✓] GET /api/transactions
[✓] GET /api/transactions/{id}
[✓] WebSocket /ws
[✓] In-memory transaction storage
[✓] Dummy transaction generator
[✓] CORS
[✓] Mock ML predictor
[✓] Real ML predictor can replace mock without changing API
[✓] WebSocket broadcasts new transactions
```

---

# 23. MOST IMPORTANT RULE

Send him this:

> **You own only `backend/`. Build the complete FastAPI server against the frozen transaction JSON contract. Use a mock ML function until the ML teammate finishes. The only ML dependency should be `predict_transaction(transaction)`. Do not wait for me, do not add a database, and do not modify frontend code.**

That gives you three genuinely independent workstreams:

```text
YOU
ML engine
      │
      │ predict_transaction()
      ▼
API teammate
FastAPI
      │
      │ REST + WebSocket
      ▼
Frontend teammate
Dashboard + Payment
```

At merge time, you are connecting interfaces, not trying to stitch together three half-written projects.