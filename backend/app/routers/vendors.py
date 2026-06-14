from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Query, HTTPException

from app.db.supabase import get_supabase
from app.models.schemas import VendorItem, AddVendorRequest

router = APIRouter(prefix="/vendors", tags=["vendors"])


@router.get("", response_model=List[VendorItem])
def list_vendors(
    department_id: Optional[str] = Query(default=None, alias="departmentId")
) -> List[VendorItem]:
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
        return sorted(data, key=lambda x: x["name"])
    else:
        # List all users with role = 'vendor'
        response = supabase.table("users").select("id, name, email").eq("role", "vendor").order("name").execute()
        data = response.data or []
        return [
            {
                "id": item["id"],
                "name": item["name"],
                "email": item.get("email"),
                "departmentId": None
            }
            for item in data
        ]


@router.post("", response_model=VendorItem)
def add_vendor(payload: AddVendorRequest) -> VendorItem:
    supabase = get_supabase()
    email_clean = payload.email.strip().lower()

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
        import datetime

        stub = {
            "firebase_uid": f"vendor-{email_clean.split('@')[0]}-{int(datetime.datetime.now().timestamp())}",
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
    department_id: Optional[str] = Query(default=None, alias="departmentId")
):
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
