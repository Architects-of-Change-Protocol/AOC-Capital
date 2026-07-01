# Dashboard Live Adapter Connector Runtime (Track 8.15)

## Purpose
Provides the first controlled execution-capable runtime for dashboard task lifecycles that are explicitly ready for execution.

## Execution boundary
This runtime executes only through injected connector objects and never performs direct external API calls.

## Connector injection model
Connectors are passed in via `DashboardLiveConnectorRegistry` and validated per lifecycle adapter before invocation.

## Why credentials are not hardcoded
Credential material is intentionally excluded from this runtime; secret handling belongs to connector implementations and future infrastructure tracks.

## Why connector execution is lifecycle-gated
Only lifecycle records with `status=ready_for_execution` and envelopes with `executionStatus=ready` are eligible.

## Dry-run vs execute mode
- `dry_run`: connector simulation path, no external creation intent.
- `execute`: connector execution path through injected adapter implementations.

## Selection rules
Selection requires readiness state, ready envelope execution status, and payload presence. Optional lifecycle and adapter filters are supported.

## Payload validation
Execution payload requires `title`, `description`, and `adapter` fields; missing fields produce deterministic errors.

## Failure isolation
Lifecycle execution failures are isolated per record; one failure never stops processing of other selected records.

## Retry scheduling semantics
Retryable connector failures map to `retry_scheduled` execution result and increment lifecycle `retryCount` while setting lifecycle state to `execution_failed`.

## Lifecycle updates
Results are persisted to `DashboardTaskLifecycleStore`; external task IDs are stored when provided.

## Audit event generation
Each applied result emits one lifecycle event with deterministic ID built from `now + lifecycleId + result.status`.

## Report contract
The runtime returns deterministic aggregate counts, result/event lists, warnings, and executive summary text.

## Future path
- Track 8.16: Approval UI Queue
- Track 8.17: Role-aware Authorization
- Track 8.18: Task Lifecycle Supabase/Vault Store
- Track 8.19: Real Jira/Linear/Asana/Atenea Connectors
