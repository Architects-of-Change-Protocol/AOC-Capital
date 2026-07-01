# Service-Role Access Policy (Phase 4.5)

## Allowed use cases
- Stripe webhook billing synchronization and idempotency event writes.
- Workspace invitation/member lifecycle writes after governance checks.
- Security telemetry persistence.

## Forbidden use cases
- Any service-role client creation without explicit route/actor/reason/operation context.
- Any user-triggered billing/member mutation without governance permission checks.

## Required guard preconditions
- `routeId`, `operation`, `reason`, and either `actorUserId` or `systemActor` are mandatory.
- Workspace operations must include `workspaceId`.
- Governance checks (`requireGovernancePermission`) are required for member/billing routes.

## Required telemetry
- Every privileged client acquisition emits `privileged_client_used` (except telemetry recursion bypass).

## Webhook exceptions
- Stripe webhook paths use `systemActor: "stripe_webhook"` and explicit operation metadata.

## Background job exceptions
- Allowed only via explicit `systemActor: "background_job"` context.

## Incident notes & review process
- Review new privileged access by validating explicit context, governance pre-check, and emitted telemetry event.
