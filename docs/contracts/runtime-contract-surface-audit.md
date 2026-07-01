# Runtime Contract Surface Audit

## Scope
- Audited runtime-facing shapes across `src/lib/security`, `src/lib/aoc`, `src/app/api/sdk`, and `src/app/api/v1`.

## Findings

### Critical
1. Multiple runtime decision envelopes were defined or implied (`EnterpriseRuntimeDecision`, route-local deny payloads, access guard metadata).
2. Lineage fields had inconsistent ownership (`decisionId`, `runtimeDecisionId`, `trace*` keys used inconsistently).

### High
1. Authorization request contracts were ad hoc in different callers of `buildEnterpriseRuntimeRequest`.
2. SDK response and error envelopes lacked a single canonical type and drifted by route.

### Medium
1. Capability/delegation metadata lacked normalized contract ownership boundaries.
2. Runtime metadata fields were propagated as free-form `Record<string, unknown>`.

### Low
1. Documentation of canonical-vs-legacy contract ownership was fragmented.

## Canonicalization Opportunities
- Centralize all runtime-facing contracts under `src/lib/aoc/contracts/`.
- Make request conversion explicit through `toGovernanceEvaluationInput`.
- Normalize lineage to canonical `RuntimeLineage`.
- Add drift detection to block local redefinition of runtime decision/lineage interfaces.

## Migration Recommendations
1. Migrate all runtime consumers to import from `@/lib/aoc/contracts`.
2. Keep compatibility aliases in `authorization.ts` during phased migration.
3. Adopt canonical SDK envelopes in shared route helpers.
4. Add CI guard (`scripts/check-runtime-contract-drift.mjs`) and contract tests.

## Compatibility Concerns
- Existing response payloads and downstream expectations may still rely on legacy fields (`decisionSource`, `decision`, etc.).
- Migration should preserve legacy alias fields while routing new semantics through canonical fields.

## Governance + Audit Inconsistencies
- Decision lineage naming and metadata were previously mixed between runtime wrappers and route-local payloads.
- Canonical lineage now provides stable semantics for decision, trace, actor, and timestamps.
