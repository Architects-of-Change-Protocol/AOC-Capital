# Dashboard Approval Workflow Runtime (Track 8.13)

## Purpose
Track 8.13 adds a deterministic approval gate between manual task push envelopes (Track 8.12) and any future execution lifecycle. It produces auditable approval requests, decision-aware status transitions, and execution gating without performing external writes.

## Approval boundary
The runtime accepts manual push envelopes and optional action metadata, then determines whether each envelope is executable or blocked by approval workflow status.

## Policy model
`DashboardApprovalPolicy` controls approval triggers for critical actions, external adapters, financial actions, escalation-required actions, and ready mode. Dry-run paths can be auto-exempted.

## Risk model
Risk is deterministic:
- `critical`: critical priority or financial review action
- `high`: ready-mode external adapter or escalation-required action
- `medium`: ready-mode internal runtime
- `low`: dry-run or no-approval paths

## Approver lane routing
The routing engine maps workflow context to required approver lanes with deterministic deduplicated order.

## Request lifecycle
Requests are generated per envelope (`approval:{envelope.id}`), with `pending` or `not_required` initial status and expiry timestamp for pending requests.

## Decision application
Decisions are matched by request ID. Latest `decidedAt` wins. The decision engine transitions status to `approved`, `rejected`, or `changes_requested` unless the request is not required or expired.

## Execution gating
Execution is allowed only when status is `approved` or `not_required`. Other states are blocked with explicit reasons.

## Report contract
The workflow report includes counts, request list, decision list, executable and blocked envelope IDs, warnings, and executive summary.

## Why no auto approval
No automatic approval is allowed in this track to keep governance deterministic and auditable.

## Why no external execution yet
Track 8.13 is a pre-execution governance layer only. It does not call APIs or execute adapters.

## Integration with Track 8.12
The runtime consumes `DashboardManualPushEnvelope` and optional `DashboardAction` context to gate manual push envelopes before future execution steps.

## Future path
- **Track 8.14**: Task Lifecycle Persistence
- **Track 8.15**: Live Adapter Connectors
- **Track 8.16**: Approval UI Queue
- **Track 8.17**: Role-aware authorization
