from __future__ import annotations

from collections.abc import Iterator

import pytest
from sqlalchemy import Engine, create_engine, text
from sqlalchemy.pool import StaticPool

from backend.app.config import Settings
from backend.app.models import Base
from backend.app.services.system import CURRENT_MIGRATION_REVISION


def make_settings(**overrides: object) -> Settings:
    values: dict[str, object] = {
        "app_env": "test",
        "log_level": "WARNING",
        "database_url": "sqlite+pysqlite:///:memory:",
        "redis_url": "redis://test.invalid:6379/0",
        "model_provider": "test-provider",
        "model_base_url": "https://model.invalid/v1",
        "model_name": "test-model",
        "model_api_key": "test-only-key",
        "model_timeout_seconds": 1.0,
        "cors_origins": ("http://127.0.0.1:5173",),
        "openapi_enabled": True,
        "demo_mode": True,
        "auth_jwt_secret": "test-only-auth-secret-that-is-long-enough",
        "auth_jwt_issuer": "tegang-test",
        "auth_jwt_audience": "tegang-test-clients",
        "auth_access_token_minutes": 15,
        "auth_refresh_token_days": 7,
        "auth_cookie_secure": False,
    }
    values.update(overrides)
    return Settings(**values)


@pytest.fixture
def sqlite_engine() -> Iterator[Engine]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL)"))
        connection.execute(
            text("INSERT INTO alembic_version (version_num) VALUES (:revision)"),
            {"revision": CURRENT_MIGRATION_REVISION},
        )
    yield engine
    engine.dispose()
