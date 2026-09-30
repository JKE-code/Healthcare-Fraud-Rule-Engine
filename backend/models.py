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


class AgentAction(BaseModel):
    action: str = Field(..., description="APPROVE, CHALLENGE_OTP, or BLOCK")
    customer_message: Optional[str] = Field(None, description="Customer-facing message")
    analyst_case_note: Optional[str] = Field(None, description="Analyst case note for BLOCK actions")


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
    timing: Optional[str] = None
    fraud_probability: float
    anomaly_score: float
    risk_score: float
    risk_level: str
    is_suspicious: bool
    prediction: str
    decision: Optional[str] = "APPROVE"  # APPROVE, REVIEW, BLOCK
    explanation: List[str]
    # New fields from review feedback
    shap_values: Optional[Dict[str, float]] = Field(default=None, description="SHAP feature contributions")
    shap_available: Optional[bool] = Field(default=False, description="Whether SHAP explanations are available")
    model_status: Optional[str] = Field(default="mock", description="'live' or 'mock' — is the ML model loaded?")
    inference_latency_ms: Optional[float] = Field(default=None, description="Server-side inference latency in ms")
    agent_action: Optional[AgentAction] = Field(default=None, description="Agentic intervention details")


class TransactionListResponse(BaseModel):
    transactions: List[TransactionResponse]
    total: int


class HealthResponse(BaseModel):
    status: str
    service: str
    model_status: Optional[str] = Field(default=None, description="'live' or 'mock'")
    latency_benchmark: Optional[Dict[str, Any]] = Field(default=None, description="p50/p95/p99 latency stats")


class DashboardStatsResponse(BaseModel):
    total_transactions: int
    fraud_detected: int
    high_risk_transactions: int
    avg_risk_score: float
    risk_distribution: dict
    prediction_distribution: dict


class BenchmarkResponse(BaseModel):
    model_status: str
    mean_ms: float
    p50_ms: float
    p95_ms: float
    p99_ms: float
    n_requests: int
