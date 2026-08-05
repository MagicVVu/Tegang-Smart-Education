# Feishu-to-code index

| Contract area | Authoritative/derived path |
| --- | --- |
| Pydantic v2 models | `backend/app/schemas` |
| ID and common field rules | `backend/app/schemas/common.py` |
| Web/Android formal read contracts | `backend/app/schemas/experience.py` |
| JSON Schema | `docs/contracts/schemas` |
| Machine-readable mapping | `docs/contracts/manifest.json` |
| TypeScript shared types | `packages/types/src/contracts.generated.ts` |
| Public TypeScript entry | `packages/types/src/index.ts` |
| Formal shared Mock data | `packages/mock-data/src/index.ts` |
| Request/response examples | `docs/contracts/examples` |
| Agent State and event contracts | `backend/app/schemas/agent.py` |
| Unified error contract | `backend/app/schemas/errors.py` |
| Generator and drift check | `backend/scripts/export_contracts.py` |
| Contract tests | `backend/tests/contracts/test_contracts.py` |
| Version and compatibility | `docs/contracts/VERSION`, `docs/contracts/compatibility.md`, `docs/contracts/CHANGELOG.md` |

This index mirrors chapter 19 of the Feishu document. Repository paths are the implementation references; the Feishu chapter explains the business rationale and governance boundary.
