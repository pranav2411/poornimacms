from __future__ import annotations

from typing import Any, Dict
import logging
from fastapi import APIRouter, HTTPException, status, Depends

logger = logging.getLogger(__name__)

from app.db.supabase import get_supabase
from app.models.schemas import Organization, OrganizationRegisterRequest
from app.core.security import get_current_user
from app.core.sequence import generate_prefixed_no

router = APIRouter(prefix="/organizations", tags=["organizations"])

def _serialize_org(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": row.get("id"),
        "name": row.get("name"),
        "code": row.get("code"),
        "logoUrl": row.get("logo_url"),
        "bannerUrl": row.get("banner_url"),
        "createdAt": row.get("created_at"),
    }

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_organization(payload: OrganizationRegisterRequest):
    supabase = get_supabase()

    org_code_clean = payload.orgCode.strip().upper()
    org_name_clean = payload.orgName.strip()

    if not org_code_clean or not org_name_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization name and code cannot be empty"
        )

    # 1. Check if organization already exists
    existing_org = (
        supabase.table("organizations")
        .select("id")
        .or_(f"code.eq.{org_code_clean},name.eq.{org_name_clean}")
        .execute()
    )
    if existing_org.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An organization with this name or code already exists"
        )

    # 2. Check if user already exists
    existing_user = (
        supabase.table("users")
        .select("id")
        .or_(f"firebase_uid.eq.{payload.firebaseUid},email.eq.{payload.adminEmail}")
        .execute()
    )
    if existing_user.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email or Firebase UID already exists"
        )

    try:
        # 3. Create Organization
        org_insert = (
            supabase.table("organizations")
            .insert({
                "name": org_name_clean,
                "code": org_code_clean,
            })
            .execute()
        )
        if not org_insert.data:
            raise HTTPException(status_code=500, detail="Failed to create organization")
        
        org_data = org_insert.data[0]
        org_id = org_data["id"]

        # 4. Generate user_no for the super admin
        admin_user_no = generate_prefixed_no(supabase, org_id, org_code_clean, "USR")

        # 5. Create Super Admin User
        user_insert = (
            supabase.table("users")
            .insert({
                "organization_id": org_id,
                "user_no": admin_user_no,
                "firebase_uid": payload.firebaseUid,
                "name": payload.adminName,
                "email": payload.adminEmail,
                "role": "super_admin",
                "is_verified": True,
                "is_active": True,
                "status": "verified"
            })
            .execute()
        )
        if not user_insert.data:
            # Cleanup organization if user creation fails
            supabase.table("organizations").delete().eq("id", org_id).execute()
            raise HTTPException(status_code=500, detail="Failed to create administrator profile")

        return _serialize_org(org_data)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error registering organization and admin: {str(e)}"
        )

@router.get("/id/{org_id}", response_model=Organization)
def get_organization_by_id(org_id: str, current_user: dict = Depends(get_current_user)):
    # Restrict users to their own organization details unless system admin
    if current_user.get("role") != "super_admin" or current_user.get("organization_id") != org_id:
        if current_user.get("firebase_uid") != "__system__":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized to access this organization's branding"
            )

    supabase = get_supabase()
    resp = supabase.table("organizations").select("*").eq("id", org_id).limit(1).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Organization not found")
    return _serialize_org(resp.data[0])

@router.patch("/branding")
def update_branding(
    payload: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Organization Super Admins can configure branding settings"
        )

    org_id = current_user.get("organization_id")
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User profile has no associated organization context"
        )

    supabase = get_supabase()
    
    update_payload = {}
    if "name" in payload:
        update_payload["name"] = str(payload["name"]).strip()
    if "logoUrl" in payload:
        update_payload["logo_url"] = str(payload["logoUrl"]).strip()
    if "bannerUrl" in payload:
        update_payload["banner_url"] = str(payload["bannerUrl"]).strip()

    if not update_payload:
        raise HTTPException(status_code=400, detail="No valid update parameters provided")

    try:
        resp = (
            supabase.table("organizations")
            .update(update_payload)
            .eq("id", org_id)
            .execute()
        )
        if not resp.data:
            raise HTTPException(status_code=404, detail="Organization not found")
        return _serialize_org(resp.data[0])
    except Exception as e:
        logger.exception("Error updating branding config:")
        raise HTTPException(
            status_code=500,
            detail=f"Database error updating branding config: {str(e)}"
        )


@router.get("/code/{org_code}")
def get_organization_by_code(org_code: str):
    supabase = get_supabase()
    resp = (
        supabase.table("organizations")
        .select("*")
        .eq("code", org_code.strip().upper())
        .limit(1)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Organization not found")
    return _serialize_org(resp.data[0])
