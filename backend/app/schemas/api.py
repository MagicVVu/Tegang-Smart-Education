"""Typed API payloads and controlled Agent output contracts."""

from __future__ import annotations

from datetime import date

from pydantic import AwareDatetime, Field

from .agent import AgentState, RealtimeEvent
from .approval import ApprovalResult
from .assessment import AssessmentResult, RemediationIntervention, Retest
from .common import (
    CONTRACT_SCHEMA_VERSION,
    AgentRunId,
    ApiEnvelope,
    ApiRequestContext,
    CourseId,
    DepartmentId,
    EmployeeProfileId,
    IdempotencyKey,
    KnowledgeCitationId,
    RequestId,
    RiskLevel,
    RoleId,
    SchemaVersion,
    TraceId,
    TrainingGoalId,
    TrainingPlanId,
    TrainingTaskId,
    UserId,
    ContractModel,
    Confidence,
)
from .errors import UnifiedError
from .training import TrainingPlan, TrainingTask


class CreateTrainingTaskInput(ContractModel):
    training_goal_id: TrainingGoalId
    name: str = Field(min_length=1, max_length=240)
    objective: str = Field(min_length=1, max_length=4000)
    target_department_ids: list[DepartmentId] = Field(default_factory=list)
    target_employee_profile_ids: list[EmployeeProfileId] = Field(default_factory=list)
    deadline: date


class CreateTrainingTaskRequest(ApiRequestContext):
    idempotency_key: IdempotencyKey
    data: CreateTrainingTaskInput


class CreateTrainingTaskResponse(ApiEnvelope):
    data: TrainingTask


class PlanGenerationInput(ContractModel):
    training_goal_id: TrainingGoalId
    task_id: TrainingTaskId
    required_course_ids: list[CourseId] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    candidate_count: int = Field(default=2, ge=1, le=5)


class PlanGenerationRequest(ApiRequestContext):
    trace_id: TraceId
    idempotency_key: IdempotencyKey
    data: PlanGenerationInput


class PlanGenerationResponse(ApiEnvelope):
    run_id: AgentRunId
    data: list[TrainingPlan]


class SubmitApprovalInput(ContractModel):
    task_id: TrainingTaskId
    plan_id: TrainingPlanId
    reviewer_role_id: RoleId
    risk_summary: str = Field(min_length=1, max_length=4000)
    impact_scope: list[str] = Field(min_length=1)
    knowledge_citation_ids: list[KnowledgeCitationId] = Field(default_factory=list)


class SubmitApprovalRequest(ApiRequestContext):
    idempotency_key: IdempotencyKey
    data: SubmitApprovalInput


class ApprovalResultResponse(ApiEnvelope):
    data: ApprovalResult


class AssessmentResultResponse(ApiEnvelope):
    data: AssessmentResult


class RemediationResultResponse(ApiEnvelope):
    data: RemediationIntervention


class RetestResultResponse(ApiEnvelope):
    data: Retest


class AgentStateResponse(ApiEnvelope):
    data: AgentState


class RealtimeEventResponse(ApiEnvelope):
    data: RealtimeEvent


class ErrorResponse(ContractModel):
    schema_version: SchemaVersion = CONTRACT_SCHEMA_VERSION
    request_id: RequestId
    trace_id: TraceId
    occurred_at: AwareDatetime
    error: UnifiedError


class DifyPlanAgentOutput(ContractModel):
    """Dify-style structured output example backed by the same Pydantic schema."""

    schema_version: SchemaVersion = CONTRACT_SCHEMA_VERSION
    training_goal_id: TrainingGoalId
    proposed_plan_id: TrainingPlanId
    title: str = Field(min_length=1, max_length=240)
    summary: str = Field(min_length=1, max_length=4000)
    selection_reason: str = Field(min_length=1, max_length=4000)
    course_ids: list[CourseId] = Field(min_length=1)
    knowledge_citation_ids: list[KnowledgeCitationId] = Field(default_factory=list)
    risk_level: RiskLevel
    confidence: Confidence
    human_review_required: bool
    warnings: list[str] = Field(default_factory=list)
