"""Approval request and decision contracts."""

from __future__ import annotations

from enum import StrEnum

from pydantic import AwareDatetime, Field, model_validator

from .common import (
    ApprovalId,
    ApprovalStatus,
    KnowledgeCitationId,
    RoleId,
    TrainingPlanId,
    TrainingTaskId,
    UserId,
    VersionedEntity,
)


class ApprovalDecision(StrEnum):
    APPROVED = "approved"
    APPROVED_WITH_CHANGES = "approved_with_changes"
    REJECTED = "rejected"
    RETURNED_FOR_INFORMATION = "returned_for_information"


class Approval(VersionedEntity):
    """Human approval record for high-risk or otherwise gated writes."""

    id: ApprovalId
    status: ApprovalStatus
    task_id: TrainingTaskId
    plan_id: TrainingPlanId
    requested_by: UserId
    reviewer_role_id: RoleId
    reviewer_id: UserId | None = None
    risk_summary: str = Field(min_length=1, max_length=4000)
    impact_scope: list[str] = Field(min_length=1)
    knowledge_citation_ids: list[KnowledgeCitationId] = Field(default_factory=list)
    submitted_at: AwareDatetime | None = None
    decided_at: AwareDatetime | None = None
    decision: ApprovalDecision | None = None
    decision_comment: str | None = Field(default=None, max_length=4000)
    requested_changes: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_decision_fields(self) -> "Approval":
        decided = self.status in {
            ApprovalStatus.APPROVED,
            ApprovalStatus.REJECTED,
        }
        if decided and (self.decision is None or self.decided_at is None or self.reviewer_id is None):
            raise ValueError("decided approval requires decision, decided_at, and reviewer_id")
        return self


class ApprovalResult(VersionedEntity):
    """Concise result emitted after an approval action."""

    id: ApprovalId
    status: ApprovalStatus
    task_id: TrainingTaskId
    plan_id: TrainingPlanId
    reviewer_id: UserId
    decision: ApprovalDecision
    decision_comment: str | None = Field(default=None, max_length=4000)
    decided_at: AwareDatetime

    @model_validator(mode="after")
    def validate_terminal_decision(self) -> "ApprovalResult":
        if self.status not in {ApprovalStatus.APPROVED, ApprovalStatus.REJECTED}:
            raise ValueError("approval result status must be AP-APPROVED or AP-REJECTED")
        if self.status == ApprovalStatus.APPROVED and self.decision not in {
            ApprovalDecision.APPROVED,
            ApprovalDecision.APPROVED_WITH_CHANGES,
        }:
            raise ValueError("approved status requires an approved decision")
        if self.status == ApprovalStatus.REJECTED and self.decision != ApprovalDecision.REJECTED:
            raise ValueError("rejected status requires a rejected decision")
        return self
