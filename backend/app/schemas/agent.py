"""Agent run, state, step summary, and realtime event contracts."""

from __future__ import annotations

from datetime import date
from enum import StrEnum
from typing import Literal

from pydantic import AwareDatetime, Field, field_validator, model_validator

from .common import (
    AgentDecisionId,
    AgentRunId,
    AgentRunStatus,
    AgentStepId,
    AGENT_STATE_VERSION,
    ApprovalId,
    ApprovalStatus,
    AssessmentResultId,
    CheckpointId,
    EmployeeProfileId,
    ErrorId,
    EVENT_SCHEMA_VERSION,
    EventId,
    KnowledgeCitationId,
    Percentage,
    SchemaVersion,
    SUPPORTED_AGENT_STATE_VERSIONS,
    SUPPORTED_EVENT_SCHEMA_VERSIONS,
    TrainingGoalId,
    TrainingPlanId,
    TrainingTaskId,
    VersionedEntity,
    CONTRACT_SCHEMA_VERSION,
)


class AgentCapability(StrEnum):
    SUPERVISOR = "supervisor"
    DIAGNOSIS = "diagnosis"
    RETRIEVAL = "retrieval"
    PLANNING = "planning"
    RULES = "rules"
    APPROVAL = "approval"
    SKILL = "skill"
    ASSESSMENT = "assessment"
    REPORT = "report"


class AgentStepStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    WAITING = "waiting"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    SKIPPED = "skipped"


class AgentDecisionSource(StrEnum):
    AGENT_SUGGESTION = "agent_suggestion"
    DETERMINISTIC_RULE = "deterministic_rule"
    HUMAN_DECISION = "human_decision"


class AgentNextAction(StrEnum):
    CONTINUE = "continue"
    PROVIDE_INPUT = "provide_input"
    REQUEST_APPROVAL = "request_approval"
    RETRY = "retry"
    ROLLBACK = "rollback"
    REPLAN = "replan"
    REQUEST_HUMAN_TAKEOVER = "request_human_takeover"
    CANCEL = "cancel"
    COMPLETE = "complete"


class ProgressVisibility(StrEnum):
    BUSINESS = "business"
    DEVELOPER = "developer"


class AgentDecisionSummary(VersionedEntity):
    """Auditable decision summary without exposing prompts or hidden reasoning."""

    id: AgentDecisionId
    status: Literal["recorded"] = "recorded"
    run_id: AgentRunId
    title: str = Field(min_length=1, max_length=240)
    summary: str = Field(min_length=1, max_length=4000)
    evidence_ids: list[str] = Field(default_factory=list)
    source: AgentDecisionSource


class AgentEventType(StrEnum):
    AGENT_STAGE_CHANGED = "agent_stage_changed"
    SKILL_STARTED = "skill_started"
    SKILL_SUCCEEDED = "skill_succeeded"
    SKILL_FAILED = "skill_failed"
    RULE_BLOCKED = "rule_blocked"
    APPROVAL_REQUIRED = "approval_required"
    APPROVAL_DECIDED = "approval_decided"
    PLAN_REPLANNED = "plan_replanned"
    RUN_RETRIED = "run_retried"
    RUN_ROLLED_BACK = "run_rolled_back"
    HUMAN_TAKEOVER_REQUIRED = "human_takeover_required"
    RUN_COMPLETED = "run_completed"
    RUN_FAILED = "run_failed"


class AgentStepSummary(VersionedEntity):
    """Auditable summary for one Agent execution step."""

    id: AgentStepId
    status: AgentStepStatus
    run_id: AgentRunId
    capability: AgentCapability
    label: str = Field(min_length=1, max_length=240)
    input_summary: str = Field(min_length=1, max_length=4000)
    output_summary: str = Field(default="", max_length=4000)
    decision_reason: str | None = Field(default=None, max_length=4000)
    checkpoint_id: CheckpointId | None = None
    retry_count: int = Field(default=0, ge=0, le=100)
    writes_committed: bool = False
    model_name: str | None = Field(default=None, max_length=240)
    prompt_version: str | None = Field(default=None, max_length=120)
    token_count: int | None = Field(default=None, ge=0)
    latency_ms: int | None = Field(default=None, ge=0)
    skill_name: str | None = Field(default=None, max_length=240)
    error_code: str | None = Field(default=None, max_length=120)
    started_at: AwareDatetime | None = None
    finished_at: AwareDatetime | None = None


class AgentState(VersionedEntity):
    """Serializable resumable Agent state, distinct from an API envelope or event."""

    id: AgentRunId
    state_version: SchemaVersion = AGENT_STATE_VERSION
    status: AgentRunStatus
    task_id: TrainingTaskId
    checkpoint_sequence: int = Field(default=0, ge=0)
    training_goal_id: TrainingGoalId | None = None
    target_employee_profile_ids: list[EmployeeProfileId] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    deadline: date | None = None
    current_step_id: AgentStepId | None = None
    current_plan_id: TrainingPlanId | None = None
    current_knowledge_citation_ids: list[KnowledgeCitationId] = Field(default_factory=list)
    current_assessment_result_id: AssessmentResultId | None = None
    current_approval_id: ApprovalId | None = None
    checkpoint_id: CheckpointId | None = None
    current_stage: str | None = Field(default=None, max_length=240)
    current_node: str | None = Field(default=None, max_length=240)
    completed_step_ids: list[AgentStepId] = Field(default_factory=list)
    pending_step_ids: list[AgentStepId] = Field(default_factory=list)
    waiting_human_action: str | None = Field(default=None, max_length=1000)
    retry_count: int = Field(default=0, ge=0, le=100)
    last_error_id: ErrorId | None = None
    last_error_code: str | None = Field(default=None, max_length=120)
    next_allowed_actions: list[AgentNextAction] = Field(default_factory=list)
    waiting_for: str | None = Field(default=None, max_length=240)
    recoverable: bool = True
    formal_write_occurred: bool = False
    started_at: AwareDatetime | None = None
    checkpointed_at: AwareDatetime | None = None

    @field_validator("state_version")
    @classmethod
    def validate_state_version(cls, value: str) -> str:
        if value not in SUPPORTED_AGENT_STATE_VERSIONS:
            supported = ", ".join(sorted(SUPPORTED_AGENT_STATE_VERSIONS))
            raise ValueError(f"unsupported Agent State version {value}; supported: {supported}")
        return value

    @model_validator(mode="after")
    def validate_checkpoint_identity(self) -> "AgentState":
        if self.checkpoint_sequence > 0 and self.checkpoint_id is None:
            raise ValueError("checkpoint_sequence greater than zero requires checkpoint_id")
        return self


class AgentRun(VersionedEntity):
    """Top-level traceable Agent execution for a training task."""

    id: AgentRunId
    status: AgentRunStatus
    task_id: TrainingTaskId
    state: AgentState
    steps: list[AgentStepSummary] = Field(default_factory=list)
    decisions: list[AgentDecisionSummary] = Field(default_factory=list)
    current_stage: str = Field(min_length=1, max_length=240)


class AgentProgressPayload(VersionedEntity):
    """Typed payload for Agent progress events."""

    id: AgentStepId
    status: AgentStepStatus
    run_id: AgentRunId
    step_id: AgentStepId
    progress_percent: Percentage
    summary: str = Field(min_length=1, max_length=1000)
    checkpoint_id: CheckpointId | None = None
    retry_count: int = Field(default=0, ge=0, le=100)
    formal_write_occurred: bool = False


class ApprovalEventPayload(VersionedEntity):
    """Minimal, permission-safe approval event payload."""

    id: ApprovalId
    status: ApprovalStatus
    run_id: AgentRunId
    approval_id: ApprovalId
    summary: str = Field(min_length=1, max_length=1000)


class ErrorEventPayload(VersionedEntity):
    """Minimal error event payload without stack, prompt, secret, or private data."""

    id: ErrorId
    status: Literal["failed"] = "failed"
    run_id: AgentRunId
    error_id: ErrorId
    code: str = Field(min_length=1, max_length=120)
    retryable: bool
    summary: str = Field(min_length=1, max_length=1000)


class RealtimeEvent(VersionedEntity):
    """Ordered realtime event envelope for Web/Android progress updates."""

    id: EventId
    status: Literal["emitted"] = "emitted"
    event_type: AgentEventType
    event_version: SchemaVersion = EVENT_SCHEMA_VERSION
    occurred_at: AwareDatetime
    run_id: AgentRunId
    task_id: TrainingTaskId
    sequence: int = Field(ge=1)
    current_stage: str | None = Field(default=None, max_length=240)
    workflow_status: AgentRunStatus | None = None
    progress_summary: str | None = Field(default=None, max_length=1000)
    requires_user_action: bool = False
    visibility: ProgressVisibility = ProgressVisibility.BUSINESS
    error_summary: str | None = Field(default=None, max_length=1000)
    next_action: AgentNextAction | None = None
    payload: AgentProgressPayload | ApprovalEventPayload | ErrorEventPayload
    schema_version: SchemaVersion = CONTRACT_SCHEMA_VERSION

    @field_validator("event_version")
    @classmethod
    def validate_event_version(cls, value: str) -> str:
        if value not in SUPPORTED_EVENT_SCHEMA_VERSIONS:
            supported = ", ".join(sorted(SUPPORTED_EVENT_SCHEMA_VERSIONS))
            raise ValueError(f"unsupported realtime event version {value}; supported: {supported}")
        return value
