import uuid
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.db.session import get_db
from backend.db.models import TransactionDB, FraudFlagDB, ReviewAuditLogDB
from backend.models import (
    TransactionRequest,
    TransactionResponse,
    TransactionListResponse,
    ReviewStatusUpdateRequest,
    RuleInfoResponse,
)
from backend.rules import engine
from backend.services.aws_notifier import notifier
from backend.websocket import manager

logger = logging.getLogger(__name__)

# Optional ML module loader (retains ML/SHAP as an analytical enrichment without making it core)
_ml_module = None
try:
    import importlib
    _ml_module = importlib.import_module("ml_engine.predictor")
except Exception:
    pass

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


def generate_transaction_id() -> str:
    return f"TX-{uuid.uuid4().hex[:8].upper()}"


@router.post("", response_model=TransactionResponse)
async def create_transaction(request: TransactionRequest, db: Session = Depends(get_db)):
    tx_id = generate_transaction_id()
    now_iso = request.timestamp or datetime.now(timezone.utc).isoformat()
    timing_val = request.timing or ""
    cust_id = request.customer_id or "CUST-1001"
    channel = request.channel or "UPI"

    tx_payload = {
        "transaction_id": tx_id,
        "timestamp": now_iso,
        "timing": timing_val,
        "customer_id": cust_id,
        "channel": channel,
        "amount": request.amount,
        "merchant": request.merchant,
        "location": request.location,
        "device": request.device,
        "payment_method": request.payment_method,
    }

    # 1. Fetch recent customer transaction history from SQLite database
    recent_db_txs = (
        db.query(TransactionDB)
        .filter(TransactionDB.customer_id == cust_id)
        .order_by(desc(TransactionDB.timestamp))
        .limit(20)
        .all()
    )
    history = [t.to_dict() for t in recent_db_txs]

    # 2. Evaluate through the Extensible Rule Engine
    eval_result = engine.evaluate_all(tx_payload, history)

    # 3. Optional ML enrichment (auxiliary score & SHAP attribution)
    ml_fraud_prob = 0.0
    ml_anomaly = 0.0
    shap_vals = {}
    if _ml_module and hasattr(_ml_module, "predict_transaction"):
        try:
            ml_out = _ml_module.predict_transaction(tx_payload)
            ml_fraud_prob = float(ml_out.get("fraud_probability", 0.0))
            ml_anomaly = float(ml_out.get("anomaly_score", 0.0))
            shap_vals = ml_out.get("shap_values", {})
        except Exception as e:
            logger.debug(f"Optional ML enrichment skipped: {e}")

    # Determine Reviewer Workflow Status
    # Flagged if rule engine flagged it or risk level is HIGH/CRITICAL
    is_flagged = eval_result.is_flagged or eval_result.risk_level in ("HIGH", "CRITICAL")
    review_status = "FLAGGED" if is_flagged else "CLEARED"

    # 4. Automated AWS SES/SNS Alerting when high-risk threshold is crossed
    aws_sent = False
    aws_msg_id = None
    if notifier.should_alert(eval_result.composite_risk_score, eval_result.risk_level):
        try:
            alert_receipt = notifier.dispatch_alert(
                {**tx_payload, "risk_score": eval_result.composite_risk_score, "risk_level": eval_result.risk_level},
                [{"rule_code": f.rule_code, "reason": f.reason} for f in eval_result.triggered_rules],
            )
            aws_sent = alert_receipt.get("delivered", False)
            aws_msg_id = alert_receipt.get("message_id")
        except Exception as e:
            logger.error(f"Failed to dispatch AWS notification: {e}")

    # 5. Persist Transaction to SQLite Database
    db_tx = TransactionDB(
        transaction_id=tx_id,
        timestamp=now_iso,
        customer_id=cust_id,
        amount=request.amount,
        merchant=request.merchant,
        location=request.location,
        device=request.device,
        payment_method=request.payment_method,
        channel=channel,
        timing=timing_val,
        risk_score=eval_result.composite_risk_score,
        risk_level=eval_result.risk_level,
        is_flagged=is_flagged,
        decision=eval_result.decision,
        prediction=eval_result.prediction,
        fraud_probability=ml_fraud_prob,
        anomaly_score=ml_anomaly,
        review_status=review_status,
        aws_alert_sent=aws_sent,
        aws_message_id=aws_msg_id,
        explanation_json=json.dumps(eval_result.explanations),
        shap_json=json.dumps(shap_vals),
    )
    db.add(db_tx)

    # Persist Fraud Flags
    for rule_res in eval_result.triggered_rules:
        db_flag = FraudFlagDB(
            transaction_id=tx_id,
            rule_code=rule_res.rule_code,
            rule_name=rule_res.rule_name,
            severity=rule_res.severity,
            reason=rule_res.reason or "",
            metrics_json=json.dumps(rule_res.metrics),
        )
        db.add(db_flag)

    db.commit()
    db.refresh(db_tx)

    result_dict = db_tx.to_dict()

    # 6. Broadcast event over WebSocket
    try:
        await manager.broadcast({
            "event": "transaction_created",
            "data": result_dict,
        })
    except Exception as e:
        logger.warning(f"WebSocket broadcast failed: {e}")

    return result_dict


@router.get("", response_model=TransactionListResponse)
async def list_transactions(
    flagged: Optional[bool] = Query(None, description="Filter for flagged transactions"),
    status: Optional[str] = Query(None, description="Filter by review_status: FLAGGED, REVIEWED, CLEARED"),
    customer_id: Optional[str] = Query(None, description="Filter by customer ID"),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    query = db.query(TransactionDB)

    if flagged is not None:
        query = query.filter(TransactionDB.is_flagged == flagged)
    if status:
        query = query.filter(TransactionDB.review_status == status.upper())
    if customer_id:
        query = query.filter(TransactionDB.customer_id == customer_id)

    total = query.count()
    txs = query.order_by(desc(TransactionDB.timestamp)).limit(limit).all()

    return {
        "transactions": [t.to_dict() for t in txs],
        "total": total,
    }


@router.get("/flagged", response_model=TransactionListResponse)
async def list_flagged_transactions(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Dedicated endpoint for the Reviewer Console Triage Queue."""
    query = db.query(TransactionDB).filter(TransactionDB.review_status == "FLAGGED")
    total = query.count()
    txs = query.order_by(desc(TransactionDB.timestamp)).limit(limit).all()

    return {
        "transactions": [t.to_dict() for t in txs],
        "total": total,
    }


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def retrieve_transaction(transaction_id: str, db: Session = Depends(get_db)):
    tx = db.query(TransactionDB).filter(TransactionDB.transaction_id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx.to_dict()


@router.patch("/{transaction_id}/review", response_model=TransactionResponse)
async def review_transaction(
    transaction_id: str,
    payload: ReviewStatusUpdateRequest,
    db: Session = Depends(get_db),
):
    """
    Reviewer Console Action:
    Allows fraud analysts to triage and mark transactions as REVIEWED or CLEARED.
    Persists decision in database and logs audit entry.
    """
    tx = db.query(TransactionDB).filter(TransactionDB.transaction_id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    action = payload.action.upper()
    if action not in ("REVIEWED", "CLEARED"):
        raise HTTPException(status_code=400, detail="Invalid action. Must be 'REVIEWED' or 'CLEARED'.")

    prev_status = tx.review_status
    now_iso = datetime.now(timezone.utc).isoformat()

    tx.review_status = action
    tx.reviewed_by = payload.reviewer or "Fraud Analyst"
    tx.reviewed_at = now_iso
    tx.reviewer_notes = payload.notes

    if action == "CLEARED":
        tx.decision = "APPROVE"
        tx.prediction = "LEGITIMATE"
        tx.is_flagged = False

    # Create audit log record
    audit_log = ReviewAuditLogDB(
        transaction_id=transaction_id,
        action=f"MARKED_{action}",
        previous_status=prev_status,
        new_status=action,
        reviewer=tx.reviewed_by,
        timestamp=now_iso,
        notes=payload.notes,
    )
    db.add(audit_log)
    db.commit()
    db.refresh(tx)

    result_dict = tx.to_dict()

    # Broadcast update event to all reviewer consoles via WebSocket
    try:
        await manager.broadcast({
            "event": "transaction_reviewed",
            "data": result_dict,
        })
    except Exception as e:
        logger.warning(f"WebSocket broadcast failed: {e}")

    return result_dict
