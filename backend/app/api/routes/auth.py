"""Formal authentication endpoints for Web and Android clients."""

from __future__ import annotations

import secrets
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request, Response

from ...config import Settings
from ...errors import AuthenticationError, ForbiddenScopeError
from ...schemas.auth import (
    AuthMeResponse,
    AuthPrincipal,
    AuthSessionData,
    AuthSessionResponse,
    DemoLoginRequest,
    DemoProfilesResponse,
    LoginRequest,
    LogoutRequest,
    LogoutResponse,
    LogoutResult,
    RefreshRequest,
)
from ...services import AuthService, AuthorizationService, IssuedSession, SecurityContext
from ..dependencies import (
    get_auth_service,
    get_authorization_service,
    get_current_principal,
    get_security_context,
    get_settings,
)

router = APIRouter(prefix="/api/v1/auth", tags=["authentication"])

REFRESH_COOKIE = "tegang_refresh"
CSRF_COOKIE = "tegang_csrf"


def _envelope(request: Request) -> dict[str, object]:
    return {
        "request_id": request.state.request_id,
        "trace_id": request.state.trace_id,
        "occurred_at": datetime.now(UTC),
    }


def _set_web_cookies(
    response: Response,
    issued: IssuedSession,
    settings: Settings,
) -> None:
    max_age = settings.auth_refresh_token_days * 24 * 60 * 60
    response.set_cookie(
        REFRESH_COOKIE,
        issued.refresh_token,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite="lax",
        path="/api/v1/auth",
        max_age=max_age,
    )
    response.set_cookie(
        CSRF_COOKIE,
        issued.csrf_token,
        httponly=False,
        secure=settings.auth_cookie_secure,
        samesite="lax",
        path="/",
        max_age=max_age,
    )


def _clear_web_cookies(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        REFRESH_COOKIE,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite="lax",
        path="/api/v1/auth",
    )
    response.delete_cookie(
        CSRF_COOKIE,
        httponly=False,
        secure=settings.auth_cookie_secure,
        samesite="lax",
        path="/",
    )


def _check_web_csrf(request: Request, settings: Settings) -> None:
    origin = request.headers.get("Origin")
    if origin and origin not in settings.cors_origins:
        raise ForbiddenScopeError("The request origin is not allowed.")
    csrf_cookie = request.cookies.get(CSRF_COOKIE, "")
    csrf_header = request.headers.get("X-CSRF-Token", "")
    if not csrf_cookie or not csrf_header or not secrets.compare_digest(csrf_cookie, csrf_header):
        raise ForbiddenScopeError("The CSRF token is missing or invalid.")


def _raw_refresh(
    request: Request,
    payload: RefreshRequest | LogoutRequest | None,
    context: SecurityContext,
) -> str:
    if context.client_kind == "android":
        secret = payload.refresh_token if payload is not None else None
        value = secret.get_secret_value() if secret is not None else ""
    else:
        value = request.cookies.get(REFRESH_COOKIE, "")
    if not value:
        raise AuthenticationError("The refresh token is missing or invalid.")
    return value


def _session_response(
    request: Request,
    response: Response,
    issued: IssuedSession,
    settings: Settings,
    context: SecurityContext,
) -> AuthSessionResponse:
    if context.client_kind == "web":
        _set_web_cookies(response, issued, settings)
    return AuthSessionResponse(
        data=AuthSessionData(
            access_token=issued.access_token,
            expires_at=issued.access_expires_at,
            principal=issued.principal,
            refresh_token=issued.refresh_token if context.client_kind == "android" else None,
        ),
        **_envelope(request),
    )


@router.post("/login", response_model=AuthSessionResponse)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    settings: Settings = Depends(get_settings),
    context: SecurityContext = Depends(get_security_context),
    service: AuthService = Depends(get_auth_service),
) -> AuthSessionResponse:
    issued = service.login(payload.account, payload.password.get_secret_value(), context)
    return _session_response(request, response, issued, settings, context)


@router.post("/refresh", response_model=AuthSessionResponse)
def refresh(
    request: Request,
    response: Response,
    payload: RefreshRequest | None = None,
    settings: Settings = Depends(get_settings),
    context: SecurityContext = Depends(get_security_context),
    service: AuthService = Depends(get_auth_service),
) -> AuthSessionResponse:
    if context.client_kind == "web":
        _check_web_csrf(request, settings)
    issued = service.refresh(_raw_refresh(request, payload, context), context)
    return _session_response(request, response, issued, settings, context)


@router.post("/logout", response_model=LogoutResponse)
def logout(
    request: Request,
    response: Response,
    payload: LogoutRequest | None = None,
    settings: Settings = Depends(get_settings),
    context: SecurityContext = Depends(get_security_context),
    service: AuthService = Depends(get_auth_service),
) -> LogoutResponse:
    if context.client_kind == "web":
        _check_web_csrf(request, settings)
    revoked_at = service.logout(_raw_refresh(request, payload, context), context)
    if context.client_kind == "web":
        _clear_web_cookies(response, settings)
    return LogoutResponse(data=LogoutResult(revoked_at=revoked_at), **_envelope(request))


@router.get("/me", response_model=AuthMeResponse)
def me(
    request: Request,
    principal: AuthPrincipal = Depends(get_current_principal),
    context: SecurityContext = Depends(get_security_context),
    authorization: AuthorizationService = Depends(get_authorization_service),
) -> AuthMeResponse:
    authorization.record_authenticated_access(principal, context, action="auth.me")
    return AuthMeResponse(data=principal, **_envelope(request))


@router.get("/demo-profiles", response_model=DemoProfilesResponse)
def demo_profiles(
    request: Request,
    service: AuthService = Depends(get_auth_service),
) -> DemoProfilesResponse:
    return DemoProfilesResponse(data=service.list_demo_profiles(), **_envelope(request))


@router.post("/demo-login", response_model=AuthSessionResponse)
def demo_login(
    payload: DemoLoginRequest,
    request: Request,
    response: Response,
    settings: Settings = Depends(get_settings),
    context: SecurityContext = Depends(get_security_context),
    service: AuthService = Depends(get_auth_service),
) -> AuthSessionResponse:
    issued = service.demo_login(payload.account, context)
    return _session_response(request, response, issued, settings, context)
