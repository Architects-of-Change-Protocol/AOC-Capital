# Canonical Envelope Semantics

## Canonical
- Success envelopes for runtime-sensitive APIs should use `SdkEnvelope<T>` success form: `{ ok: true, data, lineage?, runtime?, audit? }`.
- Runtime/governance denials and fail-closed outcomes use `RuntimeErrorEnvelope` (`ok:false`, `code`, `message`, `failClosed:true`, optional `decisionId`, `metadata`).
- Canonical lineage fields are carried under `lineage`: `decisionId`, `runtimeDecisionId`, `traceId`, `requestId`.
- Runtime metadata is carried under `runtime`: `routeId`, `source`, `evaluatedAt`, optional `scope`.

## Transitional compatibility rules
- During migration, routes may include compatibility aliases (`error`, top-level `decisionId`, legacy keys) in addition to canonical envelope fields.
- Do not fabricate lineage values; omit lineage when unavailable.
- Validation-only UI errors can remain simple and non-canonical unless route is governance/runtime-sensitive.

## AI and operational route guidance
- Preserve existing UX payload semantics by nesting existing domain payload in `data` and adding `runtime`/`lineage` incrementally.
- Governance-sensitive AI denials should use canonical runtime errors with fail-closed semantics.

## Ownership
- Canonical contract source of truth: `src/lib/aoc/contracts/*`.
- Shared envelope helpers: `src/lib/aoc/contracts/envelope-helpers.ts`.
- `src/lib/security/deny-response.ts` is the central governance denial adapter and must remain fail-closed.
