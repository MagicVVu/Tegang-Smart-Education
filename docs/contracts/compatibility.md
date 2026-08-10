# Compatibility and evolution policy

Current contract package/schema version: `2.1.0`.

Supported API schema versions: `2.0.0`, `2.1.0`.

Current business-event version: `1.0.0`. Current Agent State version: `1.0.0`.

## Direct formal cutover

Version `2.0.0` was the intentional breaking cutover. Version `2.1.0` is an additive compatible release. Web, Android, shared rules, shared utilities, Mock data, and tests consume the generated formal contracts directly. The repository does not provide a legacy adapter, conversion layer, camelCase alias, readable demo-ID mapping, or dual-write period.

Legacy pre-C-03 payloads and IDs remain rejected at the formal boundary. Valid `2.0.0` payloads continue to parse under `2.1.0`; this is direct schema compatibility, not conversion. Historical data from outside this repository may only be handled by a separately authorized migration task that writes already-valid formal objects.

## Version fields

- Contract package version: semantic release version for the complete generated contract set.
- `schema_version`: API/entity payload schema version.
- `event_version`: one business or realtime event payload version.
- `entity_version`: optimistic revision of a mutable business object.
- `state_version`: serialized Agent State/checkpoint format version.

One field must never substitute for another. An unsupported API, event, or state version is rejected explicitly; fields are not silently discarded to claim compatibility.

## Compatibility matrix

| Change | Compatible | Required action | Test | Version action |
| --- | --- | --- | --- | --- |
| Add optional field | Usually yes | Document default/omission meaning | Current and previous compatible examples | Minor |
| Add required field | No | Obtain major-version approval and migration plan | Old payload rejection plus migration tests | Major |
| Rename/delete field | No | Deprecate first; no silent alias | Old/new consumer matrix | Major |
| Change type/unit/meaning | No | New field or approved major migration | Boundary and semantic tests | Major |
| Add enum value | Conditional | Verify every consumer handles unknown safely | Web/Android/Agent fallback test | Minor only after verification |
| Remove enum value | No | Deprecate and migrate references | Historical payload tests | Major |
| Change event payload | Additive only within event version | Keep old consumers on old `event_version` | Producer/consumer version tests | Event minor or major as applicable |
| Change Agent State | Additive only when old checkpoints restore | Define supported `state_version` and restore test | Serialize/restore old checkpoint | State minor or major as applicable |
| Add error code | Conditional | Unknown code must map to safe generic failure | Client fallback test | Minor only after verification |

Renaming/removing a field, changing a field type or unit, making an optional field required, changing an ID prefix, narrowing accepted values, or changing state meaning requires a major `schema_version` increment. Major-version changes that alter business flow, permission scope, approval policy, or C-03 ID meaning require project-owner confirmation before implementation.

## Event and Agent State evolution

Business events are immutable. Consumers use `event_id` as the idempotency identity and may also use the optional business `deduplication_key`; a repeated ID must represent the same event meaning. Old consumers remain on supported old event versions, new consumers reject unsupported versions with `UNSUPPORTED_CONTRACT_VERSION`, and neither path drops required fields silently.

Agent State upgrades must preserve run/task/checkpoint identity, trace, version, status, approval references, retry/rollback/manual-takeover distinctions, and the last known safe checkpoint. No production checkpoints currently exist; `1.0.0` is the initial formal state version.

## Deprecation

Future deprecated fields must have a documented replacement and removal version. Silent aliases remain forbidden. Any compatibility window is forward-looking and does not restore the removed pre-C-03 surface.

## Database boundary

C-03 and 3.15 do not freeze database tables, primary keys, indexes, migrations, retention, or encryption. A later persistence design may use internal keys, but it must enforce uniqueness/immutability of the external ID, optimistic concurrency with `entity_version`, and an auditable mapping from internal to external identifiers.
