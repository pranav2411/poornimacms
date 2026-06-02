from __future__ import annotations

from typing import List

from fastapi import APIRouter, Query

from app.db.supabase import get_supabase
from app.models.schemas import NotificationItem

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=List[NotificationItem])
def list_notifications(limit: int = Query(default=10, ge=1, le=50)) -> List[NotificationItem]:
    supabase = get_supabase()
    # notifications table in new schema has (id, user_id, title, message, is_read, created_at)
    response = (
        supabase.table("notifications")
        .select("id, title, message, created_at")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    data = response.data or []
    return [
        {
            "id": item["id"],
            "title": item["title"],
            "timestamp": item.get("created_at"),
        }
        for item in data
    ]
