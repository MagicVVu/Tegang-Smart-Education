"""Read-only infrastructure repository for the C-04 vertical slice."""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from ..models import DepartmentRecord


@dataclass(frozen=True, slots=True)
class PersistenceState:
    migration_revision: str
    identity_schema_accessible: bool


class SystemStatusRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get_persistence_state(self) -> PersistenceState:
        revision = self._session.scalar(text("SELECT version_num FROM alembic_version"))
        self._session.scalar(select(func.count()).select_from(DepartmentRecord))
        return PersistenceState(
            migration_revision=str(revision or ""),
            identity_schema_accessible=True,
        )
