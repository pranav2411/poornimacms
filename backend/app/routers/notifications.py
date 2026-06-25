from __future__ import annotations

import re
from typing import List, Optional

from fastapi import APIRouter, Query, HTTPException, Depends, status

from app.db.supabase import get_supabase
from app.models.schemas import NotificationItem, RegisterFCMTokenRequest
from app.core.security import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=List[NotificationItem])
def list_notifications(
    user_id: Optional[str] = Query(default=None, alias="userId"),
    limit: int = Query(default=10, ge=1, le=50),
    current_user: dict = Depends(get_current_user)
) -> List[NotificationItem]:
    is_super = current_user.get("role") == "super_admin" or current_user.get("firebase_uid") == "__system__"
    if not is_super:
        # Normal users can only list their own notifications
        user_id = current_user.get("id")

    supabase = get_supabase()
    query = supabase.table("notifications").select("id, title, message, created_at")
    if user_id:
        query = query.eq("user_id", user_id)
    response = (
        query.order("created_at", desc=True)
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


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    supabase = get_supabase()
    is_super = current_user.get("role") == "super_admin" or current_user.get("firebase_uid") == "__system__"
    
    if not is_super:
        # Verify ownership of the notification
        notif_resp = supabase.table("notifications").select("user_id").eq("id", notification_id).limit(1).execute()
        if notif_resp.data:
            if notif_resp.data[0].get("user_id") != current_user.get("id"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot delete notifications belonging to other users"
                )

    supabase.table("notifications").delete().eq("id", notification_id).execute()
    return {"status": "success"}


@router.post("/register-token")
def register_fcm_token(
    payload: RegisterFCMTokenRequest,
    current_user: dict = Depends(get_current_user)
):
    supabase = get_supabase()
    is_super = current_user.get("role") == "super_admin" or current_user.get("firebase_uid") == "__system__"

    if not is_super:
        # Users can only register tokens for themselves
        if payload.userId != current_user.get("id"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot register FCM token for another user"
            )

    # Check if user exists in db
    user_check = supabase.table("users").select("id").eq("id", payload.userId).limit(1).execute()
    if not user_check.data:
        raise HTTPException(status_code=404, detail="User not found")

    token_clean = payload.token.strip()
    if not token_clean:
        raise HTTPException(status_code=400, detail="Token cannot be empty")

    try:
        # Check if the token already exists for any user
        existing = supabase.table("fcm_tokens").select("id").eq("token", token_clean).execute()

        if existing.data:
            # Update user_id and updated_at
            supabase.table("fcm_tokens").update({
                "user_id": payload.userId,
                "updated_at": "now()"
            }).eq("token", token_clean).execute()
        else:
            # Insert new token
            supabase.table("fcm_tokens").insert({
                "user_id": payload.userId,
                "token": token_clean
            }).execute()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database error registering token. Ensure fcm_tokens table is created. Details: {str(e)}"
        )

    return {"status": "success"}
