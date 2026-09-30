"""
Explanation engine.

Generates plain-English reasons for why a transaction was flagged.
Rule-based — no SHAP needed under a 2-hour deadline.
"""


def explain_transaction(
    transaction: dict,
    fraud_probability: float,
    anomaly_score: float,
    contextual_score: float
) -> list:
    """
    Return a list of up to 4 human-readable explanation strings.
    """
    reasons = []
    amount = float(transaction.get("amount", 0))
    device = str(transaction.get("device", "")).lower()
    merchant = str(transaction.get("merchant", "")).lower()
    location = str(transaction.get("location", "")).lower()

    common_locations = {
        "mumbai", "delhi", "bangalore", "hyderabad",
        "chennai", "kolkata", "pune", "ahmedabad"
    }

    # --- transaction-context reasons ---

    if amount > 50000:
        reasons.append(
        f"Transaction amount (Rs.{amount:,.0f}) is extremely high"
        )
    elif amount > 20000:
        reasons.append(
        f"Transaction amount (Rs.{amount:,.0f}) is unusually high"
        )

    if device == "new_device":
        reasons.append(
            "Transaction originated from a new/unrecognized device"
        )

    if "unknown" in merchant:
        reasons.append("Merchant is not recognized in the trusted directory")

    if location not in common_locations:
        reasons.append(
            f"Transaction location ({location.title()}) differs from normal activity zones"
        )

    # Timing explanation
    timing_str = str(transaction.get("timing", "")).strip()
    if not timing_str:
        ts = str(transaction.get("timestamp", ""))
        if "T" in ts:
            timing_str = ts.split("T")[1][:5]
    if timing_str:
        try:
            hour = int(timing_str.split(":")[0])
            if 0 <= hour <= 5:
                reasons.append(f"Transaction initiated at unusual late-night hour ({timing_str})")
        except (ValueError, IndexError):
            pass

    # --- model-derived reasons ---

    if anomaly_score > 0.7:
        reasons.append(
            "Transaction pattern is highly anomalous compared to historical behavior"
        )
    elif anomaly_score > 0.4:
        reasons.append(
            "Transaction exhibits moderately unusual patterns"
        )

    if fraud_probability > 0.8:
        reasons.append(
            "Model detects strong similarity to previously known fraudulent transactions"
        )
    elif fraud_probability > 0.5:
        reasons.append(
            "Model detects moderate similarity to known fraudulent patterns"
        )

    if contextual_score > 0.5:
        reasons.append(
            "Multiple contextual risk factors are present simultaneously"
        )

    # --- fallback ---
    if not reasons:
        reasons.append(
            "Transaction matches normal behavioral patterns"
        )

    return reasons[:4]
