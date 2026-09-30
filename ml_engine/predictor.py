"""
predictor.py — THE interface for the backend.

Usage:
    from ml_engine.predictor import predict_transaction
    result = predict_transaction(transaction_dict)

Loads trained models at import time.  Falls back to demo mode
if model files are missing, but EXPOSES the mode so the frontend
can display it honestly.
"""

import os
import time
import logging
import warnings
warnings.filterwarnings("ignore")

logger = logging.getLogger(__name__)

_DIR = os.path.dirname(os.path.abspath(__file__))
_MODELS_DIR = os.path.join(_DIR, "models")

# ---------- load models once ----------

_fraud_model = None
_anomaly_model = None
_scaler = None
_metadata = None
_demo_mode = False

try:
    import joblib

    fraud_path = os.path.join(_MODELS_DIR, "fraud_model.pkl")
    anomaly_path = os.path.join(_MODELS_DIR, "anomaly_model.pkl")
    scaler_path = os.path.join(_MODELS_DIR, "scaler.pkl")
    meta_path = os.path.join(_MODELS_DIR, "metadata.pkl")

    if os.path.exists(fraud_path) and os.path.exists(anomaly_path):
        _fraud_model = joblib.load(fraud_path)
        _anomaly_model = joblib.load(anomaly_path)
        _fraud_model.n_jobs = 1
        _anomaly_model.n_jobs = 1
        logger.info("ML models loaded successfully.")
        if os.path.exists(scaler_path):
            _scaler = joblib.load(scaler_path)
        if os.path.exists(meta_path):
            _metadata = joblib.load(meta_path)
    else:
        _demo_mode = True
        logger.warning(
            "Model files not found. Running in MOCK (fallback) mode."
        )
except Exception as e:
    _demo_mode = True
    logger.warning(f"Failed to load models: {e}. Running in MOCK mode.")

# ---------- imports from sibling modules ----------

from ml_engine.features import transform_for_model, extract_features, normalize_anomaly
from ml_engine.risk import contextual_risk, calculate_risk
from ml_engine.explain import explain_transaction


def is_demo_mode() -> bool:
    """Return True if running on mock predictions (no ML model loaded)."""
    return _demo_mode


def get_model_status() -> str:
    """Return 'live' or 'mock' — for API responses and frontend display."""
    return "mock" if _demo_mode else "live"


def get_latency_benchmark() -> dict:
    """Return stored latency benchmark from training, if available."""
    if _metadata and "latency_benchmark" in _metadata:
        return _metadata["latency_benchmark"]
    return None


def _predict_with_models(transaction: dict) -> tuple:
    """Full prediction using trained ML models + contextual boost."""
    features = transform_for_model(transaction)
    raw_features = extract_features(transaction)

    # Fraud classifier — probability of class 1 (fraud)
    fraud_probability = float(
        _fraud_model.predict_proba(features)[0][1]
    )

    # Anomaly detector — decision_function (negative = anomaly)
    raw_anomaly = float(
        _anomaly_model.decision_function(features)[0]
    )
    anomaly_score = normalize_anomaly(raw_anomaly)

    return fraud_probability, anomaly_score, features, raw_features


def _predict_demo(transaction: dict) -> tuple:
    """
    Fallback prediction when models are unavailable.
    Uses contextual risk alone to produce believable scores.
    """
    ctx = contextual_risk(transaction)
    raw_features = extract_features(transaction)

    # Synthesise a plausible fraud probability from context
    fraud_probability = min(1.0, ctx * 1.15 + 0.02)

    # Synthesise anomaly from amount deviation + context
    amount = float(transaction.get("amount", 0))
    amount_signal = min(1.0, amount / 100000)
    anomaly_score = min(1.0, 0.4 * ctx + 0.6 * amount_signal)

    return fraud_probability, anomaly_score, None, raw_features


def _generate_agent_message(transaction: dict, risk_level: str, risk_score: float, explanations: list) -> dict:
    """
    Generate agentic messages based on the decision:
        CHALLENGE → customer-facing risk explanation + OTP prompt
        BLOCK     → analyst case note
    """
    amount = float(transaction.get("amount", 0))
    location = str(transaction.get("location", "")).title()
    device = str(transaction.get("device", "")).replace("_", " ").title()
    merchant = str(transaction.get("merchant", "")).title()

    if risk_level == "CRITICAL":
        # BLOCK: Draft analyst case note
        reason_bullets = "\n".join(f"  • {r}" for r in explanations[:4])
        return {
            "action": "BLOCK",
            "customer_message": (
                f"This transaction of ₹{amount:,.0f} has been blocked for your protection. "
                f"Our system detected high-risk indicators. Please contact customer support "
                f"if you believe this is legitimate."
            ),
            "analyst_case_note": (
                f"INCIDENT CASE NOTE — AUTO-GENERATED\n"
                f"{'='*40}\n"
                f"Transaction: ₹{amount:,.0f} to {merchant}\n"
                f"Location: {location} | Device: {device}\n"
                f"Risk Score: {risk_score:.4f} | Level: {risk_level}\n"
                f"\nTriggered Factors:\n{reason_bullets}\n"
                f"\nRecommendation: Transaction blocked pre-authorization. "
                f"Escalate to L2 fraud analyst for customer contact within 4 hours."
            ),
        }
    elif risk_level == "HIGH":
        # CHALLENGE: Customer-facing + OTP
        return {
            "action": "CHALLENGE_OTP",
            "customer_message": (
                f"We detected unusual activity on your account. "
                f"A ₹{amount:,.0f} transaction to {merchant} from {location} "
                f"on {device} requires verification. "
                f"Please enter the OTP sent to your registered mobile number."
            ),
            "analyst_case_note": None,
        }
    else:
        return {
            "action": "APPROVE",
            "customer_message": None,
            "analyst_case_note": None,
        }


def predict_transaction(transaction: dict, compute_shap: bool = True) -> dict:
    """
    THE function the backend calls.

    Args:
        transaction: dict with keys:
            transaction_id, amount, merchant, location,
            device, payment_method  (timestamp optional)
        compute_shap: whether to calculate SHAP feature contributions (default True)

    Returns:
        dict matching the API contract, now including:
            model_status, inference_latency_ms, shap_values, agent_action
    """
    # Measure real inference latency
    t0 = time.perf_counter()

    # Get ML scores
    if _demo_mode:
        fraud_probability, anomaly_score, feature_vector, raw_features = _predict_demo(transaction)
    else:
        fraud_probability, anomaly_score, feature_vector, raw_features = _predict_with_models(transaction)

    # Contextual risk
    ctx_score = contextual_risk(transaction)

    # Combined risk
    risk_score, risk_level = calculate_risk(
        fraud_probability, anomaly_score, ctx_score
    )

    # Suspicion threshold
    is_suspicious = risk_score >= 0.65
    prediction = "FRAUD" if is_suspicious else "LEGITIMATE"

    # SHAP explanations
    if compute_shap:
        explanation_result = explain_transaction(
            transaction, fraud_probability, anomaly_score, ctx_score,
            feature_vector=feature_vector,
            raw_features=raw_features,
        )
    else:
        explanation_result = {
            "reasons": [],
            "shap_values": {},
            "shap_available": False,
        }

    # Inference latency
    inference_latency_ms = round((time.perf_counter() - t0) * 1000, 2)

    # Agentic messages
    agent = _generate_agent_message(
        transaction, risk_level, risk_score, explanation_result["reasons"]
    )

    return {
        "transaction_id": transaction.get("transaction_id", "TX-0000"),
        "fraud_probability": round(fraud_probability, 4),
        "anomaly_score": round(anomaly_score, 4),
        "risk_score": round(risk_score, 4),
        "risk_level": risk_level,
        "is_suspicious": is_suspicious,
        "prediction": prediction,
        "explanation": explanation_result["reasons"],
        "shap_values": explanation_result["shap_values"],
        "shap_available": explanation_result["shap_available"],
        "model_status": get_model_status(),
        "inference_latency_ms": inference_latency_ms,
        "agent_action": agent,
    }
