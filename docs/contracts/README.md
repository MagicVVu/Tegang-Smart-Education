# Data contracts and ID system

This directory freezes the C-03 cross-module contract boundary for the special-steel training Agent. It defines exchange contracts, not database tables, ORM entities, migrations, FastAPI routes, or authorization implementation.

## Authority and generation chain

The only authoritative field definitions are the Pydantic v2 models in `backend/app/schemas`.

```text
Pydantic v2 models
  -> JSON Schema and manifest
  -> generated TypeScript declarations
  -> API / Agent State / realtime events / direct Mock data / contract tests
```

Do not manually edit `schemas/*.schema.json`, `examples/*.json`, `manifest.json`, or `packages/types/src/contracts.generated.ts`. Update the Pydantic source and regenerate.

## Layout

- `backend/app/schemas/common.py`: ID patterns, audit fields, time rules, risk levels, and chapter 15 state enums.
- `backend/app/schemas/identity.py`: user, role, department, and employee profile.
- `backend/app/schemas/training.py`: training goal, task, plan, course, and deterministic rule result.
- `backend/app/schemas/knowledge.py`: versioned knowledge citations.
- `backend/app/schemas/approval.py`: approval request record and decision result.
- `backend/app/schemas/assessment.py`: assessment session/result, knowledge-point performance, remediation, and retest.
- `backend/app/schemas/agent.py`: Agent Run, State, Step summary, and realtime events.
- `backend/app/schemas/errors.py`: unified safe error object.
- `backend/app/schemas/experience.py`: formal Web/Android read contracts and prototype-facing API projections.
- `backend/app/schemas/api.py`: request/response envelopes and controlled Agent structured output.
- `backend/scripts/export_contracts.py`: deterministic exporter and drift checker.
- `docs/contracts/schemas`: generated JSON Schema files plus the combined catalog.
- `docs/contracts/examples`: model-built, model-validated payload examples.
- `packages/types/src/contracts.generated.ts`: shared generated types exported by `@tegang/types` for Web and Android.
- `backend/tests/contracts`: contract and drift tests.

The machine-readable model/Python/Schema/TypeScript/example mapping is `manifest.json`.

## IDs

New external domain IDs use `<prefix>_<ULID>` with an uppercase 26-character Crockford Base32 ULID. IDs are immutable, globally unique, contain no business or personal information, and are allocated by the responsible service. Clients must not infer object type from anything except the documented prefix and must not fabricate IDs for persisted objects.

Domain prefixes are `usr`, `role`, `dept`, `emp`, `goal`, `task`, `plan`, `course`, `know`, `kp`, `question`, `approval`, `assessment`, `assessment_result`, `kperf`, `intervention`, `retest`, `run`, `step`, `decision`, `checkpoint`, `event`, `error`, `answer`, `notification`, and `operation`. Trace and request identifiers use `trc_<ULID>` and `req_<ULID>`. Idempotency keys use a separate caller-owned `idem_...` format and have different lifecycle semantics.

Database primary keys are out of scope and may differ from external IDs. A later storage design must enforce a unique, immutable external-ID column and maintain an explicit mapping if internal keys are used.

## Names, time, risk, confidence, and versions

- JSON field names are `snake_case`. Generated formal TypeScript contracts preserve those wire names.
- Datetimes must include a timezone, are normalized to UTC, and serialize as ISO 8601. Business-local interpretation must carry a separate IANA timezone in the owning workflow/configuration; naive datetimes are rejected.
- `confidence` is always in `[0, 1]`; percentages use explicit `_percent` names and `[0, 100]` bounds.
- `schema_version` is the contract semantic version. `entity_version` is an individual object's optimistic revision. They are not interchangeable.
- `risk_level` uses `read_only`, `low`, `medium`, and `high` from the document's risk grading.
- Empty lists mean “known to contain no entries”. Omitted optional fields mean “not supplied/not available”. Empty strings are rejected where a meaningful value is required.
- Metadata and errors must never expose secrets, credentials, system prompts, stack traces, or data outside the caller's authorized scope.

## Generate, validate, and detect drift

Use Python 3.11+ with Pydantic v2. The minimal dependency is recorded in `backend/requirements-contracts.txt`.

```powershell
python -m pip install -r backend/requirements-contracts.txt
python backend/scripts/export_contracts.py
python backend/scripts/export_contracts.py --check
python -m unittest discover -s backend/tests/contracts -p "test_*.py"
pnpm --filter @tegang/types typecheck
```

`--check` regenerates everything in memory and fails on missing, changed, or stale committed artifacts. The tests validate examples, ID prefixes, timezone handling, required fields, enum values, confidence bounds, Agent State, events, errors, Dify-style structured output, TypeScript drift, and shared Web/Android package consumption.

## Direct Web and Android consumption

The prototype has been migrated in place to contract version `2.0.0`. `packages/types/src/index.ts` exports only generated `Contract*` types. Web, Android, shared rules, Mock data, and tests use formal `snake_case` fields, `<prefix>_<ULID>` IDs, and separate TB/LR/AP/AR state domains directly.

No adapter or conversion layer accepts the retired camelCase/readable-ID surface. A payload using old fields, old IDs, or a mixed status domain is invalid rather than silently reinterpreted.

See `compatibility.md` for version rules and `CHANGELOG.md` for contract changes.
