import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from backend.main import app
from backend.rules.base import BaseRule, RuleResult
from backend.rules.registry import RuleEngine, engine
from backend.rules.velocity_rule import VelocityRule
from backend.rules.unusual_amount_rule import UnusualAmountRule
from backend.rules.impossible_location_rule import ImpossibleLocationRule


client = TestClient(app)


def test_velocity_rule():
    rule = VelocityRule(window_seconds=60, max_transactions=3)
    now = datetime.now(timezone.utc)

    # 1 previous transaction 10s ago
    history = [
        {"customer_id": "CUST-999", "timestamp": (now - timedelta(seconds=10)).isoformat()}
    ]

    current_tx = {
        "customer_id": "CUST-999",
        "timestamp": now.isoformat(),
        "amount": 1000.0,
    }

    # Total = 2 (below threshold 3)
    res = rule.evaluate(current_tx, history)
    assert not res.triggered

    # Add 2nd previous transaction -> Total becomes 3 (threshold reached)
    history.append({"customer_id": "CUST-999", "timestamp": (now - timedelta(seconds=25)).isoformat()})
    res2 = rule.evaluate(current_tx, history)
    assert res2.triggered
    assert res2.rule_code == "RULE_VELOCITY"
    assert res2.severity in ("WARNING", "CRITICAL")
    assert "Velocity Surge" in res2.reason


def test_unusual_amount_rule():
    rule = UnusualAmountRule(hard_threshold=50000.0, baseline_multiplier=3.5, default_baseline=2000.0)

    # Normal amount
    normal_tx = {"customer_id": "CUST-888", "amount": 1500.0}
    res_normal = rule.evaluate(normal_tx, [])
    assert not res_normal.triggered

    # Extreme amount > 50,000
    spike_tx = {"customer_id": "CUST-888", "amount": 85000.0}
    res_spike = rule.evaluate(spike_tx, [])
    assert res_spike.triggered
    assert res_spike.rule_code == "RULE_UNUSUAL_AMOUNT"
    assert "Unusual Amount" in res_spike.reason or "Extreme" in res_spike.reason


def test_impossible_location_rule():
    rule = ImpossibleLocationRule(max_feasible_speed_kmh=850.0)
    now = datetime.now(timezone.utc)

    # Transaction 1 in Mumbai
    history = [
        {
            "customer_id": "CUST-777",
            "location": "Mumbai",
            "timestamp": (now - timedelta(minutes=10)).isoformat(),
        }
    ]

    # Transaction 2 in London 10 minutes later (Mumbai -> London is ~7,200 km -> speed > 40,000 km/h)
    london_tx = {
        "customer_id": "CUST-777",
        "location": "London",
        "timestamp": now.isoformat(),
    }

    res = rule.evaluate(london_tx, history)
    assert res.triggered
    assert res.rule_code == "RULE_IMPOSSIBLE_LOCATION"
    assert res.severity == "CRITICAL"
    assert "Impossible Travel" in res.reason


def test_extensibility_without_core_modification():
    """Verify that a brand new custom rule can be registered into RuleEngine without modifying it."""
    class CustomSanctionRule(BaseRule):
        rule_code = "RULE_SANCTIONED_MERCHANT"
        rule_name = "Sanctioned Merchant Watchlist"
        description = "Blocks transactions with sanctioned merchant keywords."

        def evaluate(self, transaction, history):
            merchant = str(transaction.get("merchant", "")).lower()
            if "darknet" in merchant or "sanctioned" in merchant:
                return RuleResult(
                    rule_code=self.rule_code,
                    rule_name=self.rule_name,
                    triggered=True,
                    risk_score=1.0,
                    severity="CRITICAL",
                    reason="Sanctioned merchant entity detected.",
                )
            return RuleResult(rule_code=self.rule_code, rule_name=self.rule_name, triggered=False)

    test_engine = RuleEngine()
    test_engine.register(CustomSanctionRule())

    # Should detect the custom rule trigger
    tx = {"merchant": "Darknet Bazaar", "amount": 500}
    eval_res = test_engine.evaluate_all(tx, [])
    assert eval_res.is_flagged
    assert eval_res.decision == "BLOCK"
    assert any(f.rule_code == "RULE_SANCTIONED_MERCHANT" for f in eval_res.triggered_rules)


def test_end_to_end_api_and_reviewer_workflow():
    test_cust = f"CUST-TEST-{datetime.now().timestamp()}"
    # 1. Post a normal transaction
    res = client.post(
        "/api/transactions",
        json={
            "amount": 1200.0,
            "merchant": "Swiggy",
            "location": "Bangalore",
            "device": "iPhone 15",
            "payment_method": "UPI",
            "customer_id": test_cust,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["transaction_id"].startswith("TX-")
    assert data["review_status"] == "CLEARED"

    # 2. Post a high-risk flagged transaction (Huge amount)
    res_flagged = client.post(
        "/api/transactions",
        json={
            "amount": 95000.0,
            "merchant": "Offshore Casino",
            "location": "Dubai",
            "device": "new_device",
            "payment_method": "CARD",
            "customer_id": test_cust,
        },
    )
    assert res_flagged.status_code == 200
    flagged_data = res_flagged.json()
    flagged_id = flagged_data["transaction_id"]
    assert flagged_data["is_flagged"] is True
    assert flagged_data["review_status"] == "FLAGGED"
    assert len(flagged_data["flags"]) > 0

    # 3. Verify it shows up in GET /api/transactions/flagged
    flagged_list = client.get("/api/transactions/flagged").json()
    assert any(t["transaction_id"] == flagged_id for t in flagged_list["transactions"])

    # 4. Reviewer action: Mark as REVIEWED
    review_res = client.patch(
        f"/api/transactions/{flagged_id}/review",
        json={"action": "REVIEWED", "reviewer": "Alice Analyst", "notes": "Contacted cardholder to verify identity."},
    )
    assert review_res.status_code == 200
    reviewed_data = review_res.json()
    assert reviewed_data["review_status"] == "REVIEWED"
    assert reviewed_data["reviewed_by"] == "Alice Analyst"

    # 5. Reviewer action: Mark as CLEARED
    clear_res = client.patch(
        f"/api/transactions/{flagged_id}/review",
        json={"action": "CLEARED", "reviewer": "Alice Analyst", "notes": "Customer confirmed legitimate transaction."},
    )
    assert clear_res.status_code == 200
    cleared_data = clear_res.json()
    assert cleared_data["review_status"] == "CLEARED"
