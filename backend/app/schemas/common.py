"""Shared contract primitives, IDs, versions, timestamps, and state enums.

Pydantic v2 models in ``backend.app.schemas`` are the authoritative contract
source. JSON Schema, TypeScript declarations, examples, and tests are derived
from these definitions.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum
from typing import Annotated, Any

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

CONTRACT_SCHEMA_VERSION = "2.0.0"
ULID_PATTERN = r"[0-9A-HJKMNP-TV-Z]{26}"
SEMVER_PATTERN = r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$"


def _prefixed_id(prefix: str, description: str) -> Any:
    return Annotated[
        str,
        StringConstraints(pattern=rf"^{prefix}_{ULID_PATTERN}$"),
        Field(description=description, examples=[f"{prefix}_01ARZ3NDEKTSV4RRFFQ69G5FAV"]),
    ]


UserId = _prefixed_id("usr", "Immutable external user ID: usr_<ULID>.")
RoleId = _prefixed_id("role", "Immutable external role ID: role_<ULID>.")
DepartmentId = _prefixed_id("dept", "Immutable external department ID: dept_<ULID>.")
EmployeeProfileId = _prefixed_id("emp", "Immutable external employee profile ID: emp_<ULID>.")
TrainingGoalId = _prefixed_id("goal", "Immutable external training goal ID: goal_<ULID>.")
TrainingTaskId = _prefixed_id("task", "Immutable external training task ID: task_<ULID>.")
TrainingPlanId = _prefixed_id("plan", "Immutable external training plan ID: plan_<ULID>.")
CourseId = _prefixed_id("course", "Immutable external course ID: course_<ULID>.")
KnowledgeCitationId = _prefixed_id("know", "Immutable external knowledge citation ID: know_<ULID>.")
KnowledgePointId = _prefixed_id("kp", "Immutable external knowledge point ID: kp_<ULID>.")
AssessmentQuestionId = _prefixed_id(
    "question", "Immutable assessment question ID: question_<ULID>."
)
ApprovalId = _prefixed_id("approval", "Immutable external approval ID: approval_<ULID>.")
AssessmentSessionId = _prefixed_id("assessment", "Immutable assessment session ID: assessment_<ULID>.")
AssessmentResultId = _prefixed_id(
    "assessment_result", "Immutable assessment result ID: assessment_result_<ULID>."
)
KnowledgePointPerformanceId = _prefixed_id(
    "kperf", "Immutable knowledge-point performance ID: kperf_<ULID>."
)
RemediationId = _prefixed_id(
    "intervention", "Immutable remediation intervention ID: intervention_<ULID>."
)
RetestId = _prefixed_id("retest", "Immutable retest ID: retest_<ULID>.")
AgentRunId = _prefixed_id("run", "Immutable Agent run ID: run_<ULID>.")
AgentStepId = _prefixed_id("step", "Immutable Agent step ID: step_<ULID>.")
AgentDecisionId = _prefixed_id(
    "decision", "Immutable Agent decision summary ID: decision_<ULID>."
)
EventId = _prefixed_id("event", "Immutable realtime event ID: event_<ULID>.")
ErrorId = _prefixed_id("error", "Immutable error occurrence ID: error_<ULID>.")
TutorAnswerId = _prefixed_id("answer", "Immutable tutor answer ID: answer_<ULID>.")
NotificationId = _prefixed_id(
    "notification", "Immutable notification ID: notification_<ULID>."
)
OperationId = _prefixed_id("operation", "Immutable asynchronous operation ID: operation_<ULID>.")
TraceId = _prefixed_id("trc", "Cross-service trace ID: trc_<ULID>.")
RequestId = _prefixed_id("req", "Single request ID: req_<ULID>.")
CheckpointId = _prefixed_id("checkpoint", "Agent checkpoint ID: checkpoint_<ULID>.")
IdempotencyKey = Annotated[
    str,
    StringConstraints(pattern=r"^idem_[A-Za-z0-9._:-]{8,120}$"),
    Field(
        description="Caller-generated idempotency key. It is not a domain entity ID.",
        examples=["idem_training_create_20260804_001"],
    ),
]
SchemaVersion = Annotated[
    str,
    StringConstraints(pattern=SEMVER_PATTERN),
    Field(description="Contract schema semantic version."),
]
Confidence = Annotated[
    float,
    Field(ge=0.0, le=1.0, description="Model or retrieval confidence in the closed interval [0, 1]."),
]
Percentage = Annotated[
    float,
    Field(ge=0.0, le=100.0, description="Percentage value in the closed interval [0, 100]."),
]


class ContractModel(BaseModel):
    """Strict base for all external contracts."""

    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
        validate_assignment=True,
        validate_default=True,
        use_attribute_docstrings=True,
    )

    @field_validator("*", mode="after")
    @classmethod
    def normalize_datetimes_to_utc(cls, value: Any) -> Any:
        if isinstance(value, datetime):
            if value.tzinfo is None or value.utcoffset() is None:
                raise ValueError("datetime must include timezone information")
            return value.astimezone(timezone.utc)
        return value


class RiskLevel(StrEnum):
    """Risk grading aligned with the document's read-only/low/medium/high levels."""

    READ_ONLY = "read_only"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class EntityStatus(StrEnum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"


class UserRole(StrEnum):
    EMPLOYEE = "employee"
    TRAINING_ADMIN = "training_admin"
    REVIEWER = "reviewer"
    SYSTEM_ADMIN = "system_admin"


class TrainingTaskStatus(StrEnum):
    """Training business states from chapter 15.8."""

    DRAFT = "TB-DRAFT"
    NEED_INPUT = "TB-NEED-INPUT"
    ANALYZING = "TB-ANALYZING"
    PLAN_READY = "TB-PLAN-READY"
    WAIT_CONFIRM = "TB-WAIT-CONFIRM"
    WAIT_APPROVAL = "TB-WAIT-APPROVAL"
    APPROVAL_EDIT = "TB-APPROVAL-EDIT"
    APPROVAL_REJECTED = "TB-APPROVAL-REJECTED"
    WAIT_PUBLISH = "TB-WAIT-PUBLISH"
    IN_PROGRESS = "TB-IN-PROGRESS"
    COMPLETED = "TB-COMPLETED"
    FAILED = "TB-FAILED"
    PAUSED = "TB-PAUSED"
    MANUAL = "TB-MANUAL"
    CANCELLED = "TB-CANCELLED"


class AgentRunStatus(StrEnum):
    """Agent execution states from chapter 15.8."""

    PENDING = "AR-PENDING"
    RUNNING = "AR-RUNNING"
    WAIT_INPUT = "AR-WAIT-INPUT"
    WAIT_APPROVAL = "AR-WAIT-APPROVAL"
    WAIT_EXTERNAL = "AR-WAIT-EXTERNAL"
    RETRYING = "AR-RETRYING"
    ROLLING_BACK = "AR-ROLLING-BACK"
    REPLANNING = "AR-REPLANNING"
    PAUSED = "AR-PAUSED"
    MANUAL = "AR-MANUAL"
    SUCCEEDED = "AR-SUCCEEDED"
    FAILED = "AR-FAILED"
    CANCELLED = "AR-CANCELLED"


class LearningRecordStatus(StrEnum):
    """Employee learning states from chapter 15.8."""

    PENDING = "LR-PENDING"
    LEARNING = "LR-LEARNING"
    WAIT_ASSESSMENT = "LR-WAIT-ASSESSMENT"
    NOT_MET = "LR-NOT-MET"
    REMEDIAL = "LR-REMEDIAL"
    WAIT_RETEST = "LR-WAIT-RETEST"
    RETESTING = "LR-RETESTING"
    COMPLETED = "LR-COMPLETED"
    PAUSED = "LR-PAUSED"


class ApprovalStatus(StrEnum):
    """Approval states from chapter 15.8."""

    NOT_SUBMITTED = "AP-NOT-SUBMITTED"
    WAITING = "AP-WAITING"
    EDITING = "AP-EDITING"
    APPROVED = "AP-APPROVED"
    REJECTED = "AP-REJECTED"
    WITHDRAWN = "AP-WITHDRAWN"
    EXPIRED = "AP-EXPIRED"
    CANCELLED = "AP-CANCELLED"


class ConnectorStatus(StrEnum):
    """External connector states from chapter 15.8."""

    PENDING = "CN-PENDING"
    CALLING = "CN-CALLING"
    SUCCEEDED = "CN-SUCCEEDED"
    FAILED = "CN-FAILED"
    UNKNOWN = "CN-UNKNOWN"
    RECONCILING = "CN-RECONCILING"
    RECOVERED = "CN-RECOVERED"


class VersionedEntity(ContractModel):
    """Audit and compatibility fields shared by externally exchanged entities."""

    schema_version: SchemaVersion = CONTRACT_SCHEMA_VERSION
    entity_version: int = Field(default=1, ge=1, description="Optimistic entity revision, independent of schema_version.")
    created_at: AwareDatetime = Field(description="Creation time with timezone; serialized as ISO 8601.")
    updated_at: AwareDatetime = Field(description="Last update time with timezone; serialized as ISO 8601.")
    created_by: UserId | None = None
    updated_by: UserId | None = None
    risk_level: RiskLevel = RiskLevel.LOW
    confidence: Confidence | None = None
    trace_id: TraceId | None = None
    request_id: RequestId | None = None
    idempotency_key: IdempotencyKey | None = None
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Non-sensitive extension metadata. Secrets, prompts, stacks, and unauthorized data are forbidden.",
    )

    @model_validator(mode="after")
    def validate_audit_order(self) -> "VersionedEntity":
        if self.updated_at < self.created_at:
            raise ValueError("updated_at must be greater than or equal to created_at")
        return self


class ApiEnvelope(ContractModel):
    """Common response envelope fields; concrete responses add a typed data field."""

    schema_version: SchemaVersion = CONTRACT_SCHEMA_VERSION
    request_id: RequestId
    trace_id: TraceId
    occurred_at: AwareDatetime


def ensure_utc(value: datetime) -> datetime:
    """Return a timezone-aware datetime normalized to UTC."""

    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError("datetime must include timezone information")
    return value.astimezone(timezone.utc)
