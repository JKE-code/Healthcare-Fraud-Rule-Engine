import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from sqlalchemy import Column, String, Float, Boolean, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship

from backend.db.session import Base


class TransactionDB(Base):
    __tablename__ = "transactions"

    transaction_id = Column(String(64), primary_key=True, index=True)
    timestamp = Column(String(64), nullable=False)
    customer_id = Column(String(64), index=True, default="CUST-1001")
    amount = Column(Float, nullable=False)
    currency = Column(String(8), default="INR")
    merchant = Column(String(128), nullable=False)
    location = Column(String(128), nullable=False)
    device = Column(String(128), nullable=False)
    payment_method = Column(String(64), nullable=False)
    channel = Column(String(64), default="UPI")
    timing = Column(String(32), nullable=True)

    # Risk & Evaluation
    risk_score = Column(Float, default=0.0)
    risk_level = Column(String(32), default="LOW")  # LOW, MEDIUM, HIGH, CRITICAL
    is_flagged = Column(Boolean, default=False, index=True)
    decision = Column(String(32), default="APPROVE")  # APPROVE, REVIEW, BLOCK
    prediction = Column(String(32), default="LEGITIMATE")  # LEGITIMATE, FRAUD
    fraud_probability = Column(Float, default=0.0)
    anomaly_score = Column(Float, default=0.0)

    # Reviewer Workflow
    review_status = Column(String(32), default="PENDING", index=True)  # PENDING, FLAGGED, REVIEWED, CLEARED
    reviewed_by = Column(String(128), nullable=True)
    reviewed_at = Column(String(64), nullable=True)
    reviewer_notes = Column(Text, nullable=True)

    # AWS SES / SNS Notifications
    aws_alert_sent = Column(Boolean, default=False)
    aws_message_id = Column(String(128), nullable=True)

    # JSON strings
    explanation_json = Column(Text, default="[]")
    shap_json = Column(Text, default="{}")

    # Relationships
    flags = relationship("FraudFlagDB", back_populates="transaction", cascade="all, delete-orphan")
    audit_logs = relationship("ReviewAuditLogDB", back_populates="transaction", cascade="all, delete-orphan")

    def to_dict(self) -> Dict[str, Any]:
        """Convert database record to dictionary matching the API contract."""
        try:
            explanations = json.loads(self.explanation_json) if self.explanation_json else []
        except Exception:
            explanations = []

        try:
            shap_vals = json.loads(self.shap_json) if self.shap_json else {}
        except Exception:
            shap_vals = {}

        return {
            "transaction_id": self.transaction_id,
            "timestamp": self.timestamp,
            "customer_id": self.customer_id,
            "amount": self.amount,
            "currency": self.currency,
            "merchant": self.merchant,
            "location": self.location,
            "device": self.device,
            "payment_method": self.payment_method,
            "channel": self.channel,
            "timing": self.timing,
            "risk_score": round(self.risk_score, 3),
            "risk_level": self.risk_level,
            "is_flagged": self.is_flagged,
            "is_suspicious": self.is_flagged,
            "decision": self.decision,
            "prediction": self.prediction,
            "fraud_probability": round(self.fraud_probability, 3),
            "anomaly_score": round(self.anomaly_score, 3),
            "review_status": self.review_status,
            "reviewed_by": self.reviewed_by,
            "reviewed_at": self.reviewed_at,
            "reviewer_notes": self.reviewer_notes,
            "aws_alert_sent": self.aws_alert_sent,
            "aws_message_id": self.aws_message_id,
            "explanation": explanations,
            "shap_values": shap_vals,
            "shap_available": bool(shap_vals),
            "flags": [flag.to_dict() for flag in self.flags] if self.flags else [],
        }


class FraudFlagDB(Base):
    __tablename__ = "fraud_flags"

    id = Column(Integer, primary_key=True, autoincrement=True)
    transaction_id = Column(String(64), ForeignKey("transactions.transaction_id"), index=True, nullable=False)
    rule_code = Column(String(64), nullable=False)
    rule_name = Column(String(128), nullable=False)
    severity = Column(String(32), default="WARNING")  # WARNING, CRITICAL
    reason = Column(Text, nullable=False)
    metrics_json = Column(Text, default="{}")

    transaction = relationship("TransactionDB", back_populates="flags")

    def to_dict(self) -> Dict[str, Any]:
        try:
            metrics = json.loads(self.metrics_json) if self.metrics_json else {}
        except Exception:
            metrics = {}

        return {
            "id": self.id,
            "transaction_id": self.transaction_id,
            "rule_code": self.rule_code,
            "rule_name": self.rule_name,
            "severity": self.severity,
            "reason": self.reason,
            "metrics": metrics,
        }


class ReviewAuditLogDB(Base):
    __tablename__ = "review_audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    transaction_id = Column(String(64), ForeignKey("transactions.transaction_id"), index=True, nullable=False)
    action = Column(String(64), nullable=False)  # MARKED_REVIEWED, MARKED_CLEARED
    previous_status = Column(String(32), nullable=False)
    new_status = Column(String(32), nullable=False)
    reviewer = Column(String(128), default="Fraud Analyst")
    timestamp = Column(String(64), nullable=False)
    notes = Column(Text, nullable=True)

    transaction = relationship("TransactionDB", back_populates="audit_logs")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "transaction_id": self.transaction_id,
            "action": self.action,
            "previous_status": self.previous_status,
            "new_status": self.new_status,
            "reviewer": self.reviewer,
            "timestamp": self.timestamp,
            "notes": self.notes,
        }
