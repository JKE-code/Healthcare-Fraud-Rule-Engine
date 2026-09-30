import logging
from typing import Dict, Any, List, Type
from pydantic import BaseModel, Field

from backend.rules.base import BaseRule, RuleResult

logger = logging.getLogger(__name__)


class EvaluationResult(BaseModel):
    composite_risk_score: float = Field(..., ge=0.0, le=1.0)
    risk_level: str  # LOW, MEDIUM, HIGH, CRITICAL
    decision: str  # APPROVE, REVIEW, BLOCK
    prediction: str  # LEGITIMATE, FRAUD
    is_flagged: bool
    triggered_rules: List[RuleResult] = Field(default_factory=list)
    explanations: List[str] = Field(default_factory=list)


class RuleEngine:
    """
    Central Rule Engine orchestrator.
    Executes all registered rules against incoming transactions without
    requiring modifications when new rules are added.
    """
    def __init__(self):
        self._rules: Dict[str, BaseRule] = {}

    def register(self, rule: BaseRule) -> None:
        """Register a rule instance."""
        if not isinstance(rule, BaseRule):
            raise TypeError(f"Rule must inherit from BaseRule, got {type(rule)}")
        self._rules[rule.rule_code] = rule
        logger.info(f"Registered rule: [{rule.rule_code}] {rule.rule_name} (weight={rule.weight})")

    def unregister(self, rule_code: str) -> None:
        """Remove a rule by code."""
        if rule_code in self._rules:
            del self._rules[rule_code]

    def get_rules(self) -> List[Dict[str, Any]]:
        """List metadata of all currently registered rules."""
        return [
            {
                "rule_code": r.rule_code,
                "rule_name": r.rule_name,
                "description": r.description,
                "weight": r.weight,
                "enabled": r.enabled,
            }
            for r in self._rules.values()
        ]

    def evaluate_all(self, transaction: Dict[str, Any], history: List[Dict[str, Any]]) -> EvaluationResult:
        """
        Evaluates the transaction against all enabled registered rules.
        Computes composite risk score and risk levels.
        """
        triggered_results: List[RuleResult] = []
        explanations: List[str] = []

        max_risk = 0.0
        weighted_sum = 0.0
        total_weight = 0.0

        for rule in self._rules.values():
            if not rule.enabled:
                continue

            try:
                result = rule.evaluate(transaction, history)
                if result.triggered:
                    triggered_results.append(result)
                    if result.reason:
                        explanations.append(result.reason)
                    max_risk = max(max_risk, result.risk_score)
                    weighted_sum += result.risk_score * rule.weight
                    total_weight += rule.weight
            except Exception as e:
                logger.error(f"Error evaluating rule {rule.rule_code}: {e}", exc_info=True)

        # Composite score calculation:
        # Dominant trigger determines base floor (70%), sum of others contributes (30%)
        if triggered_results:
            normalized_weighted = (weighted_sum / total_weight) if total_weight > 0 else 0.0
            composite_score = min(1.0, (max_risk * 0.70) + (normalized_weighted * 0.30))
        else:
            composite_score = 0.05  # Base benign friction score

        composite_score = round(composite_score, 3)

        # Risk level and decision boundary
        if composite_score >= 0.75:
            risk_level = "CRITICAL"
            decision = "BLOCK"
            prediction = "FRAUD"
            is_flagged = True
        elif composite_score >= 0.50:
            risk_level = "HIGH"
            decision = "REVIEW" if composite_score < 0.70 else "BLOCK"
            prediction = "FRAUD" if decision == "BLOCK" else "LEGITIMATE"
            is_flagged = True
        elif composite_score >= 0.25:
            risk_level = "MEDIUM"
            decision = "REVIEW"
            prediction = "LEGITIMATE"
            is_flagged = len(triggered_results) > 0
        else:
            risk_level = "LOW"
            decision = "APPROVE"
            prediction = "LEGITIMATE"
            is_flagged = False

        return EvaluationResult(
            composite_risk_score=composite_score,
            risk_level=risk_level,
            decision=decision,
            prediction=prediction,
            is_flagged=is_flagged,
            triggered_rules=triggered_results,
            explanations=explanations,
        )


# Global Rule Engine singleton instance
engine = RuleEngine()


def register_rule(cls: Type[BaseRule]):
    """Decorator to automatically instantiate and register a rule class."""
    instance = cls()
    engine.register(instance)
    return cls
