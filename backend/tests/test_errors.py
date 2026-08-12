from __future__ import annotations

from fastapi.testclient import TestClient

from backend.app.api.dependencies import get_system_status_service
from backend.app.main import create_app
from backend.tests.conftest import make_settings


def test_not_found_uses_safe_unified_error_contract() -> None:
    app = create_app(make_settings(database_url=""))
    with TestClient(app) as client:
        response = client.get(
            "/does-not-exist",
            headers={
                "X-Request-ID": "req_01ARZ3NDEKTSV4RRFFQ69G5FAV",
                "X-Trace-ID": "trc_01ARZ3NDEKTSV4RRFFQ69G5FAV",
            },
        )

    body = response.json()
    assert response.status_code == 404
    assert body["request_id"] == "req_01ARZ3NDEKTSV4RRFFQ69G5FAV"
    assert body["trace_id"] == "trc_01ARZ3NDEKTSV4RRFFQ69G5FAV"
    assert body["error"]["code"] == "RESOURCE_NOT_FOUND"
    assert "stack" not in response.text.lower()


def test_missing_database_returns_correlated_service_error() -> None:
    app = create_app(make_settings(database_url=""))
    with TestClient(app) as client:
        response = client.get("/api/v1/system/database-status")

    body = response.json()
    assert response.status_code == 503
    assert body["error"]["code"] == "CONNECTOR_UNAVAILABLE"
    assert body["request_id"] == response.headers["x-request-id"]
    assert body["trace_id"] == response.headers["x-trace-id"]
    assert "database_url" not in response.text.lower()


def test_unexpected_exception_does_not_expose_internal_detail() -> None:
    class BrokenService:
        def get_database_status(self):
            raise RuntimeError("postgresql://user:secret@internal/db")

    app = create_app(make_settings(database_url=""))
    app.dependency_overrides[get_system_status_service] = lambda: BrokenService()
    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/api/v1/system/database-status")

    assert response.status_code == 500
    assert response.json()["error"]["code"] == "INTERNAL_ERROR"
    assert "secret" not in response.text
    assert "internal/db" not in response.text
