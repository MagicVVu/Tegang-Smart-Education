"""Dependency probes preserving the C-02 readiness contract in C-04."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any

import psycopg
import redis

from .config import Settings


@dataclass(frozen=True, slots=True)
class ProbeResult:
    status: str
    detail: str
    metadata: dict[str, Any] | None = None

    def as_dict(self) -> dict[str, Any]:
        result: dict[str, Any] = {"status": self.status, "detail": self.detail}
        if self.metadata:
            result["metadata"] = self.metadata
        return result


def _probe_database_sync(database_url: str) -> ProbeResult:
    if not database_url:
        return ProbeResult("failed", "DATABASE_URL is not configured")

    try:
        with psycopg.connect(database_url, connect_timeout=3) as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT current_database()")
                database_name = cursor.fetchone()[0]
                cursor.execute(
                    "SELECT extversion FROM pg_extension WHERE extname = 'vector'"
                )
                extension = cursor.fetchone()
        if extension is None:
            return ProbeResult(
                "failed",
                "PostgreSQL is reachable but pgvector is not enabled",
                {"database": database_name},
            )
        return ProbeResult(
            "ok",
            "PostgreSQL and pgvector are available",
            {"database": database_name, "pgvector_version": extension[0]},
        )
    except Exception as exc:  # noqa: BLE001 - converted to a safe health summary
        return ProbeResult("failed", f"PostgreSQL check failed: {type(exc).__name__}")


def _probe_redis_sync(redis_url: str) -> ProbeResult:
    if not redis_url:
        return ProbeResult("failed", "REDIS_URL is not configured")

    try:
        client = redis.Redis.from_url(
            redis_url,
            socket_connect_timeout=3,
            socket_timeout=3,
            decode_responses=True,
        )
        pong = client.ping()
        client.close()
        if pong is not True:
            return ProbeResult("failed", "Redis PING returned an unexpected result")
        return ProbeResult("ok", "Redis PING succeeded")
    except Exception as exc:  # noqa: BLE001 - converted to a safe health summary
        return ProbeResult("failed", f"Redis check failed: {type(exc).__name__}")


async def probe_database(settings: Settings) -> ProbeResult:
    return await asyncio.to_thread(_probe_database_sync, settings.database_url)


async def probe_redis(settings: Settings) -> ProbeResult:
    return await asyncio.to_thread(_probe_redis_sync, settings.redis_url)


def probe_model_configuration(settings: Settings) -> ProbeResult:
    missing = settings.model_missing_fields()
    if missing:
        return ProbeResult(
            "failed",
            "Model configuration is missing",
            {"missing_fields": missing},
        )
    return ProbeResult(
        "ok",
        "Model configuration is present; connectivity is not called by health checks",
        {"provider": settings.model_provider, "model": settings.model_name},
    )


async def collect_dependency_status(settings: Settings) -> dict[str, ProbeResult]:
    database, redis_result = await asyncio.gather(
        probe_database(settings),
        probe_redis(settings),
    )
    return {
        "database": database,
        "redis": redis_result,
        "model_configuration": probe_model_configuration(settings),
    }
