# Runtime Hardening — Enterprise Productionization

## Purpose

The runtime hardening domain (`src/lib/runtime-hardening/`) provides a unified, deterministic layer for validating the integrity, readiness, and survivability of PMFreak's enterprise runtime before and during operation. It does not execute TypeScript modules at check time — all checks are file-existence and content-pattern based, making them safe to run in CI, during startup, and in test suites without side effects.

## Philosophy

1. **Static over dynamic**: All invariant checks, startup assertions, and SLO evaluations use `existsSync`/`readFileSync` — never `import()` or `require()` of live modules.
2. **Evidence over assertion**: Every check result carries `evidence[]`, `uncertainty[]`, `governanceBoundaries[]`, and `confidence` fields. No check returns a bare boolean.
3. **Recommendation-only recovery**: The recovery module (`runtime-recovery.ts`) returns human-readable recommendations only. `isAutomated: false` is explicit. No `execSync`, `spawnSync`, or `writeFileSync` is permitted.
4. **Governance boundaries are first-class**: Every result type carries `governanceBoundaries` so callers can trace which governance domain a check belongs to.

## Startup Assertions

`startup-assertions.ts` defines 19 file-existence checks that run at startup time. These cover:

- **Governance**: `package.json` validity (critical severity)
- **Subsystem validation scripts**: All `scripts/check-*.mjs` for each registered subsystem
- **Runtime artifacts**: connector runtime folder, runtime-consumer folder
- **Test coverage**: upload, governance, runtime-contracts, and runtime-consumer-boundary tests

Critical-severity assertions that fail will populate `criticalFailures` in the summary and trigger `launch_blocked` status in degraded mode.

## Invariant Enforcement

`runtime-invariants.ts` defines 10 structural invariants enforced continuously:

| Invariant | Severity | What it checks |
|---|---|---|
| `tenant_isolation_represented` | critical | connector-governance.ts references workspace/tenant |
| `workspace_isolation_represented` | critical | runtime-authorization.ts references workspace |
| `governance_boundary_represented` | critical | governance-core.ts exists in enterprise runtime |
| `runtime_authorization_centralized` | critical | authority-port.ts + runtime-authorization.ts both present |
| `no_direct_provider_in_api_routes` | critical | API routes do not directly import adapters |
| `package_json_valid` | critical | package.json parses as valid JSON |
| `replay_integrity_represented` | high | connector-replay.ts exists |
| `source_lineage_represented` | high | operational-source-lineage.ts exists |
| `deterministic_validation_scripts_exist` | high | check-governance-typing.mjs + check-runtime-contracts.mjs present |
| `connector_federation_preserves_lineage` | high | signal-federation.ts references lineage/source |

## Anti-Corruption Layer

`anti-corruption-layer.ts` provides six pure functions for sanitizing runtime signals before they enter the hardening pipeline:

- `sanitizeRuntimeEvidence(raw)` — filters and truncates evidence arrays
- `normalizeRuntimeConfidence(raw)` — clamps confidence to [0, 1]
- `validateRuntimeBoundaryIds(input)` — validates tenantId and workspaceId as non-empty strings
- `rejectMalformedRuntimeSignal(signal)` — requires `subsystem`, `checkedAt`, and `evidence[]`
- `enforceBoundedUncertainty(raw)` — normalizes uncertainty arrays, max 20 entries
- `buildAntiCorruptionResult(...)` — composes all checks into an `AntiCorruptionResult`

No external I/O is performed. All functions are pure and synchronous.

## Replay Integrity

`replay-integrity.ts` checks four aspects of replay correctness:

1. `connector_replay_exists` — `connector-replay.ts` file presence
2. `connector_replay_exposes_integrity` — file contains `integrity|evidence|uncertainty|confidence` keywords
3. `trust_governance_replay_tests` — trust/governance replay-relevant tests exist
4. `replay_checks_expose_uncertainty` — replay module exposes `uncertainty|evidence` fields

**Known risk**: Durable replay storage at production scale is not validated by static checks. This is acknowledged in `uncertainty[]` on all replay results.

## Synchronization Integrity

`synchronization-integrity.ts` checks four aspects:

1. `connector_synchronization_exists` — `connector-synchronization.ts` presence
2. `connector_heartbeat_exists` — `connector-heartbeat.ts` presence
3. `connector_synchronization_has_state` — synchronization module references `status|state|synchronized|sync`
4. `connector_resilience_exists` — `connector-resilience.ts` presence

**Known risk**: Real-time sync state is not validated. Static checks confirm structural presence only.

## Degraded Mode Classification

`degraded-mode.ts` aggregates startup assertion failures, invariant violations, replay/sync gaps, and boundary checks into a `DegradedModeStatus`:

| Status | Trigger |
|---|---|
| `healthy` | No failures, no warnings |
| `degraded` | Non-critical warnings exist |
| `unstable` | Intermediate failure state |
| `recovery_required` | Score below 60 |
| `launch_blocked` | Critical failures or missing boundaries |

## Runtime SLOs

`runtime-slo.ts` defines 8 file-existence SLOs against which the runtime is continuously measured:

- `package_json_valid`
- `validation_scripts_present`
- `replay_integrity_present`
- `synchronization_integrity_present`
- `governance_boundaries_present`
- `source_lineage_present`
- `connector_runtime_present`
- `build_test_contracts_present`

## Launch Gates

`runtime-launch-gates.ts` defines 9 launch gates with severity levels. Critical and high-severity gates that fail produce blockers; medium and low produce warnings. Gates cover: package integrity, test contracts, governance boundaries, replay, sync, connector runtime, authorization consumer, upload pipeline, and billing.

## Governance and Isolation Controls

`runtime-governance.ts` validates:
- `governance-core.ts` exists and contains boundary language (`workspaceId|tenantId|allowed|deny`)
- `authority-port.ts` exists
- `runtime-contracts.ts` exists

`runtime-isolation.ts` validates:
- Tenant isolation language in connector governance
- Workspace isolation in runtime authorization consumer
- Runtime-consumer sovereignty boundary (index.ts present)
- Runtime-consumer boundary test present

## Remaining Risks

1. **Durable replay storage**: Connector replay integrity is validated by file presence only. At production scale, durable replay logs, idempotency guarantees, and replay ordering need independent infrastructure validation.
2. **Live runtime state**: All checks are static. A module that exists but throws at runtime will pass all hardening checks.
3. **Symbol presence vs. semantics**: Cognition contract checks confirm that required symbols appear in source text, not that they are correctly exported or typed.
4. **War room governance**: `war_room_ui` governance boundary is checked only for feature folder existence; runtime RBAC enforcement is not statically verifiable.
5. **Billing module**: Billing readiness checks only for `src/lib/billing.ts` existence; billing runtime correctness is not in scope of this domain.
