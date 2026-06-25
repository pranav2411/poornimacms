from __future__ import annotations

from fastapi import APIRouter, Depends
from app.core.security import get_current_user

router = APIRouter(prefix="/meta", tags=["meta"])

CATEGORIES = ["Electrical", "Plumbing", "Carpentry", "IT/AV", "Housekeeping", "Other"]


@router.get("/categories")
def list_categories(current_user: dict = Depends(get_current_user)) -> list[str]:
    return CATEGORIES
