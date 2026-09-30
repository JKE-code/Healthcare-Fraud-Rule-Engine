from typing import Dict, Any, List
from backend.rules.base import BaseRule, RuleResult
from backend.rules.registry import register_rule


@register_rule
class UnusualAmountRule(BaseRule):
    rule_code = "RULE_UNUSUAL_AMOUNT"
    rule_name = "Unusual Transaction Amount"
    description = "Flags transactions with amounts significantly deviating from the customer historical baseline or exceeding high absolute thresholds."
    weight = 1.2

    def __init__(self, hard_threshold: float = 50000.0, baseline_multiplier: float = 3.5, default_baseline: float = 2500.0):
        self.hard_threshold = hard_threshold
        self.baseline_multiplier = baseline_multiplier
        self.default_baseline = default_baseline

    def get_parameters(self) -> Dict[str, Any]:
        return {
            "hard_threshold": self.hard_threshold,
            "baseline_multiplier": self.baseline_multiplier,
            "default_baseline": self.default_baseline,
        }

    def update_parameters(self, params: Dict[str, Any]) -> None:
        if "hard_threshold" in params:
            self.hard_threshold = float(params["hard_threshold"])
        if "baseline_multiplier" in params:
            self.baseline_multiplier = float(params["baseline_multiplier"])
        if "default_baseline" in params:
            self.default_baseline = float(params["default_baseline"])

    def evaluate(self, transaction: Dict[str, Any], history: List[Dict[str, Any]]) -> RuleResult:
        try:
            amount = float(transaction.get("amount", 0.0))
        except (ValueError, TypeError):
            amount = 0.0

        customer_id = transaction.get("customer_id")

        # Compute historical average from customer's previous transactions if available
        customer_txs = [
            float(t.get("amount", 0.0))
            for t in history
            if (not customer_id or t.get("customer_id") == customer_id) and float(t.get("amount", 0.0)) > 0
        ]

        if customer_txs:
            baseline = sum(customer_txs) / len(customer_txs)
        else:
            baseline = self.default_baseline

        multiplier = (amount / baseline) if baseline > 0 else 1.0

        triggered = False
        score = 0.0
        severity = "INFO"
        reason = None

        if amount >= 150000.0 or multiplier >= 10.0:
            triggered = True
            severity = "CRITICAL"
            score = 0.95
            reason = f"Extreme Amount Spike: ₹{amount:,.2f} is {multiplier:.1f}x higher than baseline (₹{baseline:,.2f})."
        elif amount >= self.hard_threshold or multiplier >= self.baseline_multiplier:
            triggered = True
            severity = "CRITICAL" if multiplier >= 5.0 else "WARNING"
            score = 0.80 if severity == "CRITICAL" else 0.65
            reason = f"Unusual Amount Outlier: ₹{amount:,.2f} exceeds threshold ({multiplier:.1f}x customer average ₹{baseline:,.2f})."

        return RuleResult(
            rule_code=self.rule_code,
            rule_name=self.rule_name,
            triggered=triggered,
            risk_score=score,
            severity=severity,
            reason=reason,
            metrics={
                "amount": amount,
                "baseline": round(baseline, 2),
                "multiplier": round(multiplier, 2),
                "threshold": self.hard_threshold,
            },
        )
