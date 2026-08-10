from __future__ import annotations

import copy
import json
import sys
import unittest
from pathlib import Path

from pydantic import TypeAdapter, ValidationError

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.app.schemas.agent import AgentRunStatus  # noqa: E402
from backend.app.schemas.api import (  # noqa: E402
    CreateTrainingTaskRequest,
    CreateTrainingTaskResponse,
    DifyPlanAgentOutput,
    ErrorResponse,
    PlanGenerationResponse,
)
from backend.app.schemas.common import (  # noqa: E402
    AGENT_STATE_VERSION,
    CONTRACT_SCHEMA_VERSION,
    EVENT_SCHEMA_VERSION,
    ApprovalId,
    Confidence,
    EventId,
    RequestId,
    TrainingTaskId,
    UserId,
)
from backend.app.schemas.errors import ErrorCode, UnifiedError  # noqa: E402
from backend.app.schemas.events import EventEnvelope  # noqa: E402
from backend.app.schemas.examples import EXAMPLE_MODELS  # noqa: E402
from backend.app.schemas.training import TrainingTask  # noqa: E402
from backend.scripts.export_contracts import generate_outputs  # noqa: E402

EXAMPLE_DIR = REPO_ROOT / "docs" / "contracts" / "examples"


def _load_example(name: str) -> dict[str, object]:
    return json.loads((EXAMPLE_DIR / f"{name}.json").read_text(encoding="utf-8"))


class ContractTests(unittest.TestCase):
    def test_all_published_examples_validate(self) -> None:
        for name, model in EXAMPLE_MODELS.items():
            with self.subTest(name=name):
                model.model_validate(_load_example(name))

    def test_id_prefixes_accept_ulid_and_reject_legacy_or_cross_domain_ids(self) -> None:
        ulid = "01ARZ3NDEKTSV4RRFFQ69G5FAV"
        cases = (
            (UserId, f"usr_{ulid}"),
            (TrainingTaskId, f"task_{ulid}"),
            (ApprovalId, f"approval_{ulid}"),
            (EventId, f"event_{ulid}"),
            (RequestId, f"req_{ulid}"),
        )
        for annotation, value in cases:
            with self.subTest(value=value):
                self.assertEqual(TypeAdapter(annotation).validate_python(value), value)
        with self.assertRaises(ValidationError):
            TypeAdapter(TrainingTaskId).validate_python("T-20260728-01")
        with self.assertRaises(ValidationError):
            TypeAdapter(TrainingTaskId).validate_python(f"approval_{ulid}")

    def test_naive_datetime_is_rejected_and_offset_datetime_is_normalized(self) -> None:
        payload = copy.deepcopy(_load_example("create-training-task-response"))["data"]
        payload["created_at"] = "2026-08-04T16:00:00"
        with self.assertRaises(ValidationError):
            TrainingTask.model_validate(payload)

        payload["created_at"] = "2026-08-04T16:00:00+08:00"
        model = TrainingTask.model_validate(payload)
        self.assertEqual(model.created_at.utcoffset().total_seconds(), 0)
        self.assertEqual(model.created_at.hour, 8)

    def test_required_fields_and_unknown_fields_are_rejected(self) -> None:
        payload = _load_example("create-training-task-request")
        del payload["data"]["name"]
        with self.assertRaises(ValidationError):
            CreateTrainingTaskRequest.model_validate(payload)

        payload = _load_example("create-training-task-request")
        payload["unexpected"] = True
        with self.assertRaises(ValidationError):
            CreateTrainingTaskRequest.model_validate(payload)

    def test_invalid_enum_and_confidence_are_rejected(self) -> None:
        payload = _load_example("create-training-task-response")["data"]
        payload["status"] = "completed"
        with self.assertRaises(ValidationError):
            TrainingTask.model_validate(payload)

        with self.assertRaises(ValidationError):
            TypeAdapter(Confidence).validate_python(1.01)

        payload = _load_example("plan-generation-response")
        payload["data"][0]["confidence"] = -0.01
        with self.assertRaises(ValidationError):
            PlanGenerationResponse.model_validate(payload)

        approval = _load_example("approval-result")
        approval["data"]["status"] = "AP-EDITING"
        with self.assertRaises(ValidationError):
            EXAMPLE_MODELS["approval-result"].model_validate(approval)

        assessment = _load_example("assessment-result")
        assessment["data"]["status"] = "pending"
        with self.assertRaises(ValidationError):
            EXAMPLE_MODELS["assessment-result"].model_validate(assessment)

    def test_agent_state_event_and_error_contracts(self) -> None:
        state = EXAMPLE_MODELS["agent-state"].model_validate(_load_example("agent-state"))
        self.assertEqual(state.data.status, AgentRunStatus.WAIT_APPROVAL)

        event = EXAMPLE_MODELS["progress-event"].model_validate(_load_example("progress-event"))
        self.assertEqual(event.data.sequence, 7)
        self.assertFalse(event.data.payload.formal_write_occurred)

        error = UnifiedError.model_validate(_load_example("unified-error"))
        serialized = json.dumps(error.model_dump(mode="json"), ensure_ascii=False).lower()
        for forbidden in ("stack", "system_prompt", "credential", "secret"):
            self.assertNotIn(forbidden, serialized)

    def test_api_context_success_and_error_envelopes_are_explicit(self) -> None:
        request = CreateTrainingTaskRequest.model_validate(_load_example("create-training-task-request"))
        self.assertEqual(request.actor_role, "training_admin")
        self.assertIsNotNone(request.trace_id)
        self.assertIsNotNone(request.requested_at)

        success = _load_example("create-training-task-response")
        failure = _load_example("error-response")
        self.assertIn("data", success)
        self.assertNotIn("error", success)
        self.assertIn("error", failure)
        self.assertNotIn("data", failure)

        success_schema = CreateTrainingTaskResponse.model_json_schema()
        error_schema = ErrorResponse.model_json_schema()
        self.assertIn("data", success_schema["required"])
        self.assertNotIn("error", success_schema["properties"])
        self.assertIn("error", error_schema["required"])
        self.assertNotIn("data", error_schema["properties"])

    def test_agent_state_round_trip_and_version_recognition(self) -> None:
        response_model = EXAMPLE_MODELS["agent-state"].model_validate(_load_example("agent-state"))
        state = response_model.data
        self.assertEqual(state.state_version, AGENT_STATE_VERSION)
        self.assertEqual(state.checkpoint_sequence, 6)
        self.assertIn("request_approval", state.next_allowed_actions)

        restored = type(state).model_validate_json(state.model_dump_json())
        self.assertEqual(restored, state)

        unsupported = state.model_dump(mode="json")
        unsupported["state_version"] = "9.0.0"
        with self.assertRaises(ValidationError):
            type(state).model_validate(unsupported)

    def test_business_event_envelope_versions_and_idempotency_identity(self) -> None:
        required_fields = {
            "event_id",
            "event_type",
            "event_version",
            "occurred_at",
            "producer",
            "aggregate_type",
            "aggregate_id",
            "sequence",
            "trace_id",
            "correlation_id",
            "actor",
            "payload",
            "metadata",
        }
        raw = _load_example("agent-step-event")
        self.assertTrue(required_fields.issubset(raw))
        event = EventEnvelope.model_validate(raw)
        duplicate = EventEnvelope.model_validate(copy.deepcopy(raw))
        self.assertEqual(event.event_version, EVENT_SCHEMA_VERSION)
        self.assertEqual(event.deduplication_identity, duplicate.deduplication_identity)

        unsupported = copy.deepcopy(raw)
        unsupported["event_version"] = "9.0.0"
        with self.assertRaises(ValidationError):
            EventEnvelope.model_validate(unsupported)

    def test_contract_version_compatibility_and_explicit_unsupported_error(self) -> None:
        current = CreateTrainingTaskResponse.model_validate(_load_example("create-training-task-response"))
        previous = CreateTrainingTaskResponse.model_validate(
            _load_example("previous-compatible-training-task-response")
        )
        self.assertEqual(current.schema_version, CONTRACT_SCHEMA_VERSION)
        self.assertEqual(previous.schema_version, "2.0.0")

        unsupported = CreateTrainingTaskRequest.model_validate(
            _load_example("create-training-task-request")
        ).model_dump(mode="json")
        unsupported["schema_version"] = "9.0.0"
        with self.assertRaises(ValidationError):
            CreateTrainingTaskRequest.model_validate(unsupported)

        error = ErrorResponse.model_validate(_load_example("unsupported-contract-version-error"))
        self.assertEqual(error.error.code, ErrorCode.UNSUPPORTED_CONTRACT_VERSION)
        self.assertFalse(error.error.retryable)

    def test_dify_style_output_uses_authoritative_model(self) -> None:
        output = DifyPlanAgentOutput.model_validate(_load_example("dify-plan-agent-output"))
        self.assertTrue(output.human_review_required)
        self.assertEqual(output.risk_level, "high")

    def test_generated_artifacts_have_no_drift(self) -> None:
        for path, expected in generate_outputs().items():
            with self.subTest(path=path.relative_to(REPO_ROOT)):
                self.assertTrue(path.exists())
                self.assertEqual(path.read_text(encoding="utf-8"), expected)

    def test_web_and_android_share_generated_types_package(self) -> None:
        for package in ("apps/web/package.json", "apps/mobile/package.json"):
            data = json.loads((REPO_ROOT / package).read_text(encoding="utf-8"))
            self.assertEqual(data["dependencies"]["@tegang/types"], "workspace:*")
        index = (REPO_ROOT / "packages/types/src/index.ts").read_text(encoding="utf-8")
        self.assertIn('export * from "./contracts.generated";', index)
        self.assertNotIn("TrainingStatus", index)
        self.assertNotIn("export type TrainingStatus", index)
        generated = (REPO_ROOT / "packages/types/src/contracts.generated.ts").read_text(encoding="utf-8")
        self.assertIn("export type ContractTrainingTask", generated)
        self.assertIn("export type ContractTrainingTaskView", generated)
        self.assertIn("export type ContractAssessmentResultView", generated)
        self.assertIn("export type ContractRealtimeEvent", generated)
        self.assertIn("export type ContractApiRequestContext", generated)
        self.assertIn("export type ContractEventEnvelope", generated)
        self.assertIn("export type ContractAgentState", generated)

        event_schema = json.loads(
            (REPO_ROOT / "docs/contracts/schemas/event-envelope.schema.json").read_text(encoding="utf-8")
        )
        for field in event_schema["required"]:
            self.assertIn(f"  {field}:", generated)

    def test_mobile_mock_uses_authoritative_error_codes(self) -> None:
        contracts = (REPO_ROOT / "apps/mobile/src/services/contracts.ts").read_text(encoding="utf-8")
        services = (REPO_ROOT / "apps/mobile/src/services/mock-services.ts").read_text(encoding="utf-8")
        self.assertIn("MobileServiceErrorCode = ContractErrorCode", contracts)
        for retired in (
            '"NETWORK_ERROR"',
            '"FORBIDDEN"',
            '"NOT_FOUND"',
            '"VALIDATION_ERROR"',
            '"CONTENT_UNAVAILABLE"',
            '"DUPLICATE_SUBMISSION"',
        ):
            self.assertNotIn(retired, services)

    def test_manifest_keeps_database_schema_out_of_scope(self) -> None:
        manifest = json.loads((REPO_ROOT / "docs/contracts/manifest.json").read_text(encoding="utf-8"))
        self.assertFalse(manifest["database_schema_in_scope"])
        self.assertEqual(manifest["schema_version"], "2.1.0")
        self.assertEqual(manifest["agent_state_version"], "1.0.0")
        self.assertEqual(manifest["event_version"], "1.0.0")
        self.assertEqual(manifest["supported_schema_versions"], ["2.0.0", "2.1.0"])


if __name__ == "__main__":
    unittest.main()
