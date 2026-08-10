"""C-02 minimum API process; this is not the C-04 business service skeleton."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from .config import Settings
from .health import collect_dependency_status

app = FastAPI(
    title="Tegang Smart Education C-02 Runtime Baseline",
    version="0.1.0",
    docs_url=None,
    redoc_url=None,
)


def _timestamp() -> str:
    return datetime.now(UTC).isoformat()


@app.get("/health/live")
async def live() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "backend-c02-baseline",
        "checked_at": _timestamp(),
    }


@app.get("/health/dependencies")
async def dependencies() -> JSONResponse:
    settings = Settings.from_env()
    results = await collect_dependency_status(settings)
    healthy = all(result.status == "ok" for result in results.values())
    return JSONResponse(
        status_code=200 if healthy else 503,
        content={
            "status": "ok" if healthy else "failed",
            "checked_at": _timestamp(),
            "dependencies": {
                name: result.as_dict() for name, result in results.items()
            },
        },
    )


@app.get("/health/ready")
async def ready() -> JSONResponse:
    settings = Settings.from_env()
    results = await collect_dependency_status(settings)
    healthy = all(result.status == "ok" for result in results.values())
    return JSONResponse(
        status_code=200 if healthy else 503,
        content={
            "status": "ready" if healthy else "not_ready",
            "checked_at": _timestamp(),
            "checks": {name: result.status for name, result in results.items()},
        },
    )

