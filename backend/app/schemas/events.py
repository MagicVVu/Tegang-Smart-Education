"""Immutable internal business-event contracts derived from C-03 domain models."""

from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import AwareDatetime, Field, field_validator, model_validator

from .agent import AgentStepStatus
from .approval import ApprovalDecision
from .assessment import RemediationStatus, RetestStatus
from .common import (
    AgentRunId,
    AgentStepId,
    ApprovalId,
    ApprovalStatus,
    AssessmentResultId,
    AssessmentSessionId,
    CheckpointId,
    ContractModel,
    ContractReferenceId,
    DepartmentId,
    EmployeeProfileId,
    ErrorId,
    EVENT_SCHEMA_VERSION,
    EventId,
    IdempotencyKey,
    KnowledgeCitationId,
    LearningRecordStatus,
    RemediationId,
    RequestId,
    RetestId,
    SchemaVersion,
    SUPPORTED_EVENT_SCHEMA_VERSIONS,
    TraceId,
    TrainingPlanId,
    TrainingTaskId,
    TrainingTaskStatus,
    UserId,
    UserRole,
)
from .training import PlanStatus


class BusinessEventType(StrEnum):
    TRAINING_TASK_CREATED = "training_task.created"
    TRAINING_PLAN_GENERATED = "training_plan.generated"
    APPROVAL_REQUESTED = "approval.requested"
    APPROVAL_APPROVED = "approval.approved"
    APPROVAL_RETURNED = "approval.returned"
    APPROVAL_REJECTED = "approval.rejected"
    TRAINING_TASK_PUBLISHED = "training_task.published"
    LEARNING_STARTED = "learning.started"
    LEARNING_COMPLETED = "learning.completed"
    ASSESSMENT_COMPLETED = "assessment.completed"
    REMEDIATION_CREATED = "remediation.created"
    RETEST_COMPLETED = "retest.completed"
    AGENT_STEP_STARTED = "agent_step.started"
    AGENT_STEP_COMPLETED = "agent_step.completed"
    AGENT_STEP_FAILED = "agent_step.failed"
    HUMAN_TAKEOVER_REQUESTED = "human_takeover.requested"


class EventProducer(StrEnum):
    BUSINESS_API = "business_api"
    AGENT_ORCHESTRATOR = "agent_orchestrator"
    RAG = "rag"
    SKILL_ADAPTER = "skill_adapter"
    APPROVAL = "approval"
    ASSESSMENT = "assessment"
    BACKGROUND_TASK = "background_task"
    SYSTEM = "system"


class AggregateType(StrEnum):
    TRAINING_TASK = "training_task"
    TRAINING_PLAN = "training_plan"
    APPROVAL = "approval"
    LEARNING_RECORD = "learning_record"
    ASSESSMENT_RESULT = "assessment_result"
    REMEDIATION = "remediation"
    RETEST = "retest"
    AGENT_RUN = "agent_run"


class EventActorSource(StrEnum):
    USER = "user"
    SYSTEM = "system"
    AGENT = "agent"
    RULE = "rule"
    EXTERNAL = "external"


class EventActor(ContractModel):
    """Minimal verified actor context; it never grants authority by itself."""

    source: EventActorSource
    actor_id: UserId | None = None
    actor_role: UserRole | None = None
    department_id: DepartmentId | None = None

    @model_validator(mode="after")
    def validate_user_actor(self) -> "EventActor":
        if self.source == EventActorSource.USER and (self.actor_id is None or self.actor_role is None):
            raise ValueError("user event actor requires actor_id and actor_role")
        return self


class TrainingTaskEventPayload(ContractModel):
    task_id: TrainingTaskId
    status: TrainingTaskStatus
    plan_id: TrainingPlanId | None = None
    approval_id: ApprovalId | None = None
    summary: str = Field(min_length=1, max_length=1000)


class TrainingPlanEventPayload(ContractModel):
    plan_id: TrainingPlanId
    task_id: TrainingTaskId
    status: PlanStatus
    knowledge_citation_ids: list[KnowledgeCitationId] = Field(default_factory=list)
    summary: str = Field(min_length=1, max_length=1000)


class ApprovalBusinessEventPayload(ContractModel):
    approval_id: ApprovalId
    task_id: TrainingTaskId
    plan_id: TrainingPlanId
    status: ApprovalStatus
    decision: ApprovalDecision | None = None
    summary: str = Field(min_length=1, max_length=1000)


class LearningBusinessEventPayload(ContractModel):
    task_id: TrainingTaskId
    employee_profile_id: EmployeeProfileId
    status: LearningRecordStatus
    summary: str = Field(min_length=1, max_length=1000)


class AssessmentCompletedEventPayload(ContractModel):
    assessment_result_id: AssessmentResultId
    assessment_session_id: AssessmentSessionId
    task_id: TrainingTaskId
    employee_profile_id: EmployeeProfileId
    passed: bool
    high_risk_passed: bool


class RemediationCreatedEventPayload(ContractModel):
    remediation_id: RemediationId
    task_id: TrainingTaskId
    employee_profile_id: EmployeeProfileId
    status: RemediationStatus
    attempt: int = Field(ge=1)


class RetestCompletedEventPayload(ContractModel):
    retest_id: RetestId
    task_id: TrainingTaskId
    employee_profile_id: EmployeeProfileId
    status: RetestStatus
    assessment_result_id: AssessmentResultId | None = None


class AgentStepBusinessEventPayload(ContractModel):
    run_id: AgentRunId
    step_id: AgentStepId
    status: AgentStepStatus
    checkpoint_id: CheckpointId | None = None
    error_id: ErrorId | None = None
    summary: str = Field(min_length=1, max_length=1000)


class HumanTakeoverRequestedEventPayload(ContractModel):
    run_id: AgentRunId
    task_id: TrainingTaskId
    checkpoint_id: CheckpointId | None = None
    error_id: ErrorId | None = None
    reason: str = Field(min_length=1, max_length=2000)
    requested_role: UserRole


BusinessEventPayload = (
    TrainingTaskEventPayload
    | TrainingPlanEventPayload
    | ApprovalBusinessEventPayload
    | LearningBusinessEventPayload
    | AssessmentCompletedEventPayload
    | RemediationCreatedEventPayload
    | RetestCompletedEventPayload
    | AgentStepBusinessEventPayload
    | HumanTakeoverRequestedEventPayload
)


class EventEnvelope(ContractModel):
    """Immutable business event; transport and message-broker implementation are out of scope."""

    event_id: EventId
    event_type: BusinessEventType
    event_version: SchemaVersion
    occurred_at: AwareDatetime
    producer: EventProducer
    aggregate_type: AggregateType
    aggregate_id: ContractReferenceId
    sequence: int = Field(ge=1)
    trace_id: TraceId
    correlation_id: TraceId
    causation_id: ContractReferenceId | None = None
    actor: EventActor
    payload: BusinessEventPayload
    metadata: dict[str, Any] = Field(
        description="Non-sensitive transport metadata only; prompts, credentials, stacks, and unauthorized data are forbidden.",
    )
    deduplication_key: IdempotencyKey | None = None
    request_id: RequestId | None = None

    @field_validator("event_version")
    @classmethod
    def validate_event_version(cls, value: str) -> str:
        if value not in SUPPORTED_EVENT_SCHEMA_VERSIONS:
            supported = ", ".join(sorted(SUPPORTED_EVENT_SCHEMA_VERSIONS))
            raise ValueError(f"unsupported event version {value}; supported: {supported}")
        return value

    @model_validator(mode="after")
    def validate_aggregate_and_payload(self) -> "EventEnvelope":
        prefixes = {
            AggregateType.TRAINING_TASK: "task_",
            AggregateType.TRAINING_PLAN: "plan_",
            AggregateType.APPROVAL: "approval_",
            AggregateType.LEARNING_RECORD: "task_",
            AggregateType.ASSESSMENT_RESULT: "assessment_result_",
            AggregateType.REMEDIATION: "intervention_",
            AggregateType.RETEST: "retest_",
            AggregateType.AGENT_RUN: "run_",
        }
        if not self.aggregate_id.startswith(prefixes[self.aggregate_type]):
            raise ValueError("aggregate_id prefix does not match aggregate_type")

        payload_types: dict[BusinessEventType, type[ContractModel]] = {
            BusinessEventType.TRAINING_TASK_CREATED: TrainingTaskEventPayload,
            BusinessEventType.TRAINING_PLAN_GENERATED: TrainingPlanEventPayload,
            BusinessEventType.APPROVAL_REQUESTED: ApprovalBusinessEventPayload,
            BusinessEventType.APPROVAL_APPROVED: ApprovalBusinessEventPayload,
            BusinessEventType.APPROVAL_RETURNED: ApprovalBusinessEventPayload,
            BusinessEventType.APPROVAL_REJECTED: ApprovalBusinessEventPayload,
            BusinessEventType.TRAINING_TASK_PUBLISHED: TrainingTaskEventPayload,
            BusinessEventType.LEARNING_STARTED: LearningBusinessEventPayload,
            BusinessEventType.LEARNING_COMPLETED: LearningBusinessEventPayload,
            BusinessEventType.ASSESSMENT_COMPLETED: AssessmentCompletedEventPayload,
            BusinessEventType.REMEDIATION_CREATED: RemediationCreatedEventPayload,
            BusinessEventType.RETEST_COMPLETED: RetestCompletedEventPayload,
            BusinessEventType.AGENT_STEP_STARTED: AgentStepBusinessEventPayload,
            BusinessEventType.AGENT_STEP_COMPLETED: AgentStepBusinessEventPayload,
            BusinessEventType.AGENT_STEP_FAILED: AgentStepBusinessEventPayload,
            BusinessEventType.HUMAN_TAKEOVER_REQUESTED: HumanTakeoverRequestedEventPayload,
        }
        if not isinstance(self.payload, payload_types[self.event_type]):
            raise ValueError("payload type does not match event_type")
        return self

    @property
    def deduplication_identity(self) -> str:
        """The immutable event ID is the consumer-side idempotency identity."""

        return self.event_id


CURRENT_EVENT_VERSION = EVENT_SCHEMA_VERSION
