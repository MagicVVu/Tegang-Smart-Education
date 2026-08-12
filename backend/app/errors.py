"""Safe application errors and FastAPI exception response handlers."""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from .identifiers import new_error_id, new_request_id, new_trace_id
from .schemas.api import ErrorResponse
from .schemas.errors import (
    ErrorCategory,
    ErrorCode,
    FieldError,
    UnifiedError,
)


class ApplicationError(Exception):
    def __init__(
        self,
        message: str,
        *,
        status_code: int,
        code: ErrorCode,
        category: ErrorCategory,
        retryable: bool = False,
        user_action: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.category = category
        self.retryable = retryable
        self.user_action = user_action
        self.details = details or {}


class ServiceUnavailableError(ApplicationError):
    def __init__(self, message: str = "A required service is unavailable.") -> None:
        super().__init__(
            message,
            status_code=503,
            code=ErrorCode.CONNECTOR_UNAVAILABLE,
            category=ErrorCategory.EXTERNAL_FAILURE,
            retryable=True,
            user_action="Retry after the dependency becomes available.",
        )


class AuthenticationError(ApplicationError):
    def __init__(self, message: str = "Authentication is required.") -> None:
        super().__init__(
            message,
            status_code=401,
            code=ErrorCode.UNAUTHORIZED,
            category=ErrorCategory.PERMISSION_SCOPE,
            retryable=False,
            user_action="Sign in again with an authorized account.",
        )


class ForbiddenScopeError(ApplicationError):
    def __init__(self, message: str = "The current identity is not authorized.") -> None:
        super().__init__(
            message,
            status_code=403,
            code=ErrorCode.FORBIDDEN_SCOPE,
            category=ErrorCategory.PERMISSION_SCOPE,
            retryable=False,
        )


class ResourceNotFoundError(ApplicationError):
    def __init__(self, message: str = "The requested resource was not found.") -> None:
        super().__init__(
            message,
            status_code=404,
            code=ErrorCode.RESOURCE_NOT_FOUND,
            category=ErrorCategory.NOT_FOUND,
            retryable=False,
        )


def _correlation(request: Request) -> tuple[str, str]:
    return (
        getattr(request.state, "request_id", "") or new_request_id(),
        getattr(request.state, "trace_id", "") or new_trace_id(),
    )


def _response(
    request: Request,
    *,
    status_code: int,
    code: ErrorCode,
    category: ErrorCategory,
    message: str,
    retryable: bool = False,
    user_action: str | None = None,
    details: dict[str, Any] | None = None,
    field_errors: list[FieldError] | None = None,
) -> JSONResponse:
    request_id, trace_id = _correlation(request)
    now = datetime.now(UTC)
    payload = ErrorResponse(
        request_id=request_id,
        trace_id=trace_id,
        occurred_at=now,
        error=UnifiedError(
            error_id=new_error_id(),
            code=code,
            message=message,
            category=category,
            retryable=retryable,
            user_action=user_action,
            details=details or {},
            field_errors=field_errors or [],
            trace_id=trace_id,
            occurred_at=now,
        ),
    )
    return JSONResponse(
        status_code=status_code,
        content=payload.model_dump(mode="json", exclude_none=True),
        headers={"X-Request-ID": request_id, "X-Trace-ID": trace_id},
    )


def install_exception_handlers(app: FastAPI, logger: logging.Logger) -> None:
    @app.exception_handler(ApplicationError)
    async def application_error_handler(
        request: Request, error: ApplicationError
    ) -> JSONResponse:
        return _response(
            request,
            status_code=error.status_code,
            code=error.code,
            category=error.category,
            message=error.message,
            retryable=error.retryable,
            user_action=error.user_action,
            details=error.details,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, error: RequestValidationError
    ) -> JSONResponse:
        fields = [
            FieldError(
                field=".".join(str(part) for part in item["loc"]),
                code=str(item["type"]),
                message="Invalid request field.",
            )
            for item in error.errors()
        ]
        return _response(
            request,
            status_code=422,
            code=ErrorCode.INVALID_INPUT,
            category=ErrorCategory.VALIDATION,
            message="The request contains invalid fields.",
            field_errors=fields,
        )

    @app.exception_handler(HTTPException)
    async def http_error_handler(request: Request, error: HTTPException) -> JSONResponse:
        if error.status_code == 404:
            code = ErrorCode.RESOURCE_NOT_FOUND
            category = ErrorCategory.NOT_FOUND
            message = "The requested resource was not found."
        elif error.status_code in {401, 403}:
            code = ErrorCode.UNAUTHORIZED if error.status_code == 401 else ErrorCode.FORBIDDEN_SCOPE
            category = ErrorCategory.PERMISSION_SCOPE
            message = "The request is not authorized for this resource."
        else:
            code = ErrorCode.INVALID_INPUT
            category = ErrorCategory.VALIDATION
            message = "The request could not be processed."
        return _response(
            request,
            status_code=error.status_code,
            code=code,
            category=category,
            message=message,
        )

    @app.exception_handler(Exception)
    async def unexpected_error_handler(request: Request, error: Exception) -> JSONResponse:
        request_id, trace_id = _correlation(request)
        logger.error(
            '{"event":"unhandled_exception","exception_type":"%s",'
            '"request_id":"%s","trace_id":"%s"}',
            type(error).__name__,
            request_id,
            trace_id,
        )
        return _response(
            request,
            status_code=500,
            code=ErrorCode.INTERNAL_ERROR,
            category=ErrorCategory.INTERNAL,
            message="An internal error occurred.",
            retryable=False,
            user_action="Contact support with the request ID if the problem persists.",
        )
