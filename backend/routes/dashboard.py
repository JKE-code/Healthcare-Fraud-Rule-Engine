from fastapi import APIRouter
from backend.models import DashboardStatsResponse
from backend.store import get_stats

from backend.customer_profiles import get_all_profiles, get_customer_profile

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats():
    return get_stats()


@router.get("/customers")
async def list_customers():
    return {"customers": get_all_profiles()}


@router.get("/customers/{customer_id}")
async def retrieve_customer(customer_id: str):
    return get_customer_profile(customer_id)
