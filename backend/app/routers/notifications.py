from __future__ import annotations

from typing import List

from fastapi import APIRouter, Query

from app.db.supabase import get_supabase
from app.models.schemas import NotificationItem

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=List[NotificationItem])
def list_notifications(limit: int = Query(default=10, ge=1, le=50)) -> List[NotificationItem]:
    supabase = get_supabase()
    response = (
        supabase.table("notifications")
        .select("id, title, timestamp")
        .order("timestamp", desc=True)
        .limit(limit)
        .execute()
    )
    data = response.data or []
    return [
        {
            "id": item["id"],
            "title": item["title"],
            "timestamp": item["timestamp"],
        }
        for item in data
    ]
