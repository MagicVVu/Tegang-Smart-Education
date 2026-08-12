"""Validated deterministic payload examples generated into ``docs/contracts``."""

from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel

from .agent import (
    AgentNextAction,
    AgentProgressPayload,
    AgentState,
    AgentStepStatus,
    ProgressVisibility,
    RealtimeEvent,
)
from .api import (
    AgentStateResponse,
    ApprovalResultResponse,
    AssessmentResultResponse,
    CreateTrainingTaskRequest,
    CreateTrainingTaskResponse,
    DifyPlanAgentOutput,
    ErrorResponse,
    PlanGenerationRequest,
    PlanGenerationResponse,
    RealtimeEventResponse,
    RemediationResultResponse,
    RetestResultResponse,
    SubmitApprovalRequest,
)
from .approval import Approval, ApprovalDecision, ApprovalResult
from .auth import (
    AuthMeResponse,
    AuthPrincipal,
    AuthSessionData,
    AuthSessionResponse,
    DemoProfile,
    DemoProfilesResponse,
    LogoutResponse,
    LogoutResult,
)
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
    EVENT_SCHEMA_VERSION,
    LearningRecordStatus,
    RiskLevel,
    TrainingTaskStatus,
    UserRole,
)
from .errors import ErrorCategory, ErrorCode, UnifiedError
from .events import (
    AgentStepBusinessEventPayload,
    AggregateType,
    ApprovalBusinessEventPayload,
    AssessmentCompletedEventPayload,
    BusinessEventType,
    EventActor,
    EventActorSource,
    EventEnvelope,
    EventProducer,
    HumanTakeoverRequestedEventPayload,
)
from .training import PlanStatus, RuleCheckResult, RuleCheckSummary, TrainingPlan, TrainingTask

ULID_1 = "01ARZ3NDEKTSV4RRFFQ69G5FAV"
ULID_2 = "01ARZ3NDEKTSV4RRFFQ69G5FAW"
ULID_3 = "01ARZ3NDEKTSV4RRFFQ69G5FAX"
ULID_4 = "01ARZ3NDEKTSV4RRFFQ69G5FAY"
ULID_5 = "01ARZ3NDEKTSV4RRFFQ69G5FAZ"
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
    approval_rejected_result = ApprovalResult(
        id=approval.id,
        status=ApprovalStatus.REJECTED,
        task_id=task.id,
        plan_id=plan.id,
        reviewer_id=_id("usr", ULID_2),
        decision=ApprovalDecision.REJECTED,
        decision_comment="The approval was rejected because the impact scope requires revision.",
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
        checkpoint_sequence=6,
        training_goal_id=_id("goal"),
        target_employee_profile_ids=[_id("emp")],
        constraints=["high-risk knowledge requires approval"],
        deadline=task.deadline,
        current_step_id=_id("step"),
        current_plan_id=plan.id,
        current_knowledge_citation_ids=[_id("know")],
        current_assessment_result_id=assessment_result.id,
        current_approval_id=approval.id,
        checkpoint_id=_id("checkpoint"),
        current_stage="approval",
        current_node="approval_wait",
        completed_step_ids=[_id("step", ULID_2)],
        pending_step_ids=[_id("step")],
        waiting_human_action="Review the bound high-risk plan and record an approval decision.",
        retry_count=0,
        next_allowed_actions=[AgentNextAction.REQUEST_APPROVAL, AgentNextAction.CANCEL],
        waiting_for="authorized_reviewer",
        recoverable=True,
        formal_write_occurred=False,
        started_at=NOW,
        checkpointed_at=LATER,
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
        id=_id("event", ULID_5),
        event_type="approval_required",
        occurred_at=LATER,
        run_id=state.id,
        task_id=task.id,
        sequence=7,
        current_stage="approval",
        workflow_status=AgentRunStatus.WAIT_APPROVAL,
        progress_summary="Plan checks passed; waiting for high-risk approval.",
        requires_user_action=True,
        visibility=ProgressVisibility.BUSINESS,
        next_action=AgentNextAction.REQUEST_APPROVAL,
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
    unsupported_version_error = UnifiedError(
        error_id=_id("error", ULID_2),
        code=ErrorCode.UNSUPPORTED_CONTRACT_VERSION,
        message="The requested contract version is not supported.",
        category=ErrorCategory.CONTRACT_VERSION,
        retryable=False,
        user_action="Use one of the supported schema versions and resubmit the request.",
        details={
            "requested_version": "9.0.0",
            "supported_versions": ["2.0.0", "2.1.0", "2.2.0"],
        },
        field_errors=[],
        trace_id=_id("trc"),
        occurred_at=LATER,
    )
    event_actor = EventActor(
        source=EventActorSource.USER,
        actor_id=_id("usr"),
        actor_role=UserRole.TRAINING_ADMIN,
        department_id=_id("dept"),
    )
    approval_event = EventEnvelope(
        event_id=_id("event"),
        event_type=BusinessEventType.APPROVAL_REQUESTED,
        event_version=EVENT_SCHEMA_VERSION,
        occurred_at=LATER,
        producer=EventProducer.APPROVAL,
        aggregate_type=AggregateType.APPROVAL,
        aggregate_id=approval.id,
        sequence=1,
        trace_id=_id("trc"),
        correlation_id=_id("trc"),
        causation_id=_id("req"),
        actor=event_actor,
        payload=ApprovalBusinessEventPayload(
            approval_id=approval.id,
            task_id=task.id,
            plan_id=plan.id,
            status=ApprovalStatus.WAITING,
            summary="A high-risk training plan approval was requested.",
        ),
        metadata={},
        deduplication_key="idem_approval_event_20260804_001",
        request_id=_id("req"),
    )
    assessment_event = EventEnvelope(
        event_id=_id("event", ULID_2),
        event_type=BusinessEventType.ASSESSMENT_COMPLETED,
        event_version=EVENT_SCHEMA_VERSION,
        occurred_at=LATER,
        producer=EventProducer.ASSESSMENT,
        aggregate_type=AggregateType.ASSESSMENT_RESULT,
        aggregate_id=assessment_result.id,
        sequence=1,
        trace_id=_id("trc"),
        correlation_id=_id("trc"),
        causation_id=_id("assessment"),
        actor=EventActor(source=EventActorSource.SYSTEM),
        payload=AssessmentCompletedEventPayload(
            assessment_result_id=assessment_result.id,
            assessment_session_id=assessment_result.assessment_session_id,
            task_id=task.id,
            employee_profile_id=assessment_result.employee_profile_id,
            passed=assessment_result.passed,
            high_risk_passed=assessment_result.high_risk_passed,
        ),
        metadata={},
    )
    agent_step_event = EventEnvelope(
        event_id=_id("event", ULID_3),
        event_type=BusinessEventType.AGENT_STEP_STARTED,
        event_version=EVENT_SCHEMA_VERSION,
        occurred_at=LATER,
        producer=EventProducer.AGENT_ORCHESTRATOR,
        aggregate_type=AggregateType.AGENT_RUN,
        aggregate_id=state.id,
        sequence=7,
        trace_id=_id("trc"),
        correlation_id=_id("trc"),
        causation_id=_id("req"),
        actor=EventActor(source=EventActorSource.AGENT),
        payload=AgentStepBusinessEventPayload(
            run_id=state.id,
            step_id=_id("step"),
            status=AgentStepStatus.RUNNING,
            checkpoint_id=state.checkpoint_id,
            summary="The approval-wait control step started.",
        ),
        metadata={},
    )
    human_takeover_event = EventEnvelope(
        event_id=_id("event", ULID_4),
        event_type=BusinessEventType.HUMAN_TAKEOVER_REQUESTED,
        event_version=EVENT_SCHEMA_VERSION,
        occurred_at=LATER,
        producer=EventProducer.AGENT_ORCHESTRATOR,
        aggregate_type=AggregateType.AGENT_RUN,
        aggregate_id=state.id,
        sequence=8,
        trace_id=_id("trc"),
        correlation_id=_id("trc"),
        causation_id=agent_step_event.event_id,
        actor=EventActor(source=EventActorSource.SYSTEM),
        payload=HumanTakeoverRequestedEventPayload(
            run_id=state.id,
            task_id=task.id,
            checkpoint_id=state.checkpoint_id,
            reason="The controlled retry boundary was reached and an authorized reviewer is required.",
            requested_role=UserRole.REVIEWER,
        ),
        metadata={},
    )

    principal = AuthPrincipal(
        user_id=_id("usr"),
        session_id=_id("sid"),
        display_name="模拟培训管理员 A-001",
        roles=[UserRole.TRAINING_ADMIN],
        primary_role=UserRole.TRAINING_ADMIN,
        department_ids=[_id("dept")],
        employee_profile_id=_id("emp"),
        permission_scopes=["training.department.manage"],
        authorized_data_scopes=[f"department:{_id('dept')}"],
        capabilities=["training.department.manage"],
        request_id=_id("req"),
        trace_id=_id("trc"),
    )

    response_common = {
        "request_id": _id("req"),
        "trace_id": _id("trc"),
        "occurred_at": LATER,
        "meta": {"warnings": []},
    }
    error_response_common = {
        "request_id": _id("req"),
        "trace_id": _id("trc"),
        "occurred_at": LATER,
    }
    previous_compatible_task = task.model_copy(update={"schema_version": "2.0.0"})
    examples: dict[str, tuple[type[BaseModel], BaseModel]] = {
        "auth-login-response": (
            AuthSessionResponse,
            AuthSessionResponse(
                data=AuthSessionData(
                    access_token="example.jwt.access.token.not-a-real-credential",
                    expires_at=LATER,
                    principal=principal,
                ),
                **response_common,
            ),
        ),
        "auth-me-response": (
            AuthMeResponse,
            AuthMeResponse(data=principal, **response_common),
        ),
        "auth-demo-profiles-response": (
            DemoProfilesResponse,
            DemoProfilesResponse(
                data=[
                    DemoProfile(
                        account="A-001",
                        user_id=principal.user_id,
                        display_name=principal.display_name,
                        primary_role=principal.primary_role,
                        department_ids=principal.department_ids,
                    )
                ],
                **response_common,
            ),
        ),
        "auth-logout-response": (
            LogoutResponse,
            LogoutResponse(
                data=LogoutResult(revoked_at=LATER),
                **response_common,
            ),
        ),
        "create-training-task-request": (
            CreateTrainingTaskRequest,
            CreateTrainingTaskRequest(
                request_id=_id("req"),
                trace_id=_id("trc"),
                idempotency_key="idem_training_create_20260804_001",
                actor_id=_id("usr"),
                actor_role=UserRole.TRAINING_ADMIN,
                department_id=_id("dept"),
                requested_at=NOW,
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
                actor_role=UserRole.TRAINING_ADMIN,
                department_id=_id("dept"),
                requested_at=NOW,
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
                trace_id=_id("trc"),
                idempotency_key="idem_approval_submit_20260804_001",
                actor_id=_id("usr"),
                actor_role=UserRole.TRAINING_ADMIN,
                department_id=_id("dept"),
                requested_at=NOW,
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
        "approval-rejected-result": (
            ApprovalResultResponse,
            ApprovalResultResponse(data=approval_rejected_result, **response_common),
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
        "agent-step-event": (EventEnvelope, agent_step_event),
        "approval-requested-event": (EventEnvelope, approval_event),
        "assessment-completed-event": (EventEnvelope, assessment_event),
        "human-takeover-event": (EventEnvelope, human_takeover_event),
        "unified-error": (UnifiedError, unified_error),
        "error-response": (
            ErrorResponse,
            ErrorResponse(error=unified_error, **error_response_common),
        ),
        "unsupported-contract-version-error": (
            ErrorResponse,
            ErrorResponse(error=unsupported_version_error, **error_response_common),
        ),
        "previous-compatible-training-task-response": (
            CreateTrainingTaskResponse,
            CreateTrainingTaskResponse(
                schema_version="2.0.0",
                data=previous_compatible_task,
                **response_common,
            ),
        ),
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
