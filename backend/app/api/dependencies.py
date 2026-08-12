"""FastAPI dependency composition for settings, repositories, and services."""

from __future__ import annotations

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from ..config import Settings
from ..database import get_database_session
from ..errors import AuthenticationError
from ..repositories import (
    AuditRepository,
    AuthSessionRepository,
    IdentityRepository,
    SystemStatusRepository,
)
from ..schemas.auth import AuthPrincipal
from ..services import AuthService, AuthorizationService, SecurityContext, SystemStatusService

bearer_scheme = HTTPBearer(auto_error=False)


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_system_status_service(
    session: Session = Depends(get_database_session),
) -> SystemStatusService:
    return SystemStatusService(SystemStatusRepository(session))


def get_security_context(request: Request) -> SecurityContext:
    raw_client_kind = request.headers.get("X-Client-Kind", "web").strip().lower()
    client_kind = raw_client_kind if raw_client_kind in {"web", "android"} else "web"
    return SecurityContext(
        request_id=request.state.request_id,
        trace_id=request.state.trace_id,
        client_kind=client_kind,
        user_agent=request.headers.get("User-Agent", "unknown"),
    )


def get_auth_service(
    settings: Settings = Depends(get_settings),
    session: Session = Depends(get_database_session),
) -> AuthService:
    return AuthService(
        settings,
        IdentityRepository(session),
        AuthSessionRepository(session),
        AuditRepository(session),
    )


def get_authorization_service(
    session: Session = Depends(get_database_session),
) -> AuthorizationService:
    return AuthorizationService(IdentityRepository(session), AuditRepository(session))


def get_current_principal(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    context: SecurityContext = Depends(get_security_context),
    service: AuthService = Depends(get_auth_service),
) -> AuthPrincipal:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AuthenticationError()
    return service.authenticate_access(credentials.credentials, context)
