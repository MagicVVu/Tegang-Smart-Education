"""Structural, contract, relationship, determinism, and safety validation for C-07."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

from pydantic import BaseModel

from backend.app.schemas.agent import AgentRun, AgentStepSummary, RealtimeEvent
from backend.app.schemas.approval import Approval
from backend.app.schemas.assessment import (
    AssessmentResult,
    AssessmentSession,
    RemediationIntervention,
    Retest,
)
from backend.app.schemas.common import CONTRACT_SCHEMA_VERSION, RiskLevel
from backend.app.schemas.identity import Department, EmployeeProfile, Organization, Position, Role, User
from backend.app.schemas.knowledge import KnowledgeCitation
from backend.app.schemas.training import Course, TrainingGoal, TrainingPlan, TrainingTask
from backend.scripts.bootstrap_identity import DEPARTMENTS, ORG_ID, ROLES, USERS

from .generator import DATASET_FILES
from .io import canonical_json_bytes, read_jsonl, sha256_bytes, sha256_file
from .models import (
    DatasetManifest,
    KnowledgePointDatasetRecord,
    LearningRecordDatasetRecord,
    QuestionDatasetRecord,
)

EXTERNAL_ID = re.compile(r"^[a-z][a-z0-9_]*_[0-9A-HJKMNP-TV-Z]{26}$")
SENSITIVE_KEYS = {
    "password",
    "password_hash",
    "access_token",
    "refresh_token",
    "cookie",
    "client_secret",
    "api_key",
    "authorization",
    "environment",
}


@dataclass(frozen=True, slots=True)
class ValidationResult:
    profile: str
    dataset_version: str
    object_counts: dict[str, int]
    files_checked: int
    primary_ids_checked: int


MODEL_BY_RECORD_SET: dict[str, type[BaseModel]] = {
    "organizations": Organization,
    "departments": Department,
    "roles": Role,
    "positions": Position,
    "users": User,
    "employee_profiles": EmployeeProfile,
    "knowledge_citations": KnowledgeCitation,
    "knowledge_points": KnowledgePointDatasetRecord,
    "questions": QuestionDatasetRecord,
    "courses": Course,
    "training_goals": TrainingGoal,
    "training_tasks": TrainingTask,
    "training_plans": TrainingPlan,
    "approvals": Approval,
    "learning_records": LearningRecordDatasetRecord,
    "assessment_sessions": AssessmentSession,
    "assessment_results": AssessmentResult,
    "remediations": RemediationIntervention,
    "retests": Retest,
    "agent_runs": AgentRun,
    "agent_steps": AgentStepSummary,
    "events": RealtimeEvent,
}


def _assert(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def _walk_sensitive(value: Any, path: str = "$") -> None:
    if isinstance(value, dict):
        for key, item in value.items():
            normalized = key.lower()
            if normalized in SENSITIVE_KEYS or normalized.endswith("_password"):
                raise ValueError(f"sensitive field is forbidden in simulated data: {path}.{key}")
            _walk_sensitive(item, f"{path}.{key}")
    elif isinstance(value, list):
        for index, item in enumerate(value):
            _walk_sensitive(item, f"{path}[{index}]")
    elif isinstance(value, str):
        if re.search(r"[A-Za-z]:\\|/Users/|/home/", value):
            raise ValueError(f"local absolute path is forbidden in simulated data: {path}")


def _id_of(name: str, record: dict[str, Any]) -> str | None:
    if name == "questions":
        return record["question"]["id"]
    value = record.get("id")
    return value if isinstance(value, str) else None


def _set(records: dict[str, list[dict[str, Any]]], name: str) -> set[str]:
    return {value for item in records[name] if (value := _id_of(name, item)) is not None}


def _require_refs(values: Iterable[str], targets: set[str], label: str) -> None:
    missing = sorted(set(values) - targets)
    _assert(not missing, f"unresolved {label} references: {missing[:5]}")


def _validate_relationships(records: dict[str, list[dict[str, Any]]], document_slugs: set[str]) -> None:
    organizations = _set(records, "organizations")
    departments = _set(records, "departments")
    roles = _set(records, "roles")
    positions = _set(records, "positions")
    users = _set(records, "users")
    profiles = _set(records, "employee_profiles")
    citations = _set(records, "knowledge_citations")
    points = _set(records, "knowledge_points")
    questions = _set(records, "questions")
    courses = _set(records, "courses")
    goals = _set(records, "training_goals")
    tasks = _set(records, "training_tasks")
    plans = _set(records, "training_plans")
    approvals = _set(records, "approvals")
    sessions = _set(records, "assessment_sessions")
    results = _set(records, "assessment_results")
    remediations = _set(records, "remediations")
    runs = _set(records, "agent_runs")
    steps = _set(records, "agent_steps")

    for item in records["departments"]:
        _require_refs([item["organization_id"]], organizations, "department.organization_id")
    for item in records["positions"]:
        _require_refs([item["organization_id"]], organizations, "position.organization_id")
        _require_refs([item["department_id"]], departments, "position.department_id")
    for item in records["users"]:
        _require_refs(item["role_ids"], roles, "user.role_ids")
        _require_refs(item["department_ids"], departments, "user.department_ids")
    for item in records["employee_profiles"]:
        _require_refs([item["user_id"]], users, "employee_profile.user_id")
        _require_refs([item["department_id"]], departments, "employee_profile.department_id")
        _require_refs([item["position_id"]], positions, "employee_profile.position_id")
    for item in records["knowledge_citations"]:
        _require_refs([item["source_department_id"]], departments, "citation.source_department_id")
    for item in records["knowledge_points"]:
        _require_refs([item["knowledge_citation_id"]], citations, "knowledge_point.citation")
        _assert(item["document_slug"] in document_slugs, "knowledge point references a missing document")
    high_risk_points = {
        item["id"] for item in records["knowledge_points"] if item["risk_level"] == RiskLevel.HIGH.value
    }
    questioned_points: set[str] = set()
    for item in records["questions"]:
        question = item["question"]
        questioned_points.add(question["knowledge_point_id"])
        _require_refs([question["knowledge_point_id"]], points, "question.knowledge_point_id")
        _require_refs([item["knowledge_citation_id"]], citations, "question.citation")
        _assert(all(0 <= option < len(question["options"]) for option in question["correct_option_indexes"]), "question answer index is out of range")
    _assert(high_risk_points <= questioned_points, "each high-risk knowledge point must have at least one question")
    _assert(questions, "question set must not be empty")

    for item in records["courses"]:
        _require_refs(item["department_ids"], departments, "course.department_ids")
        _require_refs(item["knowledge_point_ids"], points, "course.knowledge_point_ids")
    for item in records["training_goals"]:
        _require_refs(item["target_department_ids"], departments, "goal.department_ids")
        _require_refs(item["target_employee_profile_ids"], profiles, "goal.employee_profiles")
    goal_by_id = {item["id"]: item for item in records["training_goals"]}
    plan_by_id = {item["id"]: item for item in records["training_plans"]}
    task_by_id = {item["id"]: item for item in records["training_tasks"]}
    for item in records["training_tasks"]:
        _require_refs([item["training_goal_id"]], goals, "task.training_goal_id")
        _require_refs(item["target_department_ids"], departments, "task.department_ids")
        _require_refs(item["target_employee_profile_ids"], profiles, "task.employee_profiles")
        if item.get("current_plan_id"):
            _require_refs([item["current_plan_id"]], plans, "task.current_plan_id")
            _assert(plan_by_id[item["current_plan_id"]]["training_goal_id"] == item["training_goal_id"], "task current plan belongs to a different goal")
        if item.get("approval_id"):
            _require_refs([item["approval_id"]], approvals, "task.approval_id")
    for item in records["training_plans"]:
        _require_refs([item["training_goal_id"]], goals, "plan.training_goal_id")
        _require_refs(item["course_ids"], courses, "plan.course_ids")
        _require_refs(item["knowledge_citation_ids"], citations, "plan.citation_ids")
    for item in records["approvals"]:
        _require_refs([item["task_id"]], tasks, "approval.task_id")
        _require_refs([item["plan_id"]], plans, "approval.plan_id")
        _require_refs([item["requested_by"]], users, "approval.requested_by")
        _require_refs([item["reviewer_role_id"]], roles, "approval.reviewer_role_id")
        _require_refs(item["knowledge_citation_ids"], citations, "approval.citations")
        _assert(plan_by_id[item["plan_id"]]["training_goal_id"] == task_by_id[item["task_id"]]["training_goal_id"], "approval plan and task goals differ")
    for item in records["learning_records"]:
        _require_refs([item["task_id"]], tasks, "learning.task_id")
        _require_refs([item["employee_profile_id"]], profiles, "learning.employee_profile_id")
    for item in records["assessment_sessions"]:
        _require_refs([item["task_id"]], tasks, "assessment_session.task_id")
        _require_refs([item["employee_profile_id"]], profiles, "assessment_session.employee_profile_id")
    session_by_id = {item["id"]: item for item in records["assessment_sessions"]}
    result_by_id = {item["id"]: item for item in records["assessment_results"]}
    for item in records["assessment_results"]:
        _require_refs([item["assessment_session_id"]], sessions, "assessment_result.session_id")
        _require_refs([item["task_id"]], tasks, "assessment_result.task_id")
        _require_refs([item["employee_profile_id"]], profiles, "assessment_result.employee_profile_id")
        session = session_by_id[item["assessment_session_id"]]
        _assert(session["task_id"] == item["task_id"] and session["employee_profile_id"] == item["employee_profile_id"], "assessment result does not match its session")
        for performance in item["knowledge_point_performances"]:
            _require_refs([performance["knowledge_point_id"]], points, "performance.knowledge_point_id")
    remediation_by_id = {item["id"]: item for item in records["remediations"]}
    for item in records["remediations"]:
        _require_refs([item["assessment_result_id"]], results, "remediation.assessment_result_id")
        _require_refs([item["task_id"]], tasks, "remediation.task_id")
        _require_refs([item["employee_profile_id"]], profiles, "remediation.employee_profile_id")
        _require_refs(item["weak_knowledge_point_ids"], points, "remediation.knowledge_points")
        _require_refs(item["required_course_ids"], courses, "remediation.courses")
    for item in records["retests"]:
        _require_refs([item["remediation_id"]], remediations, "retest.remediation_id")
        _require_refs([item["assessment_session_id"]], sessions, "retest.assessment_session_id")
        _require_refs([item["result_id"]], results, "retest.result_id")
        remediation = remediation_by_id[item["remediation_id"]]
        result = result_by_id[item["result_id"]]
        _assert(item["task_id"] == remediation["task_id"] == result["task_id"], "retest task chain is inconsistent")
        _assert(item["employee_profile_id"] == remediation["employee_profile_id"] == result["employee_profile_id"], "retest employee chain is inconsistent")

    step_by_id = {item["id"]: item for item in records["agent_steps"]}
    for item in records["agent_steps"]:
        _require_refs([item["run_id"]], runs, "agent_step.run_id")
    for item in records["agent_runs"]:
        _require_refs([item["task_id"]], tasks, "agent_run.task_id")
        state = item["state"]
        _assert(state["id"] == item["id"] and state["task_id"] == item["task_id"], "Agent State identity differs from Agent Run")
        linked_steps = state["completed_step_ids"] + state["pending_step_ids"]
        _require_refs(linked_steps, steps, "agent_state.step_ids")
        _assert(all(step_by_id[step_id]["run_id"] == item["id"] for step_id in linked_steps), "Agent State references a step from another run")
    for item in records["events"]:
        _require_refs([item["run_id"]], runs, "event.run_id")
        _require_refs([item["task_id"]], tasks, "event.task_id")
        _require_refs([item["payload"]["step_id"]], steps, "event.step_id")
        _assert(step_by_id[item["payload"]["step_id"]]["run_id"] == item["run_id"], "event step belongs to another run")


def validate_dataset(dataset_dir: Path, *, output_root: Path | None = None) -> ValidationResult:
    dataset_dir = dataset_dir.resolve()
    manifest_path = dataset_dir / "manifest.json"
    _assert(manifest_path.is_file(), f"missing manifest: {manifest_path}")
    raw_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest = DatasetManifest.model_validate(raw_manifest)
    hash_payload = dict(raw_manifest)
    declared_hash = hash_payload.pop("manifest_sha256")
    _assert(sha256_bytes(canonical_json_bytes(hash_payload)) == declared_hash, "manifest_sha256 mismatch")
    _assert(manifest.contract_version == CONTRACT_SCHEMA_VERSION, "dataset contract version does not match current code")

    records: dict[str, list[dict[str, Any]]] = {}
    manifest_files = {item.path: item for item in manifest.files}
    files_checked = 0
    for relative_path, entry in manifest_files.items():
        path = dataset_dir / relative_path
        _assert(path.is_file(), f"manifest file is missing: {relative_path}")
        content = path.read_bytes()
        _assert(not content.startswith(b"\xef\xbb\xbf"), f"UTF-8 BOM is forbidden: {relative_path}")
        _assert(b"\r\n" not in content and b"\r" not in content, f"only LF newlines are permitted: {relative_path}")
        _assert(len(content) == entry.bytes, f"byte count mismatch: {relative_path}")
        _assert(sha256_file(path) == entry.sha256, f"SHA-256 mismatch: {relative_path}")
        files_checked += 1
    if output_root is not None:
        output_root = output_root.resolve()
        for entry in manifest.related_artifacts:
            path = output_root / entry.path
            _assert(path.is_file(), f"related artifact is missing: {entry.path}")
            _assert(path.stat().st_size == entry.bytes, f"related artifact size mismatch: {entry.path}")
            _assert(sha256_file(path) == entry.sha256, f"related artifact hash mismatch: {entry.path}")
            files_checked += 1

    expected_names = {name for name, _ in DATASET_FILES}
    for name, filename in DATASET_FILES:
        path = dataset_dir / filename
        _assert(filename in manifest_files, f"manifest omits {filename}")
        items = read_jsonl(path)
        records[name] = items
        _assert(manifest_files[filename].records == len(items), f"record count mismatch: {filename}")
        _assert(manifest.object_counts[name] == len(items), f"profile count mismatch: {name}")
        model = MODEL_BY_RECORD_SET[name]
        for index, item in enumerate(items):
            try:
                model.model_validate(item)
            except Exception as error:
                raise ValueError(f"contract validation failed for {name}[{index}]: {error}") from error
            _walk_sensitive(item, f"{name}[{index}]")
    _assert(expected_names <= set(records), "not all expected record sets were loaded")

    document_entries = [item for item in manifest.files if item.path.startswith("documents/")]
    _assert(len(document_entries) == manifest.object_counts["documents"], "document count mismatch")
    document_slugs = {Path(item.path).stem for item in document_entries}

    primary_ids: list[str] = []
    for name, items in records.items():
        for item in items:
            value = _id_of(name, item)
            if value is not None:
                _assert(EXTERNAL_ID.fullmatch(value) is not None, f"invalid external ID: {value}")
                primary_ids.append(value)
    _assert(len(primary_ids) == len(set(primary_ids)), "primary external IDs are not globally unique")

    _assert(_set(records, "organizations") == {ORG_ID}, "C-06 simulated organization is missing or replaced")
    _assert({item["id"] for item in records["departments"]} == {item[0] for item in DEPARTMENTS}, "the four C-06 departments must remain unchanged")
    _assert({item["id"] for item in records["roles"]} == {item[0] for item in ROLES}, "the four C-06 roles must remain unchanged")
    _assert({item["id"] for item in records["users"][:4]} == {item[1] for item in USERS}, "the four flagship users must remain present")
    _assert({item["id"] for item in records["employee_profiles"][:4]} == {item[6] for item in USERS}, "the four flagship employee profiles must remain present")
    _validate_relationships(records, document_slugs)
    return ValidationResult(
        profile=manifest.profile,
        dataset_version=manifest.dataset_version,
        object_counts=manifest.object_counts,
        files_checked=files_checked,
        primary_ids_checked=len(primary_ids),
    )
