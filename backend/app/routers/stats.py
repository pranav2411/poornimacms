from __future__ import annotations

from fastapi import APIRouter

from app.db.supabase import get_supabase
from app.models.schemas import StatsResponse

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("", response_model=StatsResponse)
def get_stats() -> StatsResponse:
    supabase = get_supabase()
    # use new complaint statuses from production schema
    response = supabase.table("complaints").select("status").execute()
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
