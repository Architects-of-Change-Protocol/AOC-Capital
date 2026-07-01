# Dashboard Approval Queue UI Runtime (Track 8.16)

## Purpose
Track 8.16 introduces a deterministic presentation runtime that converts approval workflow and lifecycle records into dashboard-consumable approval queue report models.

## UI Runtime Boundary
This runtime is read-only. It does not mutate approvals, execute decisions, write persistence, call live connectors, or enforce role authorization.

## Card State Model
Cards normalize lifecycle and approval statuses into UI states:
- `action_required`
- `blocked`
- `approved`
- `rejected`
- `expired`
- `completed`
- `retry_attention`

## Severity Model
Queue urgency is deterministic with severity levels: `critical`, `high`, `medium`, `low`.
Critical captures critical approval risk and failed execution with retries. High captures pending/blocked execution. Medium captures approved-not-executed. Low captures completed/simulated records.

## Decision History Model
Decision history maps directly from approval decisions and is ordered newest-first for timeline-style rendering.

## Action Affordance Derivation
Action availability is derived from approval status and lifecycle execution state, allowing the dashboard to show enablement/disablement and reasons without invoking mutating behavior.

## Grouping Strategy
The runtime provides two deterministic groupings:
- Severity groups in fixed order: critical, high, medium, low.
- Approver lane groups in fixed order: pmo_director, executive_sponsor, finance_lead, technical_lead, project_manager, security_owner, system_owner.
Empty groups are omitted.

## Summary Model
The runtime creates a dashboard summary with item counts and an executive summary sentence that prioritizes:
1) approval action required,
2) retry attention,
3) blocked,
4) all completed,
5) no attention needed.

## Why No Mutation
Track 8.16 exists to provide a deterministic UI runtime only. Keeping mutation out preserves auditability and prevents coupling to execution or role authorization behavior.

## Integration with Tracks 8.13–8.15
Track 8.16 consumes artifacts from:
- 8.13 Approval Workflow Runtime (`approval requests`, `decisions`, risk/approver metadata)
- 8.14 Task Lifecycle Runtime (`lifecycle status`, retries, execution outcome)
- 8.15 Live Adapter Connector Runtime outputs (execution outcomes already represented in lifecycle)

## Future Role Authorization Integration
Track 8.16 is intentionally role-agnostic so Track 8.17 can introduce role-aware authorization as a separate policy layer.

## Forward Path
- Track 8.17: Role-aware Authorization
- Track 8.18: Persistent Lifecycle Store
- Track 8.19: Real Adapter Connectors
- Track 8.20: Approval Decision Mutation API
