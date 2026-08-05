# Compatibility and evolution policy

Current contract version: `2.0.0`.

## Direct formal cutover

Version `2.0.0` is an intentional breaking cutover. Web, Android, shared rules, shared utilities, Mock data, routes, and tests consume the generated formal contracts directly. The repository does not provide a legacy adapter, conversion layer, camelCase alias, readable demo-ID mapping, or dual-write period.

Legacy payloads and IDs are rejected at the formal boundary. Historical data from outside this repository may only be handled by a separately authorized migration task that writes already-valid `2.0.0` objects; it must not add legacy acceptance to runtime contracts.

## Allowed compatible changes

- Add an optional field with a documented default or omission meaning.
- Add a new schema/model without changing existing payload interpretation.
- Broaden descriptions or examples without changing validation behavior.
- Add a new event type or enum value only after consumers are verified to degrade unknown values to a neutral “updating/unsupported” state rather than success.

## Breaking changes

Renaming/removing a field, changing a field type or unit, making an optional field required, changing an ID prefix, narrowing accepted values, or changing state meaning requires a major `schema_version` increment. Enum additions are treated as potentially breaking until Web, Android, Agent, and connector fallbacks are verified.

## Deprecation after 2.0.0

Future deprecated fields must have a documented replacement and removal version. Silent aliases remain forbidden. Any compatibility window is forward-looking and does not restore the removed pre-C-03 prototype surface.

## Database boundary

C-03 does not freeze database tables, primary keys, indexes, migrations, retention, or encryption. A later persistence design may use internal keys, but it must enforce uniqueness/immutability of the external ID, optimistic concurrency with `entity_version`, and an auditable mapping from internal to external identifiers.
