"""Training goal, task, plan, course, and rule-check contracts."""

from __future__ import annotations

from datetime import date
from enum import StrEnum

from pydantic import Field

from .common import (
    ApprovalId,
    CourseId,
    DepartmentId,
    EmployeeProfileId,
    KnowledgeCitationId,
    KnowledgePointId,
    Percentage,
    RiskLevel,
    TrainingGoalId,
    TrainingPlanId,
    TrainingTaskId,
    TrainingTaskStatus,
    VersionedEntity,
)


class GoalStatus(StrEnum):
    DRAFT = "draft"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class PlanStatus(StrEnum):
    DRAFT = "draft"
    CANDIDATE = "candidate"
    CONFIRMED = "confirmed"
    SUPERSEDED = "superseded"


class CourseStatus(StrEnum):
    DRAFT = "draft"
    ACTIVE = "active"
    RETIRED = "retired"


class RuleCheckResult(StrEnum):
    PASSED = "passed"
    WARNING = "warning"
    BLOCKED = "blocked"


class RuleCheckSummary(VersionedEntity):
    """Deterministic rule result referenced by a plan or task."""

    id: str = Field(pattern=r"^rule_[0-9A-HJKMNP-TV-Z]{26}$")
    status: RuleCheckResult
    rule_code: str = Field(min_length=1, max_length=100)
    label: str = Field(min_length=1, max_length=200)
    detail: str = Field(min_length=1, max_length=2000)
    deterministic: bool = True


class TrainingGoal(VersionedEntity):
    """Training objective and its audience/constraint boundary."""

    id: TrainingGoalId
    status: GoalStatus
    title: str = Field(min_length=1, max_length=240)
    objective: str = Field(min_length=1, max_length=4000)
    target_department_ids: list[DepartmentId] = Field(default_factory=list)
    target_employee_profile_ids: list[EmployeeProfileId] = Field(default_factory=list)
    mandatory_requirements: list[str] = Field(default_factory=list)
    high_risk_requirements: list[str] = Field(default_factory=list)
    deadline: date | None = None


class Course(VersionedEntity):
    """Reusable learning course bound to authorized knowledge points."""

    id: CourseId
    status: CourseStatus
    title: str = Field(min_length=1, max_length=240)
    department_ids: list[DepartmentId] = Field(default_factory=list)
    knowledge_point_ids: list[KnowledgePointId] = Field(default_factory=list)
    duration_minutes: int = Field(ge=1, le=10080)
    required: bool = True


class TrainingPlan(VersionedEntity):
    """Versioned candidate or confirmed plan for one training goal."""

    id: TrainingPlanId
    status: PlanStatus
    training_goal_id: TrainingGoalId
    title: str = Field(min_length=1, max_length=240)
    candidate_label: str = Field(min_length=1, max_length=120)
    summary: str = Field(min_length=1, max_length=4000)
    selection_reason: str = Field(min_length=1, max_length=4000)
    course_ids: list[CourseId] = Field(min_length=1)
    knowledge_citation_ids: list[KnowledgeCitationId] = Field(default_factory=list)
    rule_checks: list[RuleCheckSummary] = Field(default_factory=list)
    approval_id: ApprovalId | None = None


class TrainingTask(VersionedEntity):
    """Executable training assignment governed by chapter 15 business states."""

    id: TrainingTaskId
    status: TrainingTaskStatus
    training_goal_id: TrainingGoalId
    current_plan_id: TrainingPlanId | None = None
    name: str = Field(min_length=1, max_length=240)
    objective: str = Field(min_length=1, max_length=4000)
    target_department_ids: list[DepartmentId] = Field(default_factory=list)
    target_employee_profile_ids: list[EmployeeProfileId] = Field(default_factory=list)
    deadline: date
    progress_percent: Percentage = 0
    approval_id: ApprovalId | None = None
