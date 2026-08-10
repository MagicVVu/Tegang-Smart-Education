# Cross-module interface ownership and status

This matrix records ownership and implementation status only. Field definitions remain authoritative in `backend/app/schemas`; no route, broker, database, workflow, RAG, Skill, or model-provider implementation is implied.

| Caller | Provider | Purpose | Input contract | Output contract | Error contract | Mode | Status | Authority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Web | Business API | Administration, approval, report, and run views | `ApiRequestContext` plus domain input | `ApiEnvelope` plus typed `data` | `ErrorResponse` / `UnifiedError` | Sync + progress subscription | Existing Mock; formal service planned | `common.py`, `api.py`, `experience.py` |
| Android | Business API | Employee learning, tutoring, assessment, remediation, and records | `ApiRequestContext` plus domain input | `ApiEnvelope` plus typed `data` | `ErrorResponse` / `UnifiedError` | Sync + progress subscription | Existing Mock; formal service planned | `common.py`, `api.py`, `experience.py` |
| Business API | Agent orchestration | Start or inspect a controlled Agent run | Domain references plus `ApiRequestContext` | `AgentState`, run/step summaries, references | `UnifiedError` | Async boundary | Contract defined; implementation after G3 | `api.py`, `agent.py` |
| Agent orchestration | RAG | Authorized retrieval and citation verification | Task/knowledge scope and reference-only context | Knowledge citation references and safe summary | `UnifiedError` | Sync logical call | Planned implementation | `knowledge.py`, chapter 14 rules |
| Agent orchestration | Skill Adapter | Execute a whitelisted governed capability | Actor, scope, risk, approval, idempotency, typed payload | Typed result, status, audit reference | `UnifiedError` | Sync/async by Skill | Planned implementation | chapter 14 protocol; domain schemas |
| Agent orchestration | Model Provider | Controlled structured generation | Minimal task context and output schema | Schema-validated candidate output | `UnifiedError` | Sync logical call | Planned after model access is confirmed | `api.py` structured outputs |
| Agent orchestration | Checkpoint/state storage | Save and restore resumable runtime context | `AgentState` | Version-checked `AgentState` | `UnifiedError` | Sync logical call | State contract defined; storage after G3 | `agent.py` |
| Business API | Approval capability | Submit and read approval decisions | `SubmitApprovalRequest` and approval references | `ApprovalResultResponse` | `UnifiedError` | Async business process | Contract defined; Web Mock exists | `approval.py`, `api.py` |
| Business API | Assessment capability | Create/read/submit assessment and intervention data | Existing assessment domain contracts | Assessment/remediation/retest responses | `UnifiedError` | Sync + async review | Contract defined; Web/Android Mock exists | `assessment.py`, `api.py`, `experience.py` |
| Background task | Event consumer | React to immutable business facts | `EventEnvelope` | Consumer-specific result, not a new domain contract | `UnifiedError` | Async | Contract defined; transport after G3 | `events.py` |
| Progress publisher | Web/Android | Show safe Agent progress and required user action | `RealtimeEvent` | Client presentation state | `UnifiedError` or safe `error_summary` | Realtime | Contract defined; current Mock only | `agent.py` |
| evals | Agent/RAG public evaluation boundary | Replay stable contract samples | Same public input schemas | Same structured output schemas | `UnifiedError` | Offline | Planned implementation | `backend/app/schemas`, `docs/contracts/examples` |
| tests | Contracts and module public boundaries | Detect field, version, and example drift | Generated examples and schemas | Deterministic assertions | Test failures | Offline | Defined and executable | `backend/tests/contracts` |

Status vocabulary is restricted to: contract defined, existing Mock, planned implementation, implementation after G3, and pending confirmation. “Contract defined” never means a production endpoint or transport is online.
