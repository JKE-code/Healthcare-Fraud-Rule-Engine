"""
Mock data and fallback ML predictor.
Allows backend to run standalone before the ML teammate's model is plugged in.
"""
from typing import Dict, Any
import random


def mock_predict(transaction: Dict[str, Any]) -> Dict[str, Any]:
    amount = float(transaction.get("amount", 0))
    location = str(transaction.get("location", ""))
    device = str(transaction.get("device", ""))

    explanations = []

    if amount > 50000:
        probability = 0.94
        anomaly = 0.88
        risk = "CRITICAL"
        explanations.append("Transaction amount is unusually high")
        if device == "new_device":
            explanations.append("New device detected")
        if location in ("Dubai", "Lagos", "Unknown"):
            explanations.append("Unusual transaction location")
    elif amount > 10000:
        probability = 0.72
        anomaly = 0.65
        risk = "HIGH"
        explanations.append("High value transaction exceeds average user profile")
        if device == "new_device":
            explanations.append("New device detected")
    elif amount > 3000 and (device == "new_device" or location in ("Dubai", "Lagos", "Unknown")):
        probability = 0.48
        anomaly = 0.42
        risk = "MEDIUM"
        explanations.append("Medium risk: atypical location/device with moderate amount")
    else:
        probability = 0.04
        anomaly = 0.06
        risk = "LOW"

    return {
        "transaction_id": transaction["transaction_id"],
        "fraud_probability": probability,
        "anomaly_score": anomaly,
        "risk_score": probability,
        "risk_level": risk,
        "is_suspicious": probability >= 0.65,
        "prediction": "FRAUD" if probability >= 0.65 else "LEGITIMATE",
        "explanation": explanations,
    }


def get_random_sample_transaction() -> Dict[str, Any]:
    """Generate realistic dummy transactions across Normal, Suspicious, and Critical categories."""
    category = random.choices(["normal", "suspicious", "critical"], weights=[0.70, 0.20, 0.10])[0]

    cust_id = random.choice(["CUST-1001", "CUST-1002", "CUST-1003", "CUST-1004", "CUST-1005", "CUST-1006"])

    if category == "normal":
        merchants = ["Amazon", "Swiggy", "Zomato", "Flipkart", "Uber", "Blinkit", "Netflix", "Starbucks"]
        locations = ["Mumbai", "Bengaluru", "Delhi", "Hyderabad", "Pune", "Chennai"]
        amounts = [150, 320, 450, 780, 1200, 2400]
        methods = ["UPI", "CARD", "NET_BANKING"]
        return {
            "customer_id": cust_id,
            "amount": float(random.choice(amounts)),
            "merchant": random.choice(merchants),
            "location": random.choice(locations),
            "device": "mobile",
            "payment_method": random.choice(methods),
        }
    elif category == "suspicious":
        merchants = ["Unknown", "CryptoExchange", "ElectronicsHub", "QuickLoan", "OverseasStore"]
        locations = ["Delhi", "Jaipur", "Kolkata", "Goa", "Ahmedabad"]
        amounts = [6500, 8500, 12000, 18500, 24000]
        methods = ["CARD", "NET_BANKING"]
        return {
            "customer_id": cust_id,
            "amount": float(random.choice(amounts)),
            "merchant": random.choice(merchants),
            "location": random.choice(locations),
            "device": random.choice(["desktop", "new_device"]),
            "payment_method": random.choice(methods),
        }
    else:
        merchants = ["Unknown Merchant", "LuxuryWatches Offshore", "Foreign Casino", "DirectWire Global"]
        locations = ["Dubai", "Lagos", "Cayman Islands", "Unknown"]
        amounts = [52000, 75000, 95000, 120000, 180000]
        return {
            "customer_id": cust_id,
            "amount": float(random.choice(amounts)),
            "merchant": random.choice(merchants),
            "location": random.choice(locations),
            "device": "new_device",
            "payment_method": "CARD",
        }
