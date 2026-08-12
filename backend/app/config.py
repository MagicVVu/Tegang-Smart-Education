"""Environment-only application configuration with production-safe defaults."""

from __future__ import annotations

import os
from dataclasses import dataclass


def _as_bool(value: str | None, *, default: bool) -> bool:
    if value is None:
        return default
    normalized = value.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    return default


def _as_origins(value: str | None, *, development: bool) -> tuple[str, ...]:
    if value is None and development:
        return ("http://127.0.0.1:5173", "http://localhost:5173")
    if not value:
        return ()
    return tuple(dict.fromkeys(item.strip() for item in value.split(",") if item.strip()))


@dataclass(frozen=True, slots=True)
class Settings:
    app_env: str
    log_level: str
    database_url: str
    redis_url: str
    model_provider: str
    model_base_url: str
    model_name: str
    model_api_key: str
    model_timeout_seconds: float
    cors_origins: tuple[str, ...]
    openapi_enabled: bool
    demo_mode: bool
    auth_jwt_secret: str
    auth_jwt_issuer: str
    auth_jwt_audience: str
    auth_access_token_minutes: int
    auth_refresh_token_days: int
    auth_cookie_secure: bool

    @classmethod
    def from_env(cls) -> "Settings":
        app_env = os.getenv("APP_ENV", "development").strip().lower()
        development = app_env in {"development", "test"}
        timeout_raw = os.getenv("MODEL_TIMEOUT_SECONDS", "30")
        try:
            timeout = float(timeout_raw)
        except ValueError:
            timeout = 30.0
        try:
            access_token_minutes = int(os.getenv("AUTH_ACCESS_TOKEN_MINUTES", "15"))
            refresh_token_days = int(os.getenv("AUTH_REFRESH_TOKEN_DAYS", "7"))
        except ValueError as error:
            raise ValueError("Authentication token lifetimes must be integers") from error

        settings = cls(
            app_env=app_env,
            log_level=os.getenv("LOG_LEVEL", "INFO").strip().upper(),
            database_url=os.getenv("DATABASE_URL", "").strip(),
            redis_url=os.getenv("REDIS_URL", "").strip(),
            model_provider=os.getenv("MODEL_PROVIDER", "").strip(),
            model_base_url=os.getenv("MODEL_BASE_URL", "").strip(),
            model_name=os.getenv("MODEL_NAME", "").strip(),
            model_api_key=os.getenv("MODEL_API_KEY", "").strip(),
            model_timeout_seconds=timeout,
            cors_origins=_as_origins(
                os.getenv("CORS_ORIGINS"), development=development
            ),
            openapi_enabled=_as_bool(
                os.getenv("OPENAPI_ENABLED"), default=development
            ),
            demo_mode=_as_bool(os.getenv("DEMO_MODE"), default=False),
            auth_jwt_secret=os.getenv("AUTH_JWT_SECRET", "").strip(),
            auth_jwt_issuer=os.getenv(
                "AUTH_JWT_ISSUER", "tegang-smart-education"
            ).strip(),
            auth_jwt_audience=os.getenv(
                "AUTH_JWT_AUDIENCE", "tegang-clients"
            ).strip(),
            auth_access_token_minutes=access_token_minutes,
            auth_refresh_token_days=refresh_token_days,
            auth_cookie_secure=_as_bool(
                os.getenv("AUTH_COOKIE_SECURE"), default=app_env == "production"
            ),
        )
        settings.validate()
        return settings

    @property
    def sqlalchemy_database_url(self) -> str:
        if self.database_url.startswith("postgresql://"):
            return self.database_url.replace(
                "postgresql://", "postgresql+psycopg://", 1
            )
        return self.database_url

    def validate(self) -> None:
        if self.app_env == "production" and "*" in self.cors_origins:
            raise ValueError("CORS_ORIGINS cannot contain '*' in production")
        if self.model_timeout_seconds <= 0:
            raise ValueError("MODEL_TIMEOUT_SECONDS must be positive")
        if self.auth_jwt_secret and len(self.auth_jwt_secret) < 32:
            raise ValueError("AUTH_JWT_SECRET must contain at least 32 characters")
        if self.app_env == "production" and not self.auth_jwt_secret:
            raise ValueError("AUTH_JWT_SECRET is required in production")
        if not self.auth_jwt_issuer or not self.auth_jwt_audience:
            raise ValueError("Authentication issuer and audience are required")
        if self.auth_access_token_minutes <= 0 or self.auth_refresh_token_days <= 0:
            raise ValueError("Authentication token lifetimes must be positive")

    @property
    def auth_enabled(self) -> bool:
        return len(self.auth_jwt_secret) >= 32

    def model_missing_fields(self) -> list[str]:
        fields = {
            "MODEL_PROVIDER": self.model_provider,
            "MODEL_BASE_URL": self.model_base_url,
            "MODEL_NAME": self.model_name,
            "MODEL_API_KEY": self.model_api_key,
        }
        return [name for name, value in fields.items() if not value]
