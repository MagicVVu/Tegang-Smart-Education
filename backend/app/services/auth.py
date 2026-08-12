"""Authentication orchestration with fresh principals and rotating refresh tokens."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from ..config import Settings
from ..errors import AuthenticationError, ForbiddenScopeError
from ..identifiers import new_ulid
from ..repositories import AuditRepository, AuthSessionRepository, IdentityRepository
from ..schemas.auth import AuthPrincipal, DemoProfile
from ..security import (
    PasswordVerifier,
    decode_access_token,
    hash_refresh_token,
    issue_access_token,
    new_csrf_token,
    new_refresh_token,
)


@dataclass(frozen=True, slots=True)
class SecurityContext:
    request_id: str
    trace_id: str
    client_kind: str
    user_agent: str

    @property
    def client_summary(self) -> dict[str, object]:
        return {
            "client_kind": self.client_kind,
            "user_agent": self.user_agent[:120],
        }


@dataclass(frozen=True, slots=True)
class IssuedSession:
    access_token: str
    access_expires_at: datetime
    principal: AuthPrincipal
    refresh_token: str
    csrf_token: str


def _utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


class AuthService:
    def __init__(
        self,
        settings: Settings,
        identity: IdentityRepository,
        sessions: AuthSessionRepository,
        audit: AuditRepository,
        password_verifier: PasswordVerifier | None = None,
    ) -> None:
        self._settings = settings
        self._identity = identity
        self._sessions = sessions
        self._audit = audit
        self._passwords = password_verifier or PasswordVerifier()

    def _audit_event(
        self,
        context: SecurityContext,
        *,
        actor_user_id: str | None,
        session_id: str | None,
        roles: list[str],
        action: str,
        allowed: bool,
        reason: str,
        resource_id: str | None = None,
    ) -> None:
        self._audit.record(
            audit_id=f"audit_{new_ulid()}",
            occurred_at=datetime.now(UTC),
            actor_user_id=actor_user_id,
            session_id=session_id,
            effective_roles=roles,
            action=action,
            resource_type="authentication_session",
            resource_id=resource_id,
            resource_department_id=None,
            allowed=allowed,
            reason_code=reason,
            request_id=context.request_id,
            trace_id=context.trace_id,
            client_summary=context.client_summary,
        )

    def _principal(
        self,
        *,
        user_id: str,
        session_id: str,
        context: SecurityContext,
    ) -> AuthPrincipal:
        principal = self._identity.load_principal(
            external_user_id=user_id,
            session_id=session_id,
            request_id=context.request_id,
            trace_id=context.trace_id,
        )
        if principal is None:
            raise AuthenticationError("The account or password is incorrect.")
        return principal

    def _issue(
        self,
        *,
        internal_user_id: int,
        external_user_id: str,
        context: SecurityContext,
        demo: bool,
    ) -> IssuedSession:
        now = datetime.now(UTC)
        session_id = f"sid_{new_ulid()}"
        principal = self._principal(
            user_id=external_user_id,
            session_id=session_id,
            context=context,
        )
        if context.client_kind == "android" and principal.primary_role.value != "employee":
            self._audit_event(
                context,
                actor_user_id=principal.user_id,
                session_id=None,
                roles=[role.value for role in principal.roles],
                action="auth.demo_login" if demo else "auth.login",
                allowed=False,
                reason="android_employee_only",
            )
            self._audit.commit_security_event()
            raise ForbiddenScopeError("The Android client is restricted to employee identities.")

        refresh = new_refresh_token()
        self._sessions.create(
            session_external_id=session_id,
            user_id=internal_user_id,
            client_kind=context.client_kind,
            issued_at=now,
            expires_at=now + timedelta(days=self._settings.auth_refresh_token_days),
            refresh_hash=hash_refresh_token(refresh),
        )
        access, access_expires = issue_access_token(
            self._settings,
            user_id=external_user_id,
            session_id=session_id,
            now=now,
        )
        self._audit_event(
            context,
            actor_user_id=principal.user_id,
            session_id=session_id,
            roles=[role.value for role in principal.roles],
            action="auth.demo_login" if demo else "auth.login",
            allowed=True,
            reason="authenticated",
            resource_id=session_id,
        )
        return IssuedSession(
            access_token=access,
            access_expires_at=access_expires,
            principal=principal,
            refresh_token=refresh,
            csrf_token=new_csrf_token(),
        )

    def login(self, account: str, password: str, context: SecurityContext) -> IssuedSession:
        credential = self._identity.find_credential(account)
        valid = self._passwords.verify(
            password,
            credential.password_hash if credential is not None else None,
        )
        if credential is None or not valid or credential.status != "active":
            self._audit_event(
                context,
                actor_user_id=credential.external_user_id if credential else None,
                session_id=None,
                roles=[],
                action="auth.login",
                allowed=False,
                reason="invalid_credentials",
            )
            self._audit.commit_security_event()
            raise AuthenticationError("The account or password is incorrect.")
        return self._issue(
            internal_user_id=credential.internal_user_id,
            external_user_id=credential.external_user_id,
            context=context,
            demo=False,
        )

    def list_demo_profiles(self) -> list[DemoProfile]:
        if not self._settings.demo_mode:
            raise ForbiddenScopeError("Demo identities are disabled.")
        return self._identity.list_demo_profiles()

    def demo_login(self, account: str, context: SecurityContext) -> IssuedSession:
        if not self._settings.demo_mode:
            raise ForbiddenScopeError("Demo identities are disabled.")
        credential = self._identity.find_credential(account)
        if credential is None or credential.status != "active":
            raise AuthenticationError("The demo identity is unavailable.")
        return self._issue(
            internal_user_id=credential.internal_user_id,
            external_user_id=credential.external_user_id,
            context=context,
            demo=True,
        )

    def authenticate_access(
        self,
        token: str,
        context: SecurityContext,
    ) -> AuthPrincipal:
        try:
            claims = decode_access_token(self._settings, token)
        except AuthenticationError:
            self._audit_event(
                context,
                actor_user_id=None,
                session_id=None,
                roles=[],
                action="auth.access",
                allowed=False,
                reason="invalid_access_token",
            )
            self._audit.commit_security_event()
            raise
        session = self._sessions.get_session(claims.session_id)
        now = datetime.now(UTC)
        if (
            session is None
            or session.revoked_at is not None
            or _utc(session.expires_at) <= now
        ):
            self._audit_event(
                context,
                actor_user_id=claims.user_id,
                session_id=claims.session_id,
                roles=[],
                action="auth.access",
                allowed=False,
                reason="session_invalid_or_expired",
            )
            self._audit.commit_security_event()
            raise AuthenticationError("The authentication session is invalid or expired.")
        try:
            principal = self._principal(
                user_id=claims.user_id,
                session_id=claims.session_id,
                context=context,
            )
        except AuthenticationError:
            self._sessions.revoke(session, at=now, reason="identity_inactive")
            self._audit_event(
                context,
                actor_user_id=claims.user_id,
                session_id=claims.session_id,
                roles=[],
                action="auth.access",
                allowed=False,
                reason="identity_inactive",
            )
            self._audit.commit_security_event()
            raise
        self._sessions.touch(session, at=now)
        return principal

    def refresh(self, raw_token: str, context: SecurityContext) -> IssuedSession:
        state = self._sessions.get_by_refresh_hash(hash_refresh_token(raw_token))
        now = datetime.now(UTC)
        if state is None:
            raise AuthenticationError("The refresh token is invalid or expired.")
        if state.session.client_kind != context.client_kind:
            self._sessions.revoke(state.session, at=now, reason="client_kind_mismatch")
            self._audit_event(
                context,
                actor_user_id=self._identity.external_user_id(state.session.user_id),
                session_id=state.session.external_id,
                roles=[],
                action="auth.refresh",
                allowed=False,
                reason="client_kind_mismatch",
            )
            self._audit.commit_security_event()
            raise AuthenticationError("The refresh token is invalid or expired.")
        if state.token.used_at is not None or state.token.revoked_at is not None:
            self._sessions.revoke(state.session, at=now, reason="refresh_token_reuse")
            self._audit_event(
                context,
                actor_user_id=self._identity.external_user_id(state.session.user_id),
                session_id=state.session.external_id,
                roles=[],
                action="auth.refresh",
                allowed=False,
                reason="refresh_token_reuse",
            )
            self._audit.commit_security_event()
            raise AuthenticationError("The refresh token is invalid or expired.")
        if state.session.revoked_at is not None or _utc(state.token.expires_at) <= now:
            raise AuthenticationError("The refresh token is invalid or expired.")

        principal = self._principal(
            user_id=self._identity_external_id(state.session.user_id),
            session_id=state.session.external_id,
            context=context,
        )
        next_refresh = new_refresh_token()
        refresh_expires = now + timedelta(days=self._settings.auth_refresh_token_days)
        self._sessions.rotate(
            state,
            new_hash=hash_refresh_token(next_refresh),
            issued_at=now,
            expires_at=refresh_expires,
        )
        access, access_expires = issue_access_token(
            self._settings,
            user_id=principal.user_id,
            session_id=principal.session_id,
            now=now,
        )
        self._audit_event(
            context,
            actor_user_id=principal.user_id,
            session_id=principal.session_id,
            roles=[role.value for role in principal.roles],
            action="auth.refresh",
            allowed=True,
            reason="refresh_rotated",
        )
        return IssuedSession(
            access_token=access,
            access_expires_at=access_expires,
            principal=principal,
            refresh_token=next_refresh,
            csrf_token=new_csrf_token(),
        )

    def _identity_external_id(self, internal_user_id: int) -> str:
        value = self._identity.external_user_id(internal_user_id)
        if value is None:
            raise AuthenticationError("The authentication session is invalid or expired.")
        return value

    def logout(self, raw_token: str, context: SecurityContext) -> datetime:
        state = self._sessions.get_by_refresh_hash(hash_refresh_token(raw_token))
        now = datetime.now(UTC)
        if state is None or state.session.client_kind != context.client_kind:
            raise AuthenticationError("The refresh token is invalid or expired.")
        principal = self._principal(
            user_id=self._identity_external_id(state.session.user_id),
            session_id=state.session.external_id,
            context=context,
        )
        self._sessions.revoke(state.session, at=now, reason="logout")
        self._audit_event(
            context,
            actor_user_id=principal.user_id,
            session_id=principal.session_id,
            roles=[role.value for role in principal.roles],
            action="auth.logout",
            allowed=True,
            reason="session_revoked",
        )
        return now
