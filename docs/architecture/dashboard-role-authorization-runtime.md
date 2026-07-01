# Dashboard Role Authorization Runtime (Track 8.17)

## Purpose
A pure, deterministic policy runtime that resolves role/lane/sensitivity authorization for dashboard approval queue and lifecycle artifacts.

## Authorization boundary
This runtime only computes decisions and effective UI availability. It does **not** mutate approvals, execute tasks, persist decisions, call connectors, or enforce API middleware.

## Actor model
Actors contain stable identity plus assigned `roles` and optional `lanes` to support role and lane-based authorization.

## Role/capability matrix
Capabilities are granted by role via a deterministic ordered matrix. Multi-role actors merge capabilities with deduplication in a fixed order.

## Sensitive item model
Sensitivity is inferred from approval queue card or lifecycle context:
- `financial`, `executive`, `security`, `system`, `client`, `none`.
- Inference uses text, approver lanes, adapter identity, and lifecycle status.

## Required lane model
Approval decisions (`approve`, `reject`, `request_changes`) require lane membership. Lane checks support direct lanes, role-to-lane matching, admin override, PMO director lane umbrella, and executive sponsor lane handling.

## Queue authorization model
Queue evaluation computes decisions for:
- view item/sensitive
- approve/reject/request changes
- override
- audit trail

Then maps decisions to effective UI availability while honoring existing card action disabled state and disabled reasons.

## Lifecycle authorization model
Lifecycle evaluation computes decisions for:
- view item/sensitive
- manual push trigger
- live execution trigger
- retry execution
- lifecycle cancel
- audit trail

## Effective availability model
Effective availability fields are deterministic booleans with `disabledReasons` populated from policy denials and underlying card action disabled state.

## Why no mutation/enforcement yet
Track 8.17 is a policy foundation to avoid coupling authorization with business mutations/execution. This keeps decision logic reusable and testable before mutation APIs and middleware are introduced.

## Integration with Tracks 8.13–8.16
Consumes the typed runtime contracts from:
- Track 8.13 approval workflow runtime
- Track 8.14 task lifecycle runtime
- Track 8.15 live adapter connector runtime
- Track 8.16 approval queue UI runtime

## Future enforcement path
- **Track 8.18:** Persistent Lifecycle Supabase/Vault Store
- **Track 8.19:** Real Adapter Connectors
- **Track 8.20:** Approval Decision Mutation API
- **Track 8.21:** Authorization Middleware / API Enforcement
