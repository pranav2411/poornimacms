from __future__ import annotations

from typing import List

from fastapi import APIRouter

from app.db.supabase import get_supabase
from app.models.schemas import VendorItem

router = APIRouter(prefix="/vendors", tags=["vendors"])


@router.get("", response_model=List[VendorItem])
def list_vendors() -> List[VendorItem]:
    supabase = get_supabase()
    # vendors are now stored in `users` table with role='vendor'
    response = (
        supabase.table("users")
        .select("id, name")
        .eq("role", "vendor")
        .order("name")
        .execute()
    )
    data = response.data or []
    return [{"id": item["id"], "name": item["name"]} for item in data]
