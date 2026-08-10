from __future__ import annotations

from fastapi.testclient import TestClient

from backend.app import main
from backend.app.health import ProbeResult


client = TestClient(main.app)


def test_live_is_independent_of_external_services() -> None:
    response = client.get("/health/live")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_ready_reports_dependency_failure(monkeypatch) -> None:
    async def failed_dependencies(_settings):
        return {
            "database": ProbeResult("failed", "database unavailable"),
            "redis": ProbeResult("ok", "Redis PING succeeded"),
            "model_configuration": ProbeResult(
                "failed", "Model configuration is missing"
            ),
        }

    monkeypatch.setattr(main, "collect_dependency_status", failed_dependencies)
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


def test_dependencies_do_not_expose_secrets(monkeypatch) -> None:
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

    monkeypatch.setattr(main, "collect_dependency_status", healthy_dependencies)
    response = client.get("/health/dependencies")
    assert response.status_code == 200
    body = response.text
    assert "api_key" not in body.lower()
    assert "password" not in body.lower()

