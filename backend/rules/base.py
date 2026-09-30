from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class RuleResult(BaseModel):
    rule_code: str
    rule_name: str
    triggered: bool
    risk_score: float = Field(default=0.0, ge=0.0, le=1.0)
    severity: str = Field(default="INFO")  # INFO, WARNING, CRITICAL
    reason: Optional[str] = None
    metrics: Dict[str, Any] = Field(default_factory=dict)


class BaseRule(ABC):
    """
    Abstract Base Class for all fraud detection rules.
    Adheres to the Open-Closed Principle: New rules subclass BaseRule
    and register into the engine without modifying the core execution loop.
    """
    rule_code: str = "BASE_RULE"
    rule_name: str = "Base Rule"
    description: str = "Base rule template"
    weight: float = 1.0
    enabled: bool = True

    @abstractmethod
    def evaluate(self, transaction: Dict[str, Any], history: List[Dict[str, Any]]) -> RuleResult:
        """
        Evaluates a single transaction in the context of recent customer history.
        
        Args:
            transaction: The incoming transaction payload (amount, location, timestamp, etc.)
            history: List of recent transactions for this customer or account, newest first.
            
        Returns:
            RuleResult indicating whether the rule triggered, risk score, and reason.
        """
        pass
