from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.main import create_app
from backend.app.models import DepartmentRecord
from backend.app.repositories import PersistenceState, SystemStatusRepository
from backend.app.services import SystemStatusService
from backend.app.services.system import CURRENT_MIGRATION_REVISION
from backend.tests.conftest import make_settings


def test_sqlalchemy_session_persists_versioned_department(sqlite_engine) -> None:
    with Session(sqlite_engine) as session:
        session.add(
            DepartmentRecord(
                id=1,
                external_id="dept_01ARZ3NDEKTSV4RRFFQ69G5FAV",
                status="active",
                name="Synthetic validation department",
            )
        )
        session.commit()

    with Session(sqlite_engine) as session:
        record = session.get(DepartmentRecord, 1)

    assert record is not None
    assert record.schema_version == "2.2.0"
    assert record.entity_version == 1


def test_repository_and_service_report_current_revision(sqlite_engine) -> None:
    with Session(sqlite_engine) as session:
        repository = SystemStatusRepository(session)
        status = SystemStatusService(repository).get_database_status()

    assert status.status == "ok"
    assert status.storage == "postgresql"
    assert status.migration_revision == CURRENT_MIGRATION_REVISION


def test_service_rejects_stale_schema_revision() -> None:
    class StaleRepository:
        def get_persistence_state(self) -> PersistenceState:
            return PersistenceState(
                migration_revision="old_revision",
                identity_schema_accessible=True,
            )

    service = SystemStatusService(StaleRepository())  # type: ignore[arg-type]

    try:
        service.get_database_status()
    except Exception as error:
        assert type(error).__name__ == "ServiceUnavailableError"
    else:
        raise AssertionError("Stale migration revision was accepted")


def test_database_status_api_crosses_service_and_repository(sqlite_engine) -> None:
    app = create_app(make_settings(), engine=sqlite_engine)
    with TestClient(app) as client:
        response = client.get("/api/v1/system/database-status")

    body = response.json()
    assert response.status_code == 200
    assert body["data"] == {
        "status": "ok",
        "storage": "postgresql",
        "schema_version": "2.2.0",
        "migration_revision": CURRENT_MIGRATION_REVISION,
    }
    assert body["request_id"] == response.headers["x-request-id"]
    assert body["trace_id"] == response.headers["x-trace-id"]
