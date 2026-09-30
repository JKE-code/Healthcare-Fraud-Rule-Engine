from typing import List
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.models import RuleInfoResponse, RuleUpdateRequest, RuleAnalyticsResponse
from backend.rules import engine

router = APIRouter(prefix="/api/rules", tags=["rules"])


@router.get("", response_model=List[RuleInfoResponse])
async def list_rules():
    """Returns metadata and configurable parameters for all registered rules."""
    return engine.get_rules()


@router.patch("/{rule_code}", response_model=RuleInfoResponse)
async def update_rule_configuration(rule_code: str, payload: RuleUpdateRequest):
    """
    Dynamic Rule Configuration (Hot-Reload):
    Allows reviewers and admins to adjust rule thresholds (e.g. velocity count,
    speed limit, amount multiplier) or enable/disable rules at runtime without
    server restart or redeployment.
    """
    try:
        updated = engine.update_rule(
            rule_code=rule_code,
            enabled=payload.enabled,
            weight=payload.weight,
            parameters=payload.parameters,
        )
        return updated
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Rule '{rule_code}' not found")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/analytics", response_model=List[RuleAnalyticsResponse])
async def get_rule_analytics(db: Session = Depends(get_db)):
    """
    Returns rule trigger analytics and false-positive triage rates computed
    from persistent SQLite records.
    """
    return engine.get_rule_analytics(db)
