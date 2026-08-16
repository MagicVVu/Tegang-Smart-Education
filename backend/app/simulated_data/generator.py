"""Deterministically generate the approved small, standard, and stress datasets."""

from __future__ import annotations

import json
import shutil
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from backend.app.schemas.agent import (
    AgentCapability,
    AgentDecisionSource,
    AgentDecisionSummary,
    AgentEventType,
    AgentNextAction,
    AgentProgressPayload,
    AgentRun,
    AgentState,
    AgentStepStatus,
    AgentStepSummary,
    ProgressVisibility,
    RealtimeEvent,
)
from backend.app.schemas.approval import Approval, ApprovalDecision
from backend.app.schemas.assessment import (
    AssessmentNextAction,
    AssessmentQuestion,
    AssessmentQuestionType,
    AssessmentResult,
    AssessmentSession,
    AssessmentSessionStatus,
    KnowledgePointPerformance,
    RemediationIntervention,
    RemediationStatus,
    Retest,
    RetestStatus,
)
from backend.app.schemas.common import (
    AGENT_STATE_VERSION,
    CONTRACT_SCHEMA_VERSION,
    EVENT_SCHEMA_VERSION,
    AgentRunStatus,
    ApprovalStatus,
    EntityStatus,
    LearningRecordStatus,
    RiskLevel,
    TrainingTaskStatus,
    UserRole,
)
from backend.app.schemas.experience import (
    CoursePlanItem,
    PrototypeUserProfile,
    ReportStatus,
    ReportSummary,
    TrainingPlanDetail,
    TrainingTaskView,
)
from backend.app.schemas.identity import Department, EmployeeProfile, Organization, Position, Role, User
from backend.app.schemas.knowledge import KnowledgeCitation, KnowledgeValidity
from backend.app.schemas.training import (
    Course,
    CourseStatus,
    GoalStatus,
    PlanStatus,
    RuleCheckResult,
    RuleCheckSummary,
    TrainingGoal,
    TrainingPlan,
    TrainingTask,
)
from backend.scripts.bootstrap_identity import DEPARTMENTS, ORG_ID, POSITIONS, ROLES, ULIDS, USERS

from .config import C07_BASE_SHA, DatasetProfile, GenerationSettings
from .ids import DeterministicIdFactory
from .io import canonical_json_bytes, jsonl_bytes, pretty_json_bytes, sha256_bytes
from .models import (
    DatasetManifest,
    DocumentMetadata,
    KnowledgePointDatasetRecord,
    LearningRecordDatasetRecord,
    ManifestFile,
    QuestionDatasetRecord,
)

DATASET_FILES: tuple[tuple[str, str], ...] = (
    ("organizations", "organizations.jsonl"),
    ("departments", "departments.jsonl"),
    ("roles", "roles.jsonl"),
    ("positions", "positions.jsonl"),
    ("users", "users.jsonl"),
    ("employee_profiles", "employee_profiles.jsonl"),
    ("knowledge_citations", "knowledge_citations.jsonl"),
    ("knowledge_points", "knowledge_points.jsonl"),
    ("questions", "questions.jsonl"),
    ("courses", "courses.jsonl"),
    ("training_goals", "training_goals.jsonl"),
    ("training_tasks", "training_tasks.jsonl"),
    ("training_plans", "training_plans.jsonl"),
    ("approvals", "approvals.jsonl"),
    ("learning_records", "learning_records.jsonl"),
    ("assessment_sessions", "assessment_sessions.jsonl"),
    ("assessment_results", "assessment_results.jsonl"),
    ("remediations", "remediations.jsonl"),
    ("retests", "retests.jsonl"),
    ("agent_runs", "agent_runs.jsonl"),
    ("agent_steps", "agent_steps.jsonl"),
    ("events", "events.jsonl"),
)


@dataclass(slots=True)
class GeneratedDataset:
    profile: DatasetProfile
    settings: GenerationSettings
    records: dict[str, list[dict[str, Any]]]
    documents: dict[str, bytes]
    client_adapter: bytes | None
    manifest: dict[str, Any] | None = None


def _model_json(model: Any) -> dict[str, Any]:
    return model.model_dump(mode="json")


class DatasetBuilder:
    def __init__(
        self,
        repo_root: Path,
        profile: DatasetProfile,
        settings: GenerationSettings,
    ) -> None:
        self.repo_root = repo_root
        self.profile = profile
        self.settings = settings
        self.ids = DeterministicIdFactory(
            dataset_version=settings.dataset_version,
            profile=profile.name,
            random_seed=settings.random_seed,
            fixed_epoch=settings.epoch,
        )
        self.personnel = json.loads(
            (repo_root / "data" / "dictionary" / "personnel.json").read_text(encoding="utf-8")
        )
        self.content = json.loads(
            (repo_root / "data" / "dictionary" / "content.json").read_text(encoding="utf-8")
        )
        self.document_template = (
            repo_root / "data" / "templates" / "knowledge-document.md.tmpl"
        ).read_text(encoding="utf-8")
        self.records: dict[str, list[dict[str, Any]]] = {
            name: [] for name, _ in DATASET_FILES
        }
        self.documents: dict[str, bytes] = {}

    def stamp(self, kind: str, index: int, *, minutes: int = 0) -> datetime:
        kind_offset = {
            "identity": 0,
            "knowledge": 1,
            "training": 2,
            "assessment": 3,
            "agent": 4,
            "event": 5,
        }[kind]
        return self.settings.epoch + timedelta(days=kind_offset, minutes=index + minutes)

    def audit(self, kind: str, index: int, *, risk: RiskLevel = RiskLevel.LOW) -> dict[str, Any]:
        created = self.stamp(kind, index)
        kind_index = {
            "identity": 0,
            "knowledge": 1,
            "training": 2,
            "assessment": 3,
            "agent": 4,
            "event": 5,
        }[kind]
        correlation_index = kind_index * 100_000 + index
        return {
            "created_at": created,
            "updated_at": created + timedelta(minutes=5),
            "created_by": USERS[1][1],
            "updated_by": USERS[1][1],
            "risk_level": risk,
            "trace_id": self.ids.make("trc", "trace", correlation_index),
            "request_id": self.ids.make("req", "request", correlation_index),
            "metadata": {
                "simulated": True,
                "dataset_version": self.settings.dataset_version,
                "profile": self.profile.name,
            },
        }

    def build(self) -> GeneratedDataset:
        self.build_identity()
        self.build_knowledge()
        self.build_training()
        self.build_learning_and_assessment()
        self.build_agent_and_events()
        adapter = self.build_client_adapter() if self.profile.name == "small" else None
        return GeneratedDataset(
            profile=self.profile,
            settings=self.settings,
            records=self.records,
            documents=self.documents,
            client_adapter=adapter,
        )

    def build_identity(self) -> None:
        organization = Organization(
            id=ORG_ID,
            status=EntityStatus.ACTIVE,
            name="特钢智教模拟组织（非真实企业）",
            simulated=True,
            **self.audit("identity", 0),
        )
        self.records["organizations"].append(_model_json(organization))

        department_records: dict[str, Department] = {}
        for index, (external_id, name) in enumerate(DEPARTMENTS):
            record = Department(
                id=external_id,
                status=EntityStatus.ACTIVE,
                name=name,
                organization_id=ORG_ID,
                **self.audit("identity", index + 1),
            )
            department_records[external_id] = record
            self.records["departments"].append(_model_json(record))

        role_records: dict[str, Role] = {}
        for index, (external_id, role_code, name, scopes) in enumerate(ROLES):
            record = Role(
                id=external_id,
                status=EntityStatus.ACTIVE,
                role_code=UserRole(role_code),
                name=name,
                permission_scopes=scopes,
                **self.audit("identity", index + 10),
            )
            role_records[role_code] = record
            self.records["roles"].append(_model_json(record))

        positions_by_department: dict[str, list[Position]] = defaultdict(list)
        for index, (external_id, code, name, department_id) in enumerate(POSITIONS):
            record = Position(
                id=external_id,
                status=EntityStatus.ACTIVE,
                organization_id=ORG_ID,
                department_id=department_id,
                code=code,
                name=name,
                **self.audit("identity", index + 20),
            )
            positions_by_department[department_id].append(record)
            self.records["positions"].append(_model_json(record))

        extra_position_count = self.profile.counts["positions"] - len(POSITIONS)
        department_ids = [item[0] for item in DEPARTMENTS]
        for index in range(extra_position_count):
            department_index = index % len(department_ids)
            department_id = department_ids[department_index]
            department_name = DEPARTMENTS[department_index][1]
            names = self.personnel["department_positions"][department_name]
            name = names[(index // len(department_ids)) % len(names)]
            record = Position(
                id=self.ids.make("pos", "position", index),
                status=EntityStatus.ACTIVE,
                organization_id=ORG_ID,
                department_id=department_id,
                code=f"C07-{department_index + 1}-{index + 1:02d}",
                name=f"{name}（模拟）",
                **self.audit("identity", index + 30),
            )
            positions_by_department[department_id].append(record)
            self.records["positions"].append(_model_json(record))

        role_id_by_code = {code: external_id for external_id, code, _, _ in ROLES}
        position_by_id = {
            item["id"]: item for item in self.records["positions"]
        }
        flagship_by_user_id = {item[1]: item for item in USERS}
        for index in range(self.profile.counts["users"]):
            if index < len(USERS):
                account, user_id, display_name, role_code, department_id, position_id, profile_id = USERS[index]
                del account
            else:
                department_index = index % len(department_ids)
                department_id = department_ids[department_index]
                available_positions = positions_by_department[department_id]
                position = available_positions[index % len(available_positions)]
                position_id = position.id
                user_id = self.ids.make("usr", "user", index)
                profile_id = self.ids.make("emp", "employee_profile", index)
                surnames = self.personnel["surnames"]
                given_names = self.personnel["given_names"]
                display_name = f"模拟员工 {surnames[index % len(surnames)]}{given_names[(index * 7) % len(given_names)]}-{index + 1:04d}"
                role_code = "employee"

            user = User(
                id=user_id,
                status=EntityStatus.ACTIVE,
                display_name=display_name,
                role_ids=[role_id_by_code[role_code]],
                department_ids=[department_id],
                **self.audit("identity", index + 100),
            )
            scopes = ["employee:self"] if role_code == "employee" else []
            if role_code in {"training_admin", "reviewer"}:
                scopes.append(f"department:{DEPARTMENTS[0][0]}")
            if role_code == "reviewer":
                scopes.append("approval:assigned")
            if role_code == "system_admin":
                scopes.extend(["system:configuration", "trace:developer"])
            tags = ["simulated_identity"]
            if user_id not in flagship_by_user_id:
                tags.extend(
                    [
                        f"simulated:c07:{self.settings.dataset_version}:{self.profile.name}",
                        self.personnel["training_tags"][index % len(self.personnel["training_tags"])],
                    ]
                )
            profile = EmployeeProfile(
                id=profile_id,
                status=EntityStatus.ACTIVE,
                user_id=user_id,
                department_id=department_id,
                position_id=position_id,
                job_title=position_by_id[position_id]["name"],
                training_tags=tags,
                authorized_data_scopes=scopes,
                **self.audit("identity", index + 200),
            )
            self.records["users"].append(_model_json(user))
            self.records["employee_profiles"].append(_model_json(profile))

    def build_knowledge(self) -> None:
        document_count = self.profile.counts["documents"]
        citation_count = self.profile.counts["knowledge_citations"]
        if citation_count != document_count:
            raise ValueError("approved profiles require one citation per simulated document")
        topics = self.content["topics"]
        department_ids = [item[0] for item in DEPARTMENTS]
        for index in range(document_count):
            topic = topics[index % len(topics)]
            department_index = index % len(DEPARTMENTS)
            department_id, department_name = DEPARTMENTS[department_index]
            title = f"《{topic['title']}模拟培训说明 {index + 1:02d}》"
            slug = f"simulated-knowledge-{index + 1:03d}"
            document_version = f"SIM-{self.settings.dataset_version}-{index // len(topics) + 1}"
            body_probe = (
                f"{title}|{department_name}|{topic['risk_level']}|{self.settings.dataset_version}"
            ).encode("utf-8")
            content_hash = f"sha256:{sha256_bytes(body_probe)}"
            metadata = DocumentMetadata(
                slug=slug,
                title=title,
                document_version=document_version,
                source_department_id=department_id,
                risk_level=RiskLevel(topic["risk_level"]),
                content_sha256=content_hash,
                disclaimer=self.content["disclaimer"],
            )
            markdown = self.document_template.format(
                metadata_json=json.dumps(
                    metadata.model_dump(mode="json"),
                    ensure_ascii=False,
                    sort_keys=True,
                    separators=(",", ":"),
                ),
                title=title,
                department_name=department_name,
                risk_level=topic["risk_level"],
            ).replace("\r\n", "\n")
            if not markdown.endswith("\n"):
                markdown += "\n"
            self.documents[f"documents/{slug}.md"] = markdown.encode("utf-8")
            citation = KnowledgeCitation(
                id=self.ids.make("know", "knowledge_citation", index),
                status=KnowledgeValidity.EFFECTIVE,
                document_name=title,
                document_version=document_version,
                source_department_id=department_ids[department_index],
                section="模拟要求",
                excerpt=f"{topic['title']}相关内容仅用于验证授权检索、引用和风险提示。",
                relation="支撑模拟培训方案、题目和测评关系校验。",
                retrieved_at=self.stamp("knowledge", index),
                content_hash=content_hash,
                authorized_scopes=["training:read", f"department:{department_id}"],
                **self.audit("knowledge", index, risk=RiskLevel(topic["risk_level"])),
            )
            self.records["knowledge_citations"].append(_model_json(citation))

        knowledge_point_count = self.profile.counts["knowledge_points"]
        for index in range(knowledge_point_count):
            document_index = index % document_count
            citation = self.records["knowledge_citations"][document_index]
            risk = RiskLevel.HIGH if index % 5 == 1 else RiskLevel(citation["risk_level"])
            point = KnowledgePointDatasetRecord(
                id=self.ids.make("kp", "knowledge_point", index),
                name=f"模拟知识点 {index + 1:03d}：{topics[document_index % len(topics)]['title']}",
                knowledge_citation_id=citation["id"],
                document_slug=f"simulated-knowledge-{document_index + 1:03d}",
                risk_level=risk,
                pass_threshold_percent=100 if risk == RiskLevel.HIGH else 80,
                high_risk_independent_pass_required=risk == RiskLevel.HIGH,
            )
            self.records["knowledge_points"].append(_model_json(point))

        for index in range(self.profile.counts["questions"]):
            # Keep the first three canonical questions compatible with the
            # existing mobile prototype's 20/40/40 scoring fixture. Remaining
            # questions continue to cover knowledge points deterministically.
            point_index = (1, 0, 2)[index] if index < 3 else index % knowledge_point_count
            point = self.records["knowledge_points"][point_index]
            question_type = (
                AssessmentQuestionType.SINGLE,
                AssessmentQuestionType.MULTIPLE,
                AssessmentQuestionType.BOOLEAN,
            )[index % 3]
            if question_type == AssessmentQuestionType.BOOLEAN:
                options = ["正确", "错误"]
                correct = [1]
            elif question_type == AssessmentQuestionType.MULTIPLE:
                options = ["核对授权范围", "确认资料版本", "保留可追溯摘要", "绕过审批直接写入"]
                correct = [0, 1, 2]
            else:
                options = ["跳过风险检查", "确认授权、版本和必要输入", "使用真实员工资料", "直接形成绩效结论"]
                correct = [1]
            knowledge_point_name = (
                "高温作业与设备联锁",
                "培训过程留痕",
                "能力判断边界",
            )[index] if index < 3 else point["name"]
            question = AssessmentQuestion(
                id=self.ids.make("question", "question", index),
                question_type=question_type,
                prompt=f"关于“{point['name']}”，下列处理方式哪项符合模拟培训边界？",
                options=options,
                correct_option_indexes=correct,
                knowledge_point_id=point["id"],
                knowledge_point_name=knowledge_point_name,
                risk_level=RiskLevel(point["risk_level"]),
                **{
                    key: value
                    for key, value in self.audit(
                        "knowledge", index + 1000, risk=RiskLevel(point["risk_level"])
                    ).items()
                    if key != "risk_level"
                },
            )
            wrapper = QuestionDatasetRecord(
                question=question,
                explanation="正确答案体现授权、版本、风险规则和模拟数据使用边界；其他选项违反既有约束。",
                knowledge_citation_id=point["knowledge_citation_id"],
            )
            self.records["questions"].append(_model_json(wrapper))

    def build_training(self) -> None:
        department_ids = [item[0] for item in DEPARTMENTS]
        course_count = self.profile.counts["courses"]
        point_count = len(self.records["knowledge_points"])
        for index in range(course_count):
            risk = RiskLevel.HIGH if index % 5 == 1 else RiskLevel.MEDIUM
            point_ids = [
                self.records["knowledge_points"][(index * 5 + offset) % point_count]["id"]
                for offset in range(min(5, point_count))
            ]
            course = Course(
                id=self.ids.make("course", "course", index),
                status=CourseStatus.ACTIVE,
                title=f"模拟课程 {index + 1:03d}：受控培训与风险边界",
                department_ids=[department_ids[index % len(department_ids)]],
                knowledge_point_ids=point_ids,
                duration_minutes=20 + (index % 5) * 10,
                required=index % 4 != 3,
                **self.audit("training", index, risk=risk),
            )
            self.records["courses"].append(_model_json(course))

        profile_ids = [record["id"] for record in self.records["employee_profiles"]]
        goal_count = self.profile.counts["training_goals"]
        for index in range(goal_count):
            department_id = department_ids[index % len(department_ids)]
            goal = TrainingGoal(
                id=self.ids.make("goal", "training_goal", index),
                status=GoalStatus.ACTIVE,
                title=f"模拟培训目标 {index + 1:03d}",
                objective="完成部门岗位基础、风险前置学习、测评、补训和复测闭环验证。",
                target_department_ids=[department_id],
                target_employee_profile_ids=[profile_ids[index % len(profile_ids)]],
                mandatory_requirements=["基础制度", "部门知识", "测评留痕"],
                high_risk_requirements=["高风险知识点独立达标"],
                deadline=(self.settings.epoch + timedelta(days=30 + index)).date(),
                **self.audit("training", index + 100),
            )
            self.records["training_goals"].append(_model_json(goal))

        task_statuses = (
            TrainingTaskStatus.WAIT_CONFIRM,
            TrainingTaskStatus.WAIT_APPROVAL,
            TrainingTaskStatus.IN_PROGRESS,
            TrainingTaskStatus.COMPLETED,
            TrainingTaskStatus.NEED_INPUT,
            TrainingTaskStatus.MANUAL,
        )
        task_count = self.profile.counts["training_tasks"]
        for index in range(task_count):
            goal = self.records["training_goals"][index % goal_count]
            task = TrainingTask(
                id=self.ids.make("task", "training_task", index),
                status=task_statuses[index % len(task_statuses)],
                training_goal_id=goal["id"],
                name=f"模拟培训任务 {index + 1:04d}",
                objective="验证任务创建、方案、审批、学习、测评、补训、复测与报告链路。",
                target_department_ids=goal["target_department_ids"],
                target_employee_profile_ids=[profile_ids[index % len(profile_ids)]],
                deadline=(self.settings.epoch + timedelta(days=45 + index % 30)).date(),
                progress_percent=(index * 17) % 101,
                **self.audit("training", index + 200, risk=RiskLevel.HIGH if index % 4 == 0 else RiskLevel.MEDIUM),
            )
            self.records["training_tasks"].append(_model_json(task))

        plan_count = self.profile.counts["training_plans"]
        for index in range(plan_count):
            task = self.records["training_tasks"][(index // 2) % task_count]
            course = self.records["courses"][index % course_count]
            citation = self.records["knowledge_citations"][index % len(self.records["knowledge_citations"])]
            risk = RiskLevel.HIGH if index % 4 == 1 else RiskLevel.MEDIUM
            rule = RuleCheckSummary(
                id=self.ids.make("rule", "rule", index),
                status=RuleCheckResult.WARNING if risk == RiskLevel.HIGH else RuleCheckResult.PASSED,
                rule_code="HIGH_RISK_APPROVAL_REQUIRED" if risk == RiskLevel.HIGH else "MANDATORY_CONTENT_COMPLETE",
                label="高风险动作审批" if risk == RiskLevel.HIGH else "必修内容完整",
                detail="高风险正式下发等待人工审批。" if risk == RiskLevel.HIGH else "必修课程和部门路径完整。",
                deterministic=True,
                **self.audit("training", index + 500, risk=risk),
            )
            plan = TrainingPlan(
                id=self.ids.make("plan", "training_plan", index),
                status=PlanStatus.CANDIDATE if index % 2 else PlanStatus.CONFIRMED,
                training_goal_id=task["training_goal_id"],
                title=f"模拟候选方案 {index + 1:04d}",
                candidate_label="候选 B · Agent 建议" if index % 2 else "候选 A",
                summary="在统一基础内容后进入部门差异化路径，并前置高风险知识。",
                selection_reason="依据模拟岗位、授权范围、知识风险和确定性规则生成。",
                course_ids=[course["id"]],
                knowledge_citation_ids=[citation["id"]],
                rule_checks=[rule],
                **self.audit("training", index + 600, risk=risk),
            )
            self.records["training_plans"].append(_model_json(plan))

        approval_statuses = (
            ApprovalStatus.WAITING,
            ApprovalStatus.EDITING,
            ApprovalStatus.APPROVED,
            ApprovalStatus.REJECTED,
        )
        for index in range(self.profile.counts["approvals"]):
            task = self.records["training_tasks"][index % task_count]
            plan = self.records["training_plans"][(index * 2 + 1) % plan_count]
            status = approval_statuses[index % len(approval_statuses)]
            fields: dict[str, Any] = {}
            if status in {ApprovalStatus.APPROVED, ApprovalStatus.REJECTED}:
                fields = {
                    "reviewer_id": USERS[2][1],
                    "decided_at": self.stamp("training", index + 900),
                    "decision": ApprovalDecision.APPROVED if status == ApprovalStatus.APPROVED else ApprovalDecision.REJECTED,
                    "decision_comment": "模拟审批决定，仅用于流程验证。",
                }
            approval = Approval(
                id=self.ids.make("approval", "approval", index),
                status=status,
                task_id=task["id"],
                plan_id=plan["id"],
                requested_by=USERS[1][1],
                reviewer_role_id=ROLES[2][0],
                risk_summary="包含模拟高风险知识，正式下发前必须由授权审核员决定。",
                impact_scope=[f"department:{task['target_department_ids'][0]}", "action:publish_training"],
                knowledge_citation_ids=plan["knowledge_citation_ids"],
                submitted_at=self.stamp("training", index + 800),
                **fields,
                **self.audit("training", index + 800, risk=RiskLevel.HIGH),
            )
            self.records["approvals"].append(_model_json(approval))

        for index, task in enumerate(self.records["training_tasks"]):
            current_plan = self.records["training_plans"][(index * 2) % plan_count]
            task["current_plan_id"] = current_plan["id"]
            if index < len(self.records["approvals"]):
                task["approval_id"] = self.records["approvals"][index]["id"]

    def build_learning_and_assessment(self) -> None:
        tasks = self.records["training_tasks"]
        profiles = self.records["employee_profiles"]
        learning_statuses = (
            LearningRecordStatus.PENDING,
            LearningRecordStatus.LEARNING,
            LearningRecordStatus.WAIT_ASSESSMENT,
            LearningRecordStatus.NOT_MET,
            LearningRecordStatus.REMEDIAL,
            LearningRecordStatus.WAIT_RETEST,
            LearningRecordStatus.COMPLETED,
            LearningRecordStatus.PAUSED,
        )
        for index in range(self.profile.counts["learning_records"]):
            status = learning_statuses[index % len(learning_statuses)]
            started_at = self.stamp("assessment", index)
            record = LearningRecordDatasetRecord(
                task_id=tasks[index % len(tasks)]["id"],
                employee_profile_id=profiles[(index * 7) % len(profiles)]["id"],
                status=status,
                progress_percent=100 if status == LearningRecordStatus.COMPLETED else (index * 13) % 100,
                attempt=index // max(len(tasks) * len(profiles), 1) + 1,
                started_at=started_at,
                completed_at=started_at + timedelta(minutes=45) if status == LearningRecordStatus.COMPLETED else None,
                simulated_dataset_tag=f"c07:{self.settings.dataset_version}:{self.profile.name}",
            )
            self.records["learning_records"].append(_model_json(record))

        session_count = self.profile.counts["assessment_sessions"]
        result_count = self.profile.counts["assessment_results"]
        if session_count != result_count:
            raise ValueError("approved profiles require one result per assessment session")
        remediation_count = self.profile.counts["remediations"]
        point_records = self.records["knowledge_points"]
        for index in range(session_count):
            retest_pass = index >= session_count - remediation_count
            source_index = index - (session_count - remediation_count) if retest_pass else index
            task = tasks[source_index % len(tasks)]
            employee = profiles[(source_index * 11) % len(profiles)]
            started_at = self.stamp("assessment", index + 1000)
            session = AssessmentSession(
                id=self.ids.make("assessment", "assessment_session", index),
                status=AssessmentSessionStatus.SCORED,
                task_id=task["id"],
                employee_profile_id=employee["id"],
                attempt=2 if index >= session_count - remediation_count else 1,
                started_at=started_at,
                submitted_at=started_at + timedelta(minutes=20),
                **self.audit("assessment", index + 1000, risk=RiskLevel.HIGH if index < remediation_count else RiskLevel.MEDIUM),
            )
            self.records["assessment_sessions"].append(_model_json(session))

            point = point_records[source_index % len(point_records)]
            failed = index < remediation_count
            passed = retest_pass or (not failed and index % 5 != 0)
            high_risk = point["risk_level"] == RiskLevel.HIGH.value
            high_risk_passed = passed or not high_risk
            score = 100 if retest_pass else (62 if failed else 82 + index % 18)
            performance = KnowledgePointPerformance(
                id=self.ids.make("kperf", "performance", index),
                status=LearningRecordStatus.COMPLETED if passed else LearningRecordStatus.NOT_MET,
                assessment_session_id=session.id,
                knowledge_point_id=point["id"],
                knowledge_point_name=point["name"],
                score_percent=score,
                passed=passed,
                reason="模拟复测已达到要求。" if retest_pass else ("模拟高风险知识点未独立达标。" if failed else "模拟测评达到当前训练要求。"),
                risk_level=RiskLevel(point["risk_level"]),
                **{key: value for key, value in self.audit("assessment", index + 1200, risk=RiskLevel(point["risk_level"])).items() if key != "risk_level"},
            )
            result = AssessmentResult(
                id=self.ids.make("assessment_result", "assessment_result", index),
                status=AssessmentSessionStatus.SCORED,
                assessment_session_id=session.id,
                task_id=task["id"],
                employee_profile_id=employee["id"],
                score_percent=score,
                passed=passed,
                high_risk_passed=high_risk_passed,
                knowledge_point_performances=[performance],
                next_action=AssessmentNextAction.COMPLETE if passed else AssessmentNextAction.REMEDIATION,
                scored_at=started_at + timedelta(minutes=21),
                risk_level=RiskLevel(point["risk_level"]),
                **{key: value for key, value in self.audit("assessment", index + 1200, risk=RiskLevel(point["risk_level"])).items() if key != "risk_level"},
            )
            self.records["assessment_results"].append(_model_json(result))

        courses = self.records["courses"]
        for index in range(remediation_count):
            failed_result = self.records["assessment_results"][index]
            performance = failed_result["knowledge_point_performances"][0]
            remediation = RemediationIntervention(
                id=self.ids.make("intervention", "remediation", index),
                status=(RemediationStatus.PLANNED, RemediationStatus.IN_PROGRESS, RemediationStatus.COMPLETED, RemediationStatus.MANUAL)[index % 4],
                task_id=failed_result["task_id"],
                assessment_result_id=failed_result["id"],
                employee_profile_id=failed_result["employee_profile_id"],
                weak_knowledge_point_ids=[performance["knowledge_point_id"]],
                required_course_ids=[courses[index % len(courses)]["id"]],
                reason="模拟测评未达标，按薄弱知识点生成定向补训。",
                attempt=1,
                completed_at=self.stamp("assessment", index + 3000) if index % 4 == 2 else None,
                **self.audit("assessment", index + 3000, risk=RiskLevel.HIGH),
            )
            self.records["remediations"].append(_model_json(remediation))

            retest_index = session_count - remediation_count + index
            retest_result = self.records["assessment_results"][retest_index]
            retest = Retest(
                id=self.ids.make("retest", "retest", index),
                status=RetestStatus.COMPLETED,
                remediation_id=remediation.id,
                task_id=remediation.task_id,
                employee_profile_id=remediation.employee_profile_id,
                assessment_session_id=retest_result["assessment_session_id"],
                result_id=retest_result["id"],
                scheduled_at=self.stamp("assessment", index + 3500),
                completed_at=self.stamp("assessment", index + 3500, minutes=25),
                **self.audit("assessment", index + 3500, risk=RiskLevel.HIGH),
            )
            self.records["retests"].append(_model_json(retest))

    def build_agent_and_events(self) -> None:
        run_count = self.profile.counts["agent_runs"]
        step_count = self.profile.counts["agent_steps"]
        tasks = self.records["training_tasks"]
        plans = self.records["training_plans"]
        citations = self.records["knowledge_citations"]
        results = self.records["assessment_results"]
        approvals = self.records["approvals"]
        run_ids = [self.ids.make("run", "agent_run", index) for index in range(run_count)]
        steps_by_run: dict[str, list[str]] = defaultdict(list)
        capabilities = tuple(AgentCapability)
        step_statuses = (
            AgentStepStatus.SUCCEEDED,
            AgentStepStatus.RUNNING,
            AgentStepStatus.WAITING,
            AgentStepStatus.FAILED,
        )
        for index in range(step_count):
            run_id = run_ids[index % run_count]
            status = step_statuses[index % len(step_statuses)]
            step = AgentStepSummary(
                id=self.ids.make("step", "agent_step", index),
                status=status,
                run_id=run_id,
                capability=capabilities[index % len(capabilities)],
                label=f"模拟 Agent 步骤 {index + 1:05d}",
                input_summary="授权范围内的模拟目标、知识引用和业务状态。",
                output_summary="形成不包含隐藏推理的模拟执行摘要。",
                decision_reason="依据确定性规则选择继续、暂停、重试、回退或人工接管。",
                checkpoint_id=self.ids.make("checkpoint", "checkpoint", index),
                retry_count=1 if status == AgentStepStatus.FAILED else 0,
                writes_committed=False,
                model_name=None,
                prompt_version="simulated-c07-v1",
                token_count=0,
                latency_ms=20 + index % 100,
                skill_name="simulated_deterministic_step",
                error_code="SKILL_FAILED" if status == AgentStepStatus.FAILED else None,
                started_at=self.stamp("agent", index),
                finished_at=self.stamp("agent", index, minutes=1),
                **self.audit("agent", index, risk=RiskLevel.HIGH if status == AgentStepStatus.FAILED else RiskLevel.MEDIUM),
            )
            steps_by_run[run_id].append(step.id)
            self.records["agent_steps"].append(_model_json(step))

        run_statuses = (
            AgentRunStatus.WAIT_INPUT,
            AgentRunStatus.WAIT_APPROVAL,
            AgentRunStatus.RETRYING,
            AgentRunStatus.ROLLING_BACK,
            AgentRunStatus.MANUAL,
            AgentRunStatus.SUCCEEDED,
            AgentRunStatus.FAILED,
        )
        for index, run_id in enumerate(run_ids):
            task = tasks[index % len(tasks)]
            plan = plans[(index * 2 + 1) % len(plans)]
            status = run_statuses[index % len(run_statuses)]
            run_steps = steps_by_run[run_id]
            checkpoint_id = self.ids.make("checkpoint", "checkpoint", step_count + index)
            waiting_action = None
            if status == AgentRunStatus.WAIT_INPUT:
                waiting_action = "补充模拟培训范围和截止日期。"
            elif status == AgentRunStatus.WAIT_APPROVAL:
                waiting_action = "由授权审核员处理模拟高风险审批。"
            elif status == AgentRunStatus.MANUAL:
                waiting_action = "由授权人员接管模拟流程。"
            state = AgentState(
                id=run_id,
                state_version=AGENT_STATE_VERSION,
                status=status,
                task_id=task["id"],
                checkpoint_sequence=len(run_steps),
                training_goal_id=task["training_goal_id"],
                target_employee_profile_ids=task["target_employee_profile_ids"],
                constraints=["高风险动作必须审批", "信息不足时暂停"],
                deadline=task["deadline"],
                current_step_id=run_steps[-1] if run_steps else None,
                current_plan_id=plan["id"],
                current_knowledge_citation_ids=plan["knowledge_citation_ids"],
                current_assessment_result_id=results[index % len(results)]["id"],
                current_approval_id=approvals[index % len(approvals)]["id"] if approvals else None,
                checkpoint_id=checkpoint_id,
                current_stage="模拟 Agent 流程",
                current_node=status.value.lower(),
                completed_step_ids=run_steps[:-1],
                pending_step_ids=run_steps[-1:] if status not in {AgentRunStatus.SUCCEEDED, AgentRunStatus.FAILED} else [],
                waiting_human_action=waiting_action,
                retry_count=1 if status in {AgentRunStatus.RETRYING, AgentRunStatus.ROLLING_BACK} else 0,
                last_error_code="SKILL_FAILED" if status in {AgentRunStatus.RETRYING, AgentRunStatus.FAILED} else None,
                next_allowed_actions=[AgentNextAction.REQUEST_HUMAN_TAKEOVER] if status == AgentRunStatus.MANUAL else [AgentNextAction.CONTINUE],
                waiting_for="authorized_user" if waiting_action else None,
                recoverable=status != AgentRunStatus.FAILED,
                formal_write_occurred=False,
                started_at=self.stamp("agent", index + 5000),
                checkpointed_at=self.stamp("agent", index + 5000, minutes=5),
                **self.audit("agent", index + 5000, risk=RiskLevel.HIGH if status in {AgentRunStatus.WAIT_APPROVAL, AgentRunStatus.MANUAL, AgentRunStatus.FAILED} else RiskLevel.MEDIUM),
            )
            decision = AgentDecisionSummary(
                id=self.ids.make("decision", "decision", index),
                run_id=run_id,
                title="模拟 Agent 受控决策摘要",
                summary="区分 Agent 建议、确定性规则和人工决定，不暴露隐藏推理。",
                evidence_ids=plan["knowledge_citation_ids"],
                source=(AgentDecisionSource.AGENT_SUGGESTION, AgentDecisionSource.DETERMINISTIC_RULE, AgentDecisionSource.HUMAN_DECISION)[index % 3],
                **self.audit("agent", index + 5200, risk=RiskLevel(state.risk_level)),
            )
            run = AgentRun(
                id=run_id,
                status=status,
                task_id=task["id"],
                state=state,
                steps=[],
                decisions=[decision],
                current_stage=state.current_stage or "模拟 Agent 流程",
                **self.audit("agent", index + 5000, risk=RiskLevel(state.risk_level)),
            )
            self.records["agent_runs"].append(_model_json(run))

        event_types = (
            AgentEventType.AGENT_STAGE_CHANGED,
            AgentEventType.APPROVAL_REQUIRED,
            AgentEventType.SKILL_FAILED,
            AgentEventType.RUN_RETRIED,
            AgentEventType.RUN_ROLLED_BACK,
            AgentEventType.HUMAN_TAKEOVER_REQUIRED,
            AgentEventType.RUN_COMPLETED,
        )
        for index in range(self.profile.counts["events"]):
            run = self.records["agent_runs"][index % run_count]
            step_id = self.records["agent_steps"][index % step_count]["id"]
            event_type = event_types[index % len(event_types)]
            payload = AgentProgressPayload(
                id=step_id,
                status=AgentStepStatus.FAILED if event_type == AgentEventType.SKILL_FAILED else AgentStepStatus.RUNNING,
                run_id=run["id"],
                step_id=step_id,
                progress_percent=(index * 19) % 101,
                summary=f"模拟事件：{event_type.value}",
                checkpoint_id=run["state"]["checkpoint_id"],
                retry_count=1 if event_type == AgentEventType.RUN_RETRIED else 0,
                formal_write_occurred=False,
                **self.audit("event", index, risk=RiskLevel.HIGH if event_type in {AgentEventType.APPROVAL_REQUIRED, AgentEventType.SKILL_FAILED, AgentEventType.HUMAN_TAKEOVER_REQUIRED} else RiskLevel.MEDIUM),
            )
            event = RealtimeEvent(
                id=self.ids.make("event", "event", index),
                event_type=event_type,
                event_version=EVENT_SCHEMA_VERSION,
                occurred_at=self.stamp("event", index),
                run_id=run["id"],
                task_id=run["task_id"],
                sequence=index // run_count + 1,
                current_stage=run["current_stage"],
                workflow_status=AgentRunStatus(run["status"]),
                progress_summary=payload.summary,
                requires_user_action=event_type in {AgentEventType.APPROVAL_REQUIRED, AgentEventType.HUMAN_TAKEOVER_REQUIRED},
                visibility=ProgressVisibility.BUSINESS,
                error_summary="模拟 Skill 执行失败，可按受控策略处理。" if event_type == AgentEventType.SKILL_FAILED else None,
                next_action=AgentNextAction.REQUEST_HUMAN_TAKEOVER if event_type == AgentEventType.HUMAN_TAKEOVER_REQUIRED else AgentNextAction.CONTINUE,
                payload=payload,
                schema_version=CONTRACT_SCHEMA_VERSION,
                **self.audit("event", index, risk=RiskLevel(payload.risk_level)),
            )
            self.records["events"].append(_model_json(event))

    def build_client_adapter(self) -> bytes:
        users = self.records["users"][:4]
        profiles = self.records["employee_profiles"][:4]
        positions = {item["id"]: item for item in self.records["positions"]}
        departments = {item["id"]: item for item in self.records["departments"]}
        role_codes = {item["id"]: item["role_code"] for item in self.records["roles"]}
        account_labels = [item[0] for item in USERS]
        demo_users = []
        for index, user in enumerate(users):
            profile = profiles[index]
            demo_users.append(
                _model_json(
                    PrototypeUserProfile(
                        user_id=user["id"],
                        employee_profile_id=profile["id"],
                        display_name=user["display_name"],
                        role=UserRole(role_codes[user["role_ids"][0]]),
                        department_name=departments[profile["department_id"]]["name"],
                        job_title=positions[profile["position_id"]]["name"],
                        account_label=account_labels[index],
                    )
                )
            )

        citations = self.records["knowledge_citations"][:3]
        courses = self.records["courses"][:3]
        course_items = [
            _model_json(
                CoursePlanItem(
                    id=course["id"],
                    title=course["title"],
                    department_name=departments[course["department_ids"][0]]["name"],
                    duration_minutes=course["duration_minutes"],
                    risk_level=course["risk_level"],
                    completed=index == 0,
                    knowledge_point_ids=course["knowledge_point_ids"],
                )
            )
            for index, course in enumerate(courses)
        ]
        source_task = self.records["training_tasks"][0]
        source_plans = self.records["training_plans"][:2]
        task_view = _model_json(
            TrainingTaskView(
                id=source_task["id"],
                training_goal_id=source_task["training_goal_id"],
                task_status=TrainingTaskStatus.WAIT_CONFIRM,
                learning_status=LearningRecordStatus.LEARNING,
                current_plan_id=source_plans[1]["id"],
                approval_id=self.records["approvals"][0]["id"],
                name="新员工高风险安全规范与岗位基础培训（模拟）",
                objective="验证基础制度、部门知识、高风险审批、测评、补训和复测闭环。",
                department_name="炼钢生产部",
                audience_label="四部门模拟参训员工",
                department_names=[item[1] for item in DEPARTMENTS],
                audience_labels=[f"{item[1]}模拟员工" for item in DEPARTMENTS],
                mandatory_requirements=["基础制度", "部门知识", "测评留痕"],
                high_risk_requirements=["高风险知识点独立达标"],
                deadline=source_task["deadline"],
                risk_level=RiskLevel.HIGH,
                progress_percent=42,
                estimated_minutes=90,
                next_action_label="继续学习",
                created_at=source_task["created_at"],
            )
        )
        plan_details = []
        for index, source in enumerate(source_plans):
            detail = TrainingPlanDetail.model_validate(
                {
                    **source,
                    "course_ids": [item["id"] for item in course_items],
                    "knowledge_citation_ids": [item["id"] for item in citations],
                    "target_department_names": [item[1] for item in DEPARTMENTS],
                    "courses": course_items,
                    "knowledge_citations": citations,
                    "candidate_label": "候选 B · Agent 建议" if index else "候选 A",
                }
            )
            plan_details.append(_model_json(detail))
        questions = [item["question"] for item in self.records["questions"][:3]]
        source_agent_run = self.records["agent_runs"][0]
        agent_run = _model_json(
            AgentRun.model_validate(
                {
                    **source_agent_run,
                    "steps": [
                        step
                        for step in self.records["agent_steps"]
                        if step["run_id"] == source_agent_run["id"]
                    ],
                }
            )
        )
        report = _model_json(
            ReportSummary(
                task_id=source_task["id"],
                completion_rate_percent=91,
                assessment_pass_rate_percent=78,
                remedial_count=self.profile.counts["remediations"],
                reassessment_count=self.profile.counts["retests"],
                high_risk_intervention_count=self.profile.counts["approvals"],
                status=ReportStatus.DRAFT,
                disclaimer="本页全部为模拟数据，仅用于验证流程、页面和交互，不代表真实企业培训效果。",
            )
        )
        ids = {
            "employeeUser": users[0]["id"],
            "adminUser": users[1]["id"],
            "reviewerUser": users[2]["id"],
            "systemUser": users[3]["id"],
            "employeeProfile": profiles[0]["id"],
            "reviewerRole": ROLES[2][0],
            "goal": source_task["training_goal_id"],
            "task": source_task["id"],
            "completedTask": self.records["training_tasks"][3]["id"],
            "planA": source_plans[0]["id"],
            "planB": source_plans[1]["id"],
            "courseBase": courses[0]["id"],
            "courseSteel": courses[1]["id"],
            "courseIt": courses[2]["id"],
            "courseRemedial": self.records["courses"][3]["id"],
            "kpBase": self.records["knowledge_points"][0]["id"],
            "kpSteel": self.records["knowledge_points"][1]["id"],
            "kpIt": self.records["knowledge_points"][2]["id"],
            "knowBase": citations[0]["id"],
            "knowSteel": citations[1]["id"],
            "knowIt": citations[2]["id"],
            "approval": self.records["approvals"][0]["id"],
            "run": agent_run["id"],
            "trace": agent_run["trace_id"],
        }
        values = {
            "contractIds": ids,
            "demoUsers": demo_users,
            "knowledgeCitations": citations,
            "trainingTask": task_view,
            "candidatePlans": plan_details,
            "approvalRecord": self.records["approvals"][0],
            "assessmentQuestions": questions,
            "agentRun": agent_run,
            "reportSummary": report,
        }
        return render_client_adapter(values)


def render_client_adapter(values: dict[str, Any]) -> bytes:
    """Render the existing @tegang/mock-data API from the canonical small dataset."""

    imports = """import type {
  ContractAgentRun,
  ContractApproval,
  ContractAssessmentQuestion,
  ContractKnowledgeCitation,
  ContractPrototypeUserProfile,
  ContractReportSummary,
  ContractTrainingPlanDetail,
  ContractTrainingTaskView
} from "@tegang/types";
"""
    type_by_name = {
        "demoUsers": "ContractPrototypeUserProfile[]",
        "knowledgeCitations": "ContractKnowledgeCitation[]",
        "trainingTask": "ContractTrainingTaskView",
        "candidatePlans": "ContractTrainingPlanDetail[]",
        "approvalRecord": "ContractApproval",
        "assessmentQuestions": "ContractAssessmentQuestion[]",
        "agentRun": "ContractAgentRun",
        "reportSummary": "ContractReportSummary",
    }
    sections = [
        "// Generated by C-07. Do not edit by hand; run pnpm data:generate -- --profile small.\n",
        imports,
    ]
    for name, value in values.items():
        rendered = json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2)
        if name == "contractIds":
            sections.append(f"export const {name} = {rendered} as const;\n")
        else:
            sections.append(f"export const {name}: {type_by_name[name]} = {rendered};\n")
    return ("\n".join(sections).replace("\r\n", "\n") + "\n").encode("utf-8")


def _primary_ids(name: str, records: list[dict[str, Any]]) -> list[str]:
    if name == "questions":
        return [record["question"]["id"] for record in records]
    if name == "learning_records":
        return []
    return [record["id"] for record in records if isinstance(record.get("id"), str)]


def _dataset_target(output_root: Path, profile_name: str) -> Path:
    if profile_name == "small":
        return output_root / "data" / "small"
    return output_root / "data" / "generated" / profile_name


def _safe_replace_directory(target: Path, data_root: Path) -> None:
    resolved_target = target.resolve()
    resolved_data = data_root.resolve()
    if resolved_target == resolved_data or resolved_data not in resolved_target.parents:
        raise ValueError(f"refusing to replace unsafe dataset path: {resolved_target}")
    if target.exists():
        shutil.rmtree(target)
    target.mkdir(parents=True, exist_ok=True)


def generate_dataset(
    repo_root: Path,
    profile: DatasetProfile,
    *,
    settings: GenerationSettings | None = None,
    output_root: Path | None = None,
) -> Path:
    """Generate one profile and return its manifest path.

    ``repo_root`` always identifies the tracked rules, dictionaries, and templates.
    ``output_root`` may point at a temporary tree for determinism tests.
    """

    settings = settings or GenerationSettings()
    output_root = (output_root or repo_root).resolve()
    builder = DatasetBuilder(repo_root.resolve(), profile, settings)
    generated = builder.build()
    target = _dataset_target(output_root, profile.name)
    _safe_replace_directory(target, output_root / "data")

    file_entries: list[dict[str, Any]] = []
    id_ranges: dict[str, dict[str, str]] = {}
    for name, filename in DATASET_FILES:
        records = generated.records[name]
        content = jsonl_bytes(records)
        path = target / filename
        path.write_bytes(content)
        file_entries.append(
            _model_json(
                ManifestFile(
                    path=path.relative_to(target).as_posix(),
                    sha256=sha256_bytes(content),
                    bytes=len(content),
                    records=len(records),
                )
            )
        )
        ids = _primary_ids(name, records)
        if ids:
            id_ranges[name] = {"first": ids[0], "last": ids[-1]}

    for relative_path, content in sorted(generated.documents.items()):
        path = target / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        file_entries.append(
            _model_json(
                ManifestFile(
                    path=relative_path,
                    sha256=sha256_bytes(content),
                    bytes=len(content),
                )
            )
        )

    related_artifacts: list[dict[str, Any]] = []
    if generated.client_adapter is not None:
        adapter_path = output_root / "packages" / "mock-data" / "src" / "small.generated.ts"
        adapter_path.parent.mkdir(parents=True, exist_ok=True)
        temporary_adapter = adapter_path.with_suffix(".ts.tmp")
        temporary_adapter.write_bytes(generated.client_adapter)
        temporary_adapter.replace(adapter_path)
        related_artifacts.append(
            _model_json(
                ManifestFile(
                    path=adapter_path.relative_to(output_root).as_posix(),
                    sha256=sha256_bytes(generated.client_adapter),
                    bytes=len(generated.client_adapter),
                )
            )
        )

    object_counts = dict(profile.counts)
    manifest_without_hash = {
        "dataset_version": settings.dataset_version,
        "generator_version": settings.generator_version,
        "profile": profile.name,
        "random_seed": settings.random_seed,
        "fixed_epoch": settings.fixed_epoch,
        "generated_at": settings.fixed_epoch,
        "contract_version": CONTRACT_SCHEMA_VERSION,
        "c07_base_sha": C07_BASE_SHA,
        "parameters": {
            "profile_description": profile.description,
            "encoding": "UTF-8 without BOM",
            "newline": "LF",
            "json_keys": "sorted",
            "record_order": "deterministic generation index",
            "id_algorithm": "48-bit fixed-epoch offset plus SHA-256-derived 80-bit entropy, Crockford Base32 ULID",
        },
        "object_counts": object_counts,
        "id_ranges": id_ranges,
        "files": sorted(file_entries, key=lambda item: item["path"]),
        "related_artifacts": sorted(related_artifacts, key=lambda item: item["path"]),
    }
    manifest_hash = sha256_bytes(canonical_json_bytes(manifest_without_hash))
    manifest = DatasetManifest.model_validate(
        {**manifest_without_hash, "manifest_sha256": manifest_hash}
    ).model_dump(mode="json")
    manifest_path = target / "manifest.json"
    manifest_path.write_bytes(pretty_json_bytes(manifest))
    generated.manifest = manifest
    return manifest_path
