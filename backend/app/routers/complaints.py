from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query, status

from app.db.supabase import get_supabase
from app.models.schemas import (
    AssignVendorRequest,
    CloseComplaintRequest,
    Complaint,
    ComplaintCreate,
    ReportIssueRequest,
)

router = APIRouter(prefix="/complaints", tags=["complaints"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_system_user_id(supabase: Any) -> str:
    # Ensure a system user exists to satisfy NOT NULL foreign keys
    resp = (
        supabase.table("users").select("id").eq("firebase_uid", "__system__").limit(1).execute()
    )
    if resp.data:
        return resp.data[0]["id"]
    # create minimal system user
    insert = {
        "firebase_uid": "__system__",
        "name": "System",
        "email": "system@local",
        "role": "admin",
        "is_verified": True,
    }
    created = supabase.table("users").insert(insert).execute()
    if not created.data:
        raise HTTPException(status_code=500, detail="Failed to ensure system user")
    return created.data[0]["id"]


def _get_department(supabase: Any, department_id: str) -> Dict[str, Any]:
    resp = supabase.table("departments").select("id, name").eq("id", department_id).limit(1).execute()
    if not resp.data:
        raise HTTPException(status_code=400, detail="Department not found")
    return resp.data[0]


def _serialize_complaint(
    row: Dict[str, Any],
    history: List[Dict[str, Any]],
    assignment: Optional[Dict[str, Any]],
    department_name: Optional[str],
    vendor_name: Optional[str],
) -> Dict[str, Any]:
    timeline = [
        {"label": h.get("new_status") or h.get("remarks"), "time": h.get("created_at"), "remarks": h.get("remarks")} for h in history
    ]

    return {
        "id": row.get("complaint_no"),
        "complaintNo": row.get("complaint_no"),
        "room": row.get("location"),
        "category": department_name,
        "title": row.get("title"),
        "description": row.get("description"),
        "location": row.get("location"),
        "departmentId": row.get("department_id"),
        "status": row.get("status"),
        "priority": row.get("priority"),
        "assignedTo": vendor_name,
        "assignedVendorId": row.get("assigned_vendor_id"),
        "createdBy": row.get("created_by"),
        "cancellationReason": row.get("cancellation_reason"),
        "resolvedAt": row.get("resolved_at"),
        "cancelledAt": row.get("cancelled_at"),
        "timeline": timeline,
        "createdAt": row.get("created_at"),
        "updatedAt": row.get("updated_at"),
        "workCompleted": row.get("status") in ("done", "resolved"),
        "closeReason": row.get("cancellation_reason"),
    }


def _get_complaint_row(complaint_no: str) -> Dict[str, Any]:
    supabase = get_supabase()
    resp = supabase.table("complaints").select("*").eq("complaint_no", complaint_no).limit(1).execute()
    data = resp.data or []
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
    row = data[0]

    # fetch history
    history_resp = (
        supabase.table("complaint_status_history").select("old_status,new_status,remarks,changed_by,created_at").eq("complaint_id", row["id"]).order("created_at", desc=False).execute()
    )
    history = history_resp.data or []

    # fetch latest assignment
    assignment_resp = (
        supabase.table("complaint_assignments").select("vendor_id,assigned_at,assigned_by").eq("complaint_id", row["id"]).order("assigned_at", desc=True).limit(1).execute()
    )
    assignment = (assignment_resp.data or [None])[0]

    # department name
    dept_resp = supabase.table("departments").select("name").eq("id", row.get("department_id")).limit(1).execute()
    department_name = (dept_resp.data or [{}])[0].get("name")

    # vendor name
    vendor_name = None
    if row.get("assigned_vendor_id"):
        v = supabase.table("users").select("name").eq("id", row.get("assigned_vendor_id")).limit(1).execute()
        vendor_name = (v.data or [{}])[0].get("name")

    return {
        "row": row,
        "history": history,
        "assignment": assignment,
        "department_name": department_name,
        "vendor_name": vendor_name,
    }


def _generate_complaint_no() -> str:
    supabase = get_supabase()
    for _ in range(5):
        now = datetime.now(timezone.utc)
        code = f"CMP-{now.year % 100:02d}{now.month:02d}-{now.day:02d}{now.hour:02d}{now.minute:02d}{now.second:02d}"
        existing = supabase.table("complaints").select("id").eq("complaint_no", code).limit(1).execute()
        if not existing.data:
            return code
    raise HTTPException(status_code=500, detail="Unable to allocate complaint number")


@router.get("", response_model=List[Complaint])
def list_complaints(status_filter: Optional[str] = Query(default=None, alias="status"), assigned_to: Optional[str] = Query(default=None, alias="assignedTo")) -> List[Complaint]:
    supabase = get_supabase()
    query = supabase.table("complaints").select("*").order("updated_at", desc=True)
    if status_filter:
        statuses = [s.strip() for s in status_filter.split(",") if s.strip()]
        if statuses:
            query = query.in_("status", statuses)
    if assigned_to:
        # try to find vendor user by name
        user_resp = supabase.table("users").select("id").eq("name", assigned_to).limit(1).execute()
        if user_resp.data:
            vendor_id = user_resp.data[0]["id"]
            query = query.eq("assigned_vendor_id", vendor_id)
        else:
            # no vendor found -> return empty
            return []

    data = query.execute().data or []
    results: List[Dict[str, Any]] = []
    for item in data:
        # fetch history and assignment per complaint
        info = _get_complaint_row(item["complaint_no"])
        results.append(_serialize_complaint(info["row"], info["history"], info["assignment"], info.get("department_name"), info.get("vendor_name")))
    return results


@router.get("/{complaint_no}", response_model=Complaint)
def get_complaint(complaint_no: str) -> Complaint:
    info = _get_complaint_row(complaint_no)
    return _serialize_complaint(info["row"], info["history"], info["assignment"], info.get("department_name"), info.get("vendor_name"))


@router.post("", response_model=Complaint, status_code=status.HTTP_201_CREATED)
def create_complaint(payload: ComplaintCreate) -> Complaint:
    supabase = get_supabase()
    now = _now_iso()
    complaint_no = _generate_complaint_no()

    system_user_id = _get_system_user_id(supabase)
    dept = _get_department(supabase, payload.departmentId)

    insert_payload = {
        "complaint_no": complaint_no,
        "title": payload.title,
        "description": payload.description,
        "location": payload.location,
        "department_id": dept["id"],
        "priority": payload.priority,
        "status": "open",
        "created_by": payload.createdBy or system_user_id,
        "created_at": now,
        "updated_at": now,
    }

    response = supabase.table("complaints").insert(insert_payload).execute()
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create complaint")

    complaint_id = response.data[0]["id"]
    # add initial status history
    supabase.table("complaint_status_history").insert({
        "complaint_id": complaint_id,
        "old_status": None,
        "new_status": "open",
        "remarks": "Complaint registered",
        "changed_by": system_user_id,
    }).execute()

    info = _get_complaint_row(complaint_no)
    return _serialize_complaint(info["row"], info["history"], info["assignment"], info.get("department_name"), info.get("vendor_name"))


@router.post("/{complaint_no}/assign", response_model=Complaint)
def assign_vendor(complaint_no: str, payload: AssignVendorRequest) -> Complaint:
    supabase = get_supabase()
    now = _now_iso()
    info = _get_complaint_row(complaint_no)
    complaint_id = info["row"]["id"]

    system_user_id = _get_system_user_id(supabase)
    # find or create vendor user by name
    v_resp = supabase.table("users").select("id, name").eq("name", payload.vendor).eq("role", "vendor").limit(1).execute()
    if v_resp.data:
        vendor_id = v_resp.data[0]["id"]
    else:
        # create a vendor user stub
        stub = {
            "firebase_uid": f"vendor-{payload.vendor}-{int(datetime.now().timestamp())}",
            "name": payload.vendor,
            "email": f"{payload.vendor.replace(' ','').lower()}@example.local",
            "role": "vendor",
            "is_verified": True,
        }
        created = supabase.table("users").insert(stub).execute()
        if not created.data:
            raise HTTPException(status_code=500, detail="Failed to create vendor user")
        vendor_id = created.data[0]["id"]

    # record assignment
    supabase.table("complaint_assignments").insert({
        "complaint_id": complaint_id,
        "vendor_id": vendor_id,
        "assigned_by": system_user_id,
    }).execute()

    # update complaint
    supabase.table("complaints").update({
        "assigned_vendor_id": vendor_id,
        "status": "vendor_assigned",
        "updated_at": now,
    }).eq("id", complaint_id).execute()

    # add status history
    supabase.table("complaint_status_history").insert({
        "complaint_id": complaint_id,
        "old_status": info["row"].get("status"),
        "new_status": "vendor_assigned",
        "remarks": f"Vendor assigned: {payload.vendor}",
        "changed_by": system_user_id,
    }).execute()

    # notify (notifications require user_id)
    supabase.table("notifications").insert({
        "user_id": system_user_id,
        "title": f"{complaint_no} vendor assigned",
        "message": f"Vendor {payload.vendor} assigned to {complaint_no}",
    }).execute()

    info = _get_complaint_row(complaint_no)
    return _serialize_complaint(info["row"], info["history"], info["assignment"], info.get("department_name"), info.get("vendor_name"))


@router.post("/{complaint_no}/mark-fixed", response_model=Complaint)
def mark_fixed(complaint_no: str) -> Complaint:
    supabase = get_supabase()
    now = _now_iso()
    info = _get_complaint_row(complaint_no)
    complaint_id = info["row"]["id"]
    system_user_id = _get_system_user_id(supabase)

    supabase.table("complaints").update({
        "status": "done",
        "updated_at": now,
        "resolved_at": now,
    }).eq("id", complaint_id).execute()

    supabase.table("complaint_status_history").insert({
        "complaint_id": complaint_id,
        "old_status": info["row"].get("status"),
        "new_status": "done",
        "remarks": "Work completed",
        "changed_by": system_user_id,
    }).execute()

    info = _get_complaint_row(complaint_no)
    return _serialize_complaint(info["row"], info["history"], info["assignment"], info.get("department_name"), info.get("vendor_name"))


@router.post("/{complaint_no}/close", response_model=Complaint)
def close_complaint(complaint_no: str, payload: CloseComplaintRequest) -> Complaint:
    supabase = get_supabase()
    info = _get_complaint_row(complaint_no)
    complaint_id = info["row"]["id"]
    now = _now_iso()
    system_user_id = _get_system_user_id(supabase)

    supabase.table("complaints").update({
        "status": "cancelled",
        "cancellation_reason": payload.reason,
        "updated_at": now,
        "cancelled_at": now,
    }).eq("id", complaint_id).execute()

    supabase.table("complaint_status_history").insert({
        "complaint_id": complaint_id,
        "old_status": info["row"].get("status"),
        "new_status": "cancelled",
        "remarks": payload.reason,
        "changed_by": system_user_id,
    }).execute()

    info = _get_complaint_row(complaint_no)
    return _serialize_complaint(info["row"], info["history"], info["assignment"], info.get("department_name"), info.get("vendor_name"))


@router.post("/{complaint_no}/remind", response_model=Complaint)
def send_reminder(complaint_no: str) -> Complaint:
    supabase = get_supabase()
    info = _get_complaint_row(complaint_no)
    system_user_id = _get_system_user_id(supabase)

    supabase.table("notifications").insert({
        "user_id": system_user_id,
        "title": f"Reminder sent for {complaint_no}",
        "message": f"Reminder for complaint {complaint_no}",
    }).execute()

    info = _get_complaint_row(complaint_no)
    return _serialize_complaint(info["row"], info["history"], info["assignment"], info.get("department_name"), info.get("vendor_name"))


@router.post("/{complaint_no}/report", status_code=status.HTTP_201_CREATED)
def report_issue(complaint_no: str, payload: ReportIssueRequest) -> Dict[str, str]:
    supabase = get_supabase()
    info = _get_complaint_row(complaint_no)
    system_user_id = _get_system_user_id(supabase)

    supabase.table("notifications").insert({
        "user_id": system_user_id,
        "title": f"Report submitted for {complaint_no}: {payload.reason}",
        "message": payload.details or payload.reason,
    }).execute()

    return {"status": "reported"}
