from __future__ import annotations

from fastapi.testclient import TestClient

from backend.app.health import ProbeResult
from backend.app.main import create_app
from backend.tests.conftest import make_settings


def test_live_is_independent_of_external_services() -> None:
    with TestClient(create_app(make_settings(database_url=""))) as client:
        response = client.get("/health/live")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.headers["x-request-id"].startswith("req_")
    assert response.headers["x-trace-id"].startswith("trc_")


def test_ready_reports_dependency_failure() -> None:
    async def failed_dependencies(_settings):
        return {
            "database": ProbeResult("failed", "database unavailable"),
            "redis": ProbeResult("ok", "Redis PING succeeded"),
            "model_configuration": ProbeResult(
                "failed", "Model configuration is missing"
            ),
        }

    app = create_app(
        make_settings(database_url=""), dependency_collector=failed_dependencies
    )
    with TestClient(app) as client:
        response = client.get("/health/ready")

    assert response.status_code == 503
    assert response.json() == {
        "status": "not_ready",
        "checked_at": response.json()["checked_at"],
        "checks": {
            "database": "failed",
            "redis": "ok",
            "model_configuration": "failed",
        },
    }


def test_dependencies_do_not_expose_secrets() -> None:
    async def healthy_dependencies(_settings):
        return {
            "database": ProbeResult("ok", "PostgreSQL and pgvector are available"),
            "redis": ProbeResult("ok", "Redis PING succeeded"),
            "model_configuration": ProbeResult(
                "ok",
                "Model configuration is present",
                {"provider": "compatible", "model": "test-model"},
            ),
        }

    app = create_app(
        make_settings(database_url=""), dependency_collector=healthy_dependencies
    )
    with TestClient(app) as client:
        response = client.get("/health/dependencies")

    assert response.status_code == 200
    body = response.text.lower()
    assert "api_key" not in body
    assert "password" not in body
