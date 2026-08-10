"""Environment-only configuration for the C-02 runtime baseline."""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Settings:
    app_env: str
    database_url: str
    redis_url: str
    model_provider: str
    model_base_url: str
    model_name: str
    model_api_key: str
    model_timeout_seconds: float

    @classmethod
    def from_env(cls) -> "Settings":
        timeout_raw = os.getenv("MODEL_TIMEOUT_SECONDS", "30")
        try:
            timeout = float(timeout_raw)
        except ValueError:
            timeout = 30.0

        return cls(
            app_env=os.getenv("APP_ENV", "development"),
            database_url=os.getenv("DATABASE_URL", ""),
            redis_url=os.getenv("REDIS_URL", ""),
            model_provider=os.getenv("MODEL_PROVIDER", ""),
            model_base_url=os.getenv("MODEL_BASE_URL", ""),
            model_name=os.getenv("MODEL_NAME", ""),
            model_api_key=os.getenv("MODEL_API_KEY", ""),
            model_timeout_seconds=timeout,
        )

    def model_missing_fields(self) -> list[str]:
        fields = {
            "MODEL_PROVIDER": self.model_provider,
            "MODEL_BASE_URL": self.model_base_url,
            "MODEL_NAME": self.model_name,
            "MODEL_API_KEY": self.model_api_key,
        }
        return [name for name, value in fields.items() if not value.strip()]

