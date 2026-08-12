"""Authentication session and refresh-token persistence operations."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from ..models import AuthSessionRecord, RefreshTokenRecord


@dataclass(frozen=True, slots=True)
class RefreshState:
    session: AuthSessionRecord
    token: RefreshTokenRecord


class AuthSessionRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def create(
        self,
        *,
        session_external_id: str,
        user_id: int,
        client_kind: str,
        issued_at: datetime,
        expires_at: datetime,
        refresh_hash: str,
    ) -> AuthSessionRecord:
        record = AuthSessionRecord(
            external_id=session_external_id,
            user_id=user_id,
            client_kind=client_kind,
            issued_at=issued_at,
            expires_at=expires_at,
        )
        self._session.add(record)
        self._session.flush()
        self._session.add(
            RefreshTokenRecord(
                session_id=record.id,
                token_hash=refresh_hash,
                issued_at=issued_at,
                expires_at=expires_at,
            )
        )
        self._session.flush()
        return record

    def get_session(self, external_id: str) -> AuthSessionRecord | None:
        return self._session.scalar(
            select(AuthSessionRecord).where(AuthSessionRecord.external_id == external_id)
        )

    def touch(self, session: AuthSessionRecord, *, at: datetime) -> None:
        session.last_seen_at = at

    def get_by_refresh_hash(self, token_hash: str) -> RefreshState | None:
        row = self._session.execute(
            select(AuthSessionRecord, RefreshTokenRecord)
            .join(
                RefreshTokenRecord,
                RefreshTokenRecord.session_id == AuthSessionRecord.id,
            )
            .where(RefreshTokenRecord.token_hash == token_hash)
        ).first()
        if row is None:
            return None
        return RefreshState(session=row[0], token=row[1])

    def rotate(
        self,
        state: RefreshState,
        *,
        new_hash: str,
        issued_at: datetime,
        expires_at: datetime,
    ) -> None:
        next_token = RefreshTokenRecord(
            session_id=state.session.id,
            token_hash=new_hash,
            issued_at=issued_at,
            expires_at=expires_at,
        )
        self._session.add(next_token)
        self._session.flush()
        state.token.used_at = issued_at
        state.token.replaced_by_token_id = next_token.id
        state.session.last_seen_at = issued_at

    def revoke(self, session: AuthSessionRecord, *, at: datetime, reason: str) -> None:
        if session.revoked_at is None:
            session.revoked_at = at
            session.revoke_reason = reason
        self._session.execute(
            update(RefreshTokenRecord)
            .where(
                RefreshTokenRecord.session_id == session.id,
                RefreshTokenRecord.revoked_at.is_(None),
            )
            .values(revoked_at=at)
        )
