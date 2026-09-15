"""
Preloaded customer behavioural profiles as specified in JK_Full_Architecture.md.
Enables behavioural anomaly detection based on baseline deviations.
"""
from typing import Dict, Any, List

CUSTOMER_PROFILES: Dict[str, Dict[str, Any]] = {
    "CUST-1001": {
        "customer_id": "CUST-1001",
        "name": "Rohan Sharma (Student)",
        "typical_channel": "UPI",
        "avg_amount": 650.0,
        "amount_range": [50.0, 2500.0],
        "known_locations": ["Pune", "Mumbai"],
        "known_devices": ["DEV-ROHAN-PIXEL", "mobile"],
        "active_hours": [8, 23],  # 8 AM to 11 PM
        "typical_velocity_10min": 1,
        "daily_avg_transactions": 3,
        "risk_tolerance": "LOW",
    },
    "CUST-1002": {
        "customer_id": "CUST-1002",
        "name": "Priya Verma (Corporate Executive)",
        "typical_channel": "CREDIT_CARD",
        "avg_amount": 42000.0,
        "amount_range": [1000.0, 150000.0],
        "known_locations": ["Mumbai", "Bengaluru", "Delhi"],
        "known_devices": ["DEV-PRIYA-S23", "DEV-PRIYA-MAC", "mobile"],
        "active_hours": [6, 24],
        "typical_velocity_10min": 2,
        "daily_avg_transactions": 8,
        "risk_tolerance": "HIGH",
    },
    "CUST-1003": {
        "customer_id": "CUST-1003",
        "name": "Amit Patel (Retail Merchant)",
        "typical_channel": "UPI",
        "avg_amount": 7500.0,
        "amount_range": [500.0, 25000.0],
        "known_locations": ["Ahmedabad", "Surat", "Delhi"],
        "known_devices": ["DEV-AMIT-ONEPLUS", "desktop", "mobile"],
        "active_hours": [9, 21],
        "typical_velocity_10min": 3,
        "daily_avg_transactions": 15,
        "risk_tolerance": "MEDIUM",
    },
    "CUST-1004": {
        "customer_id": "CUST-1004",
        "name": "Sneha Reddy (Tech Freelancer)",
        "typical_channel": "DEBIT_CARD",
        "avg_amount": 3400.0,
        "amount_range": [200.0, 12000.0],
        "known_locations": ["Hyderabad", "Bengaluru"],
        "known_devices": ["DEV-SNEHA-MOTO", "mobile"],
        "active_hours": [10, 2],  # night owl
        "typical_velocity_10min": 1,
        "daily_avg_transactions": 4,
        "risk_tolerance": "LOW",
    },
}


def get_all_profiles() -> List[Dict[str, Any]]:
    return list(CUSTOMER_PROFILES.values())


def get_customer_profile(customer_id: str) -> Dict[str, Any]:
    return CUSTOMER_PROFILES.get(customer_id, CUSTOMER_PROFILES["CUST-1001"])


def evaluate_customer_behaviour(transaction: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluates transaction deviations against customer's behavioural baseline.
    Returns:
      deviation_score: 0.0 to 1.0
      explanations: list of human-readable reasons
    """
    cust_id = transaction.get("customer_id", "CUST-1001")
    profile = get_customer_profile(cust_id)
    amount = float(transaction.get("amount", 0))
    location = str(transaction.get("location", "")).title()
    device = str(transaction.get("device", ""))

    explanations = []
    anomaly_penalty = 0.0

    # 1. Amount Deviation Check
    max_normal = profile["amount_range"][1]
    avg_amt = profile["avg_amount"]
    if amount > max_normal:
        ratio = amount / avg_amt
        anomaly_penalty += min(0.55, 0.20 + (ratio * 0.02))
        explanations.append(
            f"Transaction amount INR {amount:,.0f} deviates {ratio:.1f}x from {profile['name']}'s baseline average (INR {avg_amt:,.0f})"
        )

    # 2. Location Check
    known_locs = [loc.title() for loc in profile["known_locations"]]
    if location not in known_locs:
        anomaly_penalty += 0.25
        explanations.append(f"Unusual transaction location: '{location}' not in customer's known locations ({', '.join(known_locs)})")

    # 3. Device Check
    if device == "new_device" or device not in profile["known_devices"]:
        anomaly_penalty += 0.20
        explanations.append(f"Unrecognized device '{device}' detected for customer {profile['name']}")

    # 4. Critical amount rule
    if amount > 50000 and profile["risk_tolerance"] == "LOW":
        anomaly_penalty += 0.25
        explanations.append("High-value transaction exceeds strict risk tolerance threshold for this account profile")

    deviation_score = min(1.0, max(0.0, anomaly_penalty))
    return {
        "customer_name": profile["name"],
        "deviation_score": round(deviation_score, 3),
        "explanations": explanations,
    }
