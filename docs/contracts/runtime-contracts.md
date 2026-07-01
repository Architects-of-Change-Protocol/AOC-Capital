# Canonical Runtime Contracts

## Canonical ownership
Canonical runtime-facing semantic contracts are owned by `src/lib/aoc/contracts/`.
PMFreak runtime consumers must import from this module instead of defining local variants.

## Canonical contracts
- `decision.ts`: `CanonicalRuntimeDecision`.
- `authorization.ts`: `RuntimeAuthorizationRequest` + `toGovernanceEvaluationInput`.
- `lineage.ts`: `RuntimeLineage` + normalization helper.
- `metadata.ts`: `RuntimeMetadata`, `RuntimeScope`, authority source.
- `sdk-envelope.ts`: canonical SDK success/error envelope shapes.
- `errors.ts`: canonical fail-closed runtime error envelope.

## Legacy/deprecated
- Legacy compatibility fields remain in `src/lib/aoc/enterprise/authorization.ts` and should be treated as transitional.
- New fields (`authoritySource`, `governanceAction`, `lineage`, `policy`) are canonical.

## Runtime consumer expectations
- Consumers call `authorizeRuntimeAction` using requests built through canonical request contracts.
- Fail-closed semantics remain mandatory (`runtime_unavailable`, malformed decisions, policy violations).
- Audit lineage keys (`decisionId`, `runtimeDecisionId`, `traceId`) must follow canonical naming.

## Contract evolution rules
1. Additive-first changes.
2. Preserve compatibility aliases when feasible.
3. No route-local runtime decision interface definitions.
4. All changes must pass drift check and contract conformance tests.
