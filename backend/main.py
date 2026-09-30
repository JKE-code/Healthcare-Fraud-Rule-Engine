"""
FastAPI application entry point for Acentra Fraud Rule Engine & Review Console.
Handles REST endpoints, WebSocket streaming, Rule Engine lifecycle, and DB initialization.
"""
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.db.session import init_db, SessionLocal
from backend.models import TransactionRequest
from backend.routes.transactions import router as transactions_router, create_transaction
from backend.routes.dashboard import router as dashboard_router
from backend.routes.rules import router as rules_router
from backend.routes.audit import router as audit_router
from backend.routes.scenarios import router as scenarios_router
from backend.routes.alerts import router as alerts_router
from backend.rules import engine
from backend.services.aws_notifier import notifier
from backend.websocket import manager
from backend.mock_data import get_random_sample_transaction, get_clean_seed_transactions
from backend.kaggle_streamer import get_next_kaggle_transaction, get_kaggle_dataset_info

logger = logging.getLogger(__name__)

# Live background stream: Active by default so new incoming transactions stream in real-time
is_live_stream_active = True
live_stream_mode = "synthetic"  # "synthetic" or "kaggle"


async def dummy_transaction_worker():
    # Allow server to initialize cleanly before first stream event
    await asyncio.sleep(2)
    while True:
        try:
            if is_live_stream_active:
                if live_stream_mode == "kaggle":
                    sample_data = get_next_kaggle_transaction()
                    if not sample_data:
                        sample_data = get_random_sample_transaction()
                else:
                    sample_data = get_random_sample_transaction()

                req = TransactionRequest(**sample_data)
                db = SessionLocal()
                try:
                    res = await create_transaction(req, db)
                    tx_id = res.get("transaction_id", "") if isinstance(res, dict) else getattr(res, "transaction_id", "")
                    risk = res.get("risk_level", "LOW") if isinstance(res, dict) else getattr(res, "risk_level", "LOW")
                    source_label = "KAGGLE" if live_stream_mode == "kaggle" else "SYNTHETIC"
                    logger.info(f"⚡ [{source_label}] Emitted {tx_id}: {req.merchant} (₹{req.amount:,.0f}) for {req.customer_id} -> {risk}")
                finally:
                    db.close()
        except Exception as e:
            logger.warning(f"Background simulator step: {e}")
        await asyncio.sleep(4)


async def seed_initial_database(db):
    """Populates realistic initial dataset."""
    from backend.db.models import TransactionDB
    seeds = get_clean_seed_transactions()
    for item in seeds:
        force_status = item.pop("force_status", None)
        reviewed_by = item.pop("reviewed_by", None)
        reviewer_notes = item.pop("reviewer_notes", None)
        req = TransactionRequest(**item)
        res = await create_transaction(req, db)
        tx_id = res.get("transaction_id") if isinstance(res, dict) else getattr(res, "transaction_id", None)
        if force_status and tx_id:
            tx = db.query(TransactionDB).filter(TransactionDB.transaction_id == tx_id).first()
            if tx:
                tx.review_status = force_status
                if force_status == "CLEARED":
                    tx.is_flagged = False
                elif force_status == "REVIEWED":
                    tx.is_flagged = True
                if reviewed_by:
                    tx.reviewed_by = reviewed_by
                if reviewer_notes:
                    tx.reviewer_notes = reviewer_notes
                db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database tables
    init_db()
    logger.info("Acentra Fraud Engine Database & Rules Initialized.")

    db = SessionLocal()
    try:
        from backend.db.models import TransactionDB
        count = db.query(TransactionDB).count()
        if count == 0:
            await seed_initial_database(db)
    except Exception as e:
        logger.warning(f"Initial seed warning: {e}")
    finally:
        db.close()

    task = asyncio.create_task(dummy_transaction_worker())
    yield
    task.cancel()


app = FastAPI(
    title="Acentra Fraud Rule Engine & Review Console API",
    version="1.0.0",
    description="Real-time transaction risk evaluation with an extensible rule engine, SQLite persistence, and AWS SES/SNS alerting.",
    lifespan=lifespan,
)

# CORS Middleware configured for React/Vite development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(transactions_router)
app.include_router(dashboard_router)
app.include_router(rules_router)
app.include_router(audit_router)
app.include_router(scenarios_router)
app.include_router(alerts_router)


@app.get("/api/health", tags=["health"])
async def health_check():
    from ml_engine.predictor import get_model_status, get_active_model_name
    return {
        "status": "ok",
        "service": "acentra-fraud-rule-engine",
        "rules_registered": len(engine.get_rules()),
        "rules": [r["rule_code"] for r in engine.get_rules()],
        "aws_notifier_mode": "live" if notifier.has_credentials else "sandbox_mock",
        "live_stream_active": is_live_stream_active,
        "live_stream_mode": live_stream_mode,
        "model_status": get_model_status(),
        "model_name": get_active_model_name(),
    }


@app.post("/api/simulator/toggle", tags=["simulator"])
async def toggle_simulator():
    """Toggle automated simulated background transactions on/off."""
    global is_live_stream_active
    is_live_stream_active = not is_live_stream_active
    return {"status": "ok", "live_stream_active": is_live_stream_active}


@app.get("/api/simulator/status", tags=["simulator"])
async def get_simulator_status():
    return {
        "live_stream_active": is_live_stream_active,
        "mode": live_stream_mode,
        "kaggle_info": get_kaggle_dataset_info(),
    }


class StreamModePayload(BaseModel):
    mode: str = "synthetic"  # "synthetic" or "kaggle"


@app.post("/api/simulator/mode", tags=["simulator"])
async def set_simulator_mode(payload: StreamModePayload):
    """
    Live Stream Mode Switcher:
    Toggles background transaction ingestion between:
    - 'synthetic': Procedural customer persona baseline stream
    - 'kaggle': Authentic credit card fraud dataset stream (kartik2112/fraud-detection)
    """
    global live_stream_mode
    target_mode = payload.mode.lower().strip()
    if target_mode not in ("synthetic", "kaggle"):
        raise HTTPException(status_code=400, detail="Mode must be either 'synthetic' or 'kaggle'")

    live_stream_mode = target_mode
    logger.info(f"Switched live transaction stream mode to: {live_stream_mode.upper()}")
    return {
        "status": "ok",
        "mode": live_stream_mode,
        "live_stream_active": is_live_stream_active,
        "message": f"Successfully switched stream mode to {live_stream_mode.upper()}",
    }


@app.post("/api/simulator/reset", tags=["simulator"])
async def reset_simulator_data():
    """Wipes the database and re-seeds clean, realistic baseline data."""
    db = SessionLocal()
    try:
        from backend.db.models import TransactionDB, FraudFlagDB, ReviewAuditLogDB
        db.query(FraudFlagDB).delete()
        db.query(ReviewAuditLogDB).delete()
        db.query(TransactionDB).delete()
        db.commit()
        await seed_initial_database(db)
        return {"status": "ok", "message": "Database successfully reset and re-seeded with realistic baseline."}
    finally:
        db.close()


# WebSocket Endpoint for live push to Reviewer Console
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection open and receive optional ping / commands from frontend
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
