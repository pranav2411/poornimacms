from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/meta", tags=["meta"])

CATEGORIES = ["Electrical", "Plumbing", "Carpentry", "IT/AV", "Housekeeping", "Other"]


@router.get("/categories")
def list_categories() -> list[str]:
    return CATEGORIES
