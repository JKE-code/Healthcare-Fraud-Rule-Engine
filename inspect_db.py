"""
Quick Database Inspector for Acentra Fraud Rule Engine.
Run this script during evaluator demo to visually inspect SQLite database records:
    python inspect_db.py
"""
import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from backend.db.session import SessionLocal
from backend.db.models import TransactionDB, FraudFlagDB, ReviewAuditLogDB


def inspect():
    db = SessionLocal()
    try:
        print("\n" + "=" * 80)
        print("ACENTRA FRAUD ENGINE — PERSISTENT DATABASE INSPECTION (SQLite)")
        print("=" * 80)

        txs = db.query(TransactionDB).order_by(TransactionDB.timestamp.desc()).limit(10).all()
        print(f"\n[1] LATEST TRANSACTIONS ({len(txs)} shown):")
        print(f"{'TX ID':<14} | {'AMOUNT':<10} | {'MERCHANT':<16} | {'RISK':<8} | {'STATUS':<9} | {'AWS ALERT'}")
        print("-" * 80)
        for t in txs:
            aws_flag = "SENT (SES/SNS)" if t.aws_alert_sent else "No"
            print(f"{t.transaction_id:<14} | INR {t.amount:<7,.0f} | {t.merchant[:15]:<16} | {t.risk_level:<8} | {t.review_status:<9} | {aws_flag}")

        flags = db.query(FraudFlagDB).order_by(FraudFlagDB.id.desc()).limit(10).all()
        print(f"\n[2] TRIGGERED FRAUD FLAGS ({len(flags)} shown):")
        print(f"{'FLAG ID':<8} | {'TX ID':<14} | {'RULE CODE':<24} | {'SEVERITY':<8} | {'REASON'}")
        print("-" * 80)
        for f in flags:
            print(f"{f.id:<8} | {f.transaction_id:<14} | {f.rule_code:<24} | {f.severity:<8} | {f.reason[:40]}")

        logs = db.query(ReviewAuditLogDB).order_by(ReviewAuditLogDB.id.desc()).limit(5).all()
        print(f"\n[3] REVIEWER AUDIT TRAIL LOGS ({len(logs)} shown):")
        print(f"{'LOG ID':<8} | {'TX ID':<14} | {'ACTION':<16} | {'REVIEWER':<16} | {'TIMESTAMP'}")
        print("-" * 80)
        for l in logs:
            print(f"{l.id:<8} | {l.transaction_id:<14} | {l.action:<16} | {l.reviewer:<16} | {l.timestamp[:19]}")

        print("\n" + "=" * 80 + "\n")
    finally:
        db.close()


if __name__ == "__main__":
    inspect()
