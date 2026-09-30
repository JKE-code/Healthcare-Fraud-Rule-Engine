"""
FastAPI application entry point for Acentra Fraud Rule Engine & Review Console.
Handles REST endpoints, WebSocket streaming, Rule Engine lifecycle, and DB initialization.
"""
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from backend.db.session import init_db, SessionLocal
from backend.models import TransactionRequest
from backend.routes.transactions import router as transactions_router, create_transaction
from backend.routes.dashboard import router as dashboard_router
from backend.routes.rules import router as rules_router
from backend.rules import engine
from backend.services.aws_notifier import notifier
from backend.websocket import manager
from backend.mock_data import get_random_sample_transaction, get_clean_seed_transactions

logger = logging.getLogger(__name__)

# Controlled background stream: Disabled by default so random transactions do not spam console
is_live_stream_active = False


async def dummy_transaction_worker():
    while True:
        try:
            if is_live_stream_active:
                sample_data = get_random_sample_transaction()
                req = TransactionRequest(**sample_data)
                db = SessionLocal()
                try:
                    await create_transaction(req, db)
                finally:
                    db.close()
        except Exception as e:
            logger.debug(f"Background simulator step: {e}")
        await asyncio.sleep(6)


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


@app.get("/api/health", tags=["health"])
async def health_check():
    return {
        "status": "ok",
        "service": "acentra-fraud-rule-engine",
        "rules_registered": len(engine.get_rules()),
        "rules": [r["rule_code"] for r in engine.get_rules()],
        "aws_notifier_mode": "live" if notifier.has_credentials else "sandbox_mock",
        "live_stream_active": is_live_stream_active,
    }


@app.post("/api/simulator/toggle", tags=["simulator"])
async def toggle_simulator():
    """Toggle automated simulated background transactions on/off."""
    global is_live_stream_active
    is_live_stream_active = not is_live_stream_active
    return {"status": "ok", "live_stream_active": is_live_stream_active}


@app.get("/api/simulator/status", tags=["simulator"])
async def get_simulator_status():
    return {"live_stream_active": is_live_stream_active}


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
