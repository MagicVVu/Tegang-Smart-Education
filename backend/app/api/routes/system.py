"""Read-only operational API proving the C-04 persistence vertical slice."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, ConfigDict

from ...services import SystemStatusService
from ..dependencies import get_system_status_service

router = APIRouter(prefix="/api/v1/system", tags=["system"])


class DatabaseStatusData(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: str
    storage: str
    schema_version: str
    migration_revision: str


class DatabaseStatusResponse(BaseModel):
    """Operational response; not a product-domain C-03 exchange contract."""

    model_config = ConfigDict(extra="forbid")

    request_id: str
    trace_id: str
    occurred_at: datetime
    data: DatabaseStatusData


@router.get("/database-status", response_model=DatabaseStatusResponse)
def database_status(
    request: Request,
    service: SystemStatusService = Depends(get_system_status_service),
) -> DatabaseStatusResponse:
    status = service.get_database_status()
    return DatabaseStatusResponse(
        request_id=request.state.request_id,
        trace_id=request.state.trace_id,
        occurred_at=datetime.now(UTC),
        data=DatabaseStatusData(
            status=status.status,
            storage=status.storage,
            schema_version=status.schema_version,
            migration_revision=status.migration_revision,
        ),
    )
