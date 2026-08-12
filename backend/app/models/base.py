"""SQLAlchemy persistence base kept separate from Pydantic exchange contracts."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, MetaData, String, func, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from ..schemas.common import CONTRACT_SCHEMA_VERSION

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


class VersionedRecordMixin:
    """Minimal version and audit columns mapped from C-03 VersionedEntity."""

    schema_version: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=CONTRACT_SCHEMA_VERSION,
        server_default=text(f"'{CONTRACT_SCHEMA_VERSION}'"),
    )
    entity_version: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default=text("1")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    created_by: Mapped[str | None] = mapped_column(String(30), nullable=True)
    updated_by: Mapped[str | None] = mapped_column(String(30), nullable=True)
