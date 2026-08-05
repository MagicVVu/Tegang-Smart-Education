"""Assessment, knowledge-point performance, remediation, and retest contracts."""

from __future__ import annotations

from enum import StrEnum
from typing import Literal

from pydantic import AwareDatetime, Field

from .common import (
    AssessmentQuestionId,
    AssessmentResultId,
    AssessmentSessionId,
    CourseId,
    EmployeeProfileId,
    KnowledgePointId,
    KnowledgePointPerformanceId,
    LearningRecordStatus,
    Percentage,
    RemediationId,
    RetestId,
    RiskLevel,
    TrainingTaskId,
    VersionedEntity,
)


class AssessmentQuestionType(StrEnum):
    SINGLE = "single"
    MULTIPLE = "multiple"
    BOOLEAN = "boolean"


class AssessmentSessionStatus(StrEnum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    SCORED = "scored"
    CANCELLED = "cancelled"


class AssessmentNextAction(StrEnum):
    COMPLETE = "complete"
    REMEDIATION = "remediation"
    HUMAN_REVIEW = "human_review"


class RemediationStatus(StrEnum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    MANUAL = "manual"
    CANCELLED = "cancelled"


class RetestStatus(StrEnum):
    WAITING = "waiting"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    MANUAL = "manual"
    CANCELLED = "cancelled"


class AssessmentQuestion(VersionedEntity):
    """Scorable question bound to one governed knowledge point."""

    id: AssessmentQuestionId
    status: Literal["active"] = "active"
    question_type: AssessmentQuestionType
    prompt: str = Field(min_length=1, max_length=4000)
    options: list[str] = Field(min_length=2)
    correct_option_indexes: list[int] = Field(min_length=1)
    knowledge_point_id: KnowledgePointId
    knowledge_point_name: str = Field(min_length=1, max_length=240)
    risk_level: RiskLevel


class AssessmentSession(VersionedEntity):
    """One employee's one assessment attempt for a training task."""

    id: AssessmentSessionId
    status: AssessmentSessionStatus
    task_id: TrainingTaskId
    employee_profile_id: EmployeeProfileId
    attempt: int = Field(ge=1, le=100)
    started_at: AwareDatetime | None = None
    submitted_at: AwareDatetime | None = None


class KnowledgePointPerformance(VersionedEntity):
    """Assessment performance for one knowledge point."""

    id: KnowledgePointPerformanceId
    status: LearningRecordStatus
    assessment_session_id: AssessmentSessionId
    knowledge_point_id: KnowledgePointId
    knowledge_point_name: str = Field(min_length=1, max_length=240)
    score_percent: Percentage
    passed: bool
    reason: str = Field(min_length=1, max_length=2000)
    risk_level: RiskLevel


class AssessmentResult(VersionedEntity):
    """Scored assessment result; never a direct performance or HR conclusion."""

    id: AssessmentResultId
    status: Literal[AssessmentSessionStatus.SCORED]
    assessment_session_id: AssessmentSessionId
    task_id: TrainingTaskId
    employee_profile_id: EmployeeProfileId
    score_percent: Percentage
    passed: bool
    high_risk_passed: bool
    knowledge_point_performances: list[KnowledgePointPerformance] = Field(default_factory=list)
    next_action: AssessmentNextAction
    scored_at: AwareDatetime
    disclaimer: str = Field(
        default="Assessment results support training decisions only and must not be used directly for performance, promotion, punishment, or HR conclusions.",
        min_length=1,
        max_length=1000,
    )


class RemediationIntervention(VersionedEntity):
    """Targeted follow-up learning created from an assessment result."""

    id: RemediationId
    status: RemediationStatus
    task_id: TrainingTaskId
    assessment_result_id: AssessmentResultId
    employee_profile_id: EmployeeProfileId
    weak_knowledge_point_ids: list[KnowledgePointId] = Field(min_length=1)
    required_course_ids: list[CourseId] = Field(default_factory=list)
    reason: str = Field(min_length=1, max_length=4000)
    attempt: int = Field(ge=1, le=100)
    completed_at: AwareDatetime | None = None


class Retest(VersionedEntity):
    """Retest scheduled after a remediation intervention."""

    id: RetestId
    status: RetestStatus
    remediation_id: RemediationId
    task_id: TrainingTaskId
    employee_profile_id: EmployeeProfileId
    assessment_session_id: AssessmentSessionId | None = None
    result_id: AssessmentResultId | None = None
    scheduled_at: AwareDatetime | None = None
    completed_at: AwareDatetime | None = None
