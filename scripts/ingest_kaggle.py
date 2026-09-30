"""
Kaggle Real-World Transaction Dataset Ingestion Pipeline
for Acentra Fraud Rule Engine.

Supported Kaggle Datasets:
1. Credit Card Transactions Fraud Dataset (kartik2112/fraud-detection):
   - Real timestamps, cardholder lat/long coordinates, merchants, amounts.
   - Evaluates: Impossible Geographical Location (Haversine speed), Velocity, Unusual Amount.
2. PaySim Synthetic Financial Mobile Dataset (ealaxi/paysim1):
   - Real mobile money simulation: customer IDs, transfer amounts, step timestamps.
3. Generic FinTech CSV format:
   - customer_id, amount, location, timestamp, merchant, device, payment_method.

Usage:
  # Run simulated Kaggle real-format streaming benchmark (no download required)
  python scripts/ingest_kaggle.py --benchmark 50

  # Ingest an actual downloaded Kaggle CSV file
  python scripts/ingest_kaggle.py --file path/to/fraudTrain.csv --limit 500
"""

import os
import sys
import time
import argparse
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List

# Add parent directory to path so backend imports resolve
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.db.session import init_db, SessionLocal
from backend.db.models import TransactionDB, FraudFlagDB
from backend.rules import engine
from backend.services.aws_notifier import notifier


import uuid

def parse_kaggle_row(row: Dict[str, Any], index: int) -> Dict[str, Any]:
    """Maps varied Kaggle column headers to standard Acentra schema."""
    tx_id = f"TX-KAG-{uuid.uuid4().hex[:6].upper()}-{index:03d}"

    # Amount resolution
    amt_val = row.get("amt") or row.get("amount") or row.get("Amount") or 100.0
    try:
        amount = float(amt_val)
    except (ValueError, TypeError):
        amount = 100.0

    # Customer ID resolution
    cust_id = (
        str(row.get("cc_num") or row.get("nameOrig") or row.get("customer_id") or f"CUST-KAG-{index % 20 + 1}")
    )

    # Merchant resolution
    merchant = str(row.get("merchant") or row.get("nameDest") or "Retail Merchant")
    if merchant.startswith("fraud_"):
        merchant = merchant.replace("fraud_", "")

    # Location resolution
    city = row.get("city")
    state = row.get("state")
    lat = row.get("lat")
    lon = row.get("long")

    if city and state:
        location = f"{city}, {state}"
    elif lat and lon:
        location = f"{float(lat):.2f}, {float(lon):.2f}"
    else:
        location = row.get("location", "Mumbai")

    # Timestamp resolution
    raw_time = row.get("trans_date_trans_time") or row.get("timestamp") or row.get("Time")
    if raw_time:
        try:
            dt = datetime.strptime(str(raw_time), "%Y-%m-%d %H:%M:%S")
            iso_time = dt.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")
        except Exception:
            iso_time = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    else:
        iso_time = (datetime.now(timezone.utc) - timedelta(seconds=index * 15)).isoformat().replace("+00:00", "Z")

    return {
        "transaction_id": tx_id,
        "timestamp": iso_time,
        "customer_id": cust_id,
        "amount": amount,
        "merchant": merchant,
        "location": location,
        "device": "mobile_app",
        "payment_method": "CARD",
        "channel": "POS",
    }


def generate_benchmark_kaggle_feed(count: int = 50) -> List[Dict[str, Any]]:
    """
    Generates a realistic batch formatted exactly like the Kartavyasethi
    Kaggle Credit Card Fraud dataset, including intentional velocity bursts,
    transcontinental impossible travel jumps, and extreme balance spikes.
    """
    import random
    cities = [
        {"city": "Mumbai", "state": "MH", "lat": 19.0760, "long": 72.8777},
        {"city": "Delhi", "state": "DL", "lat": 28.6139, "long": 77.2090},
        {"city": "Bengaluru", "state": "KA", "lat": 12.9716, "long": 77.5946},
        {"city": "London", "state": "UK", "lat": 51.5074, "long": -0.1278},
        {"city": "Dubai", "state": "UAE", "lat": 25.2048, "long": 55.2708},
    ]

    merchants = ["Amazon India", "Flipkart", "Uber", "Apple Store", "Tata Neu", "Zomato", "Rolex Boutique"]

    records = []
    base_time = datetime.now(timezone.utc) - timedelta(minutes=count * 2)

    for i in range(count):
        loc = random.choice(cities[:3]) # default domestic
        amt = random.choice([250.0, 750.0, 1850.0, 3200.0, 5400.0])
        cust = f"CUST-{random.randint(101, 110)}"

        # Inject realistic fraud patterns into the stream:
        if i == 15 or i == 16 or i == 17:
            # Velocity burst for customer 105
            cust = "CUST-105"
            base_time += timedelta(seconds=12)
        elif i == 25:
            # Impossible travel: same customer jumps to London within 8 minutes
            cust = "CUST-105"
            loc = cities[3] # London
            base_time += timedelta(minutes=8)
        elif i == 35:
            # Unusual Amount Spike
            amt = 185000.0
            cust = "CUST-108"
            base_time += timedelta(minutes=30)
        else:
            base_time += timedelta(minutes=random.randint(2, 10))

        records.append({
            "cc_num": cust,
            "amt": amt,
            "trans_date_trans_time": base_time.strftime("%Y-%m-%d %H:%M:%S"),
            "merchant": random.choice(merchants),
            "city": loc["city"],
            "state": loc["state"],
            "lat": loc["lat"],
            "long": loc["long"],
        })

    return records


def ingest_records(records: List[Dict[str, Any]]):
    init_db()
    db = SessionLocal()

    total = len(records)
    flagged_count = 0
    rule_triggers = {}
    start_time = time.time()

    print(f"\n=======================================================")
    print(f"ACENTRA RULE ENGINE: KAGGLE DATASET INGESTION PIPELINE")
    print(f"Total Transactions to Process: {total}")
    print(f"=======================================================\n")

    try:
        for idx, raw in enumerate(records, start=1):
            tx = parse_kaggle_row(raw, idx)
            cust_id = tx["customer_id"]

            # Query recent history for stateful rules (velocity, impossible geo)
            from sqlalchemy import desc
            history_rows = (
                db.query(TransactionDB)
                .filter(TransactionDB.customer_id == cust_id)
                .order_by(desc(TransactionDB.timestamp))
                .limit(20)
                .all()
            )
            history = [h.to_dict() for h in history_rows]

            # Evaluate via Rule Engine
            eval_result = engine.evaluate_all(tx, history)

            is_flagged = eval_result.is_flagged or eval_result.risk_level in ("HIGH", "CRITICAL")
            review_status = "FLAGGED" if is_flagged else "CLEARED"

            if is_flagged:
                flagged_count += 1

            for flag in eval_result.triggered_rules:
                rule_triggers[flag.rule_code] = rule_triggers.get(flag.rule_code, 0) + 1

            # Check AWS Alert condition
            aws_sent = False
            aws_msg = None
            if notifier.should_alert(eval_result.composite_risk_score, eval_result.risk_level):
                alert_receipt = notifier.dispatch_alert(
                    {**tx, "risk_score": eval_result.composite_risk_score, "risk_level": eval_result.risk_level},
                    [{"rule_code": f.rule_code, "reason": f.reason} for f in eval_result.triggered_rules],
                )
                aws_sent = alert_receipt.get("delivered", False)
                aws_msg = alert_receipt.get("message_id")

            # Persist Transaction
            db_tx = TransactionDB(
                transaction_id=tx["transaction_id"],
                timestamp=tx["timestamp"],
                customer_id=tx["customer_id"],
                amount=tx["amount"],
                merchant=tx["merchant"],
                location=tx["location"],
                device=tx["device"],
                payment_method=tx["payment_method"],
                channel=tx["channel"],
                timing="",
                risk_score=eval_result.composite_risk_score,
                risk_level=eval_result.risk_level,
                is_flagged=is_flagged,
                review_status=review_status,
                decision=eval_result.decision,
                prediction="FRAUD" if is_flagged else "LEGITIMATE",
                aws_alert_sent=aws_sent,
                aws_message_id=aws_msg,
            )
            db.add(db_tx)
            db.flush()

            # Persist Flags
            import json
            for f in eval_result.triggered_rules:
                db_flag = FraudFlagDB(
                    transaction_id=tx["transaction_id"],
                    rule_code=f.rule_code,
                    rule_name=f.rule_name,
                    severity=f.severity,
                    reason=f.reason,
                    metrics_json=json.dumps(f.metrics or {}),
                )
                db.add(db_flag)

            db.commit()

            flag_str = "[FLAGGED]" if is_flagged else "[CLEARED]"
            print(
                f"[{idx:03d}/{total:03d}] {tx['transaction_id']} | "
                f"Amount: INR {tx['amount']:>9,.2f} | Cust: {cust_id:<10} | "
                f"Risk: {eval_result.composite_risk_score*100:>5.1f}% ({eval_result.risk_level:<8}) | "
                f"Flags: {len(eval_result.triggered_rules)} {flag_str}"
            )

        elapsed = time.time() - start_time
        throughput = total / elapsed if elapsed > 0 else total

        print("\n-------------------------------------------------------")
        print("INGESTION & RULE EVALUATION SUMMARY")
        print("-------------------------------------------------------")
        print(f"Total Ingested:         {total} transactions")
        print(f"Total Flagged for Triage: {flagged_count} ({flagged_count/total*100:.1f}%)")
        print(f"Elapsed Time:           {elapsed:.2f} seconds")
        print(f"Evaluation Throughput:  {throughput:.1f} tx/sec")
        print("\nTriggered Rules Breakdown:")
        for code, count in rule_triggers.items():
            print(f"  - {code:<25}: {count} trigger(s)")
        print("-------------------------------------------------------\n")

    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Ingest Kaggle fraud datasets into Acentra Rule Engine.")
    parser.add_argument("--file", type=str, help="Path to local Kaggle CSV dataset")
    parser.add_argument("--limit", type=int, default=100, help="Maximum number of rows to ingest (default: 100)")
    parser.add_argument("--benchmark", type=int, default=30, help="Run built-in Kaggle-schema benchmark (default: 30)")

    args = parser.parse_args()

    if args.file and os.path.exists(args.file):
        import pandas as pd
        print(f"Loading local dataset from: {args.file}")
        df = pd.read_csv(args.file, nrows=args.limit)
        records = df.to_dict(orient="records")
        ingest_records(records)
    else:
        print(f"Running built-in Kaggle realistic transaction stream ({args.benchmark} rows)...")
        records = generate_benchmark_kaggle_feed(count=args.benchmark)
        ingest_records(records)


if __name__ == "__main__":
    main()
