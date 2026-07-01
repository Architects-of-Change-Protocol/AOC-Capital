# Canonical Envelope Adoption Audit

## Critical
- `src/lib/security/deny-response.ts`: central denial helper returned `{ error }` only, causing inconsistent governance/runtime errors. **Recommendation:** emit `RuntimeErrorEnvelope` + compatibility `error` alias. **Compatibility:** preserved via alias. **Difficulty:** Low.
- `src/app/api/sdk/**` routes: mixed `{ok:true,...}` and `{error:...}` shapes with top-level `decisionId`. **Recommendation:** return `SdkEnvelope<T>` with `data`, `lineage`, `runtime`. **Compatibility:** keep transitional top-level aliases where needed. **Difficulty:** Medium.

## High
- AI/operational routes (`src/app/api/operational-memory/route.ts`, `src/app/api/intelligence/coordination/route.ts`, `src/app/api/change-detection/route.ts`, `src/app/api/executive-synthesis/route.ts`) use ad hoc payloads and metadata fields. **Recommendation:** normalize success envelope and runtime metadata attachment while retaining domain payload in `data`. **Compatibility:** keep existing keys in transition. **Difficulty:** Medium.
- Governance delegation issue route (`src/app/api/governance/delegations/issue/route.ts`) lacks canonical runtime metadata and consistent envelope. **Recommendation:** canonical success envelope with lineage + runtime metadata. **Difficulty:** Low.

## Medium
- Several governance approval/trust routes still return simple `{error}` strings or status-specific messages. **Recommendation:** incrementally migrate onto `denyResponse`/canonical runtime errors and sdk envelope helpers. **Compatibility:** preserve existing user-facing `error` text alias. **Difficulty:** Medium.

## Low
- Some non-governance validation errors (input formatting) remain plain `{error}` intentionally for UX simplicity. **Recommendation:** keep as-is unless route becomes governance-sensitive.
