from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.services.aws_notifier import notifier

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


class AlertTestRequest(BaseModel):
    recipient_email: Optional[str] = None
    topic_arn: Optional[str] = None
    amount: float = Field(default=95000.0, description="Test transaction amount")
    risk_score: float = Field(default=0.92, description="Test composite risk score")
    rule_code: str = Field(default="RULE_IMPOSSIBLE_LOCATION", description="Simulated triggered rule")
    reason: str = Field(
        default="Simulated velocity jump: Mumbai to London within 12 minutes (Speed: 3,420 km/h)",
        description="Simulated alert justification",
    )


@router.get("/status")
async def get_alert_service_status() -> Dict[str, Any]:
    """
    Returns the real-time operational status of AWS SES (email) and
    AWS SNS (topic/SMS) notification pipelines, distinguishing between
    live AWS dispatch and sandbox mock emulation.
    """
    return notifier.get_service_status()


@router.post("/test")
async def test_alert_dispatch(payload: AlertTestRequest) -> Dict[str, Any]:
    """
    Manual Verification Endpoint:
    Allows evaluators and security analysts to test AWS SES email and
    AWS SNS topic/SMS notification delivery on demand with custom test parameters.
    """
    sample_tx = {
        "transaction_id": "TX-AWS-TEST-001",
        "customer_id": "CUST-AUDIT",
        "amount": payload.amount,
        "risk_score": payload.risk_score,
        "risk_level": "CRITICAL" if payload.risk_score >= 0.85 else "HIGH",
        "location": "London / Mumbai",
    }
    sample_flags = [
        {
            "rule_code": payload.rule_code,
            "reason": payload.reason,
        }
    ]

    receipt = notifier.dispatch_alert(sample_tx, sample_flags)
    return {
        "status": "success",
        "message": "AWS SES/SNS alert test successfully processed.",
        "receipt": receipt,
    }
