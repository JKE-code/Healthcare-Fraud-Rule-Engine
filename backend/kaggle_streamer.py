"""
Kaggle Dataset Streamer & Reader.
Reads genuine credit card transaction records from dataset/kaggle_credit_card_fraud.csv
and serves them for real-time rule engine evaluation and live console streaming.
"""
import os
import csv
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_FILE = os.path.join(os.path.dirname(_DIR), "dataset", "kaggle_credit_card_fraud.csv")

_kaggle_records: List[Dict[str, Any]] = []
_kaggle_index: int = 0


def load_kaggle_dataset() -> List[Dict[str, Any]]:
    global _kaggle_records
    if _kaggle_records:
        return _kaggle_records

    if not os.path.exists(DATASET_FILE):
        return []

    records = []
    try:
        with open(DATASET_FILE, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                records.append(row)
        _kaggle_records = records
    except Exception as e:
        print(f"Error loading Kaggle dataset from {DATASET_FILE}: {e}")

    return _kaggle_records


def get_next_kaggle_transaction() -> Optional[Dict[str, Any]]:
    """Returns the next sequential authentic transaction from the Kaggle dataset."""
    global _kaggle_index
    records = load_kaggle_dataset()
    if not records:
        return None

    row = records[_kaggle_index % len(records)]
    _kaggle_index += 1

    city = row.get("city", "Mumbai")
    state = row.get("state", "MH")
    loc_str = f"{city}, {state}" if state else city

    amt = 100.0
    try:
        amt = float(row.get("amt", 100.0))
    except (ValueError, TypeError):
        pass

    return {
        "customer_id": row.get("cc_num", "CUST-KAG-001"),
        "amount": amt,
        "merchant": row.get("merchant", "Retail POS"),
        "location": loc_str,
        "device": "mobile_app",
        "payment_method": "CARD",
        "channel": "KAGGLE_DATASET",
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "is_fraud_ground_truth": bool(int(row.get("is_fraud", 0))),
    }


def get_kaggle_dataset_info() -> Dict[str, Any]:
    records = load_kaggle_dataset()
    return {
        "dataset_name": "Credit Card Transactions Fraud Detection",
        "source": "Kaggle (kartik2112/fraud-detection)",
        "file_path": DATASET_FILE,
        "total_records": len(records),
        "available": len(records) > 0,
        "current_stream_index": _kaggle_index,
    }
