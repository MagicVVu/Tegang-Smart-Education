"""Agent run, state, step summary, and realtime event contracts."""

from __future__ import annotations

from enum import StrEnum
from typing import Literal

from pydantic import AwareDatetime, Field

from .common import (
    AgentDecisionId,
    AgentRunId,
    AgentRunStatus,
    AgentStepId,
    ApprovalId,
    ApprovalStatus,
    CheckpointId,
    ErrorId,
    EventId,
    Percentage,
    SchemaVersion,
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
    status: AgentRunStatus
    task_id: TrainingTaskId
    current_step_id: AgentStepId | None = None
    current_plan_id: TrainingPlanId | None = None
    current_approval_id: ApprovalId | None = None
    checkpoint_id: CheckpointId | None = None
    retry_count: int = Field(default=0, ge=0, le=100)
    waiting_for: str | None = Field(default=None, max_length=240)
    recoverable: bool = True
    formal_write_occurred: bool = False


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
    occurred_at: AwareDatetime
    run_id: AgentRunId
    task_id: TrainingTaskId
    sequence: int = Field(ge=1)
    payload: AgentProgressPayload | ApprovalEventPayload | ErrorEventPayload
    schema_version: SchemaVersion = CONTRACT_SCHEMA_VERSION
