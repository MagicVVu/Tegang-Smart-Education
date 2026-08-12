# Contract changelog

All notable changes to the cross-module contract are recorded here. Versions follow semantic versioning.

## 2.2.0 - 2026-08-10

- Added `OrganizationId`, `PositionId`, `SessionId`, and `AuditId` prefixes while preserving all existing ID meanings.
- Added Organization and Position plus optional organization/position links on the existing Department and EmployeeProfile contracts.
- Added login, refresh, logout, `/auth/me`, demo identity, fresh Principal, and scoped employee identity contracts.
- Added a Web-only HttpOnly refresh-cookie projection and an optional Android refresh-token field returned only to the employee mobile client for immediate secure storage.
- Regenerated JSON Schema, examples, manifest, and shared TypeScript; `2.0.0` and `2.1.0` remain supported.
- Did not change event or Agent State versions and did not introduce a legacy adapter.

## 2.1.0 - 2026-08-10

- Added the common API request context and optional response metadata without making new fields mandatory for `2.0.0` callers.
- Added independently versioned Agent State checkpoint fields and kept the existing `id`/`task_id` C-03 names as the canonical run/task references.
- Added the immutable internal `EventEnvelope`, 16 past-tense business event names, minimal typed payloads, actor context, ordering, correlation, causation, and deduplication identity.
- Expanded realtime progress events with business/developer visibility, workflow status, user-action, safe error summary, and next-action fields.
- Added explicit unsupported-version and resource-not-found error codes while continuing to use the single `UnifiedError` object.
- Added generated approval, assessment, Agent-step, human-takeover, error, and previous-compatible examples plus contract tests for versions, round trips, envelope exclusivity, event identity, and TypeScript drift.
- Aligned Web/Android Mock response versions and Android Mock error codes with generated contracts.
- Did not add API routes, persistence, event transport, message queues, workflow nodes, or model integrations.

## 2.0.0 - 2026-08-04

- Performed the approved breaking cutover from prototype camelCase DTOs and readable IDs to generated formal contracts.
- Removed hand-written public domain types and compatibility aliases from `@tegang/types`.
- Migrated Web, Android, shared rules, utilities, Mock data, routes, and tests to `snake_case` and `<prefix>_<ULID>` IDs.
- Split the former mixed training status into formal TB task, LR learning, AP approval, and AR Agent-run states.
- Added formal cross-client read contracts for plan detail, employee task view, course content, tutor, assessment detail, remediation, notifications, and reports.
- Added assessment-question, decision, answer, notification, and operation ID prefixes.
- Explicitly removed the adapter/conversion-layer plan; legacy payloads are rejected.

## 1.0.0 - 2026-08-04

- Froze the Pydantic v2 authoritative model layer for identity, organization, training, knowledge, approval, assessment, remediation/retest, Agent execution, events, and errors.
- Established `<prefix>_<ULID>` external IDs plus distinct trace, request, checkpoint, and idempotency identifiers.
- Aligned training, Agent, learning, approval, connector, and risk enums with the latest documented state/risk definitions.
- Added deterministic JSON Schema, manifest, TypeScript, and validated example generation.
- Recorded the pre-cutover compatibility issue that was resolved by version `2.0.0`.
- Added contract validation and drift tests.
- Explicitly excluded database schema, migrations, API routes, model testing, and real enterprise validation.
