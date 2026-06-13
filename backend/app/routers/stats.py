from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Query

from app.db.supabase import get_supabase
from app.models.schemas import StatsResponse

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("", response_model=StatsResponse)
def get_stats(created_by: Optional[str] = Query(default=None, alias="createdBy")) -> StatsResponse:
    supabase = get_supabase()
    # use new complaint statuses from production schema
    query = supabase.table("complaints").select("status")
    if created_by:
        query = query.eq("created_by", created_by)
    response = query.execute()
    data = response.data or []

    active_count = sum(1 for item in data if item["status"] not in ("done", "resolved", "cancelled"))
    resolved_count = sum(1 for item in data if item["status"] in ("done", "resolved"))
    assigned_count = sum(1 for item in data if item["status"] == "vendor_assigned")

    return {
        "stats": [
            {"label": "Active Complaints", "value": active_count},
            {"label": "Resolved", "value": resolved_count},
            {"label": "Assigned", "value": assigned_count},
        ]
    }
