"""Identity, role, organization, and employee profile contracts."""

from __future__ import annotations

from pydantic import Field

from .common import (
    DepartmentId,
    EmployeeProfileId,
    EntityStatus,
    RoleId,
    UserId,
    UserRole,
    VersionedEntity,
)


class Role(VersionedEntity):
    """Role and permission-scope reference; it does not replace the permission engine."""

    id: RoleId
    status: EntityStatus
    role_code: UserRole
    name: str = Field(min_length=1, max_length=120)
    permission_scopes: list[str] = Field(default_factory=list)


class User(VersionedEntity):
    """Application user identity without credential or sensitive HR fields."""

    id: UserId
    status: EntityStatus
    display_name: str = Field(min_length=1, max_length=120)
    role_ids: list[RoleId] = Field(min_length=1)
    department_ids: list[DepartmentId] = Field(default_factory=list)


class Department(VersionedEntity):
    """Organization department node."""

    id: DepartmentId
    status: EntityStatus
    name: str = Field(min_length=1, max_length=160)
    parent_department_id: DepartmentId | None = None


class EmployeeProfile(VersionedEntity):
    """Training-oriented employee profile with a minimal authorized data scope."""

    id: EmployeeProfileId
    status: EntityStatus
    user_id: UserId
    department_id: DepartmentId
    job_title: str = Field(min_length=1, max_length=160)
    training_tags: list[str] = Field(default_factory=list)
    authorized_data_scopes: list[str] = Field(default_factory=list)
