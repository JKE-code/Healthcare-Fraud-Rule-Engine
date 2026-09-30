"""
Automated tests for FastAPI endpoints:
- GET /api/health
- POST /api/transactions
- GET /api/transactions
- GET /api/transactions/{transaction_id}
- GET /api/dashboard/stats
- WebSocket /ws connection and broadcast
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi.testclient import TestClient
from backend.main import app

def run_tests():
    client = TestClient(app)

    print("--- 1. Testing GET /api/health ---")
    resp = client.get("/api/health")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    assert data["status"] == "ok"
    assert data["service"] in ("fraudguard-api", "fraud-detection-api")
    print("[PASS] GET /api/health passed:", data)

    print("\n--- 2. Testing POST /api/transactions (Normal) ---")
    normal_payload = {
        "amount": 450,
        "merchant": "Amazon",
        "location": "Mumbai",
        "device": "mobile",
        "payment_method": "UPI"
    }
    resp = client.post("/api/transactions", json=normal_payload)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    tx1 = resp.json()
    assert tx1["transaction_id"].startswith("TX-")
    assert tx1["amount"] == 450
    assert tx1["prediction"] == "LEGITIMATE"
    assert tx1["risk_level"] == "LOW"
    print("[PASS] Normal transaction created:", tx1["transaction_id"], tx1["risk_level"])

    print("\n--- 3. Testing POST /api/transactions (Critical Fraud) ---")
    fraud_payload = {
        "amount": 95000,
        "merchant": "Unknown Merchant",
        "location": "Dubai",
        "device": "new_device",
        "payment_method": "CARD"
    }
    resp = client.post("/api/transactions", json=fraud_payload)
    assert resp.status_code == 200
    tx2 = resp.json()
    assert tx2["transaction_id"].startswith("TX-")
    assert tx2["amount"] == 95000
    assert tx2["prediction"] == "FRAUD"
    assert tx2["risk_level"] == "CRITICAL"
    assert len(tx2["explanation"]) > 0
    print("[PASS] Critical transaction created:", tx2["transaction_id"], tx2["risk_level"], tx2["explanation"])

    print("\n--- 4. Testing GET /api/transactions ---")
    resp = client.get("/api/transactions")
    assert resp.status_code == 200
    list_data = resp.json()
    assert "transactions" in list_data
    assert list_data["total"] >= 2
    # Verify newest transaction appears first
    assert list_data["transactions"][0]["transaction_id"] == tx2["transaction_id"]
    print("[PASS] GET /api/transactions passed, total count:", list_data["total"])

    print(f"\n--- 5. Testing GET /api/transactions/{tx2['transaction_id']} ---")
    resp = client.get(f"/api/transactions/{tx2['transaction_id']}")
    assert resp.status_code == 200
    assert resp.json()["transaction_id"] == tx2["transaction_id"]
    print("[PASS] GET single transaction by ID passed")

    print("\n--- 6. Testing GET 404 for non-existent transaction ---")
    resp = client.get("/api/transactions/TX-DOESNOTEXIST")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Transaction not found"
    print("[PASS] 404 response validated")

    print("\n--- 7. Testing GET /api/dashboard/stats ---")
    resp = client.get("/api/dashboard/stats")
    assert resp.status_code == 200
    stats = resp.json()
    assert stats["total_transactions"] >= 2
    assert "risk_distribution" in stats
    print("[PASS] Dashboard stats passed:", stats)

    print("\n--- 8. Testing WebSocket /ws connection ---")
    with client.websocket_connect("/ws") as websocket:
        websocket.send_text("ping")
        pong = websocket.receive_text()
        assert pong == "pong"
        print("[PASS] WebSocket connection and ping/pong passed")

    print("\n==========================================")
    print(" ALL BACKEND API CONTRACT TESTS PASSED! ")
    print("==========================================")

if __name__ == "__main__":
    run_tests()
