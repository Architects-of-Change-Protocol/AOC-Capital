# Dashboard Approval Mutation Runtime (Track 8.20)

## Purpose
This runtime introduces the first controlled mutation boundary for dashboard approval decisions. It records explicit actor decisions and deterministically updates lifecycle state.

## Mutation Boundary
`runDashboardApprovalMutationRuntime()` accepts:
- explicit mutation input (request id, envelope id, decision, actor)
- explicit context (approval request, lifecycle, lifecycle store)

It does not resolve implicit actors, launch jobs, or call connectors.

## Supported Decisions
- `approve`
- `reject`
- `request_changes`
- `defer` (mapped to `request_changes` with deferred comment semantics)

## Authorization Dependency
Authorization is delegated to Track 8.17 role-aware authorization logic and evaluates capability, required approver lanes, and sensitive item access.

## Lifecycle Update Semantics
- approve + executable gate => `ready_for_execution`
- reject => `rejected`
- request_changes / defer => `changes_requested`

## Audit Event Emission
Each accepted mutation emits a deterministic lifecycle event with actor id, decision, approval status, and lifecycle status metadata.

## Store Persistence Behavior
Only the provided `DashboardTaskLifecycleStore` is used:
- `saveLifecycle(updatedLifecycle)`
- `saveEvent(event)`

No separate approval-request persistence is introduced.

## API Route Safety Boundary
`POST /api/dashboard/approvals/decision` validates request payload shape and returns deterministic responses. It currently returns `501` because store/auth wiring is intentionally deferred until safe context wiring exists.

## Why No Connector Execution Happens Here
This runtime is purely governance mutation infrastructure. It deliberately does not execute live connectors, create tasks, or trigger adapter calls.

## Integration with Tracks 8.13–8.19
- 8.13: uses approval decision/state machine primitives
- 8.14: merges into lifecycle and emits lifecycle events
- 8.16: aligns with queue-driven decision model
- 8.17: enforces role-aware authorization
- 8.18: persists through lifecycle store interface
- 8.19: preserves boundary from real connector execution

## Future Path
- Track 8.21: Authorization Middleware / API Enforcement
- Track 8.22: Distributed Runtime Recovery Coordination
- Track 8.23: Production Connector Secrets + OAuth
- Track 8.24: Approval Mutation UI Controls
