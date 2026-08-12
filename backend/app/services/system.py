"""Service logic for the read-only persistence status vertical slice."""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.exc import SQLAlchemyError

from ..errors import ServiceUnavailableError
from ..repositories import SystemStatusRepository
from ..schemas.common import CONTRACT_SCHEMA_VERSION

CURRENT_MIGRATION_REVISION = "20260810_0002"


@dataclass(frozen=True, slots=True)
class SystemDatabaseStatus:
    status: str
    storage: str
    schema_version: str
    migration_revision: str


class SystemStatusService:
    def __init__(self, repository: SystemStatusRepository) -> None:
        self._repository = repository

    def get_database_status(self) -> SystemDatabaseStatus:
        try:
            state = self._repository.get_persistence_state()
        except SQLAlchemyError as error:
            raise ServiceUnavailableError(
                "Database persistence layer is not ready."
            ) from error

        if (
            not state.identity_schema_accessible
            or state.migration_revision != CURRENT_MIGRATION_REVISION
        ):
            raise ServiceUnavailableError(
                "Database persistence schema is not at the required revision."
            )

        return SystemDatabaseStatus(
            status="ok",
            storage="postgresql",
            schema_version=CONTRACT_SCHEMA_VERSION,
            migration_revision=state.migration_revision,
        )
