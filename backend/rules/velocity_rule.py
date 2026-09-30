from datetime import datetime, timezone
from typing import Dict, Any, List
from backend.rules.base import BaseRule, RuleResult
from backend.rules.registry import register_rule


def parse_timestamp(ts: Any) -> float:
    """Helper to convert timestamp to unix epoch seconds."""
    if isinstance(ts, (int, float)):
        return float(ts)
    if isinstance(ts, str):
        try:
            # Handle ISO string with or without Z
            clean_ts = ts.replace("Z", "+00:00")
            dt = datetime.fromisoformat(clean_ts)
            return dt.timestamp()
        except Exception:
            pass
    return datetime.now(timezone.utc).timestamp()


@register_rule
class VelocityRule(BaseRule):
    rule_code = "RULE_VELOCITY"
    rule_name = "Transaction Velocity Surge"
    description = "Detects rapid authorization frequency exceeding 3 transactions per rolling 60-second window."
    weight = 1.3

    def __init__(self, window_seconds: int = 60, max_transactions: int = 3):
        self.window_seconds = window_seconds
        self.max_transactions = max_transactions

    def get_parameters(self) -> Dict[str, Any]:
        return {
            "window_seconds": self.window_seconds,
            "max_transactions": self.max_transactions,
        }

    def update_parameters(self, params: Dict[str, Any]) -> None:
        if "window_seconds" in params:
            self.window_seconds = int(params["window_seconds"])
        if "max_transactions" in params:
            self.max_transactions = int(params["max_transactions"])

    def evaluate(self, transaction: Dict[str, Any], history: List[Dict[str, Any]]) -> RuleResult:
        current_time = parse_timestamp(transaction.get("timestamp"))
        customer_id = transaction.get("customer_id")

        recent_txs = []
        for prev in history:
            # Match customer
            if customer_id and prev.get("customer_id") != customer_id:
                continue

            prev_time = parse_timestamp(prev.get("timestamp"))
            delta = current_time - prev_time

            # Consider transactions within window (delta >= 0 ensures we don't look ahead)
            if 0 <= delta <= self.window_seconds:
                recent_txs.append(prev)

        # Count includes the current transaction (+ 1)
        total_in_window = len(recent_txs) + 1

        if total_in_window >= self.max_transactions:
            # Burst severity calculation
            if total_in_window >= 5:
                severity = "CRITICAL"
                score = 0.95
            elif total_in_window >= 4:
                severity = "CRITICAL"
                score = 0.85
            else:
                severity = "WARNING"
                score = 0.70

            return RuleResult(
                rule_code=self.rule_code,
                rule_name=self.rule_name,
                triggered=True,
                risk_score=score,
                severity=severity,
                reason=f"Velocity Surge: {total_in_window} transactions initiated within {self.window_seconds}s (limit: {self.max_transactions}).",
                metrics={
                    "transactions_in_window": total_in_window,
                    "window_seconds": self.window_seconds,
                    "threshold": self.max_transactions,
                },
            )

        return RuleResult(
            rule_code=self.rule_code,
            rule_name=self.rule_name,
            triggered=False,
            risk_score=0.0,
            metrics={"transactions_in_window": total_in_window, "window_seconds": self.window_seconds},
        )
