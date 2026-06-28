from __future__ import annotations

import logging
from typing import Optional
from fastapi import APIRouter, Query, Depends, HTTPException, status

from app.db.supabase import get_supabase
from app.models.schemas import StatsResponse
from app.core.security import get_current_user

from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("", response_model=StatsResponse)
def get_stats(
    created_by: Optional[str] = Query(default=None, alias="createdBy"),
    department_id: Optional[str] = Query(default=None, alias="departmentId"),
    assigned_vendor_id: Optional[str] = Query(default=None, alias="assignedVendorId"),
    current_user: dict = Depends(get_current_user)
) -> StatsResponse:
    role = current_user.get("role")
    user_id = current_user.get("id")

    # Enforce role-based stats scope
    if current_user.get("firebase_uid") != "__system__":
        if role == "faculty":
            created_by = user_id
            department_id = None
            assigned_vendor_id = None
        elif role == "vendor":
            assigned_vendor_id = user_id
            created_by = None
            department_id = None
        elif role == "admin":
            department_id = current_user.get("department_id")
            if not department_id:
                return {
                    "stats": [
                        {"label": "Active Complaints", "value": 0},
                        {"label": "Resolved", "value": 0},
                        {"label": "Assigned", "value": 0},
                    ],
                    "avgResolutionTime": 0.0
                }
        elif role == "super_admin":
            pass
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized access to stats"
            )

    supabase = get_supabase()
    # use new complaint statuses from production schema
    query = supabase.table("complaints").select("status, created_at, resolved_at")
    if current_user.get("firebase_uid") != "__system__":
        org_id = current_user.get("organization_id")
        if org_id:
            query = query.eq("organization_id", org_id)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User profile has no associated organization context"
            )
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
                logger.error(f"Error parsing date in stats: {e}")

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
