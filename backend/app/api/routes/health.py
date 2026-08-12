"""C-02-compatible process and dependency health routes."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from ...config import Settings
from ..dependencies import get_settings

router = APIRouter(prefix="/health", tags=["health"])


def _timestamp() -> str:
    return datetime.now(UTC).isoformat()


@router.get("/live")
async def live() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "backend-c04-skeleton",
        "checked_at": _timestamp(),
    }


@router.get("/dependencies")
async def dependencies(
    request: Request, settings: Settings = Depends(get_settings)
) -> JSONResponse:
    results = await request.app.state.collect_dependency_status(settings)
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


@router.get("/ready")
async def ready(
    request: Request, settings: Settings = Depends(get_settings)
) -> JSONResponse:
    results = await request.app.state.collect_dependency_status(settings)
    healthy = all(result.status == "ok" for result in results.values())
    return JSONResponse(
        status_code=200 if healthy else 503,
        content={
            "status": "ready" if healthy else "not_ready",
            "checked_at": _timestamp(),
            "checks": {name: result.status for name, result in results.items()},
        },
    )
