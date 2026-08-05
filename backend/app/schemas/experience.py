"""Formal read/API contracts consumed directly by the Web and Android prototypes.

These projections are derived from the same domain IDs and enums as the core
contracts.  They are not adapters and never accept legacy field or state names.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Literal

from pydantic import AwareDatetime, Field

from .assessment import AssessmentNextAction, KnowledgePointPerformance
from .common import (
    AgentRunId,
    AssessmentResultId,
    AssessmentSessionId,
    CONTRACT_SCHEMA_VERSION,
    ApprovalId,
    CourseId,
    EmployeeProfileId,
    KnowledgeCitationId,
    KnowledgePointId,
    LearningRecordStatus,
    NotificationId,
    Percentage,
    RiskLevel,
    SchemaVersion,
    TrainingTaskId,
    TrainingGoalId,
    TrainingPlanId,
    TrainingTaskStatus,
    TutorAnswerId,
    UserId,
    UserRole,
    ContractModel,
)
from .knowledge import KnowledgeCitation
from .training import TrainingPlan


class PrototypeUserProfile(ContractModel):
    """Permission-safe signed-in user projection for prototype clients."""

    schema_version: SchemaVersion = CONTRACT_SCHEMA_VERSION
    user_id: UserId
    employee_profile_id: EmployeeProfileId | None = None
    display_name: str = Field(min_length=1, max_length=120)
    role: UserRole
    department_name: str = Field(min_length=1, max_length=160)
    job_title: str = Field(min_length=1, max_length=160)
    account_label: str | None = Field(default=None, min_length=1, max_length=120)


class CoursePlanItem(ContractModel):
    """Course projection embedded in a training-plan read response."""

    schema_version: SchemaVersion = CONTRACT_SCHEMA_VERSION
    id: CourseId
    title: str = Field(min_length=1, max_length=240)
    department_name: str = Field(min_length=1, max_length=160)
    duration_minutes: int = Field(ge=1, le=10080)
    risk_level: RiskLevel
    completed: bool = False
    knowledge_point_ids: list[KnowledgePointId] = Field(default_factory=list)


class TrainingPlanDetail(TrainingPlan):
    """Training-plan read model with its already-authorized embedded resources."""

    target_department_names: list[str] = Field(default_factory=list)
    courses: list[CoursePlanItem] = Field(min_length=1)
    knowledge_citations: list[KnowledgeCitation] = Field(default_factory=list)


class TrainingTaskView(ContractModel):
    """Direct client read contract with task and employee-learning states separated."""

    schema_version: SchemaVersion = CONTRACT_SCHEMA_VERSION
    id: TrainingTaskId
    training_goal_id: TrainingGoalId
    task_status: TrainingTaskStatus
    learning_status: LearningRecordStatus
    current_plan_id: TrainingPlanId | None = None
    approval_id: ApprovalId | None = None
    name: str = Field(min_length=1, max_length=240)
    objective: str = Field(min_length=1, max_length=4000)
    department_name: str = Field(min_length=1, max_length=160)
    audience_label: str = Field(min_length=1, max_length=240)
    department_names: list[str] = Field(default_factory=list)
    audience_labels: list[str] = Field(default_factory=list)
    mandatory_requirements: list[str] = Field(default_factory=list)
    high_risk_requirements: list[str] = Field(default_factory=list)
    deadline: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    risk_level: RiskLevel
    progress_percent: Percentage
    estimated_minutes: int = Field(ge=1, le=10080)
    next_action_label: str = Field(min_length=1, max_length=240)
    availability_reason: str | None = Field(default=None, max_length=1000)
    created_at: AwareDatetime


class TrainingRecordView(ContractModel):
    schema_version: SchemaVersion = CONTRACT_SCHEMA_VERSION
    task_id: TrainingTaskId
    task_name: str = Field(min_length=1, max_length=240)
    learning_status: LearningRecordStatus
    completed_at: AwareDatetime | None = None
    result_summary: str = Field(min_length=1, max_length=1000)


class CourseUnitContent(ContractModel):
    schema_version: SchemaVersion = CONTRACT_SCHEMA_VERSION
    id: CourseId
    title: str = Field(min_length=1, max_length=240)
    duration_minutes: int = Field(ge=1, le=10080)
    risk_level: RiskLevel
    completed: bool = False
    eyebrow: str = Field(min_length=1, max_length=240)
    heading: str = Field(min_length=1, max_length=500)
    paragraphs: list[str] = Field(min_length=1)
    key_points: list[str] = Field(min_length=1)
    scenario_question: str = Field(min_length=1, max_length=2000)
    scenario_answer: str = Field(min_length=1, max_length=2000)
    knowledge_citation_ids: list[KnowledgeCitationId] = Field(default_factory=list)


class CourseDetailView(ContractModel):
    schema_version: SchemaVersion = CONTRACT_SCHEMA_VERSION
    task_id: TrainingTaskId
    title: str = Field(min_length=1, max_length=240)
    units: list[CourseUnitContent] = Field(min_length=1)
    current_unit_index: int = Field(ge=0)
    content_version: str = Field(min_length=1, max_length=120)
    is_remedial: bool = False


class LearningProgressView(ContractModel):
    schema_version: SchemaVersion = CONTRACT_SCHEMA_VERSION
    task: TrainingTaskView
    current_unit_index: int = Field(ge=0)
    saved_at: AwareDatetime
    attempt: int | None = Field(default=None, ge=1)


class TutorAnswerKind(StrEnum):
    SUPPORTED = "supported"
    REFUSED = "refused"
    MANUAL = "manual"


class TutorSessionView(ContractModel):
    schema_version: SchemaVersion = CONTRACT_SCHEMA_VERSION
    welcome: str = Field(min_length=1, max_length=4000)
    suggestions: list[str] = Field(default_factory=list)


class TutorAnswerView(ContractModel):
    schema_version: SchemaVersion = CONTRACT_SCHEMA_VERSION
    id: TutorAnswerId
    answer: str = Field(min_length=1, max_length=8000)
    kind: TutorAnswerKind
    knowledge_citation_ids: list[KnowledgeCitationId] = Field(default_factory=list)
    high_risk_notice: str | None = Field(default=None, max_length=1000)


class WrongAnswerReason(ContractModel):
    question_id: str = Field(pattern=r"^question_[0-9A-HJKMNP-TV-Z]{26}$")
    knowledge_point_id: KnowledgePointId
    knowledge_point_name: str = Field(min_length=1, max_length=240)
    reason: str = Field(min_length=1, max_length=2000)
    recommendation: str = Field(min_length=1, max_length=2000)


class AssessmentResultView(ContractModel):
    schema_version: SchemaVersion = CONTRACT_SCHEMA_VERSION
    id: AssessmentResultId
    assessment_session_id: AssessmentSessionId
    task_id: TrainingTaskId
    employee_profile_id: EmployeeProfileId
    attempt: int = Field(ge=1)
    score_percent: Percentage
    passed: bool
    high_risk_passed: bool
    knowledge_point_performances: list[KnowledgePointPerformance] = Field(default_factory=list)
    next_action: AssessmentNextAction
    submitted_at: AwareDatetime
    previous_score_percent: Percentage | None = None
    score_change_percent: float | None = Field(default=None, ge=-100, le=100)
    wrong_answer_reasons: list[WrongAnswerReason] = Field(default_factory=list)
    disclaimer: str = Field(min_length=1, max_length=1000)


class AssessmentDraftView(ContractModel):
    schema_version: SchemaVersion = CONTRACT_SCHEMA_VERSION
    task_id: TrainingTaskId
    attempt: int = Field(ge=1)
    answers: dict[str, list[int]]
    saved_at: AwareDatetime
    storage: Literal["local", "synced"]


class WeakKnowledgePoint(ContractModel):
    knowledge_point_id: KnowledgePointId
    knowledge_point_name: str = Field(min_length=1, max_length=240)
    reason: str = Field(min_length=1, max_length=2000)
    risk_level: RiskLevel


class RemedialPlanView(ContractModel):
    schema_version: SchemaVersion = CONTRACT_SCHEMA_VERSION
    task_id: TrainingTaskId
    title: str = Field(min_length=1, max_length=240)
    reason: str = Field(min_length=1, max_length=4000)
    weak_points: list[WeakKnowledgePoint] = Field(min_length=1)
    requirements: list[str] = Field(min_length=1)
    next_step: str = Field(min_length=1, max_length=2000)
    current_step: Literal[1, 2, 3]


class NotificationDestination(StrEnum):
    TASK = "task"
    ASSESSMENT = "assessment"
    REMEDIAL = "remedial"


class NotificationItemView(ContractModel):
    schema_version: SchemaVersion = CONTRACT_SCHEMA_VERSION
    id: NotificationId
    title: str = Field(min_length=1, max_length=240)
    description: str = Field(min_length=1, max_length=1000)
    created_at: AwareDatetime
    icon: str = Field(min_length=1, max_length=120)
    unread: bool
    task_id: TrainingTaskId | None = None
    destination: NotificationDestination | None = None


class ReportStatus(StrEnum):
    DRAFT = "draft"
    AWAITING_CONFIRMATION = "awaiting_confirmation"
    CONFIRMED = "confirmed"


class ReportSummary(ContractModel):
    schema_version: SchemaVersion = CONTRACT_SCHEMA_VERSION
    task_id: TrainingTaskId
    completion_rate_percent: Percentage
    assessment_pass_rate_percent: Percentage
    remedial_count: int = Field(ge=0)
    reassessment_count: int = Field(ge=0)
    high_risk_intervention_count: int = Field(ge=0)
    status: ReportStatus
    disclaimer: str = Field(min_length=1, max_length=2000)
