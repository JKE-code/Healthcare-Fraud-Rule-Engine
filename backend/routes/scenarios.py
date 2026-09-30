import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.db.models import TransactionDB
from backend.models import TransactionRequest, TransactionResponse
from backend.routes.transactions import create_transaction

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])


class ScenarioRequest(BaseModel):
    scenario_type: str = Field(..., description="'velocity', 'impossible_travel', 'unusual_amount', 'new_device', or 'normal'")
    customer_id: Optional[str] = Field("CUST-DEMO", description="Target customer ID for simulation")


@router.post("/trigger", response_model=TransactionResponse)
async def trigger_attack_scenario(req: ScenarioRequest, db: Session = Depends(get_db)):
    """
    Automated Attack Scenario Simulator:
    Pre-conditions prerequisite transaction history in SQLite and executes
    targeted attack vectors to reliably demonstrate rule firing to evaluators.
    """
    scenario = req.scenario_type.lower()
    cust_id = req.customer_id or f"CUST-SIM-{uuid.uuid4().hex[:4].upper()}"
    now = datetime.now(timezone.utc)

    if scenario == "velocity":
        # Pre-seed 2 rapid authorizations 15s and 8s ago
        for offset in (20, 8):
            seed_tx = TransactionDB(
                transaction_id=f"TX-SEED-{uuid.uuid4().hex[:6].upper()}",
                timestamp=(now - timedelta(seconds=offset)).isoformat(),
                customer_id=cust_id,
                amount=1500.0,
                merchant="QuickPay Recharge",
                location="Mumbai",
                device="mobile",
                payment_method="UPI",
                risk_score=0.1,
                risk_level="LOW",
                review_status="CLEARED",
            )
            db.add(seed_tx)
        db.commit()

        # Execute 3rd transaction right now to trigger Velocity Surge (count >= 3 in 60s)
        tx_req = TransactionRequest(
            customer_id=cust_id,
            amount=2500.0,
            merchant="QuickPay Burst Target",
            location="Mumbai",
            device="mobile",
            payment_method="UPI",
            timestamp=now.isoformat(),
        )
        return await create_transaction(tx_req, db)

    elif scenario == "impossible_travel":
        # Pre-seed previous transaction 10 minutes ago in Mumbai
        seed_tx = TransactionDB(
            transaction_id=f"TX-SEED-{uuid.uuid4().hex[:6].upper()}",
            timestamp=(now - timedelta(minutes=10)).isoformat(),
            customer_id=cust_id,
            amount=500.0,
            merchant="Starbucks Mumbai",
            location="Mumbai",
            device="mobile",
            payment_method="UPI",
            risk_score=0.05,
            risk_level="LOW",
            review_status="CLEARED",
        )
        db.add(seed_tx)
        db.commit()

        # Execute 2nd transaction 10 minutes later in London (7,200 km away -> >40,000 km/h)
        tx_req = TransactionRequest(
            customer_id=cust_id,
            amount=14500.0,
            merchant="Harrods London",
            location="London",
            device="mobile",
            payment_method="CARD",
            timestamp=now.isoformat(),
        )
        return await create_transaction(tx_req, db)

    elif scenario == "unusual_amount":
        # Execute an extreme amount spike (₹1,85,000)
        tx_req = TransactionRequest(
            customer_id=cust_id,
            amount=185000.0,
            merchant="Apex Jewelry & Bullion",
            location="Delhi",
            device="desktop",
            payment_method="CARD",
            timestamp=now.isoformat(),
        )
        return await create_transaction(tx_req, db)

    elif scenario == "new_device":
        # Execute charge from unrecognized device emulator on ₹25,000
        tx_req = TransactionRequest(
            customer_id=cust_id,
            amount=25000.0,
            merchant="High Value Electronics",
            location="Bangalore",
            device="new_device_emulator_hash_9x",
            payment_method="CARD",
            timestamp=now.isoformat(),
        )
        return await create_transaction(tx_req, db)

    elif scenario == "normal":
        # Execute benign everyday transaction
        tx_req = TransactionRequest(
            customer_id=cust_id,
            amount=650.0,
            merchant="Swiggy Food",
            location="Mumbai",
            device="mobile",
            payment_method="UPI",
            timestamp=now.isoformat(),
        )
        return await create_transaction(tx_req, db)

    else:
        raise HTTPException(
            status_code=400,
            detail="Unknown scenario. Choose from: 'velocity', 'impossible_travel', 'unusual_amount', 'new_device', 'normal'."
        )


class KaggleStreamRequest(BaseModel):
    count: int = Field(default=5, ge=1, le=50, description="Number of Kaggle transactions to stream")


@router.post("/stream-kaggle")
async def stream_kaggle_transactions(req: KaggleStreamRequest, db: Session = Depends(get_db)):
    """
    Live Kaggle Dataset Streamer:
    Streams real-world formatted transactions from the Kaggle Credit Card Fraud dataset
    (kartik2112/fraud-detection) into the rule evaluation pipeline with channel='KAGGLE_LIVE'.
    """
    from backend.kaggle_streamer import get_next_kaggle_transaction, load_kaggle_dataset
    csv_records = load_kaggle_dataset()
    processed = []

    if csv_records:
        for _ in range(req.count):
            tx_data = get_next_kaggle_transaction()
            if not tx_data:
                break
            tx_req = TransactionRequest(
                customer_id=tx_data["customer_id"],
                amount=tx_data["amount"],
                merchant=tx_data["merchant"],
                location=tx_data["location"],
                device=tx_data["device"],
                payment_method=tx_data["payment_method"],
                channel="KAGGLE_LIVE",
                timestamp=tx_data["timestamp"],
            )
            res = await create_transaction(tx_req, db)
            processed.append(res)
    else:
        from scripts.ingest_kaggle import generate_benchmark_kaggle_feed, parse_kaggle_row
        raw_records = generate_benchmark_kaggle_feed(count=req.count)
        for idx, raw in enumerate(raw_records, start=1):
            tx_data = parse_kaggle_row(raw, idx)
            tx_req = TransactionRequest(
                customer_id=tx_data["customer_id"],
                amount=tx_data["amount"],
                merchant=tx_data["merchant"],
                location=tx_data["location"],
                device=tx_data["device"],
                payment_method=tx_data["payment_method"],
                channel="KAGGLE_LIVE",
                timestamp=tx_data["timestamp"],
            )
            res = await create_transaction(tx_req, db)
            processed.append(res)

    flagged_count = sum(1 for p in processed if (p.get("is_flagged") if isinstance(p, dict) else getattr(p, "is_flagged", False)))

    return {
        "status": "success",
        "stream_source": "Kaggle Credit Card Fraud Dataset (kartik2112/fraud-detection)",
        "total_streamed": len(processed),
        "total_flagged": flagged_count,
        "transactions": processed,
    }

