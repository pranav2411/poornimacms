from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, HTTPException, status, Depends, Response

from app.db.supabase import get_supabase
from app.models.schemas import UserCreate, UserItem, UserUpdate, NotifyPendingUserRequest
from app.core.fcm import notify_role
from app.core.security import get_current_user, require_roles
from app.core.sequence import generate_prefixed_no

router = APIRouter(prefix="/users", tags=["users"])

ALLOWED_ROLES = {"faculty", "admin", "vendor", "super_admin"}


def _serialize_user(row: Dict[str, Any]) -> Dict[str, Any]:
	return {
		"id": row.get("id"),
		"organizationId": row.get("organization_id"),
		"userNo": row.get("user_no") or "",
		"firebaseUid": row.get("firebase_uid"),
		"name": row.get("name"),
		"avatarUrl": row.get("avatar_url"),
		"email": row.get("email"),
		"role": row.get("role"),
		"departmentId": row.get("department_id"),
		"isVerified": bool(row.get("is_verified") or row.get("status") == "verified"),
		"isActive": bool(row.get("is_active", True)),
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
def create_user(payload: UserCreate, current_user: dict = Depends(get_current_user)) -> UserItem:
	supabase = get_supabase()

	is_super = current_user.get("role") == "super_admin" or current_user.get("firebase_uid") == "__system__"
	
	role = payload.role.strip()
	if role not in ALLOWED_ROLES:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail=f"role must be one of: {', '.join(sorted(ALLOWED_ROLES))}",
		)

	# Determine organization context
	org_id = payload.organizationId
	if not org_id:
		# If the current caller is a Super Admin, default to their organization
		if is_super and current_user.get("organization_id"):
			org_id = current_user.get("organization_id")
		else:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail="Organization ID is required to create a user profile"
			)

	# Verify organization exists and get its short code
	org_resp = supabase.table("organizations").select("code").eq("id", org_id).limit(1).execute()
	if not org_resp.data:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Target organization does not exist"
		)
	org_code = org_resp.data[0]["code"]

	# Enforce organization scoping checks if not system or global admin
	if not is_super:
		# Anonymous signups must use the correct organization ID
		if current_user.get("firebase_uid") != "__system__" and current_user.get("db_registered", False):
			if current_user.get("organization_id") != org_id:
				raise HTTPException(
					status_code=status.HTTP_403_FORBIDDEN,
					detail="Cannot create profiles for users in other organizations"
				)

		if payload.firebaseUid and payload.firebaseUid != current_user.get("firebase_uid"):
			raise HTTPException(
				status_code=status.HTTP_403_FORBIDDEN,
				detail="Cannot register a profile for another user's Firebase UID"
			)
		if payload.email.strip().lower() != current_user.get("email", "").strip().lower():
			raise HTTPException(
				status_code=status.HTTP_403_FORBIDDEN,
				detail="Registration email must match authenticated token email"
			)
		# Force role to faculty for self-service user registration
		role = "faculty"
		payload.isVerified = False
		payload.isActive = True

	# Verify uniqueness of email within organization context
	if payload.firebaseUid:
		existing = (
			supabase.table("users")
			.select("id")
			.or_(f"firebase_uid.eq.{payload.firebaseUid},email.eq.{payload.email}")
			.limit(1)
			.execute()
		)
	else:
		existing = (
			supabase.table("users")
			.select("id")
			.eq("email", payload.email)
			.limit(1)
			.execute()
		)

	if existing.data:
		raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists")

	name = payload.name
	if not name:
		name = payload.email.split("@")[0]

	status_val = "verified" if (is_super and payload.isVerified) else "pending"

	# Generate the unique sequence user_no
	user_no = generate_prefixed_no(supabase, org_id, org_code, "USR")

	insert_payload = {
		"organization_id": org_id,
		"user_no": user_no,
		"firebase_uid": payload.firebaseUid,
		"name": name,
		"avatar_url": payload.avatarUrl,
		"email": payload.email,
		"role": role,
		"department_id": payload.departmentId,
		"is_verified": payload.isVerified if is_super else False,
		"is_active": payload.isActive if is_super else True,
		"status": status_val
	}

	response = supabase.table("users").insert(insert_payload).execute()
	if not response.data:
		raise HTTPException(status_code=500, detail="Failed to create user")

	user_data = response.data[0]
	if not user_data.get("is_verified"):
		name_str = user_data.get("name") or payload.email.split("@")[0]
		notify_role(
			role="super_admin",
			title="New Pending User Registration",
			body=f"User {name_str} ({payload.email}) has registered and is pending verification.",
			data={"type": "new_user", "email": payload.email}
		)

	return _serialize_user(user_data)


@router.patch("/firebase/{firebase_uid}", response_model=UserItem)
def update_user_by_firebase_uid(
	firebase_uid: str, 
	payload: UserUpdate, 
	current_user: dict = Depends(get_current_user)
) -> UserItem:
	supabase = get_supabase()

	target_user = _get_user_by_firebase_uid(firebase_uid)
	if current_user.get("firebase_uid") != "__system__":
		if target_user.get("organization_id") != current_user.get("organization_id"):
			raise HTTPException(
				status_code=status.HTTP_403_FORBIDDEN,
				detail="Access denied: target user is in a different organization"
			)

	is_super = current_user.get("role") == "super_admin" or current_user.get("firebase_uid") == "__system__"
	is_self = current_user.get("firebase_uid") == firebase_uid

	if not is_super and not is_self:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="Cannot update another user's profile"
		)

	update_payload = payload.model_dump(exclude_unset=True)
	if not update_payload:
		return _serialize_user(target_user)

	mapped_payload: Dict[str, Any] = {}
	if "name" in update_payload:
		mapped_payload["name"] = update_payload["name"]
	if "avatarUrl" in update_payload:
		mapped_payload["avatar_url"] = update_payload["avatarUrl"]

	# Restrict sensitive fields to super admin only
	if is_super:
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
			mapped_payload["status"] = "verified" if update_payload["isVerified"] else "pending"
		if "isActive" in update_payload:
			mapped_payload["is_active"] = update_payload["isActive"]

	if not mapped_payload:
		return _serialize_user(target_user)

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
def get_user_by_firebase_uid(
	firebase_uid: str, 
	current_user: dict = Depends(get_current_user)
) -> UserItem:
	target_user = _get_user_by_firebase_uid(firebase_uid)
	if current_user.get("firebase_uid") != "__system__":
		if target_user.get("organization_id") != current_user.get("organization_id"):
			raise HTTPException(
				status_code=status.HTTP_403_FORBIDDEN,
				detail="Access denied: target user is in a different organization"
			)

	is_authorized = (
		current_user.get("role") in ("super_admin", "admin") or
		current_user.get("firebase_uid") == "__system__" or
		current_user.get("firebase_uid") == firebase_uid
	)
	if not is_authorized:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="Access denied: unauthorized to view this profile"
		)
	return _serialize_user(target_user)


@router.get("/email/{email}", response_model=UserItem)
def get_user_by_email(email: str, current_user: dict = Depends(get_current_user)) -> UserItem:
	is_authorized = (
		current_user.get("role") in ("super_admin", "admin") or
		current_user.get("firebase_uid") == "__system__" or
		current_user.get("email", "").strip().lower() == email.strip().lower()
	)
	if not is_authorized:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="Access denied: unauthorized to view this profile"
		)

	supabase = get_supabase()
	response = (
		supabase.table("users")
		.select("*, organizations(code)")
		.eq("email", email.strip().lower())
		.limit(1)
		.execute()
	)
	data = response.data or []
	if not data:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
	
	target_user = data[0]
	if current_user.get("firebase_uid") != "__system__":
		if target_user.get("organization_id") != current_user.get("organization_id"):
			raise HTTPException(
				status_code=status.HTTP_403_FORBIDDEN,
				detail="Access denied: target user is in a different organization"
			)

	return _serialize_user(target_user)


@router.patch("/id/{user_id}", response_model=UserItem)
def update_user_by_id(
	user_id: str, 
	payload: UserUpdate, 
	current_user: dict = Depends(get_current_user)
) -> UserItem:
	supabase = get_supabase()

	target_user = _get_user_row(user_id)
	if current_user.get("firebase_uid") != "__system__":
		if target_user.get("organization_id") != current_user.get("organization_id"):
			raise HTTPException(
				status_code=status.HTTP_403_FORBIDDEN,
				detail="Access denied: target user is in a different organization"
			)

	is_super = current_user.get("role") == "super_admin" or current_user.get("firebase_uid") == "__system__"
	is_self = current_user.get("id") == user_id

	if not is_super and not is_self:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="Cannot update another user's profile"
		)

	update_payload = payload.model_dump(exclude_unset=True)
	if not update_payload:
		return _serialize_user(target_user)

	mapped_payload: Dict[str, Any] = {}
	if "name" in update_payload:
		mapped_payload["name"] = update_payload["name"]
	if "avatarUrl" in update_payload:
		mapped_payload["avatar_url"] = update_payload["avatarUrl"]

	# Restrict sensitive fields to super admin only
	if is_super:
		if "firebaseUid" in update_payload:
			mapped_payload["firebase_uid"] = update_payload["firebaseUid"]
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
			mapped_payload["status"] = "verified" if update_payload["isVerified"] else "pending"
		if "isActive" in update_payload:
			mapped_payload["is_active"] = update_payload["isActive"]

	if not mapped_payload:
		return _serialize_user(target_user)

	response = (
		supabase.table("users")
		.update(mapped_payload)
		.eq("id", user_id)
		.execute()
	)
	data = response.data or []
	if not data:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

	return _serialize_user(data[0])


@router.delete("/id/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_by_id(user_id: str, current_user: dict = Depends(require_roles(["super_admin"]))):
	supabase = get_supabase()

	target_user = _get_user_row(user_id)
	if current_user.get("firebase_uid") != "__system__":
		if target_user.get("organization_id") != current_user.get("organization_id"):
			raise HTTPException(
				status_code=status.HTTP_403_FORBIDDEN,
				detail="Access denied: target user is in a different organization"
			)

	# 1. Delete notifications for the user
	supabase.table("notifications").delete().eq("user_id", user_id).execute()
	# 2. Delete SOS alerts for the user
	supabase.table("sos_alerts").delete().eq("triggered_by", user_id).execute()

	# 3. Try to delete the user
	try:
		resp = supabase.table("users").delete().eq("id", user_id).execute()
		if not resp.data:
			raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
	except Exception:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Cannot delete user. This user has associated complaints, departments, or other active data in the system."
		)
	return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/notify-pending")
def notify_pending_user(
	payload: NotifyPendingUserRequest, 
	current_user: dict = Depends(get_current_user)
):
	name_str = f"User {payload.name}" if payload.name else "A new user"
	notify_role(
		role="super_admin",
		title="New Pending User Registration",
		body=f"{name_str} ({payload.email}) has registered and is pending verification.",
		org_id=payload.organizationId,
		data={"type": "new_user", "email": payload.email}
	)
	return {"status": "success"}
