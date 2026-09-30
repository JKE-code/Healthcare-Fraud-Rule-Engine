"""
Mock data and realistic customer transaction generators for Acentra Fraud Engine.
Ensures customer persona consistency so legitimate transactions pass rule checks
and only genuine attack vectors trigger fraud rules.
"""
from typing import Dict, Any, List
import random
from datetime import datetime, timezone, timedelta


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
        "transaction_id": transaction.get("transaction_id", "TX-MOCK"),
        "fraud_probability": probability,
        "anomaly_score": anomaly,
        "risk_score": probability,
        "risk_level": risk,
        "is_suspicious": probability >= 0.65,
        "prediction": "FRAUD" if probability >= 0.65 else "LEGITIMATE",
        "explanation": explanations,
    }


# Persona profiles with consistent home cities, habitual devices, and spending bands
CUSTOMER_PRESETS = [
    {
        "customer_id": "CUST-1001",
        "name": "Rohan Sharma (Student)",
        "home_location": "Mumbai",
        "device": "mobile",
        "channel": "UPI",
        "merchants": ["Swiggy", "Zomato", "BookMyShow", "Blinkit", "Starbucks", "Amazon"],
        "amounts": [180.0, 320.0, 450.0, 680.0, 1150.0],
    },
    {
        "customer_id": "CUST-1002",
        "name": "Priya Verma (Exec)",
        "home_location": "Bengaluru",
        "device": "mobile",
        "channel": "CREDIT_CARD",
        "merchants": ["Amazon", "Flipkart", "MakeMyTrip", "Tata CliQ", "Taj Hotels"],
        "amounts": [3500.0, 7800.0, 14200.0, 22000.0, 31500.0],
    },
    {
        "customer_id": "CUST-1003",
        "name": "Amit Patel (Merchant)",
        "home_location": "Ahmedabad",
        "device": "desktop",
        "channel": "NET_BANKING",
        "merchants": ["Wholesale Mart", "IndianOil", "Tally Solutions", "Apollo Pharmacy"],
        "amounts": [1200.0, 3800.0, 6500.0, 9200.0, 14000.0],
    },
    {
        "customer_id": "CUST-1004",
        "name": "Sneha Reddy (Tech)",
        "home_location": "Hyderabad",
        "device": "mobile",
        "channel": "UPI",
        "merchants": ["Uber", "Swiggy", "Netflix", "Zomato", "GitHub"],
        "amounts": [150.0, 340.0, 650.0, 890.0, 1800.0],
    },
]


def get_random_sample_transaction() -> Dict[str, Any]:
    """
    Generate realistic transactions with consistent customer personas, home locations,
    and appropriate baseline spending so normal transactions pass rule checks cleanly.
    """
    category = random.choices(["normal", "suspicious", "critical"], weights=[0.80, 0.12, 0.08])[0]
    persona = random.choice(CUSTOMER_PRESETS)

    if category == "normal":
        # Realistic normal transaction matching user's home location and typical spending
        return {
            "amount": float(random.choice(persona["amounts"])),
            "merchant": random.choice(persona["merchants"]),
            "location": persona["home_location"],
            "device": persona["device"],
            "payment_method": "UPI" if persona["channel"] == "UPI" else "CARD",
            "customer_id": persona["customer_id"],
            "channel": persona["channel"],
        }
    elif category == "suspicious":
        # High value transaction on an unverified device
        return {
            "amount": 28000.0,
            "merchant": "Electronics Hub",
            "location": persona["home_location"],
            "device": "new_device",
            "payment_method": "CARD",
            "customer_id": persona["customer_id"],
            "channel": "CARD",
        }
    else:  # critical
        return {
            "amount": 125000.0,
            "merchant": "Luxury Watches Offshore",
            "location": persona["home_location"],
            "device": "new_device",
            "payment_method": "CARD",
            "customer_id": "CUST-1001",
            "channel": "CARD",
        }


def get_clean_seed_transactions() -> List[Dict[str, Any]]:
    """
    Generates a realistic, balanced seed dataset:
    - ~70% Clean legitimate transactions (Swiggy, Zomato, Amazon, Uber) -> LOW / CLEARED (Green)
    - ~15% Reviewed transactions (previously audited by analyst) -> REVIEWED (Blue)
    - ~15% Genuine flagged attack vectors (Impossible travel, extreme spike, burst) -> FLAGGED (Red)
    """
    now = datetime.now(timezone.utc)
    seeds = []

    # 1. Base legitimate transactions for CUST-1001 (Rohan Sharma, Mumbai)
    seeds.append({
        "customer_id": "CUST-1001",
        "merchant": "Swiggy Food",
        "location": "Mumbai",
        "amount": 320.0,
        "device": "mobile",
        "payment_method": "UPI",
        "channel": "UPI",
        "timestamp": (now - timedelta(hours=8)).isoformat(),
        "force_status": "CLEARED",
    })
    seeds.append({
        "customer_id": "CUST-1001",
        "merchant": "Zomato",
        "location": "Mumbai",
        "amount": 280.0,
        "device": "mobile",
        "payment_method": "UPI",
        "channel": "UPI",
        "timestamp": (now - timedelta(hours=6)).isoformat(),
        "force_status": "CLEARED",
    })
    seeds.append({
        "customer_id": "CUST-1001",
        "merchant": "Amazon Pantry",
        "location": "Mumbai",
        "amount": 1150.0,
        "device": "mobile",
        "payment_method": "UPI",
        "channel": "UPI",
        "timestamp": (now - timedelta(hours=4)).isoformat(),
        "force_status": "CLEARED",
    })
    seeds.append({
        "customer_id": "CUST-1001",
        "merchant": "Blinkit Grocery",
        "location": "Mumbai",
        "amount": 450.0,
        "device": "mobile",
        "payment_method": "UPI",
        "channel": "UPI",
        "timestamp": (now - timedelta(hours=2)).isoformat(),
        "force_status": "CLEARED",
    })

    # 2. Legitimate transactions for CUST-1002 (Priya Verma, Bengaluru)
    seeds.append({
        "customer_id": "CUST-1002",
        "merchant": "Flipkart Supermart",
        "location": "Bengaluru",
        "amount": 4200.0,
        "device": "mobile",
        "payment_method": "CARD",
        "channel": "CREDIT_CARD",
        "timestamp": (now - timedelta(hours=7)).isoformat(),
        "force_status": "CLEARED",
    })
    seeds.append({
        "customer_id": "CUST-1002",
        "merchant": "MakeMyTrip Flights",
        "location": "Bengaluru",
        "amount": 18500.0,
        "device": "mobile",
        "payment_method": "CARD",
        "channel": "CREDIT_CARD",
        "timestamp": (now - timedelta(hours=5)).isoformat(),
        "force_status": "CLEARED",
    })
    seeds.append({
        "customer_id": "CUST-1002",
        "merchant": "Starbucks Coffee",
        "location": "Bengaluru",
        "amount": 750.0,
        "device": "mobile",
        "payment_method": "CARD",
        "channel": "CREDIT_CARD",
        "timestamp": (now - timedelta(hours=1)).isoformat(),
        "force_status": "CLEARED",
    })

    # 3. Legitimate transactions for CUST-1003 (Amit Patel, Ahmedabad)
    seeds.append({
        "customer_id": "CUST-1003",
        "merchant": "Wholesale Mart",
        "location": "Ahmedabad",
        "amount": 8200.0,
        "device": "desktop",
        "payment_method": "NET_BANKING",
        "channel": "NET_BANKING",
        "timestamp": (now - timedelta(hours=6)).isoformat(),
        "force_status": "CLEARED",
    })
    seeds.append({
        "customer_id": "CUST-1003",
        "merchant": "IndianOil Corp",
        "location": "Ahmedabad",
        "amount": 3400.0,
        "device": "desktop",
        "payment_method": "NET_BANKING",
        "channel": "NET_BANKING",
        "timestamp": (now - timedelta(hours=3)).isoformat(),
        "force_status": "CLEARED",
    })

    # 4. Legitimate transactions for CUST-1004 (Sneha Reddy, Hyderabad)
    seeds.append({
        "customer_id": "CUST-1004",
        "merchant": "Uber Mobility",
        "location": "Hyderabad",
        "amount": 350.0,
        "device": "mobile",
        "payment_method": "UPI",
        "channel": "UPI",
        "timestamp": (now - timedelta(minutes=45)).isoformat(),
        "force_status": "CLEARED",
    })
    seeds.append({
        "customer_id": "CUST-1004",
        "merchant": "BookMyShow Movies",
        "location": "Hyderabad",
        "amount": 620.0,
        "device": "mobile",
        "payment_method": "UPI",
        "channel": "UPI",
        "timestamp": (now - timedelta(minutes=20)).isoformat(),
        "force_status": "CLEARED",
    })

    # 5. Pre-reviewed transactions (demonstrating triage history)
    seeds.append({
        "customer_id": "CUST-1002",
        "merchant": "Taj Luxury Hotels",
        "location": "Bengaluru",
        "amount": 34000.0,
        "device": "mobile",
        "payment_method": "CARD",
        "channel": "CREDIT_CARD",
        "timestamp": (now - timedelta(hours=10)).isoformat(),
        "force_status": "REVIEWED",
        "reviewed_by": "Vikas (Lead Reviewer)",
        "reviewer_notes": "Corporate retreat booking verified via expense voucher.",
    })
    seeds.append({
        "customer_id": "CUST-1001",
        "merchant": "DataScience EdTech",
        "location": "Mumbai",
        "amount": 8500.0,
        "device": "mobile",
        "payment_method": "UPI",
        "channel": "UPI",
        "timestamp": (now - timedelta(hours=9)).isoformat(),
        "force_status": "REVIEWED",
        "reviewed_by": "Vikas (Lead Reviewer)",
        "reviewer_notes": "Cardholder confirmed educational tuition payment.",
    })

    # 6. Flagged Attack Scenarios (Pending in Flagged Queue)
    # A. Extreme Amount Spike (CUST-1001 student with baseline 650 spending 125,000)
    seeds.append({
        "customer_id": "CUST-1001",
        "merchant": "Al-Safa Luxury Jewels",
        "location": "Mumbai",
        "amount": 125000.0,
        "device": "desktop",
        "payment_method": "CARD",
        "channel": "CARD",
        "timestamp": (now - timedelta(minutes=15)).isoformat(),
        # Engine will naturally flag RULE_UNUSUAL_AMOUNT
    })

    # B. Impossible Travel (CUST-1001 in London 10 mins after Mumbai)
    seeds.append({
        "customer_id": "CUST-1001",
        "merchant": "Harrods Knightsbridge",
        "location": "London",
        "amount": 14500.0,
        "device": "mobile",
        "payment_method": "CARD",
        "channel": "CARD",
        "timestamp": (now - timedelta(minutes=5)).isoformat(),
        # Engine will naturally flag RULE_IMPOSSIBLE_LOCATION
    })

    # C. Velocity Burst Attack (CUST-1004 receiving 3rd high-speed authorization)
    seeds.append({
        "customer_id": "CUST-1004",
        "merchant": "QuickPay Fast Recharge #3",
        "location": "Hyderabad",
        "amount": 4200.0,
        "device": "mobile",
        "payment_method": "UPI",
        "channel": "UPI",
        "timestamp": (now - timedelta(seconds=30)).isoformat(),
        # Engine will evaluate
    })

    return seeds

