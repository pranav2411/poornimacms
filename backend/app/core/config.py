from __future__ import annotations

from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings
from pydantic_settings import SettingsConfigDict


class Settings(BaseSettings):
    environment: str = "development"
    allowed_origins: str = Field(
        "http://localhost:3000",
        alias="ALLOWED_ORIGINS",
    )

    supabase_url: str = Field(..., alias="SUPABASE_URL")
    supabase_service_role_key: str = Field(..., alias="SUPABASE_SERVICE_ROLE_KEY")

    otp_secret: str = Field(..., alias="OTP_SECRET")
    otp_ttl_minutes: int = 10

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
    )

    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


settings = Settings()
