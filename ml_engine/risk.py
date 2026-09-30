"""
Risk scoring engine.

Combines ML fraud probability, anomaly score, and contextual risk
into a single risk_score + risk_level.
"""


def contextual_risk(transaction: dict) -> float:
    """
    Rule-based risk scoring from transaction context fields.
    Returns a score between 0.0 and 1.0.
    """
    score = 0.0
    amount = float(transaction.get("amount", 0))
    device = str(transaction.get("device", "")).lower()
    merchant = str(transaction.get("merchant", "")).lower()
    location = str(transaction.get("location", "")).lower()
    payment_method = str(transaction.get("payment_method", "")).lower()

    # Amount thresholds
    if amount > 50000:
        score += 0.35
    elif amount > 20000:
        score += 0.25
    elif amount > 5000:
        score += 0.15
    elif amount > 2000:
        score += 0.05

    # Device risk
    if device == "new_device":
        score += 0.20

    # Merchant risk
    if "unknown" in merchant:
        score += 0.15

    # Location risk
    common_locations = {
        "mumbai", "delhi", "bangalore", "hyderabad",
        "chennai", "kolkata", "pune", "ahmedabad"
    }
    if location not in common_locations:
        score += 0.15

    # Payment method risk
    if payment_method == "card":
        score += 0.05

    # Timing risk (late night 00:00 - 05:00)
    timing_str = str(transaction.get("timing", "")).strip()
    if not timing_str:
        # Check ISO timestamp if available
        ts = str(transaction.get("timestamp", ""))
        if "T" in ts:
            timing_str = ts.split("T")[1][:5]
    if timing_str:
        try:
            hour = int(timing_str.split(":")[0])
            if 0 <= hour <= 5:
                score += 0.15
        except (ValueError, IndexError):
            pass

    return min(score, 1.0)


def calculate_risk(
    fraud_probability: float,
    anomaly_score: float,
    contextual_score: float
) -> tuple:
    """
    Weighted combination of all risk signals.

    Returns:
        (risk_score, risk_level) where risk_level is one of
        LOW, MEDIUM, HIGH, CRITICAL.
    """
    risk_score = (
        0.65 * fraud_probability +
        0.20 * anomaly_score +
        0.15 * contextual_score
    )

    risk_score = max(0.0, min(1.0, risk_score))

    if risk_score >= 0.85:
        level = "CRITICAL"
    elif risk_score >= 0.65:
        level = "HIGH"
    elif risk_score >= 0.35:
        level = "MEDIUM"
    else:
        level = "LOW"

    return risk_score, level
