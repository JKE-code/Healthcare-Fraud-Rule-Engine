from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.db.session import get_db
from backend.db.models import ReviewAuditLogDB
from backend.models import AuditLogListResponse

router = APIRouter(prefix="/api/audit-logs", tags=["audit"])


@router.get("", response_model=AuditLogListResponse)
async def list_audit_logs(
    transaction_id: Optional[str] = Query(None, description="Filter logs by transaction ID"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """
    Returns the persistent chronological audit trail of all reviewer decisions,
    including timestamps, reviewer IDs, previous status, and notes.
    """
    query = db.query(ReviewAuditLogDB)
    if transaction_id:
        query = query.filter(ReviewAuditLogDB.transaction_id == transaction_id)

    total = query.count()
    logs = query.order_by(desc(ReviewAuditLogDB.id)).limit(limit).all()

    return {
        "logs": [l.to_dict() for l in logs],
        "total": total,
    }


@router.get("/export")
async def export_audit_logs(db: Session = Depends(get_db)):
    """
    Returns full downloadable compliance export of all reviewer audit logs.
    """
    logs = db.query(ReviewAuditLogDB).order_by(desc(ReviewAuditLogDB.id)).all()
    return {
        "export_id": "AUDIT-EXPORT-COMPLIANCE",
        "total_records": len(logs),
        "audit_trail": [l.to_dict() for l in logs],
    }
