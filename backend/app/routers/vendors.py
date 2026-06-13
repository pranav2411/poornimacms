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
    query = supabase.table("users").select("id, name, email, department_id").eq("role", "vendor")
    if department_id:
        query = query.eq("department_id", department_id)
    response = query.order("name").execute()
    data = response.data or []
    return [
        {
            "id": item["id"],
            "name": item["name"],
            "email": item.get("email"),
            "departmentId": item.get("department_id"),
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
        # Update user to be a vendor for this department
        updated = (
            supabase.table("users")
            .update(
                {
                    "role": "vendor",
                    "department_id": payload.departmentId,
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
        item = updated.data[0]
    else:
        # Create a new vendor user
        import datetime

        stub = {
            "firebase_uid": f"vendor-{email_clean.split('@')[0]}-{int(datetime.datetime.now().timestamp())}",
            "name": payload.name,
            "email": email_clean,
            "role": "vendor",
            "department_id": payload.departmentId,
            "status": "verified",
            "is_verified": True,
            "is_active": True,
        }
        created = supabase.table("users").insert(stub).execute()
        if not created.data:
            raise HTTPException(
                status_code=500, detail="Failed to create vendor user"
            )
        item = created.data[0]

    return {
        "id": item["id"],
        "name": item["name"],
        "email": item["email"],
        "departmentId": item.get("department_id"),
    }


@router.post("/{vendor_id}/remove")
def remove_vendor(vendor_id: str):
    supabase = get_supabase()
    response = (
        supabase.table("users")
        .update({"department_id": None})
        .eq("id", vendor_id)
        .eq("role", "vendor")
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return {"status": "success"}
