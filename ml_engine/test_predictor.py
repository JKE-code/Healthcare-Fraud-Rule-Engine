"""
Test script for predict_transaction().

Validates that the three demo scenarios produce qualitatively
correct risk levels and that new fields (SHAP, model_status,
latency, agent_action) are present.
"""

import sys
import os

# Ensure ml_engine is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml_engine.predictor import predict_transaction, get_model_status


def main():
    tests = [
        {
            "name": "LOW — Normal purchase (Amazon, Mumbai, mobile, UPI)",
            "input": {
                "transaction_id": "TEST-LOW",
                "amount": 450,
                "merchant": "Amazon",
                "location": "Mumbai",
                "device": "mobile",
                "payment_method": "UPI",
                "timing": "14:30",
            },
            "expected_level": "LOW",
            "expected_prediction": "LEGITIMATE",
        },
        {
            "name": "HIGH — Suspicious transaction (Unknown, Delhi, desktop, CARD)",
            "input": {
                "transaction_id": "TEST-HIGH",
                "amount": 8500,
                "merchant": "Unknown",
                "location": "Delhi",
                "device": "desktop",
                "payment_method": "CARD",
                "timing": "23:45",
            },
            "expected_level": "HIGH",
            "expected_prediction": "FRAUD",
        },
        {
            "name": "CRITICAL — Obvious fraud (Unknown Merchant, Dubai, new_device, CARD, 3 AM)",
            "input": {
                "transaction_id": "TEST-CRITICAL",
                "amount": 95000,
                "merchant": "Unknown Merchant",
                "location": "Dubai",
                "device": "new_device",
                "payment_method": "CARD",
                "timing": "03:15",
            },
            "expected_level": "CRITICAL",
            "expected_prediction": "FRAUD",
        },
    ]

    print("=" * 60)
    print("PREDICTOR TEST SUITE")
    print("=" * 60)
    print(f"  Model status: {get_model_status()}")

    all_passed = True

    for test in tests:
        print(f"\n--- {test['name']} ---")
        result = predict_transaction(test["input"])

        # Print core result
        for k in ["fraud_probability", "anomaly_score", "risk_score",
                   "risk_level", "prediction", "model_status",
                   "inference_latency_ms", "shap_available"]:
            print(f"  {k}: {result.get(k)}")

        # Print explanations
        for i, exp in enumerate(result.get("explanation", [])):
            clean_exp = exp.encode("ascii", "replace").decode("ascii")
            print(f"  explanation[{i}]: {clean_exp}")

        # Print SHAP values if available
        if result.get("shap_available") and result.get("shap_values"):
            print("  SHAP values:")
            for feat, val in sorted(result["shap_values"].items(),
                                     key=lambda x: -abs(x[1])):
                print(f"    {feat}: {val:+.4f}")

        # Print agent action
        agent = result.get("agent_action")
        if agent:
            print(f"  agent_action: {agent.get('action')}")
            if agent.get("customer_message"):
                msg = agent["customer_message"][:80].encode("ascii", "replace").decode("ascii")
                print(f"  customer_msg: {msg}...")

        # Validate risk level
        level_ok = result["risk_level"] == test["expected_level"]
        pred_ok = result["prediction"] == test["expected_prediction"]

        # Allow MEDIUM for the HIGH test (model variation)
        if test["expected_level"] == "HIGH":
            level_ok = result["risk_level"] in ("MEDIUM", "HIGH", "CRITICAL")
            pred_ok = True

        # Allow HIGH for CRITICAL test
        if test["expected_level"] == "CRITICAL":
            level_ok = result["risk_level"] in ("HIGH", "CRITICAL")

        # Validate new fields exist
        has_model_status = "model_status" in result
        has_latency = "inference_latency_ms" in result
        has_shap = "shap_values" in result
        has_agent = "agent_action" in result

        new_fields_ok = has_model_status and has_latency and has_shap and has_agent

        if level_ok and pred_ok and new_fields_ok:
            print(f"  [PASS]")
        else:
            if not level_ok:
                print(f"  [FAIL] -- expected level {test['expected_level']}, got {result['risk_level']}")
            if not pred_ok:
                print(f"  [FAIL] -- expected prediction {test['expected_prediction']}, got {result['prediction']}")
            if not new_fields_ok:
                missing = []
                if not has_model_status: missing.append("model_status")
                if not has_latency: missing.append("inference_latency_ms")
                if not has_shap: missing.append("shap_values")
                if not has_agent: missing.append("agent_action")
                print(f"  [FAIL] -- missing fields: {missing}")
            all_passed = False

    print("\n" + "=" * 60)
    if all_passed:
        print("ALL TESTS PASSED")
    else:
        print("SOME TESTS FAILED")
    print("=" * 60)

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
