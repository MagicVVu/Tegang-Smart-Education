# Contract changelog

All notable changes to the cross-module contract are recorded here. Versions follow semantic versioning.

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
