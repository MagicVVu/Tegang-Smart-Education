"""Authentication session and server-confirmed principal contracts."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import AwareDatetime, Field, SecretStr

from .common import (
    ApiEnvelope,
    ContractModel,
    DepartmentId,
    EmployeeProfileId,
    RequestId,
    SessionId,
    TraceId,
    UserId,
    UserRole,
)


class AuthPrincipal(ContractModel):
    """Fresh server-side authorization projection for one active session."""

    user_id: UserId
    session_id: SessionId
    display_name: str = Field(min_length=1, max_length=120)
    roles: list[UserRole] = Field(min_length=1)
    primary_role: UserRole
    department_ids: list[DepartmentId] = Field(default_factory=list)
    employee_profile_id: EmployeeProfileId | None = None
    permission_scopes: list[str] = Field(default_factory=list)
    authorized_data_scopes: list[str] = Field(default_factory=list)
    capabilities: list[str] = Field(default_factory=list)
    request_id: RequestId
    trace_id: TraceId


class LoginRequest(ContractModel):
    account: str = Field(min_length=1, max_length=120)
    password: SecretStr


class DemoLoginRequest(ContractModel):
    account: str = Field(min_length=1, max_length=120)


class RefreshRequest(ContractModel):
    refresh_token: SecretStr | None = None


class LogoutRequest(ContractModel):
    refresh_token: SecretStr | None = None


class AuthSessionData(ContractModel):
    access_token: str = Field(min_length=32, max_length=4096)
    token_type: Literal["Bearer"] = "Bearer"
    expires_at: AwareDatetime
    principal: AuthPrincipal
    refresh_token: str | None = Field(
        default=None,
        min_length=32,
        max_length=4096,
        description="Returned only to the Android client for immediate secure-storage persistence.",
    )


class AuthSessionResponse(ApiEnvelope):
    data: AuthSessionData


class AuthMeResponse(ApiEnvelope):
    data: AuthPrincipal


class DemoProfile(ContractModel):
    account: str = Field(min_length=1, max_length=120)
    user_id: UserId
    display_name: str = Field(min_length=1, max_length=120)
    primary_role: UserRole
    department_ids: list[DepartmentId] = Field(default_factory=list)


class DemoProfilesResponse(ApiEnvelope):
    data: list[DemoProfile]


class LogoutResult(ContractModel):
    success: Literal[True] = True
    revoked_at: datetime


class LogoutResponse(ApiEnvelope):
    data: LogoutResult


class EmployeeIdentitySummary(ContractModel):
    """Minimal non-sensitive projection returned through scoped identity access."""

    employee_profile_id: EmployeeProfileId
    user_id: UserId
    display_name: str = Field(min_length=1, max_length=120)
    department_id: DepartmentId
    job_title: str = Field(min_length=1, max_length=160)


class EmployeeIdentityResponse(ApiEnvelope):
    data: EmployeeIdentitySummary
