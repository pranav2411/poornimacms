from __future__ import annotations

from fastapi import APIRouter

from app.db.supabase import get_supabase
from app.models.schemas import StatsResponse

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("", response_model=StatsResponse)
def get_stats() -> StatsResponse:
    supabase = get_supabase()
    response = supabase.table("complaints").select("status, otp_verified").execute()
    data = response.data or []

    active_count = sum(1 for item in data if item["status"] != "Closed")
    resolved_count = sum(1 for item in data if item["status"] == "Closed")
    pending_otp = sum(
        1 for item in data if item["status"] == "Fixed" and not item.get("otp_verified")
    )

    return {
        "stats": [
            {"label": "Active Complaints", "value": active_count},
            {"label": "Resolved", "value": resolved_count},
            {"label": "Pending OTP", "value": pending_otp},
        ]
    }
