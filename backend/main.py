"""
FastAPI application entry point for Fraud Detection & Transaction Risk Agent.
Handles REST endpoints, WebSocket connections, CORS, and dummy transaction simulator.
"""
import asyncio
import time
import numpy as np
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from backend.models import HealthResponse, BenchmarkResponse
from backend.routes.transactions import (
    router as transactions_router,
    process_transaction,
    get_model_status,
    get_latency_benchmark,
)
from backend.routes.dashboard import router as dashboard_router
from backend.websocket import manager
from backend.mock_data import get_random_sample_transaction


# Background worker to generate live dummy transactions for real-time dashboard feel
async def dummy_transaction_worker():
    # Wait 2 seconds before starting generator to let server spin up cleanly
    await asyncio.sleep(2)
    while True:
        try:
            sample_data = get_random_sample_transaction()
            result = process_transaction(sample_data)
            await manager.broadcast({
                "event": "transaction_created",
                "data": result,
            })
        except Exception:
            pass
        await asyncio.sleep(3)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seed 5 transactions initially so dashboard has immediate history
    for _ in range(5):
        sample = get_random_sample_transaction()
        process_transaction(sample)

    task = asyncio.create_task(dummy_transaction_worker())
    yield
    task.cancel()


app = FastAPI(
    title="FraudGuard — Pre-Authorization Fraud Detection API",
    version="2.0.0",
    description="Real-time transaction fraud scoring with SHAP explanations, latency benchmarks, and agentic interventions.",
    lifespan=lifespan,
)

# CORS Middleware configured for React/Vite development and flexible staging
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


@app.get("/api/health", response_model=HealthResponse, tags=["health"])
async def health_check():
    return {
        "status": "ok",
        "service": "fraudguard-api",
        "model_status": get_model_status(),
        "latency_benchmark": get_latency_benchmark(),
    }


@app.get("/api/benchmark", response_model=BenchmarkResponse, tags=["benchmark"])
async def latency_benchmark():
    """
    Run 1,000 live inference requests and return p50/p95/p99 latency stats.
    This proves the actual inference speed — not a claim, a measurement.
    """
    try:
        from ml_engine.predictor import predict_transaction as ml_predict
    except ImportError:
        return {
            "model_status": "mock",
            "mean_ms": 0, "p50_ms": 0, "p95_ms": 0, "p99_ms": 0,
            "n_requests": 0,
        }

    test_transactions = [
        {"transaction_id": "BENCH-1", "amount": 450, "merchant": "Amazon",
         "location": "Mumbai", "device": "mobile", "payment_method": "UPI"},
        {"transaction_id": "BENCH-2", "amount": 95000, "merchant": "Unknown Merchant",
         "location": "Dubai", "device": "new_device", "payment_method": "CARD"},
        {"transaction_id": "BENCH-3", "amount": 8500, "merchant": "Croma",
         "location": "Delhi", "device": "desktop", "payment_method": "CARD"},
    ]

    latencies = []
    for i in range(1000):
        tx = test_transactions[i % 3].copy()
        t0 = time.perf_counter()
        ml_predict(tx, compute_shap=False)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        latencies.append(elapsed_ms)

    arr = np.array(latencies)
    return {
        "model_status": get_model_status(),
        "mean_ms": round(float(np.mean(arr)), 2),
        "p50_ms": round(float(np.percentile(arr, 50)), 2),
        "p95_ms": round(float(np.percentile(arr, 95)), 2),
        "p99_ms": round(float(np.percentile(arr, 99)), 2),
        "n_requests": 1000,
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection open and receive any ping/pong or client messages
            data = await websocket.receive_text()
            # Respond to client ping with pong if needed
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
