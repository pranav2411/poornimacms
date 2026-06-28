from __future__ import annotations

import logging
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Query, HTTPException, Depends, status

from app.db.supabase import get_supabase
from app.models.schemas import VendorItem, AddVendorRequest
from app.core.security import get_current_user, require_roles
from app.core.sequence import generate_prefixed_no

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vendors", tags=["vendors"])


def format_resolution_time(seconds: float) -> str:
    if seconds <= 0:
        return "0 mins"
    minutes = seconds / 60.0
    if minutes < 60:
        return f"{round(minutes, 1)} mins"
    hours = minutes / 60.0
    if hours < 24:
        return f"{round(hours, 1)} hrs"
    days = hours / 24.0
    return f"{round(days, 1)} days"


@router.get("", response_model=List[VendorItem])
def list_vendors(
    department_id: Optional[str] = Query(default=None, alias="departmentId"),
    current_user: dict = Depends(require_roles(["admin"]))
) -> List[VendorItem]:
    is_super = current_user.get("role") == "super_admin" or current_user.get("firebase_uid") == "__system__"
    if not is_super:
        # Enforce department restriction for normal department admins
        admin_dept_id = current_user.get("department_id")
        if not admin_dept_id:
            return []
        department_id = admin_dept_id

    supabase = get_supabase()
    if department_id:
        # Query via department_vendors junction table
        response = (
            supabase.table("department_vendors")
            .select("vendor_id, vendor:users(id, name, email)")
            .eq("department_id", department_id)
            .execute()
        )
        data = []
        for item in (response.data or []):
            vendor = item.get("vendor")
            if vendor:
                data.append({
                    "id": vendor["id"],
                    "name": vendor["name"],
                    "email": vendor.get("email"),
                    "departmentId": department_id
                })
    else:
        # List all users with role = 'vendor' (Only allowed for super admin / admin within organization)
        org_id = current_user.get("organization_id")
        response = (
            supabase.table("users")
            .select("id, name, email")
            .eq("role", "vendor")
            .eq("organization_id", org_id)
            .order("name")
            .execute()
        )
        data = [
            {
                "id": item["id"],
                "name": item["name"],
                "email": item.get("email"),
                "departmentId": None
            }
            for item in (response.data or [])
        ]

    # Calculate active complaints and average resolution time for listed vendors
    vendor_ids = [v["id"] for v in data]
    vendor_stats = {}
    if vendor_ids:
        try:
            complaints_resp = (
                supabase.table("complaints")
                .select("assigned_vendor_id, status, created_at, resolved_at")
                .in_("assigned_vendor_id", vendor_ids)
                .execute()
            )
            complaints = complaints_resp.data or []
            
            for v_id in vendor_ids:
                vendor_complaints = [c for c in complaints if c.get("assigned_vendor_id") == v_id]
                active_count = sum(1 for c in vendor_complaints if c.get("status") not in ("resolved", "cancelled"))
                
                resolved_durations = []
                for c in vendor_complaints:
                    if c.get("status") in ("done", "resolved") and c.get("created_at") and c.get("resolved_at"):
                        try:
                            created = datetime.fromisoformat(c["created_at"].replace("Z", "+00:00"))
                            resolved = datetime.fromisoformat(c["resolved_at"].replace("Z", "+00:00"))
                            duration = (resolved - created).total_seconds()
                            if duration >= 0:
                                resolved_durations.append(duration)
                        except Exception as e:
                            logger.error(f"Error parsing date for vendor stats: {e}")
                
                avg_time_str = "N/A"
                if resolved_durations:
                    avg_seconds = sum(resolved_durations) / len(resolved_durations)
                    avg_time_str = format_resolution_time(avg_seconds)
                
                vendor_stats[v_id] = {
                    "activeComplaints": active_count,
                    "avgResolutionTime": avg_time_str
                }
        except Exception as e:
            logger.error(f"Error calculating vendor stats: {e}")

    for item in data:
        stats = vendor_stats.get(item["id"], {"activeComplaints": 0, "avgResolutionTime": "N/A"})
        item["activeComplaints"] = stats["activeComplaints"]
        item["avgResolutionTime"] = stats["avgResolutionTime"]

    return sorted(data, key=lambda x: x["name"])


@router.post("", response_model=VendorItem)
def add_vendor(
    payload: AddVendorRequest,
    current_user: dict = Depends(require_roles(["admin"]))
) -> VendorItem:
    is_super = current_user.get("role") == "super_admin" or current_user.get("firebase_uid") == "__system__"
    if not is_super:
        # Enforce that normal admins can only add vendors to their own department
        if payload.departmentId != current_user.get("department_id"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot add vendor to another department"
            )

    supabase = get_supabase()
    email_clean = payload.email.strip().lower()
    org_id = current_user.get("organization_id")
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User profile has no associated organization context"
        )

    # check if user already exists
    existing = (
        supabase.table("users")
        .select("*")
        .eq("email", email_clean)
        .limit(1)
        .execute()
    )
    if existing.data:
        user = existing.data[0]
        if user.get("organization_id") != org_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot update user profile belonging to another organization"
            )

        # Update user to be a vendor
        updated = (
            supabase.table("users")
            .update(
                {
                    "role": "vendor",
                    "status": "verified",
                    "is_verified": True,
                    "name": payload.name or user.get("name"),
                }
            )
            .eq("id", user["id"])
            .execute()
        )

        if not updated.data:
            raise HTTPException(
                status_code=500, detail="Failed to update existing user to vendor"
            )
        vendor_id = user["id"]
        vendor_name = payload.name or user.get("name")
        vendor_email = user.get("email")
    else:
        # Create a new vendor user
        org_code = current_user.get("org_code")
        if not org_code:
            org_resp = supabase.table("organizations").select("code").eq("id", org_id).limit(1).execute()
            if not org_resp.data:
                raise HTTPException(status_code=404, detail="Organization not found")
            org_code = org_resp.data[0]["code"]

        user_no = generate_prefixed_no(supabase, org_id, org_code, "USR")

        stub = {
            "organization_id": org_id,
            "user_no": user_no,
            "firebase_uid": f"vendor-{email_clean.split('@')[0]}-{int(datetime.now().timestamp())}",
            "name": payload.name,
            "email": email_clean,
            "role": "vendor",
            "status": "verified",
            "is_verified": True,
            "is_active": True,
        }
        created = supabase.table("users").insert(stub).execute()
        if not created.data:
            raise HTTPException(
                status_code=500, detail="Failed to create vendor user"
            )
        vendor_id = created.data[0]["id"]
        vendor_name = created.data[0]["name"]
        vendor_email = created.data[0]["email"]

    # Assign vendor to the department in department_vendors
    if payload.departmentId:
        supabase.table("department_vendors").insert({
            "department_id": payload.departmentId,
            "vendor_id": vendor_id
        }).execute()

    return {
        "id": vendor_id,
        "name": vendor_name,
        "email": vendor_email,
        "departmentId": payload.departmentId,
    }


@router.post("/{vendor_id}/remove")
def remove_vendor(
    vendor_id: str,
    department_id: Optional[str] = Query(default=None, alias="departmentId"),
    current_user: dict = Depends(require_roles(["admin"]))
):
    is_super = current_user.get("role") == "super_admin" or current_user.get("firebase_uid") == "__system__"
    if not is_super:
        admin_dept_id = current_user.get("department_id")
        if not admin_dept_id or department_id != admin_dept_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot remove vendor from another department"
            )

    supabase = get_supabase()
    if department_id:
        response = (
            supabase.table("department_vendors")
            .delete()
            .eq("vendor_id", vendor_id)
            .eq("department_id", department_id)
            .execute()
        )
    else:
        response = (
            supabase.table("department_vendors")
            .delete()
            .eq("vendor_id", vendor_id)
            .execute()
        )
    return {"status": "success"}
