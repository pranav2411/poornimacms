from __future__ import annotations

from typing import List, Optional
from fastapi import Depends, HTTPException, Header, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth as firebase_auth

from app.db.supabase import get_supabase
from app.core.config import settings
from app.core.fcm import init_fcm

security_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    x_system_key: Optional[str] = Header(default=None, alias="x-system-key")
) -> dict:
    """
    Middleware dependency to authenticate backend API requests.
    Accepts:
    1. A Server-to-Server shared API key header: `x-system-key` (matches SUPABASE_SERVICE_ROLE_KEY)
    2. A Firebase client JWT ID token in the `Authorization: Bearer <token>` header.
    """
    # 1. Server-to-Server System Authentication
    if x_system_key and x_system_key == settings.supabase_service_role_key:
        return {
            "id": "__system__",
            "firebase_uid": "__system__",
            "name": "System Server",
            "email": "system@local",
            "role": "super_admin",
            "is_verified": True,
            "is_active": True,
            "db_registered": True
        }

    # 2. Token-based User Authentication
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials"
        )

    # Initialize Firebase Admin SDK if not already done
    init_fcm()

    id_token = credentials.credentials
    try:
        decoded_token = firebase_auth.verify_id_token(id_token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired authentication token: {str(e)}"
        )

    firebase_uid = decoded_token.get("uid")
    if not firebase_uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing user ID (uid)"
        )

    # 3. Retrieve user profile from Supabase database
    supabase = get_supabase()
    response = supabase.table("users").select("*").eq("firebase_uid", firebase_uid).limit(1).execute()
    users = response.data or []
    
    if not users:
        # User is authenticated in Firebase but does not exist in our database yet
        # Return a shell object with db_registered = False to allow registration routes
        return {
            "id": None,
            "firebase_uid": firebase_uid,
            "name": decoded_token.get("name"),
            "email": decoded_token.get("email"),
            "role": None,
            "is_verified": False,
            "is_active": True,
            "db_registered": False
        }

    user = users[0]
    
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    return {
        "id": user.get("id"),
        "firebase_uid": firebase_uid,
        "name": user.get("name"),
        "email": user.get("email"),
        "role": user.get("role"),
        "is_verified": bool(user.get("is_verified") or user.get("status") == "verified"),
        "is_active": bool(user.get("is_active", True)),
        "department_id": user.get("department_id"),
        "db_registered": True
    }


def require_roles(allowed_roles: List[str]):
    """
    Role-based authorization dependency builder.
    Verifies that the user role matches one of the allowed roles.
    Bypasses checking for verified status if "pending" is in the allowed roles list.
    """
    def dependency(current_user: dict = Depends(get_current_user)) -> dict:
        # Bypasses for Server-to-Server requests
        if current_user.get("firebase_uid") == "__system__":
            return current_user

        if not current_user.get("db_registered", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User profile must be fully registered in the database"
            )

        user_role = current_user.get("role")
        # Normalize: both 'super_admin' and 'superadmin' are mapped to the same permissions
        role_map = {"super_admin": "superadmin", "superadmin": "superadmin"}
        normalized_role = role_map.get(user_role, user_role)

        # Super admin always has full access
        if normalized_role == "superadmin":
            return current_user

        # Match roles
        is_allowed = False
        for role in allowed_roles:
            norm_allowed = role_map.get(role, role)
            if normalized_role == norm_allowed:
                is_allowed = True
                break

        if not is_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: unauthorized user role"
            )

        # Enforce verification check unless the route allows "pending" users
        is_verified = current_user.get("is_verified", False)
        if not is_verified and "pending" not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: account verification is pending"
            )

        return current_user
    return dependency
