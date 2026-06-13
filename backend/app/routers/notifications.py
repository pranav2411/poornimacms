from __future__ import annotations

import re
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
    raw_data = response.data or []
    
    # Check if there are any SOS notifications in the list
    has_sos = any(item.get("title", "").startswith("🚨 SOS") for item in raw_data)
    
    filtered_data = []
    if has_sos:
        # Fetch SOS alerts to cross-reference their status
        sos_resp = supabase.table("sos_alerts").select("id, status, message, location").execute()
        sos_alerts = sos_resp.data or []
        
        resolved_ids = set()
        resolved_titles = set()
        active_titles = set()
        
        for a in sos_alerts:
            alert_id = a["id"]
            status = a.get("status", "active")
            if status == "resolved":
                resolved_ids.add(alert_id)
            
            # Reconstruct title for matching old notifications
            msg = a.get("message") or ""
            emergency_type = "SOS"
            description = ""
            match = re.match(r"^\[(.*?)\]\s*(.*)$", msg)
            if match:
                emergency_type = match.group(1).upper()
                description = match.group(2)
            else:
                emergency_type = "EMERGENCY"
                description = msg

            loc = a.get("location") or "Unknown"
            locs = [loc]
            if loc == "Unknown Location":
                locs.append("Unknown")
            elif loc == "Unknown":
                locs.append("Unknown Location")
                
            for l in locs:
                title = f"🚨 SOS: {emergency_type} alert at {l}"
                if description:
                    title += f" - {description}"
                if status == "resolved":
                    resolved_titles.add(title)
                else:
                    active_titles.add(title)
        
        # Filter and delete resolved notifications
        ids_to_delete = []
        for item in raw_data:
            title = item.get("title", "")
            message = item.get("message") or ""
            
            is_sos = title.startswith("🚨 SOS")
            if is_sos:
                is_resolved = False
                
                # Check message metadata tag [SOS_ID:uuid]
                tag_match = re.search(r"\[SOS_ID:([a-fA-F0-9\-]+)\]", message)
                if tag_match:
                    sos_id = tag_match.group(1)
                    if sos_id in resolved_ids:
                        is_resolved = True
                else:
                    # Fallback to title matching
                    if title in resolved_titles and title not in active_titles:
                        is_resolved = True
                
                if is_resolved:
                    ids_to_delete.append(item["id"])
                    continue
            
            filtered_data.append(item)
            
        if ids_to_delete:
            supabase.table("notifications").delete().in_("id", ids_to_delete).execute()
    else:
        filtered_data = raw_data

    return [
        {
            "id": item["id"],
            "title": item["title"],
            "timestamp": item.get("created_at"),
        }
        for item in filtered_data
    ]
