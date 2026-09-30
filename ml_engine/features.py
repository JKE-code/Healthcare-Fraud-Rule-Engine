"""
Feature engineering for fraud detection.

Extracts behavioral risk features from a transaction dict that match
the training feature space exactly:

    amount          — transaction amount (INR)
    merchant_risk   — 0-1 risk score from merchant lookup
    location_risk   — 0-1 risk score from location lookup
    device_risk     — 0-1 risk score from device type
    payment_risk    — 0-1 risk score from payment method
    hour            — hour of day (0-23)
    amount_deviation— ratio of amount to typical Rs 2500

No synthetic PCA projections.  The model is trained directly on these
features, so inference uses the same space — no feature mismatch.
"""

import numpy as np
import os
import joblib
import warnings
warnings.filterwarnings("ignore")

# --- paths ---
_DIR = os.path.dirname(os.path.abspath(__file__))
_MODELS_DIR = os.path.join(_DIR, "models")

# --- load scaler at import time ---
_scaler = None

def _load_artifacts():
    global _scaler
    scaler_path = os.path.join(_MODELS_DIR, "scaler.pkl")
    if os.path.exists(scaler_path):
        _scaler = joblib.load(scaler_path)

_load_artifacts()

# ---------- risk lookup tables ----------
# These map raw transaction fields to the risk-score features
# the model was trained on (from generate_dataset.py distributions).

MERCHANT_RISK = {
    "amazon": 0.05,
    "amazon india": 0.05,
    "flipkart": 0.08,
    "swiggy": 0.06,
    "zomato": 0.06,
    "bigbasket": 0.07,
    "myntra": 0.08,
    "phonepe": 0.04,
    "paytm": 0.05,
    "google pay": 0.04,
    "uber": 0.10,
    "ola": 0.09,
    "netflix": 0.05,
    "starbucks": 0.06,
    "blinkit": 0.06,
    "croma electronics": 0.10,
}

LOCATION_RISK = {
    "mumbai": 0.05,
    "delhi": 0.08,
    "bangalore": 0.05,
    "bengaluru": 0.05,
    "hyderabad": 0.06,
    "chennai": 0.06,
    "kolkata": 0.07,
    "pune": 0.06,
    "ahmedabad": 0.07,
    "jaipur": 0.08,
    "goa": 0.10,
}

DEVICE_RISK = {
    "mobile": 0.05,
    "desktop": 0.15,
    "tablet": 0.10,
    "new_device": 0.85,
}

PAYMENT_RISK = {
    "upi": 0.05,
    "card": 0.25,
    "net_banking": 0.15,
    "netbanking": 0.15,
    "wallet": 0.10,
}

# Typical legitimate transaction amount
NORMAL_AMOUNT = 2500.0

# Feature names matching training column order
FEATURE_NAMES = [
    "amount", "merchant_risk", "location_risk",
    "device_risk", "payment_risk", "hour", "amount_deviation",
]


def extract_features(transaction: dict) -> dict:
    """
    Extract individual risk features from a transaction dict.

    Returns a dict with each named feature — useful for SHAP explanations
    and for building the feature vector.
    """
    amount = float(transaction.get("amount", 0))
    merchant = str(transaction.get("merchant", "")).lower().strip()
    location = str(transaction.get("location", "")).lower().strip()
    device = str(transaction.get("device", "")).lower().strip()
    payment_method = str(transaction.get("payment_method", "")).lower().strip()

    # Merchant risk: unknown merchants get high risk
    merchant_risk = MERCHANT_RISK.get(merchant, 0.70)
    if "unknown" in merchant:
        merchant_risk = 0.85

    # Location risk: foreign / unknown locations get high risk
    location_risk = LOCATION_RISK.get(location, 0.65)

    # Device risk: new/unrecognized devices get high risk
    device_risk = DEVICE_RISK.get(device, 0.50)

    # Payment risk
    payment_risk = PAYMENT_RISK.get(payment_method, 0.15)

    # Hour extraction
    hour = 12.0  # default midday
    timing_str = str(transaction.get("timing", "")).strip()
    if not timing_str:
        ts = str(transaction.get("timestamp", ""))
        if "T" in ts:
            timing_str = ts.split("T")[1][:5]
    if timing_str:
        try:
            hour = float(int(timing_str.split(":")[0]))
        except (ValueError, IndexError):
            pass

    # Amount deviation from normal
    amount_deviation = amount / NORMAL_AMOUNT

    return {
        "amount": amount,
        "merchant_risk": merchant_risk,
        "location_risk": location_risk,
        "device_risk": device_risk,
        "payment_risk": payment_risk,
        "hour": hour,
        "amount_deviation": amount_deviation,
    }


def transform_for_model(transaction: dict) -> np.ndarray:
    """
    Convert a frontend transaction dict into the 7-feature vector
    that the trained models expect.

    Features: [amount, merchant_risk, location_risk, device_risk,
               payment_risk, hour, amount_deviation]

    Returns shape (1, 7) numpy array ready for model.predict().
    """
    feats = extract_features(transaction)

    features = np.array([[
        feats["amount"],
        feats["merchant_risk"],
        feats["location_risk"],
        feats["device_risk"],
        feats["payment_risk"],
        feats["hour"],
        feats["amount_deviation"],
    ]])

    # Scale if scaler available (trained scaler from train.py)
    if _scaler is not None:
        try:
            features = _scaler.transform(features)
        except Exception:
            pass  # shape mismatch guard

    return features


def normalize_anomaly(raw_score: float) -> float:
    """
    Convert IsolationForest decision_function output to 0–1 score.
    decision_function returns negative for anomalies, positive for normal.
    We invert: 0 = normal, 1 = highly anomalous.
    """
    return float(max(0.0, min(1.0, 0.5 - raw_score)))
