from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query, status

from app.core.config import settings
from app.core.security import generate_otp, hash_otp, verify_otp
from app.db.supabase import get_supabase
from app.models.schemas import (
    AssignVendorRequest,
    CloseComplaintRequest,
    Complaint,
    ComplaintCreate,
    ReportIssueRequest,
    VerifyOtpRequest,
)

router = APIRouter(prefix="/complaints", tags=["complaints"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _serialize_complaint(row: Dict[str, Any]) -> Dict[str, Any]:
    timeline_items = row.get("complaint_timeline") or []
    timeline = [
        {
            "label": item.get("label"),
            "time": item.get("time"),
            "remarks": item.get("remarks"),
        }
        for item in timeline_items
    ]

    return {
        "id": row.get("complaint_code"),
        "room": row.get("room"),
        "category": row.get("category"),
        "title": row.get("title"),
        "description": row.get("description"),
        "status": row.get("status"),
        "priority": row.get("priority"),
        "assignedTo": row.get("assigned_vendor"),
        "timeline": timeline,
        "createdAt": row.get("created_at"),
        "updatedAt": row.get("updated_at"),
        "workCompleted": row.get("work_completed"),
        "otpVerified": row.get("otp_verified"),
        "lastReminderSent": row.get("last_reminder_sent"),
        "closeReason": row.get("close_reason"),
    }


def _append_timeline(complaint_id: str, label: str, remarks: Optional[str] = None) -> None:
    supabase = get_supabase()
    payload = {
        "complaint_id": complaint_id,
        "label": label,
        "time": _now_iso(),
        "remarks": remarks,
    }
    supabase.table("complaint_timeline").insert(payload).execute()


def _get_complaint_row(complaint_code: str) -> Dict[str, Any]:
    supabase = get_supabase()
    response = (
        supabase.table("complaints")
        .select(
            "id, complaint_code, room, category, title, description, status, priority, "
            "assigned_vendor, created_at, updated_at, work_completed, otp_verified, "
            "last_reminder_sent, close_reason, otp_hash, otp_expires_at, "
            "complaint_timeline(label,time,remarks)"
        )
        .eq("complaint_code", complaint_code)
        .limit(1)
        .execute()
    )

    data = response.data or []
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
    return data[0]


def _generate_complaint_code() -> str:
    supabase = get_supabase()
    for _ in range(5):
        code = f"CMP-{datetime.now(timezone.utc).year % 100:02d}{datetime.now(timezone.utc).month:02d}-{datetime.now(timezone.utc).day:02d}{datetime.now(timezone.utc).hour:02d}{datetime.now(timezone.utc).minute:02d}{datetime.now(timezone.utc).second:02d}"
        existing = (
            supabase.table("complaints")
            .select("id")
            .eq("complaint_code", code)
            .limit(1)
            .execute()
        )
        if not existing.data:
            return code
    raise HTTPException(status_code=500, detail="Unable to allocate complaint code")


@router.get("", response_model=List[Complaint])
def list_complaints(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    assigned_to: Optional[str] = Query(default=None, alias="assignedTo"),
) -> List[Complaint]:
    supabase = get_supabase()
    query = (
        supabase.table("complaints")
        .select(
            "complaint_code, room, category, title, description, status, priority, "
            "assigned_vendor, created_at, updated_at, work_completed, otp_verified, "
            "last_reminder_sent, close_reason, complaint_timeline(label,time,remarks)"
        )
        .order("updated_at", desc=True)
    )

    if status_filter:
        statuses = [item.strip() for item in status_filter.split(",") if item.strip()]
        if statuses:
            query = query.in_("status", statuses)

    if assigned_to:
        query = query.eq("assigned_vendor", assigned_to)

    data = query.execute().data or []
    return [_serialize_complaint(item) for item in data]


@router.get("/{complaint_code}", response_model=Complaint)
def get_complaint(complaint_code: str) -> Complaint:
    row = _get_complaint_row(complaint_code)
    return _serialize_complaint(row)


@router.post("", response_model=Complaint, status_code=status.HTTP_201_CREATED)
def create_complaint(payload: ComplaintCreate) -> Complaint:
    supabase = get_supabase()
    now = _now_iso()
    complaint_code = _generate_complaint_code()
    insert_payload = {
        "complaint_code": complaint_code,
        "room": payload.room,
        "category": payload.category,
        "title": payload.title,
        "description": payload.description,
        "priority": payload.priority,
        "status": "Pending",
        "created_at": now,
        "updated_at": now,
        "work_completed": False,
        "otp_verified": False,
    }

    response = supabase.table("complaints").insert(insert_payload).execute()
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create complaint")

    complaint_id = response.data[0]["id"]
    _append_timeline(complaint_id, "Complaint registered")

    row = _get_complaint_row(complaint_code)
    return _serialize_complaint(row)


@router.post("/{complaint_code}/assign", response_model=Complaint)
def assign_vendor(complaint_code: str, payload: AssignVendorRequest) -> Complaint:
    supabase = get_supabase()
    now = _now_iso()
    row = _get_complaint_row(complaint_code)

    response = (
        supabase.table("complaints")
        .update(
            {
                "assigned_vendor": payload.vendor,
                "status": "Assigned",
                "updated_at": now,
            }
        )
        .eq("id", row["id"])
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to assign vendor")

    _append_timeline(row["id"], "Vendor assigned", f"Vendor: {payload.vendor}")

    supabase.table("notifications").insert(
        {
            "title": f"{complaint_code} vendor assigned",
            "timestamp": now,
        }
    ).execute()

    updated = _get_complaint_row(complaint_code)
    return _serialize_complaint(updated)


@router.post("/{complaint_code}/mark-fixed", response_model=Complaint)
def mark_fixed(complaint_code: str) -> Complaint:
    supabase = get_supabase()
    now = _now_iso()
    row = _get_complaint_row(complaint_code)

    response = (
        supabase.table("complaints")
        .update(
            {
                "status": "Fixed",
                "work_completed": True,
                "updated_at": now,
            }
        )
        .eq("id", row["id"])
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to update complaint")

    _append_timeline(row["id"], "Work completed")
    updated = _get_complaint_row(complaint_code)
    return _serialize_complaint(updated)


@router.post("/{complaint_code}/otp")
def generate_otp_for_complaint(complaint_code: str) -> Dict[str, str]:
    supabase = get_supabase()
    row = _get_complaint_row(complaint_code)
    otp = generate_otp()
    otp_hash = hash_otp(otp)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.otp_ttl_minutes)

    response = (
        supabase.table("complaints")
        .update(
            {
                "otp_hash": otp_hash,
                "otp_expires_at": expires_at.isoformat(),
                "updated_at": _now_iso(),
            }
        )
        .eq("id", row["id"])
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to generate OTP")

    _append_timeline(row["id"], "OTP generated")
    return {"otp": otp, "expiresAt": expires_at.isoformat()}


@router.post("/{complaint_code}/verify-otp", response_model=Complaint)
def verify_complaint_otp(complaint_code: str, payload: VerifyOtpRequest) -> Complaint:
    supabase = get_supabase()
    row = _get_complaint_row(complaint_code)
    otp_hash_value = row.get("otp_hash")
    otp_expires_at = row.get("otp_expires_at")

    if not otp_hash_value or not otp_expires_at:
        raise HTTPException(status_code=400, detail="OTP has not been generated")

    if datetime.fromisoformat(otp_expires_at) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP has expired")

    if not verify_otp(payload.otp, otp_hash_value):
        raise HTTPException(status_code=400, detail="Invalid OTP")

    response = (
        supabase.table("complaints")
        .update(
            {
                "otp_verified": True,
                "otp_hash": None,
                "otp_expires_at": None,
                "updated_at": _now_iso(),
            }
        )
        .eq("id", row["id"])
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to verify OTP")

    _append_timeline(row["id"], "OTP verified")
    updated = _get_complaint_row(complaint_code)
    return _serialize_complaint(updated)


@router.post("/{complaint_code}/close", response_model=Complaint)
def close_complaint(complaint_code: str, payload: CloseComplaintRequest) -> Complaint:
    supabase = get_supabase()
    row = _get_complaint_row(complaint_code)
    now = _now_iso()

    response = (
        supabase.table("complaints")
        .update(
            {
                "status": "Closed",
                "close_reason": payload.reason,
                "updated_at": now,
            }
        )
        .eq("id", row["id"])
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to close complaint")

    _append_timeline(row["id"], "Complaint closed", payload.reason)
    updated = _get_complaint_row(complaint_code)
    return _serialize_complaint(updated)


@router.post("/{complaint_code}/remind", response_model=Complaint)
def send_reminder(complaint_code: str) -> Complaint:
    supabase = get_supabase()
    row = _get_complaint_row(complaint_code)
    last_reminder = row.get("last_reminder_sent")
    now = datetime.now(timezone.utc)

    if last_reminder:
        last_dt = datetime.fromisoformat(last_reminder)
        if now - last_dt < timedelta(hours=24):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Reminders are limited to once every 24 hours",
            )

    response = (
        supabase.table("complaints")
        .update(
            {
                "last_reminder_sent": now.isoformat(),
                "updated_at": now.isoformat(),
            }
        )
        .eq("id", row["id"])
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to send reminder")

    supabase.table("notifications").insert(
        {
            "title": f"Reminder sent for {complaint_code}",
            "timestamp": now.isoformat(),
        }
    ).execute()

    updated = _get_complaint_row(complaint_code)
    return _serialize_complaint(updated)


@router.post("/{complaint_code}/report", status_code=status.HTTP_201_CREATED)
def report_issue(complaint_code: str, payload: ReportIssueRequest) -> Dict[str, str]:
    supabase = get_supabase()
    _ = _get_complaint_row(complaint_code)
    now = _now_iso()

    supabase.table("notifications").insert(
        {
            "title": f"Report submitted for {complaint_code}: {payload.reason}",
            "timestamp": now,
        }
    ).execute()

    return {"status": "reported"}
