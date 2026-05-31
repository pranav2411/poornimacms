from __future__ import annotations

from typing import List

from fastapi import APIRouter

from app.db.supabase import get_supabase
from app.models.schemas import VendorItem

router = APIRouter(prefix="/vendors", tags=["vendors"])


@router.get("", response_model=List[VendorItem])
def list_vendors() -> List[VendorItem]:
    supabase = get_supabase()
    response = supabase.table("vendors").select("name").order("name").execute()
    data = response.data or []
    return [{"name": item["name"]} for item in data]
