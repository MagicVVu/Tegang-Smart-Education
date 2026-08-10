"""Unified safe error contract."""

from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import AwareDatetime, Field

from .common import (
    CONTRACT_SCHEMA_VERSION,
    ErrorId,
    SchemaVersion,
    TraceId,
    ContractModel,
)


class ErrorCategory(StrEnum):
    VALIDATION = "validation"
    NOT_FOUND = "not_found"
    CONTRACT_VERSION = "contract_version"
    PERMISSION_SCOPE = "permission_scope"
    STATE_CONFLICT = "state_conflict"
    KNOWLEDGE_VERSION = "knowledge_version"
    APPROVAL_REQUIRED = "approval_required"
    AGENT_FAILURE = "agent_failure"
    SKILL_FAILURE = "skill_failure"
    EXTERNAL_FAILURE = "external_failure"
    RETRY_EXHAUSTED = "retry_exhausted"
    MANUAL_TAKEOVER = "manual_takeover"
    INTERNAL = "internal"


class ErrorCode(StrEnum):
    INVALID_INPUT = "INVALID_INPUT"
    MISSING_INFORMATION = "MISSING_INFORMATION"
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND"
    UNSUPPORTED_CONTRACT_VERSION = "UNSUPPORTED_CONTRACT_VERSION"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN_SCOPE = "FORBIDDEN_SCOPE"
    STATE_CONFLICT = "STATE_CONFLICT"
    APPROVAL_REQUIRED = "APPROVAL_REQUIRED"
    APPROVAL_REJECTED = "APPROVAL_REJECTED"
    APPROVAL_EXPIRED = "APPROVAL_EXPIRED"
    KNOWLEDGE_NOT_FOUND = "KNOWLEDGE_NOT_FOUND"
    KNOWLEDGE_VERSION_CONFLICT = "KNOWLEDGE_VERSION_CONFLICT"
    IDEMPOTENCY_CONFLICT = "IDEMPOTENCY_CONFLICT"
    AGENT_FAILED = "AGENT_FAILED"
    SKILL_FAILED = "SKILL_FAILED"
    CONNECTOR_TIMEOUT = "CONNECTOR_TIMEOUT"
    CONNECTOR_UNAVAILABLE = "CONNECTOR_UNAVAILABLE"
    EXTERNAL_RESULT_UNKNOWN = "EXTERNAL_RESULT_UNKNOWN"
    RETRY_LIMIT_REACHED = "RETRY_LIMIT_REACHED"
    MANUAL_TAKEOVER_REQUIRED = "MANUAL_TAKEOVER_REQUIRED"
    INTERNAL_ERROR = "INTERNAL_ERROR"


class FieldError(ContractModel):
    """Field-level validation problem safe for a caller to display."""

    field: str = Field(min_length=1, max_length=240)
    code: str = Field(min_length=1, max_length=120)
    message: str = Field(min_length=1, max_length=1000)


class UnifiedError(ContractModel):
    """Unified external error object with no secret, stack, prompt, or unauthorized data."""

    error_id: ErrorId
    code: ErrorCode
    message: str = Field(min_length=1, max_length=2000)
    category: ErrorCategory
    retryable: bool
    user_action: str | None = Field(default=None, max_length=1000)
    details: dict[str, Any] = Field(
        default_factory=dict,
        description="Permission-safe details only; never include stack traces, prompts, secrets, or unauthorized data.",
    )
    field_errors: list[FieldError] = Field(default_factory=list)
    trace_id: TraceId
    occurred_at: AwareDatetime
    schema_version: SchemaVersion = CONTRACT_SCHEMA_VERSION
