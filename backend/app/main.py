"""Testable C-04 FastAPI application factory and ASGI entry point."""

from __future__ import annotations

from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import Engine

from .api import api_router
from .config import Settings
from .database import create_database_engine, create_session_factory
from .errors import install_exception_handlers
from .health import ProbeResult, collect_dependency_status
from .observability import configure_logging, install_request_context

DependencyCollector = Callable[
    [Settings], Awaitable[dict[str, ProbeResult]]
]


def create_app(
    settings: Settings | None = None,
    *,
    engine: Engine | None = None,
    dependency_collector: DependencyCollector = collect_dependency_status,
) -> FastAPI:
    resolved_settings = settings or Settings.from_env()
    owns_engine = engine is None
    resolved_engine = engine or create_database_engine(resolved_settings)
    logger = configure_logging(resolved_settings.log_level)

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
        yield
        if owns_engine and resolved_engine is not None:
            resolved_engine.dispose()

    openapi_enabled = resolved_settings.openapi_enabled
    application = FastAPI(
        title="Tegang Smart Education API",
        version="0.3.0",
        docs_url="/docs" if openapi_enabled else None,
        redoc_url=None,
        openapi_url="/openapi.json" if openapi_enabled else None,
        lifespan=lifespan,
    )
    application.state.settings = resolved_settings
    application.state.engine = resolved_engine
    application.state.session_factory = create_session_factory(resolved_engine)
    application.state.collect_dependency_status = dependency_collector

    if resolved_settings.cors_origins:
        application.add_middleware(
            CORSMiddleware,
            allow_origins=list(resolved_settings.cors_origins),
            allow_credentials=True,
            allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allow_headers=[
                "Accept",
                "Authorization",
                "Content-Type",
                "X-Request-ID",
                "X-Trace-ID",
                "X-CSRF-Token",
                "X-Client-Kind",
            ],
            expose_headers=["X-Request-ID", "X-Trace-ID"],
        )

    install_request_context(application, logger)
    install_exception_handlers(application, logger)
    application.include_router(api_router)
    return application


app = create_app()
