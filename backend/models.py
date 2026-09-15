from pydantic import BaseModel, Field
from typing import List, Optional


class TransactionRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Transaction amount in INR, must be > 0")
    merchant: str = Field(..., min_length=1, description="Merchant name")
    location: str = Field(..., min_length=1, description="Transaction location")
    device: str = Field(..., min_length=1, description="Device identifier or type")
    payment_method: str = Field(..., min_length=1, description="Payment method (e.g. CARD, UPI)")
    customer_id: Optional[str] = Field("CUST-1001", description="Customer profile ID")
    channel: Optional[str] = Field("UPI", description="Transaction channel (UPI, CREDIT_CARD, DEBIT_CARD)")


class TransactionResponse(BaseModel):
    transaction_id: str
    timestamp: str
    amount: float
    merchant: str
    location: str
    device: str
    payment_method: str
    customer_id: Optional[str] = "CUST-1001"
    channel: Optional[str] = "UPI"
    fraud_probability: float
    anomaly_score: float
    risk_score: float
    risk_level: str
    is_suspicious: bool
    prediction: str
    decision: Optional[str] = "APPROVE"  # APPROVE, REVIEW, BLOCK
    explanation: List[str]


class TransactionListResponse(BaseModel):
    transactions: List[TransactionResponse]
    total: int


class HealthResponse(BaseModel):
    status: str
    service: str


class DashboardStatsResponse(BaseModel):
    total_transactions: int
    fraud_detected: int
    high_risk_transactions: int
    avg_risk_score: float
    risk_distribution: dict
    prediction_distribution: dict
