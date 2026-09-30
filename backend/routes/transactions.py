import uuid
from datetime import datetime, timezone
from typing import Dict, Any

from fastapi import APIRouter, HTTPException

from backend.models import TransactionRequest, TransactionResponse, TransactionListResponse
from backend.store import add_transaction, get_transaction, get_all_transactions, get_total_count
from backend.websocket import manager

import importlib

# Dynamic ML predictor resolver (checks ml_engine.predictor first, falls back to mock_predict)
def predict_transaction(tx_payload: Dict[str, Any]) -> Dict[str, Any]:
    try:
        ml_module = importlib.import_module("ml_engine.predictor")
        if hasattr(ml_module, "predict_transaction"):
            return ml_module.predict_transaction(tx_payload)
    except (ImportError, ModuleNotFoundError):
        pass
    from backend.mock_data import mock_predict
    return mock_predict(tx_payload)

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


def generate_transaction_id() -> str:
    return f"TX-{uuid.uuid4().hex[:8].upper()}"


from backend.customer_profiles import evaluate_customer_behaviour

def process_transaction(request_data: Dict[str, Any]) -> Dict[str, Any]:
    tx_id = generate_transaction_id()
    now_iso = request_data.get("timestamp") or datetime.now(timezone.utc).isoformat()
    timing_val = request_data.get("timing") or ""
    cust_id = request_data.get("customer_id", "CUST-1001")
    channel = request_data.get("channel", "UPI")

    tx_payload = {
        "transaction_id": tx_id,
        "timestamp": now_iso,
        "timing": timing_val,
        "customer_id": cust_id,
        "channel": channel,
        "amount": request_data["amount"],
        "merchant": request_data["merchant"],
        "location": request_data["location"],
        "device": request_data["device"],
        "payment_method": request_data["payment_method"],
    }

    # Evaluate customer behavioural baseline deviation
    behaviour_eval = evaluate_customer_behaviour(tx_payload)

    # Call ML predictor interface (either real or mock)
    ml_result = predict_transaction(tx_payload)

    fraud_prob = float(ml_result.get("fraud_probability", 0.0))
    anomaly = float(ml_result.get("anomaly_score", 0.0))
    base_risk = float(ml_result.get("risk_score", 0.0))

    # Integrate behavioural deviation into composite risk
    dev_score = behaviour_eval["deviation_score"]
    if dev_score > 0:
        # Boost risk when customer deviates strongly from historical baseline
        composite_risk = min(1.0, (base_risk * 0.70) + (dev_score * 0.30))
        anomaly = max(anomaly, dev_score)
    else:
        # If transaction matches customer's normal baseline (e.g. Priya normal high volume), reduce false positives
        composite_risk = base_risk * 0.40

    composite_risk = round(composite_risk, 3)

    # Determine risk level
    if composite_risk >= 0.80:
        risk_level = "CRITICAL"
        decision = "BLOCK"
    elif composite_risk >= 0.60:
        risk_level = "HIGH"
        decision = "BLOCK" if composite_risk >= 0.70 else "REVIEW"
    elif composite_risk >= 0.30:
        risk_level = "MEDIUM"
        decision = "REVIEW"
    else:
        risk_level = "LOW"
        decision = "APPROVE"

    prediction = "FRAUD" if decision == "BLOCK" else "LEGITIMATE"
    is_suspicious = decision in ("BLOCK", "REVIEW")

    # Merge explanations from ML and customer behaviour
    ml_explanations = list(ml_result.get("explanation", []))
    combined_explanations = list(dict.fromkeys(ml_explanations + behaviour_eval["explanations"]))

    # Combine transaction data + ML results (contract frozen in spec)
    combined: Dict[str, Any] = {
        "transaction_id": tx_id,
        "timestamp": now_iso,
        "timing": timing_val,
        "customer_id": cust_id,
        "channel": channel,
        "amount": request_data["amount"],
        "merchant": request_data["merchant"],
        "location": request_data["location"],
        "device": request_data["device"],
        "payment_method": request_data["payment_method"],
        "fraud_probability": round(fraud_prob, 3),
        "anomaly_score": round(anomaly, 3),
        "risk_score": composite_risk,
        "risk_level": risk_level,
        "is_suspicious": is_suspicious,
        "prediction": prediction,
        "decision": decision,
        "explanation": combined_explanations,
    }

    # In-memory storage
    add_transaction(tx_id, combined)

    return combined


@router.post("", response_model=TransactionResponse)
async def create_transaction(request: TransactionRequest):
    result = process_transaction(request.model_dump())

    # Broadcast to WebSocket clients
    await manager.broadcast({
        "event": "transaction_created",
        "data": result,
    })

    return result


@router.get("", response_model=TransactionListResponse)
async def list_transactions():
    tx_list = get_all_transactions()
    return {
        "transactions": tx_list,
        "total": get_total_count(),
    }


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def retrieve_transaction(transaction_id: str):
    tx = get_transaction(transaction_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx
