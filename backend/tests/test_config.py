from __future__ import annotations

import pytest

from backend.app.config import Settings


def test_development_defaults_enable_local_docs_and_bounded_cors(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    monkeypatch.delenv("OPENAPI_ENABLED", raising=False)

    settings = Settings.from_env()

    assert settings.openapi_enabled is True
    assert settings.cors_origins == (
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    )


def test_production_rejects_wildcard_cors(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("CORS_ORIGINS", "*")

    with pytest.raises(ValueError, match="cannot contain"):
        Settings.from_env()


def test_production_disables_openapi_by_default(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("CORS_ORIGINS", "https://training.example.com")
    monkeypatch.setenv("AUTH_JWT_SECRET", "production-test-secret-that-is-long-enough")
    monkeypatch.delenv("OPENAPI_ENABLED", raising=False)

    settings = Settings.from_env()

    assert settings.openapi_enabled is False
    assert settings.cors_origins == ("https://training.example.com",)


def test_production_requires_explicit_auth_secret(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("CORS_ORIGINS", "https://training.example.com")
    monkeypatch.delenv("AUTH_JWT_SECRET", raising=False)

    with pytest.raises(ValueError, match="AUTH_JWT_SECRET is required"):
        Settings.from_env()
