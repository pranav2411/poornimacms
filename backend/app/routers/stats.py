from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Query

from app.db.supabase import get_supabase
from app.models.schemas import StatsResponse

from datetime import datetime

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("", response_model=StatsResponse)
def get_stats(
    created_by: Optional[str] = Query(default=None, alias="createdBy"),
    department_id: Optional[str] = Query(default=None, alias="departmentId"),
    assigned_vendor_id: Optional[str] = Query(default=None, alias="assignedVendorId"),
) -> StatsResponse:
    supabase = get_supabase()
    # use new complaint statuses from production schema
    query = supabase.table("complaints").select("status, created_at, resolved_at")
    if created_by:
        query = query.eq("created_by", created_by)
    if department_id:
        query = query.eq("department_id", department_id)
    if assigned_vendor_id:
        query = query.eq("assigned_vendor_id", assigned_vendor_id)
    response = query.execute()
    data = response.data or []

    active_count = sum(1 for item in data if item["status"] not in ("done", "resolved", "cancelled"))
    resolved_count = sum(1 for item in data if item["status"] in ("done", "resolved"))
    assigned_count = sum(1 for item in data if item["status"] == "vendor_assigned")

    # Calculate average resolution time
    resolved_complaints = [
        item for item in data
        if item["status"] in ("done", "resolved") and item.get("created_at") and item.get("resolved_at")
    ]

    avg_resolution_time = 0.0
    if resolved_complaints:
        total_seconds = 0.0
        parsed_count = 0
        for item in resolved_complaints:
            try:
                created = datetime.fromisoformat(item["created_at"].replace("Z", "+00:00"))
                resolved = datetime.fromisoformat(item["resolved_at"].replace("Z", "+00:00"))
                duration = (resolved - created).total_seconds()
                if duration > 0:
                    total_seconds += duration
                    parsed_count += 1
            except Exception as e:
                print(f"Error parsing date in stats: {e}")

        if parsed_count > 0:
            avg_resolution_time = round((total_seconds / parsed_count) / 3600.0, 1)

    return {
        "stats": [
            {"label": "Active Complaints", "value": active_count},
            {"label": "Resolved", "value": resolved_count},
            {"label": "Assigned", "value": assigned_count},
        ],
        "avgResolutionTime": avg_resolution_time
    }
