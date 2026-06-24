from __future__ import annotations

import re
from typing import Any, List
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status

from app.db.supabase import get_supabase
from app.models.schemas import SosAlertCreate, SosAlertHistoryItem
from app.core.fcm import notify_all

router = APIRouter(prefix="/sos", tags=["sos"])


@router.post("/alert", status_code=status.HTTP_201_CREATED)
def trigger_sos_alert(payload: SosAlertCreate):
    supabase = get_supabase()

    # 1. Fetch user details to get their name
    user_resp = supabase.table("users").select("id, name").eq("id", payload.triggeredBy).limit(1).execute()
    if not user_resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user_name = user_resp.data[0]["name"]

    # 2. Insert alert into the sos_alerts table
    sos_payload = {
        "triggered_by": payload.triggeredBy,
        "location": payload.location or "Unknown Location",
        "message": f"[{payload.emergencyType.upper()}] {payload.description or ''}".strip(),
        "status": "active"
    }
    
    sos_resp = supabase.table("sos_alerts").insert(sos_payload).execute()
    if not sos_resp.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to record SOS alert")

    # 3. Insert notification for app-wide alerts
    notif_title = f"🚨 SOS: {payload.emergencyType.upper()} alert at {payload.location or 'Unknown'}"
    if payload.description:
         notif_title += f" - {payload.description}"

    alert_id = sos_resp.data[0]["id"]
    notif_message = f"Emergency triggered by {user_name}. Location: {payload.location or 'Unknown'}. Details: {payload.description or 'No details'} [SOS_ID:{alert_id}]"

    notif_resp = supabase.table("notifications").insert({
        "user_id": payload.triggeredBy,
        "title": notif_title,
        "message": notif_message
    }).execute()

    if not notif_resp.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to trigger app notification")

    # Send push notification to everyone
    notify_all(
        title=notif_title,
        body=notif_message,
        data={
            "type": "sos",
            "alertId": str(alert_id),
            "location": str(payload.location or "Unknown"),
            "triggeredBy": str(user_name)
        }
    )

    return {"status": "success", "alert": sos_resp.data[0]}


@router.get("/history", response_model=List[SosAlertHistoryItem])
def get_sos_history() -> List[SosAlertHistoryItem]:
    supabase = get_supabase()
    resp = supabase.table("sos_alerts").select("*").order("created_at", desc=True).execute()
    alerts = resp.data or []
    if not alerts:
        return []

    triggered_by_ids = list(set(alert["triggered_by"] for alert in alerts))
    user_names_by_id = {}
    user_emails_by_id = {}
    if triggered_by_ids:
        user_resp = supabase.table("users").select("id, name, email").in_("id", triggered_by_ids).execute()
        for u in (user_resp.data or []):
            user_names_by_id[u["id"]] = u["name"]
            user_emails_by_id[u["id"]] = u.get("email") or ""

    formatted = []
    for alert in alerts:
        u_id = alert.get("triggered_by")
        formatted.append(
            SosAlertHistoryItem(
                id=alert.get("id"),
                triggeredBy=u_id,
                triggeredByName=user_names_by_id.get(u_id) or "Unknown User",
                triggeredByEmail=user_emails_by_id.get(u_id) or "",
                location=alert.get("location"),
                message=alert.get("message"),
                status=alert.get("status") or "active",
                createdAt=alert.get("created_at"),
                closedAt=alert.get("closed_at")
            )
        )
    return formatted


@router.post("/{alert_id}/resolve")
def resolve_sos_alert(alert_id: str):
    supabase = get_supabase()
    
    # 1. Fetch the alert details first to match and delete notifications (both metadata tagged and older title-based ones)
    alert_resp = supabase.table("sos_alerts").select("*").eq("id", alert_id).limit(1).execute()
    if not alert_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found or failed to resolve"
        )
    alert_data = alert_resp.data[0]

    # 2. Update status of the SOS alert to resolved
    now = datetime.now(timezone.utc).isoformat()
    resp = (
        supabase.table("sos_alerts")
        .update({"status": "resolved", "closed_at": now})
        .eq("id", alert_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found or failed to resolve"
        )
        
    # 3. Delete matching notifications from database
    # Deleting via modern tag in message [SOS_ID:alert_id]
    supabase.table("notifications").delete().like("message", f"%[SOS_ID:{alert_id}]%").execute()
    
    # Deleting via fallback (title matching) for backwards compatibility
    msg = alert_data.get("message") or ""
    emergency_type = "SOS"
    description = ""
    match = re.match(r"^\[(.*?)\]\s*(.*)$", msg)
    if match:
        emergency_type = match.group(1).upper()
        description = match.group(2)
    else:
        emergency_type = "EMERGENCY"
        description = msg

    loc = alert_data.get("location") or "Unknown"
    locs = [loc]
    if loc == "Unknown Location":
        locs.append("Unknown")
    elif loc == "Unknown":
        locs.append("Unknown Location")
        
    for l in locs:
        notif_title = f"🚨 SOS: {emergency_type} alert at {l}"
        if description:
            notif_title += f" - {description}"
        supabase.table("notifications").delete().eq("title", notif_title).execute()

    return {"status": "success"}

