# Dashboard Task Lifecycle Runtime (Track 8.14)

## Purpose
Persist deterministic task lifecycle state for dashboard-driven execution objects before live connector execution is enabled.

## Lifecycle persistence boundary
This runtime persists manual push envelopes, approval requests/decisions, lifecycle transitions, execution readiness gates, and audit events. It intentionally does **not** execute external tasks or call live adapters.

## Lifecycle status model
`created`, `approval_pending`, `approval_not_required`, `approved`, `rejected`, `changes_requested`, `expired`, `ready_for_execution`, `execution_blocked`, `execution_simulated`, `execution_failed`, `execution_completed`, `cancelled`.

## Event model
Events capture lifecycle transitions and milestones (e.g., `envelope_created`, `approval_requested`, `execution_ready`) with timestamped metadata and actor context.

## Store interface
`DashboardTaskLifecycleStore` provides lifecycle/event save/get/list APIs and is designed for deterministic runtime usage and easy substitution by future Supabase/Vault implementations.

## In-memory store
`createInMemoryDashboardTaskLifecycleStore()` stores lifecycle and event records by id, supports envelope lookup, and returns deterministic sorted lists.

## Approval reconciliation
Approval status is merged into lifecycle records from Track 8.13 artifacts and translated into lifecycle statuses/transitions.

## Execution readiness reconciliation
Readiness and blocked gates are derived from approval workflow executable/blocked envelope projections and dry-run mode semantics.

## Audit trail model
Transitions produce immutable audit events with `fromStatus` and `toStatus` metadata for traceability.

## Retry lineage placeholder
Lifecycle records include `retryOfLifecycleId` and `retryCount` to support future retry-chain persistence and reporting.

## Why no external execution yet
Track 8.14 is persistence-only. External task execution is intentionally deferred to Track 8.15.

## Integration with Track 8.12 and 8.13
Inputs are `DashboardManualPushReport` (Track 8.12) and optional `DashboardApprovalWorkflowReport` (Track 8.13), enabling deterministic, non-mutating lifecycle persistence.

## Future path
- **Track 8.15:** Live Adapter Connectors
- **Track 8.16:** Approval UI Queue
- **Track 8.17:** Role-aware Authorization
- **Track 8.18:** Task Lifecycle Supabase/Vault Store
