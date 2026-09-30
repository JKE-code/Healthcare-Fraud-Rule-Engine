from typing import Dict, Any, List
from backend.rules.base import BaseRule, RuleResult
from backend.rules.registry import register_rule


@register_rule
class NewDeviceHighValueRule(BaseRule):
    """
    Extensibility demonstration:
    Added to demonstrate that new rules can be registered dynamically
    without modifying the RuleEngine core execution code.
    """
    rule_code = "RULE_NEW_DEVICE"
    rule_name = "Unrecognized Device on High Value Transaction"
    description = "Intercepts transactions originating from a new device fingerprint when amount exceeds ₹15,000."
    weight = 1.0

    def evaluate(self, transaction: Dict[str, Any], history: List[Dict[str, Any]]) -> RuleResult:
        device = str(transaction.get("device", "")).lower()
        amount = float(transaction.get("amount", 0.0))

        # Check if device is marked as 'new_device' or unknown
        is_new_device = "new" in device or "unknown" in device or "emulator" in device

        if is_new_device and amount > 15000.0:
            return RuleResult(
                rule_code=self.rule_code,
                rule_name=self.rule_name,
                triggered=True,
                risk_score=0.70,
                severity="WARNING",
                reason=f"New Device Mismatch: ₹{amount:,.2f} charged from unverified device '{device}'.",
                metrics={"device": device, "amount": amount},
            )

        return RuleResult(
            rule_code=self.rule_code,
            rule_name=self.rule_name,
            triggered=False,
            risk_score=0.0,
            metrics={"device": device},
        )
