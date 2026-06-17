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
    MarkFixedRequest,
    ComplaintUpdate,
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
    creator_name: Optional[str] = None,
    images: Optional[List[str]] = None,
    fix_images: Optional[List[str]] = None,
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
        "createdByName": creator_name or "Faculty User",
        "images": images or [],
        "fixImages": fix_images or [],
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

    # creator name
    creator_name = None
    if row.get("created_by"):
        c = supabase.table("users").select("name").eq("id", row.get("created_by")).limit(1).execute()
        if c.data:
            creator_name = c.data[0].get("name")

    # images
    images_resp = (
        supabase.table("complaint_images").select("secure_url, public_id").eq("complaint_id", row["id"]).execute()
    )
    img_list = images_resp.data or []
    images = [img["secure_url"] for img in img_list if not str(img.get("public_id") or "").startswith("fix-")]
    fix_images = [img["secure_url"] for img in img_list if str(img.get("public_id") or "").startswith("fix-")]

    return {
        "row": row,
        "history": history,
        "assignment": assignment,
        "department_name": department_name,
        "vendor_name": vendor_name,
        "creator_name": creator_name,
        "images": images,
        "fix_images": fix_images,
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
def list_complaints(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    assigned_to: Optional[str] = Query(default=None, alias="assignedTo"),
    created_by: Optional[str] = Query(default=None, alias="createdBy"),
    location: Optional[str] = Query(default=None, alias="location"),
    department_id: Optional[str] = Query(default=None, alias="departmentId"),
    assigned_vendor_id: Optional[str] = Query(default=None, alias="assignedVendorId"),
) -> List[Complaint]:
    supabase = get_supabase()
    query = supabase.table("complaints").select("*").order("updated_at", desc=True)
    if department_id:
        query = query.eq("department_id", department_id)
    if status_filter:
        statuses = [s.strip() for s in status_filter.split(",") if s.strip()]
        if statuses:
            query = query.in_("status", statuses)
    if assigned_vendor_id:
        # Fetch the departments this vendor belongs to
        vendor_depts = []
        user_resp = supabase.table("users").select("department_id").eq("id", assigned_vendor_id).limit(1).execute()
        if user_resp.data and user_resp.data[0].get("department_id"):
            vendor_depts.append(user_resp.data[0]["department_id"])
        
        dv_resp = supabase.table("department_vendors").select("department_id").eq("vendor_id", assigned_vendor_id).execute()
        for row in (dv_resp.data or []):
            if row.get("department_id") and row["department_id"] not in vendor_depts:
                vendor_depts.append(row["department_id"])
        
        if not vendor_depts:
            return []
        
        query = query.eq("assigned_vendor_id", assigned_vendor_id).in_("department_id", vendor_depts)
    elif assigned_to:
        # try to find vendor user by name
        user_resp = supabase.table("users").select("id").eq("name", assigned_to).limit(1).execute()
        if user_resp.data:
            vendor_id = user_resp.data[0]["id"]
            query = query.eq("assigned_vendor_id", vendor_id)
        else:
            # no vendor found -> return empty
            return []
    if created_by:
        query = query.eq("created_by", created_by)
    if location:
        query = query.eq("location", location)

    data = query.execute().data or []
    if not data:
        return []

    complaint_ids = [item["id"] for item in data]

    # Fetch status history for all complaints in one query
    history_resp = (
        supabase.table("complaint_status_history")
        .select("complaint_id,old_status,new_status,remarks,changed_by,created_at")
        .in_("complaint_id", complaint_ids)
        .order("created_at", desc=False)
        .execute()
    )
    histories_by_id: Dict[str, List[Dict[str, Any]]] = {}
    for h in (history_resp.data or []):
        c_id = h["complaint_id"]
        if c_id not in histories_by_id:
            histories_by_id[c_id] = []
        histories_by_id[c_id].append(h)

    # Fetch assignments in one query
    assignment_resp = (
        supabase.table("complaint_assignments")
        .select("complaint_id,vendor_id,assigned_at,assigned_by")
        .in_("complaint_id", complaint_ids)
        .order("assigned_at", desc=True)
        .execute()
    )
    assignments_by_id: Dict[str, Dict[str, Any]] = {}
    for a in (assignment_resp.data or []):
        c_id = a["complaint_id"]
        # Ordered by assigned_at desc, so the first one found is the latest
        if c_id not in assignments_by_id:
            assignments_by_id[c_id] = a

    # Fetch departments in one query
    dept_ids = list(set(item["department_id"] for item in data if item.get("department_id")))
    dept_names_by_id: Dict[str, str] = {}
    if dept_ids:
        dept_resp = supabase.table("departments").select("id,name").in_("id", dept_ids).execute()
        for d in (dept_resp.data or []):
            dept_names_by_id[d["id"]] = d["name"]

    # Fetch vendor names in one query
    vendor_ids = list(set(item["assigned_vendor_id"] for item in data if item.get("assigned_vendor_id")))
    vendor_names_by_id: Dict[str, str] = {}
    if vendor_ids:
        vendor_resp = supabase.table("users").select("id,name").in_("id", vendor_ids).execute()
        for v in (vendor_resp.data or []):
            vendor_names_by_id[v["id"]] = v["name"]

    # Fetch creator names in one query
    creator_ids = list(set(item["created_by"] for item in data if item.get("created_by")))
    creator_names_by_id: Dict[str, str] = {}
    if creator_ids:
        creator_resp = supabase.table("users").select("id,name").in_("id", creator_ids).execute()
        for c in (creator_resp.data or []):
            creator_names_by_id[c["id"]] = c["name"]

    # Fetch complaint images in one query
    images_resp = (
        supabase.table("complaint_images")
        .select("complaint_id,secure_url,public_id")
        .in_("complaint_id", complaint_ids)
        .execute()
    )
    images_by_complaint: Dict[str, List[str]] = {}
    fix_images_by_complaint: Dict[str, List[str]] = {}
    for img in (images_resp.data or []):
        c_id = img["complaint_id"]
        url = img["secure_url"]
        pub_id = img.get("public_id") or ""
        if pub_id.startswith("fix-"):
            if c_id not in fix_images_by_complaint:
                fix_images_by_complaint[c_id] = []
            fix_images_by_complaint[c_id].append(url)
        else:
            if c_id not in images_by_complaint:
                images_by_complaint[c_id] = []
            images_by_complaint[c_id].append(url)

    results: List[Dict[str, Any]] = []
    for item in data:
        c_id = item["id"]
        history = histories_by_id.get(c_id, [])
        assignment = assignments_by_id.get(c_id, None)
        department_name = dept_names_by_id.get(item.get("department_id"), None)
        vendor_name = vendor_names_by_id.get(item.get("assigned_vendor_id"), None)
        creator_name = creator_names_by_id.get(item.get("created_by"), None)
        images = images_by_complaint.get(c_id, [])
        fix_images = fix_images_by_complaint.get(c_id, [])

        results.append(_serialize_complaint(item, history, assignment, department_name, vendor_name, creator_name, images, fix_images))
    return results




@router.get("/reports", response_model=List[Dict[str, Any]])
def list_reports(
    user_id: str = Query(..., alias="userId"),
    role: str = Query(..., alias="role"),
    department_id: Optional[str] = Query(default=None, alias="departmentId"),
    vendor_id: Optional[str] = Query(default=None, alias="vendorId"),
) -> List[Dict[str, Any]]:
    import re
    supabase = get_supabase()
    
    # 1. Try to query from "reports" table
    reports_table_exists = False
    try:
        supabase.table("reports").select("id").limit(1).execute()
        reports_table_exists = True
    except Exception as e:
        err_msg = str(e)
        if "relation" in err_msg.lower() or "public.reports" in err_msg or "PGRST205" in err_msg:
            reports_table_exists = False
        else:
            reports_table_exists = True
            
    if reports_table_exists:
        query = supabase.table("reports").select(
            "*, complaints!inner(*, departments(name), creator:users!created_by(name))"
        )
        
        # Apply role-based filtering:
        # "only to the admin who assigned the vendor and to the vendor who was assigned"
        if role == "admin":
            query = query.eq("assigned_admin_id", user_id)
        elif role == "vendor":
            query = query.eq("assigned_vendor_id", user_id)
        elif role in ("superadmin", "super_admin"):
            if department_id:
                query = query.eq("complaints.department_id", department_id)
            if vendor_id:
                query = query.eq("assigned_vendor_id", vendor_id)
                
        # Execute query
        resp = query.order("created_at", desc=True).execute()
        raw_reports = resp.data or []
        
        # Fetch vendor names in one query to avoid N+1 query loops
        vendor_ids = list(set(r["assigned_vendor_id"] for r in raw_reports if r.get("assigned_vendor_id")))
        vendor_names_by_id = {}
        if vendor_ids:
            v_resp = supabase.table("users").select("id, name").in_("id", vendor_ids).execute()
            for v in (v_resp.data or []):
                vendor_names_by_id[v["id"]] = v["name"]

        # Format the output for the client
        formatted = []
        for r in raw_reports:
            comp = r.get("complaints") or {}
            dept = comp.get("departments") or {}
            creator = comp.get("creator") or {}
            
            # Fetch vendor details
            vendor_name = "Unassigned"
            v_id = r.get("assigned_vendor_id")
            if v_id and v_id in vendor_names_by_id:
                vendor_name = vendor_names_by_id[v_id]
                    
            formatted.append({
                "id": r["id"],
                "complaintNo": comp.get("complaint_no"),
                "complaintId": comp.get("id"),
                "title": comp.get("title"),
                "reason": r.get("reason"),
                "details": r.get("details"),
                "reportedBy": creator.get("name") or "Faculty User",
                "vendorName": vendor_name,
                "vendorId": r.get("assigned_vendor_id"),
                "departmentName": dept.get("name") or "General",
                "departmentId": comp.get("department_id"),
                "createdAt": r.get("created_at")
            })
        return formatted

    else:
        # FALLBACK: Query from "notifications" table!
        # Find all notifications that start with "[REPORT]"
        query = supabase.table("notifications").select("id, user_id, title, message, created_at")
        
        # If user is admin or vendor, only query their notifications
        if role in ("admin", "vendor"):
            query = query.eq("user_id", user_id)
            
        resp = query.order("created_at", desc=True).execute()
        raw_notifs = resp.data or []
        
        # Filter notifications that start with "[REPORT]"
        reports_notifs = []
        for n in raw_notifs:
            title = n.get("title") or ""
            if title.startswith("[REPORT]"):
                reports_notifs.append(n)
                
        # Group/deduplicate and extract unique complaint numbers first
        seen_reports = set()
        deduped_notifs = []
        complaint_nos = set()
        
        for n in reports_notifs:
            title = n["title"]
            match = re.match(r"^\[REPORT\]\s*(CMP-\d{4}-\d{6,10}):\s*(.*)$", title)
            if match:
                comp_no = match.group(1)
                reason = match.group(2)
            else:
                comp_no = title.replace("[REPORT]", "").strip().split(":")[0].strip()
                reason = title.split(":")[-1].strip() if ":" in title else title
                
            details = n.get("message") or ""
            created_at = n.get("created_at")
            
            key = f"{comp_no}-{created_at}"
            if key in seen_reports:
                continue
            seen_reports.add(key)
            
            deduped_notifs.append({
                "id": n["id"],
                "comp_no": comp_no,
                "reason": reason,
                "details": details,
                "created_at": created_at
            })
            complaint_nos.add(comp_no)
            
        # Fetch all matching complaints in one query
        complaints_by_no = {}
        if complaint_nos:
            comp_resp = supabase.table("complaints").select("*").in_("complaint_no", list(complaint_nos)).execute()
            for comp in (comp_resp.data or []):
                complaints_by_no[comp["complaint_no"]] = comp
                
        # Collect department IDs and user IDs
        dept_ids = set()
        user_ids = set()
        for comp in complaints_by_no.values():
            if comp.get("department_id"):
                dept_ids.add(comp["department_id"])
            if comp.get("assigned_vendor_id"):
                user_ids.add(comp["assigned_vendor_id"])
            if comp.get("created_by"):
                user_ids.add(comp["created_by"])
                
        # Fetch all departments in one query
        dept_names_by_id = {}
        if dept_ids:
            dept_resp = supabase.table("departments").select("id, name").in_("id", list(dept_ids)).execute()
            for d in (dept_resp.data or []):
                dept_names_by_id[d["id"]] = d["name"]
                
        # Fetch all user names (vendors & creators) in one query
        user_names_by_id = {}
        if user_ids:
            user_resp = supabase.table("users").select("id, name").in_("id", list(user_ids)).execute()
            for u in (user_resp.data or []):
                user_names_by_id[u["id"]] = u["name"]
                
        # Format reports using pre-fetched details
        formatted = []
        for item in deduped_notifs:
            comp_no = item["comp_no"]
            comp = complaints_by_no.get(comp_no)
            if not comp:
                continue
                
            dept_name = dept_names_by_id.get(comp.get("department_id"), "General")
            
            assigned_vendor_id = comp.get("assigned_vendor_id")
            vendor_name = "Unassigned"
            if assigned_vendor_id and assigned_vendor_id in user_names_by_id:
                vendor_name = user_names_by_id[assigned_vendor_id]
                
            reporter_name = "Faculty User"
            created_by = comp.get("created_by")
            if created_by and created_by in user_names_by_id:
                reporter_name = user_names_by_id[created_by]
            
            # Filter for superadmin / admin / vendor role-based visibility in fallback mode
            if role in ("admin", "vendor"):
                pass
            elif role in ("superadmin", "super_admin"):
                if department_id and comp.get("department_id") != department_id:
                    continue
                if vendor_id and assigned_vendor_id != vendor_id:
                    continue
            
            formatted.append({
                "id": item["id"],
                "complaintNo": comp_no,
                "complaintId": comp.get("id"),
                "title": comp.get("title"),
                "reason": item["reason"],
                "details": item["details"],
                "reportedBy": reporter_name,
                "vendorName": vendor_name,
                "vendorId": assigned_vendor_id,
                "departmentName": dept_name,
                "departmentId": comp.get("department_id"),
                "createdAt": item["created_at"]
            })
            
        return formatted


@router.get("/{complaint_no}", response_model=Complaint)
def get_complaint(complaint_no: str) -> Complaint:
    info = _get_complaint_row(complaint_no)
    return _serialize_complaint(
        info["row"],
        info["history"],
        info["assignment"],
        info.get("department_name"),
        info.get("vendor_name"),
        info.get("creator_name"),
        info.get("images"),
        info.get("fix_images")
    )


@router.post("", response_model=Complaint, status_code=status.HTTP_201_CREATED)
def create_complaint(payload: ComplaintCreate) -> Complaint:
    supabase = get_supabase()
    now = _now_iso()
    complaint_no = _generate_complaint_no()

    system_user_id = _get_system_user_id(supabase)
    dept = _get_department(supabase, payload.departmentId)

    import uuid
    created_by_uuid = payload.createdBy
    try:
        uuid.UUID(str(created_by_uuid))
    except ValueError:
        created_by_uuid = system_user_id

    insert_payload = {
        "complaint_no": complaint_no,
        "title": payload.title,
        "description": payload.description,
        "location": payload.location,
        "department_id": dept["id"],
        "priority": payload.priority,
        "status": "open",
        "created_by": created_by_uuid,
        "created_at": now,
        "updated_at": now,
    }

    response = supabase.table("complaints").insert(insert_payload).execute()
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create complaint")

    complaint_id = response.data[0]["id"]

    # insert images if any
    if payload.images:
        image_inserts = []
        for idx, img in enumerate(payload.images):
            image_inserts.append({
                "complaint_id": complaint_id,
                "public_id": f"img-{int(datetime.now(timezone.utc).timestamp())}-{idx}",
                "secure_url": img
            })
        if image_inserts:
            supabase.table("complaint_images").insert(image_inserts).execute()

    # add initial status history
    supabase.table("complaint_status_history").insert({
        "complaint_id": complaint_id,
        "old_status": None,
        "new_status": "open",
        "remarks": "Complaint registered",
        "changed_by": system_user_id,
    }).execute()

    info = _get_complaint_row(complaint_no)
    return _serialize_complaint(
        info["row"],
        info["history"],
        info["assignment"],
        info.get("department_name"),
        info.get("vendor_name"),
        info.get("creator_name"),
        info.get("images"),
        info.get("fix_images")
    )


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
    return _serialize_complaint(
        info["row"],
        info["history"],
        info["assignment"],
        info.get("department_name"),
        info.get("vendor_name"),
        info.get("creator_name"),
        info.get("images"),
        info.get("fix_images")
    )


@router.post("/{complaint_no}/mark-fixed", response_model=Complaint)
def mark_fixed(complaint_no: str, payload: Optional[MarkFixedRequest] = None) -> Complaint:
    supabase = get_supabase()
    now = _now_iso()
    info = _get_complaint_row(complaint_no)
    complaint_id = info["row"]["id"]
    system_user_id = _get_system_user_id(supabase)

    remarks = payload.remarks if payload and payload.remarks else "Work completed"

    if payload and payload.image:
        supabase.table("complaint_images").insert({
            "complaint_id": complaint_id,
            "public_id": f"fix-{int(datetime.now(timezone.utc).timestamp())}",
            "secure_url": payload.image
        }).execute()

    supabase.table("complaints").update({
        "status": "done",
        "updated_at": now,
        "resolved_at": now,
    }).eq("id", complaint_id).execute()

    supabase.table("complaint_status_history").insert({
        "complaint_id": complaint_id,
        "old_status": info["row"].get("status"),
        "new_status": "done",
        "remarks": remarks,
        "changed_by": system_user_id,
    }).execute()

    info = _get_complaint_row(complaint_no)
    return _serialize_complaint(
        info["row"],
        info["history"],
        info["assignment"],
        info.get("department_name"),
        info.get("vendor_name"),
        info.get("creator_name"),
        info.get("images"),
        info.get("fix_images")
    )


@router.post("/{complaint_no}/verify-solution", response_model=Complaint)
def verify_solution(complaint_no: str) -> Complaint:
    supabase = get_supabase()
    now = _now_iso()
    info = _get_complaint_row(complaint_no)
    complaint_id = info["row"]["id"]
    system_user_id = _get_system_user_id(supabase)

    supabase.table("complaints").update({
        "status": "resolved",
        "updated_at": now,
        "resolved_at": now,
    }).eq("id", complaint_id).execute()

    supabase.table("complaint_status_history").insert({
        "complaint_id": complaint_id,
        "old_status": info["row"].get("status"),
        "new_status": "resolved",
        "remarks": "Solution verified by faculty",
        "changed_by": system_user_id,
    }).execute()

    info = _get_complaint_row(complaint_no)
    return _serialize_complaint(
        info["row"],
        info["history"],
        info["assignment"],
        info.get("department_name"),
        info.get("vendor_name"),
        info.get("creator_name"),
        info.get("images"),
        info.get("fix_images")
    )


@router.post("/{complaint_no}/notify-vendor", response_model=Complaint)
def notify_vendor(complaint_no: str) -> Complaint:
    supabase = get_supabase()
    info = _get_complaint_row(complaint_no)
    assigned_vendor_id = info["row"].get("assigned_vendor_id")
    if not assigned_vendor_id:
        raise HTTPException(status_code=400, detail="No vendor assigned to notify")

    supabase.table("notifications").insert({
        "user_id": assigned_vendor_id,
        "title": f"Pending Complaint: {complaint_no}",
        "message": f"Complaint {complaint_no} is pending your attention.",
    }).execute()

    return _serialize_complaint(
        info["row"],
        info["history"],
        info["assignment"],
        info.get("department_name"),
        info.get("vendor_name"),
        info.get("creator_name"),
        info.get("images"),
        info.get("fix_images")
    )


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
    return _serialize_complaint(
        info["row"],
        info["history"],
        info["assignment"],
        info.get("department_name"),
        info.get("vendor_name"),
        info.get("creator_name"),
        info.get("images"),
        info.get("fix_images")
    )


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
    return _serialize_complaint(
        info["row"],
        info["history"],
        info["assignment"],
        info.get("department_name"),
        info.get("vendor_name"),
        info.get("creator_name"),
        info.get("images"),
        info.get("fix_images")
    )


@router.post("/{complaint_no}/report", status_code=status.HTTP_201_CREATED)
def report_issue(complaint_no: str, payload: ReportIssueRequest) -> Dict[str, str]:
    supabase = get_supabase()
    info = _get_complaint_row(complaint_no)
    complaint = info["row"]
    complaint_id = complaint["id"]
    
    # 1. Enforce that complaint can only be reported if marked completed (status == done)
    status_val = str(complaint.get("status") or "").lower()
    if status_val != "done":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Faculty can only report incomplete work when the complaint has been marked completed by the vendor/admin"
        )
        
    assigned_vendor_id = complaint.get("assigned_vendor_id")
    
    # Find the assigning admin from complaint_assignments
    assigned_by = None
    assignment_resp = (
        supabase.table("complaint_assignments")
        .select("assigned_by")
        .eq("complaint_id", complaint_id)
        .order("assigned_at", desc=True)
        .limit(1)
        .execute()
    )
    if assignment_resp.data:
        assigned_by = assignment_resp.data[0].get("assigned_by")
        
    # Try inserting into reports table if it exists
    reports_table_exists = False
    try:
        supabase.table("reports").select("id").limit(1).execute()
        reports_table_exists = True
    except Exception as e:
        err_msg = str(e)
        if "relation" in err_msg.lower() or "public.reports" in err_msg or "PGRST205" in err_msg:
            reports_table_exists = False
        else:
            reports_table_exists = True
            
    if reports_table_exists:
        try:
            report_payload = {
                "complaint_id": complaint_id,
                "reported_by": complaint["created_by"],
                "reason": payload.reason,
                "details": payload.details,
                "assigned_vendor_id": assigned_vendor_id,
                "assigned_admin_id": assigned_by,
            }
            supabase.table("reports").insert(report_payload).execute()
        except Exception:
            reports_table_exists = False

    # Send notifications to admin and vendor under reports tab
    report_title = f"[REPORT] {complaint_no}: {payload.reason}"
    report_message = payload.details or payload.reason
    
    if assigned_by:
        supabase.table("notifications").insert({
            "user_id": assigned_by,
            "title": report_title,
            "message": report_message,
        }).execute()
        
    if assigned_vendor_id:
        supabase.table("notifications").insert({
            "user_id": assigned_vendor_id,
            "title": report_title,
            "message": report_message,
        }).execute()

    return {"status": "reported"}


@router.delete("/{complaint_no}", status_code=status.HTTP_204_NO_CONTENT)
def delete_complaint(complaint_no: str):
    supabase = get_supabase()
    resp = supabase.table("complaints").select("id").eq("complaint_no", complaint_no).limit(1).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    delete_resp = supabase.table("complaints").delete().eq("complaint_no", complaint_no).execute()
    if not delete_resp.data:
        raise HTTPException(status_code=500, detail="Failed to delete complaint")
    
    return


@router.patch("/{complaint_no}", response_model=Complaint)
def update_complaint(complaint_no: str, payload: ComplaintUpdate) -> Complaint:
    supabase = get_supabase()
    now = _now_iso()
    info = _get_complaint_row(complaint_no)
    complaint_id = info["row"]["id"]
    
    # Ensure complaint can only be edited while it is open/pending and no vendor is assigned
    status_val = str(info["row"].get("status") or "").lower()
    if status_val not in ("open", "pending") or info["row"].get("assigned_vendor_id") is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complaint can only be edited while it is open/pending and no vendor has been assigned"
        )

    system_user_id = _get_system_user_id(supabase)

    update_payload = payload.model_dump(exclude_unset=True)
    if not update_payload:
        return _serialize_complaint(
            info["row"],
            info["history"],
            info["assignment"],
            info.get("department_name"),
            info.get("vendor_name"),
            info.get("creator_name"),
            info.get("images"),
            info.get("fix_images")
        )

    mapped_payload = {}
    if "title" in update_payload:
        mapped_payload["title"] = update_payload["title"]
    if "description" in update_payload:
        mapped_payload["description"] = update_payload["description"]
    if "location" in update_payload:
        mapped_payload["location"] = update_payload["location"]
    if "priority" in update_payload:
        mapped_payload["priority"] = update_payload["priority"]

    mapped_payload["updated_at"] = now

    supabase.table("complaints").update(mapped_payload).eq("id", complaint_id).execute()

    supabase.table("complaint_status_history").insert({
        "complaint_id": complaint_id,
        "old_status": info["row"].get("status"),
        "new_status": info["row"].get("status"),
        "remarks": "Complaint details updated",
        "changed_by": system_user_id,
    }).execute()

    info = _get_complaint_row(complaint_no)
    return _serialize_complaint(
        info["row"],
        info["history"],
        info["assignment"],
        info.get("department_name"),
        info.get("vendor_name"),
        info.get("creator_name"),
        info.get("images"),
        info.get("fix_images")
    )


