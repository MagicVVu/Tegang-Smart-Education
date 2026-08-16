"""Explicit field-whitelist anonymized export for validated C-07 datasets."""

from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any

from .generator import DATASET_FILES
from .io import canonical_json_bytes, jsonl_bytes, pretty_json_bytes, read_jsonl, sha256_bytes

COMMON = ("schema_version", "entity_version", "created_at", "updated_at", "risk_level", "trace_id")
TOP_LEVEL_FIELDS: dict[str, tuple[str, ...]] = {
    "organizations": ("id", "status", "name", "simulated", *COMMON),
    "departments": ("id", "status", "name", "organization_id", "parent_department_id", *COMMON),
    "roles": ("id", "status", "role_code", "name", "permission_scopes", *COMMON),
    "positions": ("id", "status", "organization_id", "department_id", "code", "name", *COMMON),
    "users": ("id", "status", "display_name", "role_ids", "department_ids", *COMMON),
    "employee_profiles": ("id", "status", "user_id", "department_id", "position_id", "job_title", "training_tags", "authorized_data_scopes", *COMMON),
    "knowledge_citations": ("id", "status", "document_name", "document_version", "source_department_id", "section", "excerpt", "relation", "retrieved_at", "content_hash", "authorized_scopes", *COMMON),
    "knowledge_points": ("id", "name", "knowledge_citation_id", "document_slug", "risk_level", "pass_threshold_percent", "high_risk_independent_pass_required"),
    "courses": ("id", "status", "title", "department_ids", "knowledge_point_ids", "duration_minutes", "required", *COMMON),
    "training_goals": ("id", "status", "title", "objective", "target_department_ids", "target_employee_profile_ids", "mandatory_requirements", "high_risk_requirements", "deadline", *COMMON),
    "training_tasks": ("id", "status", "training_goal_id", "current_plan_id", "name", "objective", "target_department_ids", "target_employee_profile_ids", "deadline", "progress_percent", "approval_id", *COMMON),
    "approvals": ("id", "status", "task_id", "plan_id", "requested_by", "reviewer_role_id", "reviewer_id", "risk_summary", "impact_scope", "knowledge_citation_ids", "submitted_at", "decided_at", "decision", "decision_comment", "requested_changes", *COMMON),
    "learning_records": ("task_id", "employee_profile_id", "status", "progress_percent", "attempt", "started_at", "completed_at", "simulated_dataset_tag"),
    "assessment_sessions": ("id", "status", "task_id", "employee_profile_id", "attempt", "started_at", "submitted_at", *COMMON),
    "remediations": ("id", "status", "task_id", "assessment_result_id", "employee_profile_id", "weak_knowledge_point_ids", "required_course_ids", "reason", "attempt", "completed_at", *COMMON),
    "retests": ("id", "status", "remediation_id", "task_id", "employee_profile_id", "assessment_session_id", "result_id", "scheduled_at", "completed_at", *COMMON),
    "agent_steps": ("id", "status", "run_id", "capability", "label", "input_summary", "output_summary", "decision_reason", "checkpoint_id", "retry_count", "writes_committed", "model_name", "prompt_version", "token_count", "latency_ms", "skill_name", "error_code", "started_at", "finished_at", *COMMON),
}


def _pick(record: dict[str, Any], fields: tuple[str, ...]) -> dict[str, Any]:
    return {field: record[field] for field in fields if field in record}


def _project(name: str, record: dict[str, Any], index: int) -> dict[str, Any]:
    if name in TOP_LEVEL_FIELDS:
        projected = _pick(record, TOP_LEVEL_FIELDS[name])
        if name == "users":
            projected["display_name"] = f"模拟用户-{index + 1:04d}"
        return projected
    if name == "questions":
        question = record["question"]
        return {
            "question": _pick(
                question,
                (
                    "id", "status", "question_type", "prompt", "options",
                    "correct_option_indexes", "knowledge_point_id", "knowledge_point_name",
                    "risk_level", *COMMON,
                ),
            ),
            "explanation": record["explanation"],
            "knowledge_citation_id": record["knowledge_citation_id"],
        }
    if name == "training_plans":
        projected = _pick(
            record,
            (
                "id", "status", "training_goal_id", "title", "candidate_label", "summary",
                "selection_reason", "course_ids", "knowledge_citation_ids", "approval_id", *COMMON,
            ),
        )
        projected["rule_checks"] = [
            _pick(item, ("id", "status", "rule_code", "label", "detail", "deterministic", *COMMON))
            for item in record["rule_checks"]
        ]
        return projected
    if name == "assessment_results":
        projected = _pick(
            record,
            (
                "id", "status", "assessment_session_id", "task_id", "employee_profile_id",
                "score_percent", "passed", "high_risk_passed", "next_action", "scored_at",
                "disclaimer", *COMMON,
            ),
        )
        projected["knowledge_point_performances"] = [
            _pick(
                item,
                (
                    "id", "status", "assessment_session_id", "knowledge_point_id",
                    "knowledge_point_name", "score_percent", "passed", "reason", "risk_level",
                    "schema_version", "entity_version", "created_at", "updated_at", "trace_id",
                ),
            )
            for item in record["knowledge_point_performances"]
        ]
        return projected
    if name == "agent_runs":
        state = record["state"]
        return {
            **_pick(record, ("id", "status", "task_id", "current_stage", *COMMON)),
            "state": _pick(
                state,
                (
                    "id", "state_version", "status", "task_id", "checkpoint_sequence",
                    "training_goal_id", "target_employee_profile_ids", "constraints", "deadline",
                    "current_step_id", "current_plan_id", "current_knowledge_citation_ids",
                    "current_assessment_result_id", "current_approval_id", "checkpoint_id",
                    "current_stage", "current_node", "completed_step_ids", "pending_step_ids",
                    "waiting_human_action", "retry_count", "last_error_code", "next_allowed_actions",
                    "waiting_for", "recoverable", "formal_write_occurred", "started_at",
                    "checkpointed_at", *COMMON,
                ),
            ),
            "decisions": [
                _pick(item, ("id", "status", "run_id", "title", "summary", "evidence_ids", "source", *COMMON))
                for item in record["decisions"]
            ],
            "steps": [],
        }
    if name == "events":
        projected = _pick(
            record,
            (
                "id", "status", "event_type", "event_version", "occurred_at", "run_id", "task_id",
                "sequence", "current_stage", "workflow_status", "progress_summary",
                "requires_user_action", "visibility", "error_summary", "next_action", *COMMON,
            ),
        )
        projected["payload"] = _pick(
            record["payload"],
            (
                "id", "status", "run_id", "step_id", "progress_percent", "summary",
                "checkpoint_id", "retry_count", "formal_write_occurred", *COMMON,
            ),
        )
        return projected
    raise ValueError(f"missing anonymized export whitelist for record set: {name}")


def export_anonymized(dataset_dir: Path, *, repo_root: Path, output_root: Path | None = None) -> Path:
    """Export only explicitly whitelisted fields from one validated dataset."""

    dataset_dir = dataset_dir.resolve()
    source_manifest = json.loads((dataset_dir / "manifest.json").read_text(encoding="utf-8"))
    output_root = (output_root or repo_root).resolve()
    target = output_root / "data" / "exports" / (
        f"{source_manifest['profile']}-{source_manifest['dataset_version']}-anonymized"
    )
    resolved_exports = (output_root / "data" / "exports").resolve()
    if target.resolve() == resolved_exports or resolved_exports not in target.resolve().parents:
        raise ValueError(f"refusing to replace unsafe export path: {target}")
    if target.exists():
        shutil.rmtree(target)
    target.mkdir(parents=True, exist_ok=True)

    files: list[dict[str, Any]] = []
    object_counts: dict[str, int] = {}
    for name, filename in DATASET_FILES:
        source_records = read_jsonl(dataset_dir / filename)
        projected = [_project(name, record, index) for index, record in enumerate(source_records)]
        content = jsonl_bytes(projected)
        path = target / filename
        path.write_bytes(content)
        files.append(
            {
                "path": filename,
                "sha256": sha256_bytes(content),
                "bytes": len(content),
                "records": len(projected),
            }
        )
        object_counts[name] = len(projected)

    for entry in source_manifest["files"]:
        if not entry["path"].startswith("documents/"):
            continue
        content = (dataset_dir / entry["path"]).read_bytes()
        path = target / entry["path"]
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        files.append(
            {
                "path": entry["path"],
                "sha256": sha256_bytes(content),
                "bytes": len(content),
            }
        )
    object_counts["documents"] = source_manifest["object_counts"]["documents"]
    manifest_base = {
        "export_format": "c07-anonymized-whitelist-v1",
        "dataset_version": source_manifest["dataset_version"],
        "generator_version": source_manifest["generator_version"],
        "profile": source_manifest["profile"],
        "generated_at": source_manifest["generated_at"],
        "source_manifest_sha256": source_manifest["manifest_sha256"],
        "object_counts": object_counts,
        "files": sorted(files, key=lambda item: item["path"]),
        "forbidden_sources": [
            "user_credentials",
            "auth_sessions",
            "auth_refresh_tokens",
            "security_audit_records",
            "environment_variables",
        ],
    }
    export_hash = sha256_bytes(canonical_json_bytes(manifest_base))
    manifest = {**manifest_base, "export_manifest_sha256": export_hash}
    manifest_path = target / "manifest.json"
    manifest_path.write_bytes(pretty_json_bytes(manifest))
    return manifest_path
