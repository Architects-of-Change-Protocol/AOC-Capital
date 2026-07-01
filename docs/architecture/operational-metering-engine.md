# Operational Metering Engine

PMFreak's operational metering engine is a deterministic accounting runtime for operational intelligence workload, not a request counter.

## Philosophy
- Meter operational cognition and orchestration workload instead of provider tokens.
- Preserve provider independence and avoid pricing coupling.
- Produce replay-safe canonical events for audit and reconciliation readiness.

## Operational Credits
Credits represent governed operational capacity and support reservation, consumption, replenishment, depletion signaling, and future grants/enterprise overrides.

## Orchestration Intensity
Intensity (`low`..`critical`) multiplies category-weighted usage to reflect true operational complexity (e.g. synthesis, correlation, executive generation).

## Replay Safety & Reconciliation
Each event has deterministic identity and `replaySafeHash` for dedupe and replay protection. Reconciliation snapshots expose integrity signals without forcing full event sourcing.

## Immutable Transition Runtime
Public metering registration returns an immutable `nextState` and explicit `MeteringStateTransition` metadata (`fromStateHash`, `toStateHash`, transition reason, accounting deltas, and integrity signals). This keeps replay deterministic and audit-safe without requiring full event sourcing.

## Versioned Replay-Safe Identity
Event identity includes `MeteringVersionContext` (contract version, policy id/version, runtime version, capability snapshot hash, quota profile version, lifecycle context version). The same operation under a different policy/runtime context produces a distinct replay identity for reconciliation.

## Quota Profile Strategy
`OperationalQuotaProfile` is now a canonical runtime shape for hard/soft posture, burst allowances, sponsor-funded allowances, reserved capacity, and temporary expansions. This is preparation for enterprise-grade enforcement modes, not billing logic.

## Event Indexing & Cursor Strategy
Runtime state includes immutable event indexing and cursor metadata (`lastEventId`, replay hash index, sequence, category/correlation/window mappings, cursor position, latest event timestamp). This prepares reliable replay traversal and persistence-ready snapshots.

## Lifecycle-Aware Consumption Strategy
Consumption evaluation accepts optional lifecycle context and emits a neutral-by-default lifecycle modifier (base consumption → lifecycle modifier → final consumption). This enables future trial-stage adaptation without coupling to onboarding UX or payment systems.

## Reconciliation Hardening & Persistence Compatibility
Reconciliation snapshots now include transition counts, cursor position, latest transition id, quota posture, version-context presence, lifecycle-context presence, and immutable transition integrity checks. This supports future persistence adapters and replay diagnostics.

## Explicit Non-Goals (Not Billing Infrastructure)
This metering layer intentionally excludes Stripe/payment coupling, invoicing, pricing tables, and external billing orchestration. It remains provider-independent operational accounting infrastructure.

## Policy-Driven Accounting
Consumption is policy-based with category weights, intensity multipliers, capability multipliers, and future extension points for enterprise and sponsor controls.

## Lifecycle-Safe Accounting
Metering state integrates into trial lifecycle without tight coupling. Trial runtime can consume allowance signals and operational usage posture for activation/readiness decisions.

## Future Monetization & Enterprise Quotas
The model supports future quota windows, sponsor-funded credits, temporary expansions, and billing reconciliation workflows while remaining payment-processor agnostic.
