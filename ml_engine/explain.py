"""
SHAP-based explanation engine for FraudGuard.

Uses SHAP TreeExplainer on the trained RandomForest to compute
actual feature contributions for each prediction.  Produces both:
    1. Raw SHAP values (for technical display)
    2. Plain-English explanations (for analysts and compliance)

Feature contributions are derived from the model's learned weights,
not hand-written rules.
"""

import os
import logging
import numpy as np

logger = logging.getLogger(__name__)

_DIR = os.path.dirname(os.path.abspath(__file__))
_MODELS_DIR = os.path.join(_DIR, "models")

# Feature display names for human-readable output
FEATURE_DISPLAY = {
    "amount": "Transaction Amount",
    "merchant_risk": "Merchant Risk Profile",
    "location_risk": "Geographic Location Risk",
    "device_risk": "Device Trust Level",
    "payment_risk": "Payment Method Risk",
    "hour": "Transaction Timing (Hour)",
    "amount_deviation": "Amount Deviation from Normal",
}

FEATURE_NAMES = list(FEATURE_DISPLAY.keys())

# SHAP explainer — loaded lazily
_explainer = None
_fraud_model = None


def _load_explainer():
    """Load SHAP TreeExplainer for the fraud model (lazy, once)."""
    global _explainer, _fraud_model
    if _explainer is not None:
        return True

    try:
        import shap
        import joblib

        model_path = os.path.join(_MODELS_DIR, "fraud_model.pkl")
        if not os.path.exists(model_path):
            logger.warning("fraud_model.pkl not found — SHAP unavailable")
            return False

        _fraud_model = joblib.load(model_path)
        _explainer = shap.TreeExplainer(_fraud_model)
        logger.info("SHAP TreeExplainer loaded successfully")
        return True
    except Exception as e:
        logger.warning(f"Failed to load SHAP explainer: {e}")
        return False


def _shap_to_english(feature_name: str, shap_value: float, raw_value: float) -> str:
    """Convert a single SHAP contribution to a plain-English sentence."""
    display = FEATURE_DISPLAY.get(feature_name, feature_name)
    direction = "increases" if shap_value > 0 else "decreases"
    strength = abs(shap_value)

    if strength < 0.02:
        return None  # negligible contribution

    if feature_name == "amount":
        return f"{display} (₹{raw_value:,.0f}) {direction} fraud risk (SHAP: {shap_value:+.3f})"
    elif feature_name == "device_risk":
        level = "high" if raw_value > 0.5 else "low"
        return f"{display} is {level} — {direction} fraud risk (SHAP: {shap_value:+.3f})"
    elif feature_name == "location_risk":
        level = "elevated" if raw_value > 0.3 else "normal"
        return f"{display} is {level} — {direction} fraud risk (SHAP: {shap_value:+.3f})"
    elif feature_name == "merchant_risk":
        level = "unrecognized/risky" if raw_value > 0.5 else "trusted"
        return f"Merchant is {level} — {direction} fraud risk (SHAP: {shap_value:+.3f})"
    elif feature_name == "hour":
        if raw_value <= 5:
            return f"Late-night transaction ({int(raw_value)}:00) {direction} fraud risk (SHAP: {shap_value:+.3f})"
        else:
            return f"Transaction timing ({int(raw_value)}:00) {direction} fraud risk (SHAP: {shap_value:+.3f})"
    elif feature_name == "amount_deviation":
        if raw_value > 4:
            return f"Amount is {raw_value:.1f}x above typical — {direction} fraud risk (SHAP: {shap_value:+.3f})"
        else:
            return f"Amount deviation ({raw_value:.1f}x) {direction} fraud risk (SHAP: {shap_value:+.3f})"
    elif feature_name == "payment_risk":
        return f"{display} {direction} fraud risk (SHAP: {shap_value:+.3f})"
    else:
        return f"{display} {direction} fraud risk (SHAP: {shap_value:+.3f})"


def explain_transaction(
    transaction: dict,
    fraud_probability: float,
    anomaly_score: float,
    contextual_score: float,
    feature_vector: np.ndarray = None,
    raw_features: dict = None,
) -> dict:
    """
    Generate explanations for a prediction using SHAP + contextual enrichment.

    Args:
        transaction: raw transaction dict
        fraud_probability: model fraud probability
        anomaly_score: anomaly detector score
        contextual_score: contextual risk score
        feature_vector: scaled feature vector (1, 7) for SHAP
        raw_features: dict of unscaled feature values from extract_features()

    Returns:
        dict with:
            reasons: list of plain-English explanations (top 4)
            shap_values: dict of {feature_name: shap_value} (if SHAP available)
            shap_available: bool
    """
    reasons = []
    shap_values_dict = {}
    shap_available = False

    # --- attempt SHAP explanation ---
    if feature_vector is not None and _load_explainer():
        try:
            shap_vals = _explainer.shap_values(feature_vector)

            # Extract class 1 (fraud) SHAP values as a 1D array of shape (n_features,)
            if isinstance(shap_vals, list):
                fraud_shap = np.array(shap_vals[1])[0]
            elif isinstance(shap_vals, np.ndarray):
                if shap_vals.ndim == 3:
                    fraud_shap = shap_vals[0, :, 1]
                elif shap_vals.ndim == 2:
                    fraud_shap = shap_vals[0]
                else:
                    fraud_shap = shap_vals.flatten()
            else:
                fraud_shap = np.array(shap_vals).flatten()

            fraud_shap = np.asarray(fraud_shap).flatten()

            # Build SHAP dict
            for i, fname in enumerate(FEATURE_NAMES):
                shap_values_dict[fname] = round(float(fraud_shap[i]), 4)

            # Sort by absolute contribution
            sorted_features = sorted(
                enumerate(FEATURE_NAMES),
                key=lambda x: abs(fraud_shap[x[0]]),
                reverse=True,
            )

            # Generate English reasons from SHAP
            for idx, fname in sorted_features:
                raw_val = raw_features.get(fname, 0.0) if raw_features else 0.0
                reason = _shap_to_english(fname, fraud_shap[idx], raw_val)
                if reason:
                    reasons.append(reason)

            shap_available = True
        except Exception as e:
            logger.warning(f"SHAP explanation failed: {e}")

    # --- fallback: contextual explanations if SHAP unavailable ---
    if not shap_available:
        reasons = _fallback_explain(transaction, fraud_probability, anomaly_score)

    # --- add anomaly note if relevant ---
    if anomaly_score > 0.7 and len(reasons) < 4:
        reasons.append(
            f"Transaction pattern is highly anomalous (anomaly score: {anomaly_score:.2f})"
        )

    return {
        "reasons": reasons[:4],
        "shap_values": shap_values_dict,
        "shap_available": shap_available,
    }


def _fallback_explain(transaction: dict, fraud_probability: float, anomaly_score: float) -> list:
    """Fallback rule-based explanations when SHAP is unavailable."""
    reasons = []
    amount = float(transaction.get("amount", 0))
    device = str(transaction.get("device", "")).lower()
    merchant = str(transaction.get("merchant", "")).lower()
    location = str(transaction.get("location", "")).lower()

    common_locations = {
        "mumbai", "delhi", "bangalore", "bengaluru", "hyderabad",
        "chennai", "kolkata", "pune", "ahmedabad"
    }

    if amount > 50000:
        reasons.append(f"Transaction amount (₹{amount:,.0f}) is extremely high")
    elif amount > 20000:
        reasons.append(f"Transaction amount (₹{amount:,.0f}) is unusually high")

    if device == "new_device":
        reasons.append("Transaction originated from a new/unrecognized device")

    if "unknown" in merchant:
        reasons.append("Merchant is not recognized in the trusted directory")

    if location not in common_locations:
        reasons.append(f"Transaction location ({location.title()}) differs from normal activity zones")

    if not reasons:
        reasons.append("Transaction matches normal behavioral patterns")

    return reasons
