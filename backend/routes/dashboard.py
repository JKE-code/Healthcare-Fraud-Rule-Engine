from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.db.session import get_db
from backend.db.models import TransactionDB
from backend.models import DashboardStatsResponse
from backend.customer_profiles import get_all_profiles, get_customer_profile

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(db: Session = Depends(get_db)):
    txs = db.query(TransactionDB).all()
    total = len(txs)

    if total == 0:
        return {
            "total_transactions": 0,
            "flagged_transactions": 0,
            "reviewed_transactions": 0,
            "cleared_transactions": 0,
            "high_risk_transactions": 0,
            "avg_risk_score": 0.0,
            "risk_distribution": {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0},
            "review_distribution": {"FLAGGED": 0, "REVIEWED": 0, "CLEARED": 0},
        }

    flagged_count = sum(1 for t in txs if t.is_flagged or t.review_status == "FLAGGED")
    reviewed_count = sum(1 for t in txs if t.review_status == "REVIEWED")
    cleared_count = sum(1 for t in txs if t.review_status == "CLEARED")
    high_risk_count = sum(1 for t in txs if t.risk_level in ("HIGH", "CRITICAL"))
    total_risk = sum(t.risk_score for t in txs)

    risk_dist = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    review_dist = {"FLAGGED": 0, "REVIEWED": 0, "CLEARED": 0}

    for t in txs:
        rl = t.risk_level or "LOW"
        risk_dist[rl] = risk_dist.get(rl, 0) + 1

        rs = t.review_status or "FLAGGED"
        review_dist[rs] = review_dist.get(rs, 0) + 1

    return {
        "total_transactions": total,
        "flagged_transactions": flagged_count,
        "reviewed_transactions": reviewed_count,
        "cleared_transactions": cleared_count,
        "high_risk_transactions": high_risk_count,
        "avg_risk_score": round((total_risk / total) * 100, 2),
        "risk_distribution": risk_dist,
        "review_distribution": review_dist,
    }


@router.get("/customers")
async def list_customers():
    return {"customers": get_all_profiles()}


@router.get("/customers/{customer_id}")
async def retrieve_customer(customer_id: str):
    return get_customer_profile(customer_id)
