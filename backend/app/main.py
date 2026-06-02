from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import complaints, meta, notifications, stats, vendors
from app.routers.users import router as users_router

app = FastAPI(title="Poornima CMS API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}


app.include_router(complaints.router)
app.include_router(vendors.router)
app.include_router(notifications.router)
app.include_router(stats.router)
app.include_router(meta.router)
app.include_router(users_router)
