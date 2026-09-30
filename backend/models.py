from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class TransactionRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Transaction amount in INR, must be > 0")
    merchant: str = Field(..., min_length=1, description="Merchant name")
    location: str = Field(..., min_length=1, description="Transaction location")
    device: str = Field(..., min_length=1, description="Device identifier or type")
    payment_method: str = Field(..., min_length=1, description="Payment method (e.g. CARD, UPI)")
    customer_id: Optional[str] = Field("CUST-1001", description="Customer profile ID")
    channel: Optional[str] = Field("UPI", description="Transaction channel (UPI, CREDIT_CARD, DEBIT_CARD)")
    timing: Optional[str] = Field(None, description="Transaction time (e.g. 14:30 or 03:00)")
    timestamp: Optional[str] = Field(None, description="Optional ISO timestamp")


class FraudFlagResponse(BaseModel):
    id: Optional[int] = None
    rule_code: str
    rule_name: str
    severity: str  # WARNING, CRITICAL
    reason: str
    metrics: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ReviewAuditLogResponse(BaseModel):
    id: Optional[int] = None
    action: str
    previous_status: str
    new_status: str
    reviewer: str
    timestamp: str
    notes: Optional[str] = None


class TransactionResponse(BaseModel):
    transaction_id: str
    timestamp: str
    amount: float
    currency: Optional[str] = "INR"
    merchant: str
    location: str
    device: str
    payment_method: str
    customer_id: Optional[str] = "CUST-1001"
    channel: Optional[str] = "UPI"
    timing: Optional[str] = None

    # Risk & Evaluation
    risk_score: float
    risk_level: str  # LOW, MEDIUM, HIGH, CRITICAL
    is_flagged: bool = False
    is_suspicious: bool = False
    decision: Optional[str] = "APPROVE"  # APPROVE, REVIEW, BLOCK
    prediction: str = "LEGITIMATE"  # LEGITIMATE, FRAUD
    fraud_probability: Optional[float] = 0.0
    anomaly_score: Optional[float] = 0.0

    # Reviewer Console Status
    review_status: str = "PENDING"  # PENDING, FLAGGED, REVIEWED, CLEARED
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    reviewer_notes: Optional[str] = None

    # AWS Alerting
    aws_alert_sent: bool = False
    aws_message_id: Optional[str] = None

    # Explanations & Flags
    explanation: List[str] = Field(default_factory=list)
    flags: List[FraudFlagResponse] = Field(default_factory=list)

    # Optional ML/SHAP compatibility fields
    shap_values: Optional[Dict[str, float]] = Field(default=None)
    shap_available: Optional[bool] = False
    model_status: Optional[str] = "rule_engine"


class TransactionListResponse(BaseModel):
    transactions: List[TransactionResponse]
    total: int


class ReviewStatusUpdateRequest(BaseModel):
    action: str = Field(..., description="Action to perform: 'REVIEWED' or 'CLEARED'")
    reviewer: Optional[str] = Field("Fraud Analyst", description="Name/ID of the reviewing analyst")
    notes: Optional[str] = Field(None, description="Triage or clearance notes")


class RuleInfoResponse(BaseModel):
    rule_code: str
    rule_name: str
    description: str
    weight: float
    enabled: bool


class DashboardStatsResponse(BaseModel):
    total_transactions: int
    flagged_transactions: int
    reviewed_transactions: int
    cleared_transactions: int
    high_risk_transactions: int
    avg_risk_score: float
    risk_distribution: Dict[str, int]
    review_distribution: Dict[str, int]
