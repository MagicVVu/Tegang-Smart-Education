"""Validated deterministic payload examples generated into ``docs/contracts``."""

from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel

from .agent import AgentProgressPayload, AgentState, AgentStepStatus, RealtimeEvent
from .api import (
    AgentStateResponse,
    ApprovalResultResponse,
    AssessmentResultResponse,
    CreateTrainingTaskRequest,
    CreateTrainingTaskResponse,
    DifyPlanAgentOutput,
    PlanGenerationRequest,
    PlanGenerationResponse,
    RealtimeEventResponse,
    RemediationResultResponse,
    RetestResultResponse,
    SubmitApprovalRequest,
)
from .approval import Approval, ApprovalDecision, ApprovalResult
from .assessment import (
    AssessmentNextAction,
    AssessmentResult,
    AssessmentSessionStatus,
    KnowledgePointPerformance,
    RemediationIntervention,
    RemediationStatus,
    Retest,
    RetestStatus,
)
from .common import (
    AgentRunStatus,
    ApprovalStatus,
    LearningRecordStatus,
    RiskLevel,
    TrainingTaskStatus,
)
from .errors import ErrorCategory, ErrorCode, UnifiedError
from .training import PlanStatus, RuleCheckResult, RuleCheckSummary, TrainingPlan, TrainingTask

ULID_1 = "01ARZ3NDEKTSV4RRFFQ69G5FAV"
ULID_2 = "01ARZ3NDEKTSV4RRFFQ69G5FAW"
ULID_3 = "01ARZ3NDEKTSV4RRFFQ69G5FAX"
NOW = datetime(2026, 8, 4, 8, 0, tzinfo=timezone.utc)
LATER = datetime(2026, 8, 4, 8, 5, tzinfo=timezone.utc)


def _id(prefix: str, ulid: str = ULID_1) -> str:
    return f"{prefix}_{ulid}"


def _audit(*, risk: RiskLevel = RiskLevel.LOW, confidence: float | None = None) -> dict[str, object]:
    return {
        "created_at": NOW,
        "updated_at": LATER,
        "created_by": _id("usr"),
        "updated_by": _id("usr"),
        "risk_level": risk,
        "confidence": confidence,
        "trace_id": _id("trc"),
        "request_id": _id("req"),
        "metadata": {},
    }


def build_examples() -> dict[str, tuple[type[BaseModel], BaseModel]]:
    """Build each published example by constructing its authoritative model."""

    rule_check = RuleCheckSummary(
        id=_id("rule"),
        status=RuleCheckResult.WARNING,
        rule_code="HIGH_RISK_APPROVAL_REQUIRED",
        label="High-risk publication approval",
        detail="Formal publication remains blocked until an authorized reviewer approves.",
        risk_level=RiskLevel.HIGH,
        **{k: v for k, v in _audit(risk=RiskLevel.HIGH).items() if k != "risk_level"},
    )
    task = TrainingTask(
        id=_id("task"),
        status=TrainingTaskStatus.WAIT_CONFIRM,
        training_goal_id=_id("goal"),
        current_plan_id=_id("plan"),
        name="New employee high-risk safety training",
        objective="Complete role-specific learning, assessment, remediation, and retest with traceable evidence.",
        target_department_ids=[_id("dept")],
        target_employee_profile_ids=[_id("emp")],
        deadline="2026-08-15",
        progress_percent=42,
        approval_id=_id("approval"),
        risk_level=RiskLevel.HIGH,
        **{k: v for k, v in _audit(risk=RiskLevel.HIGH).items() if k != "risk_level"},
    )
    plan = TrainingPlan(
        id=_id("plan"),
        status=PlanStatus.CANDIDATE,
        training_goal_id=_id("goal"),
        title="Risk-first differentiated path",
        candidate_label="Candidate B",
        summary="Front-load high-risk knowledge before operational learning.",
        selection_reason="Shortens the exposure window while preserving department-specific paths.",
        course_ids=[_id("course")],
        knowledge_citation_ids=[_id("know")],
        rule_checks=[rule_check],
        approval_id=_id("approval"),
        risk_level=RiskLevel.HIGH,
        confidence=0.82,
        **{k: v for k, v in _audit(risk=RiskLevel.HIGH).items() if k not in {"risk_level", "confidence"}},
    )
    approval = Approval(
        id=_id("approval"),
        status=ApprovalStatus.WAITING,
        task_id=task.id,
        plan_id=plan.id,
        requested_by=_id("usr"),
        reviewer_role_id=_id("role"),
        risk_summary="High-risk knowledge is included and formal publication requires approval.",
        impact_scope=["department:steelmaking", "action:publish_training"],
        knowledge_citation_ids=[_id("know")],
        submitted_at=NOW,
        risk_level=RiskLevel.HIGH,
        **{k: v for k, v in _audit(risk=RiskLevel.HIGH).items() if k != "risk_level"},
    )
    approval_result = ApprovalResult(
        id=approval.id,
        status=ApprovalStatus.APPROVED,
        task_id=task.id,
        plan_id=plan.id,
        reviewer_id=_id("usr", ULID_2),
        decision=ApprovalDecision.APPROVED,
        decision_comment="Approved for the stated department scope.",
        decided_at=LATER,
        risk_level=RiskLevel.HIGH,
        **{k: v for k, v in _audit(risk=RiskLevel.HIGH).items() if k != "risk_level"},
    )
    performance = KnowledgePointPerformance(
        id=_id("kperf"),
        status=LearningRecordStatus.NOT_MET,
        assessment_session_id=_id("assessment"),
        knowledge_point_id=_id("kp"),
        knowledge_point_name="Equipment interlock pre-check",
        score_percent=60,
        passed=False,
        reason="The equipment interlock pre-check was incomplete.",
        risk_level=RiskLevel.HIGH,
        **{k: v for k, v in _audit(risk=RiskLevel.HIGH).items() if k != "risk_level"},
    )
    assessment_result = AssessmentResult(
        id=_id("assessment_result"),
        status=AssessmentSessionStatus.SCORED,
        assessment_session_id=_id("assessment"),
        task_id=task.id,
        employee_profile_id=_id("emp"),
        score_percent=78,
        passed=False,
        high_risk_passed=False,
        knowledge_point_performances=[performance],
        next_action=AssessmentNextAction.REMEDIATION,
        scored_at=LATER,
        risk_level=RiskLevel.HIGH,
        **{k: v for k, v in _audit(risk=RiskLevel.HIGH).items() if k != "risk_level"},
    )
    remediation = RemediationIntervention(
        id=_id("intervention"),
        status=RemediationStatus.PLANNED,
        task_id=task.id,
        assessment_result_id=assessment_result.id,
        employee_profile_id=_id("emp"),
        weak_knowledge_point_ids=[_id("kp")],
        required_course_ids=[_id("course")],
        reason="High-risk knowledge point did not meet the independent threshold.",
        attempt=1,
        risk_level=RiskLevel.HIGH,
        **{k: v for k, v in _audit(risk=RiskLevel.HIGH).items() if k != "risk_level"},
    )
    retest = Retest(
        id=_id("retest"),
        status=RetestStatus.WAITING,
        remediation_id=remediation.id,
        task_id=task.id,
        employee_profile_id=_id("emp"),
        scheduled_at=LATER,
        risk_level=RiskLevel.HIGH,
        **{k: v for k, v in _audit(risk=RiskLevel.HIGH).items() if k != "risk_level"},
    )
    state = AgentState(
        id=_id("run"),
        status=AgentRunStatus.WAIT_APPROVAL,
        task_id=task.id,
        current_step_id=_id("step"),
        current_plan_id=plan.id,
        current_approval_id=approval.id,
        checkpoint_id=_id("checkpoint"),
        retry_count=0,
        waiting_for="authorized_reviewer",
        recoverable=True,
        formal_write_occurred=False,
        risk_level=RiskLevel.HIGH,
        **{k: v for k, v in _audit(risk=RiskLevel.HIGH).items() if k != "risk_level"},
    )
    progress = AgentProgressPayload(
        id=_id("step"),
        status=AgentStepStatus.WAITING,
        run_id=state.id,
        step_id=_id("step"),
        progress_percent=65,
        summary="Plan checks passed; waiting for high-risk approval.",
        checkpoint_id=_id("checkpoint"),
        retry_count=0,
        formal_write_occurred=False,
        risk_level=RiskLevel.HIGH,
        **{k: v for k, v in _audit(risk=RiskLevel.HIGH).items() if k != "risk_level"},
    )
    event = RealtimeEvent(
        id=_id("event"),
        event_type="approval_required",
        occurred_at=LATER,
        run_id=state.id,
        task_id=task.id,
        sequence=7,
        payload=progress,
        risk_level=RiskLevel.HIGH,
        **{k: v for k, v in _audit(risk=RiskLevel.HIGH).items() if k not in {"risk_level"}},
    )
    unified_error = UnifiedError(
        error_id=_id("error"),
        code=ErrorCode.APPROVAL_REQUIRED,
        message="High-risk publication is waiting for an authorized reviewer.",
        category=ErrorCategory.APPROVAL_REQUIRED,
        retryable=False,
        user_action="Open the approval record and complete the authorized review.",
        details={"approval_id": approval.id, "task_id": task.id},
        field_errors=[],
        trace_id=_id("trc"),
        occurred_at=LATER,
    )

    response_common = {
        "request_id": _id("req"),
        "trace_id": _id("trc"),
        "occurred_at": LATER,
    }
    examples: dict[str, tuple[type[BaseModel], BaseModel]] = {
        "create-training-task-request": (
            CreateTrainingTaskRequest,
            CreateTrainingTaskRequest(
                request_id=_id("req"),
                idempotency_key="idem_training_create_20260804_001",
                actor_id=_id("usr"),
                data={
                    "training_goal_id": _id("goal"),
                    "name": task.name,
                    "objective": task.objective,
                    "target_department_ids": task.target_department_ids,
                    "target_employee_profile_ids": task.target_employee_profile_ids,
                    "deadline": task.deadline,
                },
            ),
        ),
        "create-training-task-response": (
            CreateTrainingTaskResponse,
            CreateTrainingTaskResponse(data=task, **response_common),
        ),
        "plan-generation-request": (
            PlanGenerationRequest,
            PlanGenerationRequest(
                request_id=_id("req"),
                trace_id=_id("trc"),
                idempotency_key="idem_plan_generate_20260804_001",
                actor_id=_id("usr"),
                data={
                    "training_goal_id": _id("goal"),
                    "task_id": task.id,
                    "required_course_ids": [_id("course")],
                    "constraints": ["high-risk knowledge requires approval"],
                    "candidate_count": 2,
                },
            ),
        ),
        "plan-generation-response": (
            PlanGenerationResponse,
            PlanGenerationResponse(run_id=state.id, data=[plan], **response_common),
        ),
        "approval-request": (
            SubmitApprovalRequest,
            SubmitApprovalRequest(
                request_id=_id("req"),
                idempotency_key="idem_approval_submit_20260804_001",
                actor_id=_id("usr"),
                data={
                    "task_id": task.id,
                    "plan_id": plan.id,
                    "reviewer_role_id": approval.reviewer_role_id,
                    "risk_summary": approval.risk_summary,
                    "impact_scope": approval.impact_scope,
                    "knowledge_citation_ids": approval.knowledge_citation_ids,
                },
            ),
        ),
        "approval-result": (
            ApprovalResultResponse,
            ApprovalResultResponse(data=approval_result, **response_common),
        ),
        "assessment-result": (
            AssessmentResultResponse,
            AssessmentResultResponse(data=assessment_result, **response_common),
        ),
        "remediation-result": (
            RemediationResultResponse,
            RemediationResultResponse(data=remediation, **response_common),
        ),
        "retest-result": (
            RetestResultResponse,
            RetestResultResponse(data=retest, **response_common),
        ),
        "agent-state": (
            AgentStateResponse,
            AgentStateResponse(data=state, **response_common),
        ),
        "progress-event": (
            RealtimeEventResponse,
            RealtimeEventResponse(data=event, **response_common),
        ),
        "unified-error": (UnifiedError, unified_error),
        "dify-plan-agent-output": (
            DifyPlanAgentOutput,
            DifyPlanAgentOutput(
                training_goal_id=_id("goal"),
                proposed_plan_id=plan.id,
                title=plan.title,
                summary=plan.summary,
                selection_reason=plan.selection_reason,
                course_ids=plan.course_ids,
                knowledge_citation_ids=plan.knowledge_citation_ids,
                risk_level=RiskLevel.HIGH,
                confidence=0.82,
                human_review_required=True,
                warnings=["Formal publication remains blocked before approval."],
            ),
        ),
    }
    return examples


EXAMPLE_MODELS: dict[str, type[BaseModel]] = {
    name: model_type for name, (model_type, _) in build_examples().items()
}
