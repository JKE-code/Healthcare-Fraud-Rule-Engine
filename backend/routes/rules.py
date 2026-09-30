from typing import List
from fastapi import APIRouter
from backend.models import RuleInfoResponse
from backend.rules import engine

router = APIRouter(prefix="/api/rules", tags=["rules"])


@router.get("", response_model=List[RuleInfoResponse])
async def list_rules():
    """Returns metadata for all registered rules in the engine."""
    return engine.get_rules()
