"""Request correlation and minimal structured access logging."""

from __future__ import annotations

import contextvars
import json
import logging
from time import perf_counter

from fastapi import FastAPI, Request

from .identifiers import accepted_request_id, accepted_trace_id

request_id_context: contextvars.ContextVar[str] = contextvars.ContextVar(
    "request_id", default=""
)
trace_id_context: contextvars.ContextVar[str] = contextvars.ContextVar(
    "trace_id", default=""
)


def configure_logging(level: str) -> logging.Logger:
    logger = logging.getLogger("tegang.backend")
    logger.setLevel(getattr(logging, level, logging.INFO))
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(message)s"))
        logger.addHandler(handler)
    logger.propagate = False
    return logger


def install_request_context(app: FastAPI, logger: logging.Logger) -> None:
    @app.middleware("http")
    async def correlate_request(request: Request, call_next):
        request_id = accepted_request_id(request.headers.get("x-request-id"))
        trace_id = accepted_trace_id(request.headers.get("x-trace-id"))
        request.state.request_id = request_id
        request.state.trace_id = trace_id
        request_token = request_id_context.set(request_id)
        trace_token = trace_id_context.set(trace_id)
        started = perf_counter()
        status_code = 500
        try:
            response = await call_next(request)
            status_code = response.status_code
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Trace-ID"] = trace_id
            return response
        finally:
            logger.info(
                json.dumps(
                    {
                        "event": "http_request",
                        "method": request.method,
                        "path": request.url.path,
                        "status_code": status_code,
                        "duration_ms": round((perf_counter() - started) * 1000, 2),
                        "request_id": request_id,
                        "trace_id": trace_id,
                    },
                    ensure_ascii=False,
                    separators=(",", ":"),
                )
            )
            request_id_context.reset(request_token)
            trace_id_context.reset(trace_token)
