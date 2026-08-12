"""Security audit persistence with an intentionally small client summary."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from ..models import AuditRecord


class AuditRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def record(
        self,
        *,
        audit_id: str,
        occurred_at: datetime,
        actor_user_id: str | None,
        session_id: str | None,
        effective_roles: list[str],
        action: str,
        resource_type: str,
        resource_id: str | None,
        resource_department_id: str | None,
        allowed: bool,
        reason_code: str,
        request_id: str,
        trace_id: str,
        client_summary: dict[str, object],
    ) -> None:
        self._session.add(
            AuditRecord(
                external_id=audit_id,
                occurred_at=occurred_at,
                actor_user_id=actor_user_id,
                session_id=session_id,
                effective_roles=effective_roles,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                resource_department_id=resource_department_id,
                allowed=allowed,
                reason_code=reason_code,
                request_id=request_id,
                trace_id=trace_id,
                client_summary=client_summary,
            )
        )

    def commit_security_event(self) -> None:
        """Persist security denials before the request transaction raises and rolls back."""

        self._session.commit()
