from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, HTTPException, status

from app.db.supabase import get_supabase
from app.models.schemas import UserCreate, UserItem, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])

ALLOWED_ROLES = {"faculty", "admin", "vendor", "super_admin"}


def _serialize_user(row: Dict[str, Any]) -> Dict[str, Any]:
	return {
		"id": row.get("id"),
		"firebaseUid": row.get("firebase_uid"),
		"name": row.get("name"),
		"avatarUrl": row.get("avatar_url"),
		"email": row.get("email"),
		"role": row.get("role"),
		"departmentId": row.get("department_id"),
		"isVerified": row.get("is_verified"),
		"isActive": row.get("is_active"),
		"createdAt": row.get("created_at"),
		"updatedAt": row.get("updated_at"),
	}


def _get_user_row(user_id: str) -> Dict[str, Any]:
	supabase = get_supabase()
	response = supabase.table("users").select("*").eq("id", user_id).limit(1).execute()
	data = response.data or []
	if not data:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
	return data[0]


def _get_user_by_firebase_uid(firebase_uid: str) -> Dict[str, Any]:
	supabase = get_supabase()
	response = (
		supabase.table("users")
		.select("*")
		.eq("firebase_uid", firebase_uid)
		.limit(1)
		.execute()
	)
	data = response.data or []
	if not data:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
	return data[0]


@router.post("", response_model=UserItem, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate) -> UserItem:
	supabase = get_supabase()

	role = payload.role.strip()
	if role not in ALLOWED_ROLES:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail=f"role must be one of: {', '.join(sorted(ALLOWED_ROLES))}",
		)

	existing = (
		supabase.table("users")
		.select("id")
		.or_(f"firebase_uid.eq.{payload.firebaseUid},email.eq.{payload.email}")
		.limit(1)
		.execute()
	)
	if existing.data:
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists")

	insert_payload = {
		"firebase_uid": payload.firebaseUid,
		"name": payload.name,
		"avatar_url": payload.avatarUrl,
		"email": payload.email,
		"role": role,
		"department_id": payload.departmentId,
		"is_verified": payload.isVerified,
		"is_active": payload.isActive,
	}

	response = supabase.table("users").insert(insert_payload).execute()
	if not response.data:
		raise HTTPException(status_code=500, detail="Failed to create user")

	return _serialize_user(response.data[0])


@router.patch("/firebase/{firebase_uid}", response_model=UserItem)
def update_user_by_firebase_uid(firebase_uid: str, payload: UserUpdate) -> UserItem:
	supabase = get_supabase()

	update_payload = payload.model_dump(exclude_unset=True)
	if not update_payload:
		return _serialize_user(_get_user_by_firebase_uid(firebase_uid))

	mapped_payload: Dict[str, Any] = {}
	if "name" in update_payload:
		mapped_payload["name"] = update_payload["name"]
	if "avatarUrl" in update_payload:
		mapped_payload["avatar_url"] = update_payload["avatarUrl"]
	if "email" in update_payload:
		mapped_payload["email"] = update_payload["email"]
	if "role" in update_payload:
		role = str(update_payload["role"]).strip()
		if role not in ALLOWED_ROLES:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail=f"role must be one of: {', '.join(sorted(ALLOWED_ROLES))}",
			)
		mapped_payload["role"] = role
	if "departmentId" in update_payload:
		mapped_payload["department_id"] = update_payload["departmentId"]
	if "isVerified" in update_payload:
		mapped_payload["is_verified"] = update_payload["isVerified"]
	if "isActive" in update_payload:
		mapped_payload["is_active"] = update_payload["isActive"]

	response = (
		supabase.table("users")
		.update(mapped_payload)
		.eq("firebase_uid", firebase_uid)
		.execute()
	)
	data = response.data or []
	if not data:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

	return _serialize_user(data[0])


@router.get("/firebase/{firebase_uid}", response_model=UserItem)
def get_user_by_firebase_uid(firebase_uid: str) -> UserItem:
	return _serialize_user(_get_user_by_firebase_uid(firebase_uid))
