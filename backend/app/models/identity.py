"""Minimal identity persistence records for Department, Role, and User."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    ForeignKey,
    JSON,
    String,
    Table,
    Column,
    DateTime,
    Integer,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, VersionedRecordMixin

BIGINT = BigInteger().with_variant(Integer, "sqlite")


user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", BIGINT, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", BIGINT, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("assigned_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Column("assigned_by", String(30), nullable=True),
)

user_departments = Table(
    "user_departments",
    Base.metadata,
    Column("user_id", BIGINT, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column(
        "department_id",
        BIGINT,
        ForeignKey("departments.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column("assigned_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Column("assigned_by", String(30), nullable=True),
)

user_department_scopes = Table(
    "user_department_scopes",
    Base.metadata,
    Column("user_id", BIGINT, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column(
        "department_id",
        BIGINT,
        ForeignKey("departments.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column("scope_type", String(32), primary_key=True),
    Column("assigned_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Column("assigned_by", String(30), nullable=True),
)


class OrganizationRecord(VersionedRecordMixin, Base):
    __tablename__ = "organizations"
    __table_args__ = (
        CheckConstraint("entity_version >= 1", name="entity_version_positive"),
    )

    id: Mapped[int] = mapped_column(BIGINT, primary_key=True, autoincrement=True)
    external_id: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    simulated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class DepartmentRecord(VersionedRecordMixin, Base):
    __tablename__ = "departments"
    __table_args__ = (
        CheckConstraint("entity_version >= 1", name="entity_version_positive"),
    )

    id: Mapped[int] = mapped_column(BIGINT, primary_key=True, autoincrement=True)
    external_id: Mapped[str] = mapped_column(String(31), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    organization_id: Mapped[int | None] = mapped_column(
        BIGINT,
        ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=True,
    )
    parent_department_id: Mapped[int | None] = mapped_column(
        BIGINT,
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
    )


class PositionRecord(VersionedRecordMixin, Base):
    __tablename__ = "positions"
    __table_args__ = (
        CheckConstraint("entity_version >= 1", name="entity_version_positive"),
        UniqueConstraint("department_id", "code", name="uq_positions_department_code"),
    )

    id: Mapped[int] = mapped_column(BIGINT, primary_key=True, autoincrement=True)
    external_id: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    organization_id: Mapped[int] = mapped_column(
        BIGINT, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False
    )
    department_id: Mapped[int] = mapped_column(
        BIGINT, ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False
    )
    code: Mapped[str] = mapped_column(String(80), nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)


class RoleRecord(VersionedRecordMixin, Base):
    __tablename__ = "roles"
    __table_args__ = (
        CheckConstraint("entity_version >= 1", name="entity_version_positive"),
    )

    id: Mapped[int] = mapped_column(BIGINT, primary_key=True, autoincrement=True)
    external_id: Mapped[str] = mapped_column(String(31), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    role_code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    permission_scopes: Mapped[list[str]] = mapped_column(
        JSON, nullable=False, default=list
    )


class UserRecord(VersionedRecordMixin, Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("entity_version >= 1", name="entity_version_positive"),
    )

    id: Mapped[int] = mapped_column(BIGINT, primary_key=True, autoincrement=True)
    external_id: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)


class EmployeeProfileRecord(VersionedRecordMixin, Base):
    __tablename__ = "employee_profiles"
    __table_args__ = (
        CheckConstraint("entity_version >= 1", name="entity_version_positive"),
    )

    id: Mapped[int] = mapped_column(BIGINT, primary_key=True, autoincrement=True)
    external_id: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    user_id: Mapped[int] = mapped_column(
        BIGINT, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    department_id: Mapped[int] = mapped_column(
        BIGINT, ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False
    )
    position_id: Mapped[int] = mapped_column(
        BIGINT, ForeignKey("positions.id", ondelete="RESTRICT"), nullable=False
    )
    job_title: Mapped[str] = mapped_column(String(160), nullable=False)
    training_tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    authorized_data_scopes: Mapped[list[str]] = mapped_column(
        JSON, nullable=False, default=list
    )


class UserCredentialRecord(Base):
    __tablename__ = "user_credentials"

    user_id: Mapped[int] = mapped_column(
        BIGINT, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    account_name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(512), nullable=False)
    password_changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class AuthSessionRecord(Base):
    __tablename__ = "auth_sessions"

    id: Mapped[int] = mapped_column(BIGINT, primary_key=True, autoincrement=True)
    external_id: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    user_id: Mapped[int] = mapped_column(
        BIGINT, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    client_kind: Mapped[str] = mapped_column(String(32), nullable=False)
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoke_reason: Mapped[str | None] = mapped_column(String(120), nullable=True)


class RefreshTokenRecord(Base):
    __tablename__ = "auth_refresh_tokens"

    id: Mapped[int] = mapped_column(BIGINT, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(
        BIGINT, ForeignKey("auth_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    replaced_by_token_id: Mapped[int | None] = mapped_column(
        BIGINT, ForeignKey("auth_refresh_tokens.id", ondelete="SET NULL"), nullable=True
    )


class AuditRecord(Base):
    __tablename__ = "security_audit_records"

    id: Mapped[int] = mapped_column(BIGINT, primary_key=True, autoincrement=True)
    external_id: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    actor_user_id: Mapped[str | None] = mapped_column(String(30), nullable=True)
    session_id: Mapped[str | None] = mapped_column(String(30), nullable=True)
    effective_roles: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    action: Mapped[str] = mapped_column(String(160), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(120), nullable=False)
    resource_id: Mapped[str | None] = mapped_column(String(160), nullable=True)
    resource_department_id: Mapped[str | None] = mapped_column(String(31), nullable=True)
    allowed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    reason_code: Mapped[str] = mapped_column(String(120), nullable=False)
    request_id: Mapped[str] = mapped_column(String(30), nullable=False)
    trace_id: Mapped[str] = mapped_column(String(30), nullable=False)
    client_summary: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
