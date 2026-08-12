"""Password, access-token, refresh-token, and CSRF primitives."""

from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import jwt
from jwt import PyJWTError
from pwdlib import PasswordHash

from .config import Settings
from .errors import AuthenticationError, ServiceUnavailableError
from .identifiers import new_ulid

ACCESS_ALGORITHM = "HS256"


@dataclass(frozen=True, slots=True)
class AccessClaims:
    user_id: str
    session_id: str
    token_id: str


class PasswordVerifier:
    def __init__(self) -> None:
        self._hasher = PasswordHash.recommended()
        self._dummy_hash = self._hasher.hash(secrets.token_urlsafe(32))

    def hash(self, password: str) -> str:
        return self._hasher.hash(password)

    def verify(self, password: str, password_hash: str | None) -> bool:
        candidate = password_hash or self._dummy_hash
        try:
            valid = self._hasher.verify(password, candidate)
        except Exception:
            valid = False
        return valid and password_hash is not None


def issue_access_token(
    settings: Settings,
    *,
    user_id: str,
    session_id: str,
    now: datetime | None = None,
) -> tuple[str, datetime]:
    if not settings.auth_enabled:
        raise ServiceUnavailableError("Authentication is not configured.")
    issued_at = now or datetime.now(UTC)
    expires_at = issued_at + timedelta(minutes=settings.auth_access_token_minutes)
    payload = {
        "sub": user_id,
        "sid": session_id,
        "jti": f"jti_{new_ulid()}",
        "iss": settings.auth_jwt_issuer,
        "aud": settings.auth_jwt_audience,
        "iat": issued_at,
        "nbf": issued_at,
        "exp": expires_at,
        "token_type": "access",
    }
    return (
        jwt.encode(payload, settings.auth_jwt_secret, algorithm=ACCESS_ALGORITHM),
        expires_at,
    )


def decode_access_token(settings: Settings, token: str) -> AccessClaims:
    if not settings.auth_enabled:
        raise ServiceUnavailableError("Authentication is not configured.")
    try:
        payload = jwt.decode(
            token,
            settings.auth_jwt_secret,
            algorithms=[ACCESS_ALGORITHM],
            audience=settings.auth_jwt_audience,
            issuer=settings.auth_jwt_issuer,
            options={
                "require": ["sub", "sid", "jti", "iss", "aud", "iat", "nbf", "exp"]
            },
        )
    except PyJWTError as error:
        raise AuthenticationError("The access token is invalid or expired.") from error
    if payload.get("token_type") != "access":
        raise AuthenticationError("The access token is invalid or expired.")
    return AccessClaims(
        user_id=str(payload["sub"]),
        session_id=str(payload["sid"]),
        token_id=str(payload["jti"]),
    )


def new_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def new_csrf_token() -> str:
    return secrets.token_urlsafe(32)
