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
from backend.routes.audit import router as audit_router
from backend.routes.scenarios import router as scenarios_router
from backend.routes.alerts import router as alerts_router
from backend.rules import engine
from backend.services.aws_notifier import notifier
from backend.websocket import manager
from backend.mock_data import get_random_sample_transaction

logger = logging.getLogger(__name__)


# Background worker to generate live dummy transactions for real-time reviewer console demonstration
async def dummy_transaction_worker():
    # Wait 3 seconds before starting simulator to let server spin up cleanly
    await asyncio.sleep(3)
    while True:
        try:
            sample_data = get_random_sample_transaction()
            req = TransactionRequest(**sample_data)
            db = SessionLocal()
            try:
                await create_transaction(req, db)
            finally:
                db.close()
        except Exception as e:
            logger.debug(f"Background simulator step: {e}")
        await asyncio.sleep(4)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database tables
    init_db()
    logger.info("Acentra Fraud Engine Database & Rules Initialized.")

    # Seed 3 initial transactions if database is fresh
    db = SessionLocal()
    try:
        from backend.db.models import TransactionDB
        count = db.query(TransactionDB).count()
        if count == 0:
            for _ in range(3):
                sample = get_random_sample_transaction()
                req = TransactionRequest(**sample)
                await create_transaction(req, db)
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
    return {
        "status": "ok",
        "service": "acentra-fraud-rule-engine",
        "rules_registered": len(engine.get_rules()),
        "rules": [r["rule_code"] for r in engine.get_rules()],
        "aws_notifier_mode": "live" if notifier.has_credentials else "sandbox_mock",
    }


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
