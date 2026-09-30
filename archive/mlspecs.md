# ML ROLE SPEC — FRAUD DETECTION & TRANSACTION RISK AGENT

You own **only**:

```text id="mlb4g8"
ml_engine/
```

Your entire job is to give the backend one clean function:

```python
predict_transaction(transaction)
```

Everything else is hidden behind that function.

Because you have **~90 minutes of actual ML work**, the priority is:

```text
WORKING MODEL
    ↓
GOOD PROBABILITY
    ↓
ANOMALY DETECTION
    ↓
RISK SCORE
    ↓
EXPLANATION
    ↓
FREEZE
```

Do not spend the entire fucking hackathon squeezing another 1–2% out of F1.

---

# 1. FINAL ML ARCHITECTURE

```text
                         TRANSACTION
                              │
                              ▼
                     Feature Engineering
                              │
             ┌────────────────┴────────────────┐
             │                                 │
             ▼                                 ▼
      Fraud Classifier                  Isolation Forest
             │                                 │
             ▼                                 ▼
    fraud_probability                  anomaly_score
             │                                 │
             └───────────────┬─────────────────┘
                             ▼
                       Risk Engine
                             │
               ┌─────────────┼─────────────┐
               ▼             ▼             ▼
          risk_score     risk_level    suspicious?
                             │
                             ▼
                       Explanation Engine
                             │
                             ▼
                     FINAL ML RESPONSE
```

Use:

```text id="5f14e0"
Supervised:
RandomForestClassifier

Unsupervised:
IsolationForest

Explainability:
feature/rule-based explanation
```

Do **not** add an LLM to the prediction pipeline.

---

# 2. FILE STRUCTURE

Create this:

```text id="k9a4dy"
ml_engine/
│
├── __init__.py
├── predictor.py
├── train.py
├── features.py
├── risk.py
├── explain.py
├── models/
│   ├── fraud_model.pkl
│   ├── anomaly_model.pkl
│   ├── scaler.pkl
│   └── metadata.pkl
│
└── test_predictor.py
```

Your most important file is:

```text id="ydx7e6"
predictor.py
```

---

# 3. MODEL CHOICE

## Fraud classifier

Use:

```python id="c5b6eb"
RandomForestClassifier
```

Why?

Because under a two-hour deadline it is:

```text
fast
robust
handles nonlinear patterns
easy to serialize
works nicely with tabular data
supports probability
```

Use approximately:

```python id="uhbf7s"
RandomForestClassifier(
    n_estimators=300,
    max_depth=12,
    min_samples_leaf=2,
    class_weight="balanced",
    random_state=42,
    n_jobs=-1
)
```

Your RTX 3050 is irrelevant here. Use CPU. Training this model on a reasonable tabular fraud dataset should be fast enough.

---

# 4. ANOMALY MODEL

Use:

```python id="ogd7x8"
IsolationForest(
    n_estimators=200,
    contamination=0.01,
    random_state=42,
    n_jobs=-1
)
```

Important:

**Train Isolation Forest mostly/only on legitimate transactions.**

Conceptually:

```text
legitimate transactions → learn normal behavior
new transaction → compare against normal behavior
```

---

# 5. DATASET

Use your available fraud dataset.

For a standard credit-card fraud dataset:

```text id="0uw7pz"
Time
V1 ... V28
Amount
Class
```

where:

```text id="if31x8"
Class = 0 → legitimate
Class = 1 → fraud
```

If that's the dataset you're using, don't waste time trying to turn `V1...V28` into human-readable merchant information. Those fields are already useful for the ML model.

---

# 6. TRAINING PIPELINE

Your `train.py` should do:

```text id="19msq3"
load CSV
 ↓
clean data
 ↓
split X/y
 ↓
stratified train/test split
 ↓
scale if necessary
 ↓
train Random Forest
 ↓
train Isolation Forest
 ↓
evaluate
 ↓
save models
```

Use:

```python id="4n0j3c"
train_test_split(
    X,
    y,
    test_size=0.2,
    stratify=y,
    random_state=42
)
```

**Stratification matters** because fraud is heavily imbalanced.

---

# 7. DO NOT USE ACCURACY

Your evaluation output should show:

```text id="4yrl9w"
Precision
Recall
F1
ROC-AUC
PR-AUC
Confusion Matrix
```

Most important:

```text
Fraud Recall
Fraud Precision
Fraud F1
PR-AUC
```

Don't walk into the demo saying:

> "Our model achieved 99.8% accuracy."

On a heavily imbalanced fraud dataset, that statement can make you look like you don't understand your own model.

---

# 8. CLASS IMBALANCE

Use:

```python id="2xy5vx"
class_weight="balanced"
```

or calculate class weights.

For Random Forest that's enough for a fast MVP.

Also tune the decision threshold rather than blindly using:

```text
probability > 0.5
```

For example:

```python id="e8n8z7"
is_fraud = probability >= 0.35
```

The exact threshold should be chosen using validation performance.

Fraud detection generally cares heavily about **recall**, because missing a fraud can be more expensive than manually reviewing a suspicious legitimate transaction.

---

# 9. FEATURE PIPELINE

Create:

```text id="g8whq5"
features.py
```

It should have:

```python id="z9xw2x"
def transform_transaction(transaction):
    ...
```

For your trained model, preserve the same feature ordering used during training.

This is critical.

Training:

```text
[Time, V1, V2, ..., V28, Amount]
```

Inference must produce:

```text
[Time, V1, V2, ..., V28, Amount]
```

in exactly the same order.

Not:

```text
[Amount, V1, V2, ...]
```

A model fed the wrong feature ordering is basically a very sophisticated random number generator.

---

# 10. THE FRONTEND TRANSACTION PROBLEM

Your frontend sends:

```json id="zvf4oh"
{
  "amount": 95000,
  "merchant": "Unknown Merchant",
  "location": "Dubai",
  "device": "new_device",
  "payment_method": "CARD"
}
```

But your Kaggle-style model may expect:

```text id="l4xd6v"
V1 ... V28
Amount
Time
```

You therefore need a **demo feature adapter**.

The system architecture becomes:

```text id="xod0sl"
Frontend transaction
        ↓
feature adapter
        ↓
model-compatible vector
        ↓
Random Forest
```

For the hackathon, use a deterministic synthetic mapping for the non-existent features.

For example:

```python id="6m8cvd"
def transaction_to_features(t):
    amount = t["amount"]

    suspicious_device = int(t["device"] == "new_device")
    suspicious_location = int(t["location"] not in {
        "Mumbai", "Delhi", "Bangalore"
    })
    unknown_merchant = int(
        t["merchant"].lower() == "unknown"
        or "unknown" in t["merchant"].lower()
    )
    card = int(t["payment_method"] == "CARD")

    return ...
```

But there is a better architecture if your dataset is the PCA credit-card dataset:

### Don't pretend the Kaggle model understands merchant/location/device.

Instead use a **hybrid score**:

```text
Historical ML probability
        +
transaction-context risk features
        ↓
combined fraud probability
```

That lets your actual trained classifier work while incorporating the demo transaction context.

---

# 11. RECOMMENDED HYBRID MODEL FOR THIS HACKATHON

Because your UI has:

```text
amount
merchant
location
device
payment method
```

build a second lightweight model/risk layer around these.

Feature vector:

```text id="vjnzg5"
amount
log(amount)
new_device
unusual_location
unknown_merchant
card_payment
amount_deviation
```

You can train a simple Random Forest on synthetic behavioral data as well.

But given the time limit, the easiest robust setup is:

```text
REAL FRAUD DATA MODEL
             +
CONTEXT RISK RULES
             ↓
       FINAL RISK SCORE
```

---

# 12. CONTEXT RISK SCORE

Create:

```text id="j3jymh"
risk.py
```

Example:

```python
def contextual_risk(t):

    score = 0

    if t["amount"] > 20000:
        score += 0.25

    if t["amount"] > 50000:
        score += 0.20

    if t["device"] == "new_device":
        score += 0.20

    if "unknown" in t["merchant"].lower():
        score += 0.15

    if t["location"] not in {
        "Mumbai",
        "Delhi",
        "Bangalore",
        "Hyderabad",
        "Chennai"
    }:
        score += 0.15

    if t["payment_method"] == "CARD":
        score += 0.05

    return min(score, 1.0)
```

Then:

```python
final_score = (
    0.65 * model_probability +
    0.20 * anomaly_risk +
    0.15 * contextual_risk
)
```

This gives you a more believable demo.

---

# 13. IMPORTANT ANOMALY SCORE ISSUE

Isolation Forest's raw output is **not** naturally a nice `0–1` "fraud probability."

Do not tell judges:

> "Isolation Forest gives us 87% probability of fraud."

It doesn't.

Instead normalize it into a demo-friendly anomaly score.

For example:

```python
def normalize_anomaly(raw_score):
    return max(0, min(1, 0.5 - raw_score))
```

You can calibrate the mapping based on the training distribution.

The semantics should remain:

```text
0 → normal
1 → highly anomalous
```

Call it:

```text
Anomaly Score
```

not:

```text
Anomaly Probability
```

---

# 14. RISK ENGINE

Use:

```python id="u0c5iv"
def calculate_risk(fraud_probability, anomaly_score, contextual_score):

    risk_score = (
        0.65 * fraud_probability +
        0.20 * anomaly_score +
        0.15 * contextual_score
    )

    if risk_score >= 0.85:
        level = "CRITICAL"
    elif risk_score >= 0.65:
        level = "HIGH"
    elif risk_score >= 0.35:
        level = "MEDIUM"
    else:
        level = "LOW"

    return risk_score, level
```

Then:

```python id="wq4aq2"
is_suspicious = risk_score >= 0.65
prediction = "FRAUD" if is_suspicious else "LEGITIMATE"
```

---

# 15. EXPLANATION ENGINE

Create:

```text id="h3vms5"
explain.py
```

Return a list of plain-English reasons.

```python
def explain_transaction(
    transaction,
    fraud_probability,
    anomaly_score,
    contextual_score
):

    reasons = []

    if transaction["amount"] > 20000:
        reasons.append(
            "Transaction amount is unusually high"
        )

    if transaction["device"] == "new_device":
        reasons.append(
            "Transaction originated from a new device"
        )

    if "unknown" in transaction["merchant"].lower():
        reasons.append(
            "Merchant is not recognized"
        )

    if contextual_score > 0.4:
        reasons.append(
            "Transaction differs from expected behavioral patterns"
        )

    if anomaly_score > 0.7:
        reasons.append(
            "Transaction pattern is highly anomalous"
        )

    if fraud_probability > 0.8:
        reasons.append(
            "Model detects strong similarity to fraudulent transactions"
        )

    if not reasons:
        reasons.append(
            "Transaction matches normal behavioral patterns"
        )

    return reasons[:4]
```

This gives your frontend exactly what it needs.

---

# 16. THE ONLY FUNCTION BACKEND NEEDS

This is the most important part.

Create:

```python id="0dx4ti"
# predictor.py

def predict_transaction(transaction: dict) -> dict:
    ...
```

Backend does:

```python
result = predict_transaction(transaction)
```

And gets:

```json id="vshfca"
{
  "transaction_id": "TX-1234",
  "fraud_probability": 0.91,
  "anomaly_score": 0.83,
  "risk_score": 0.89,
  "risk_level": "CRITICAL",
  "is_suspicious": true,
  "prediction": "FRAUD",
  "explanation": [
    "Transaction amount is unusually high",
    "Transaction originated from a new device",
    "Merchant is not recognized",
    "Transaction pattern is highly anomalous"
  ]
}
```

---

# 17. `predictor.py` SKELETON

Build around this:

```python
import joblib

fraud_model = joblib.load(
    "ml_engine/models/fraud_model.pkl"
)

anomaly_model = joblib.load(
    "ml_engine/models/anomaly_model.pkl"
)


def predict_transaction(transaction):

    features = transform_transaction(transaction)

    fraud_probability = float(
        fraud_model.predict_proba(features)[0][1]
    )

    raw_anomaly = float(
        anomaly_model.decision_function(features)[0]
    )

    anomaly_score = normalize_anomaly(raw_anomaly)

    contextual_score = contextual_risk(transaction)

    risk_score, risk_level = calculate_risk(
        fraud_probability,
        anomaly_score,
        contextual_score
    )

    suspicious = risk_score >= 0.65

    return {
        "transaction_id": transaction["transaction_id"],
        "fraud_probability": round(fraud_probability, 4),
        "anomaly_score": round(anomaly_score, 4),
        "risk_score": round(risk_score, 4),
        "risk_level": risk_level,
        "is_suspicious": suspicious,
        "prediction": (
            "FRAUD" if suspicious else "LEGITIMATE"
        ),
        "explanation": explain_transaction(
            transaction,
            fraud_probability,
            anomaly_score,
            contextual_score
        )
    }
```

---

# 18. VERY IMPORTANT MODEL/SERIALIZATION RULE

Save:

```text id="z2lk71"
fraud_model.pkl
anomaly_model.pkl
```

with:

```python
joblib.dump(model, ...)
```

Don't retrain when the API starts.

Bad:

```text
API starts
↓
load dataset
↓
train model
↓
wait 30 sec
↓
server starts
```

Good:

```text
train once
↓
save .pkl
↓
API starts
↓
load .pkl
↓
prediction in milliseconds
```

---

# 19. MODEL METADATA

Save feature information too:

```python
metadata = {
    "features": feature_names,
    "threshold": 0.35
}
```

Then:

```python
joblib.dump(metadata, "ml_engine/models/metadata.pkl")
```

This prevents feature-order bullshit later.

---

# 20. SYNTHETIC DEMO TRANSACTION HANDLING

This is important because the frontend's demo transactions won't naturally match your training dataset.

Create predefined behavioral classes.

### Normal

```text
amount: 450
device: mobile
merchant: Amazon
location: Mumbai
payment_method: UPI
```

Expected:

```text
LOW
```

### Suspicious

```text
amount: 8500
device: desktop
merchant: Unknown
location: Delhi
payment_method: CARD
```

Expected:

```text
HIGH
```

### Critical

```text
amount: 95000
device: new_device
merchant: Unknown Merchant
location: Dubai
payment_method: CARD
```

Expected:

```text
CRITICAL
```

You should explicitly ensure the risk layer produces these outcomes.

The actual ML probability can vary, but the final system behavior must be deterministic enough for the demo.

---

# 21. MODEL TEST SCRIPT

Create:

```text id="wz8wli"
test_predictor.py
```

Test three transactions:

```python
tests = [
    {
        "transaction_id": "TEST-LOW",
        "amount": 450,
        "merchant": "Amazon",
        "location": "Mumbai",
        "device": "mobile",
        "payment_method": "UPI"
    },
    {
        "transaction_id": "TEST-HIGH",
        "amount": 8500,
        "merchant": "Unknown",
        "location": "Delhi",
        "device": "desktop",
        "payment_method": "CARD"
    },
    {
        "transaction_id": "TEST-CRITICAL",
        "amount": 95000,
        "merchant": "Unknown Merchant",
        "location": "Dubai",
        "device": "new_device",
        "payment_method": "CARD"
    }
]
```

Run:

```bash
python ml_engine/test_predictor.py
```

Expected output roughly:

```text
TEST-LOW
Probability: 0.03
Anomaly: 0.05
Risk: LOW
Prediction: LEGITIMATE

TEST-HIGH
Probability: 0.71
Anomaly: 0.63
Risk: HIGH
Prediction: FRAUD

TEST-CRITICAL
Probability: 0.93
Anomaly: 0.87
Risk: CRITICAL
Prediction: FRAUD
```

Exact values don't matter.

The qualitative behavior does.

---

# 22. YOUR WORK TIMELINE

You have roughly **90 minutes before integration**.

## First 20 min

Dataset:

```text
load
clean
split
```

Train:

```text
Random Forest
```

Evaluate.

---

## 20–35 min

Train:

```text
Isolation Forest
```

Save:

```text
fraud_model.pkl
anomaly_model.pkl
```

---

## 35–50 min

Implement:

```text
features.py
risk.py
```

---

## 50–65 min

Implement:

```text
explain.py
predictor.py
```

---

## 65–75 min

Run:

```text
LOW
HIGH
CRITICAL
```

tests.

Fix anything broken.

---

## 75–90 min

**FREEZE ML.**

Do not touch the model.

Connect it to backend.

---

# 23. FINAL INTEGRATION CONTRACT

Tell API teammate that the only thing he needs is:

```python
from ml_engine.predictor import predict_transaction
```

Then:

```python
result = predict_transaction(transaction)
```

He does not need to know:

```text
Random Forest
Isolation Forest
feature engineering
thresholds
risk calculations
explanation rules
```

All of that stays inside `ml_engine`.

---

# 24. WHAT YOU SHOULD NOT BUILD

Under a two-hour deadline, absolutely avoid:

```text
Deep neural networks
LSTM
Transformers
Graph Neural Networks
Autoencoders
LLM agents inside the ML pipeline
RAG
Vector databases
Real bank integrations
SHAP debugging hell
GPU optimization
Hyperparameter sweeps
Kubernetes
Kafka
Redis
PostgreSQL
```

Every one of these is a potential time sink with almost zero increase in demo value.

---

# 25. YOUR FINAL DELIVERABLE

At the moment of integration, your directory should look like:

```text
ml_engine/
│
├── __init__.py
├── predictor.py        ← MOST IMPORTANT
├── train.py
├── features.py
├── risk.py
├── explain.py
│
└── models/
    ├── fraud_model.pkl
    ├── anomaly_model.pkl
    └── metadata.pkl
```

And this should work:

```python
from ml_engine.predictor import predict_transaction

result = predict_transaction({
    "transaction_id": "TX-9999",
    "amount": 95000,
    "merchant": "Unknown Merchant",
    "location": "Dubai",
    "device": "new_device",
    "payment_method": "CARD"
})

print(result)
```

Output:

```text
{
    "transaction_id": "TX-9999",
    "fraud_probability": 0.94,
    "anomaly_score": 0.88,
    "risk_score": 0.92,
    "risk_level": "CRITICAL",
    "is_suspicious": True,
    "prediction": "FRAUD",
    "explanation": [...]
}
```

That function is your **entire contribution boundary**. Once it works, stop doing ML and become the integration guy for the final 30 minutes.
