# RLS Gap Inventory (Phase 4.3)

Honest snapshot as of 2026-05-12.

## projects
- **DB-enforced**: Yes (workspace_memberships-chain RLS for CRUD).
- **Route-enforced**: Yes (`requireProjectPermission` + membership checks).
- **Service-role dependency**: Moderate in admin/background flows.
- **Cross-tenant risk**: Low for client JWT path, medium for service-role misuse.

## workspace_memberships
- **DB-enforced**: Partial (table exists and used in policies; direct policy review still needed in follow-up migration audit).
- **Route-enforced**: Yes.
- **Cross-tenant risk**: Medium until explicit least-privilege policies are fully enumerated and tested.

## operational_memory_entries
- **DB-enforced**: Yes (project/workspace chain policy).
- **Route-enforced**: Yes.
- **Cross-tenant risk**: Low/medium (depends on service-role reads).

## project_memories
- **DB-enforced**: Yes (project/workspace chain policy).
- **Route-enforced**: Yes.
- **Cross-tenant risk**: Low/medium (service-role path still privileged).

## onboarding_analyses
- **DB-enforced**: Company-id based RLS (legacy tenant primitive).
- **Route-enforced**: Partial; onboarding endpoints still consume company metadata.
- **Risk**: Medium; not fully workspace-native.

## security_events
- **DB-enforced**: Yes for read; client writes revoked; service-role writes only.
- **Route-enforced**: N/A for writes (centralized server telemetry).
- **Risk**: Medium due to central service-role writer concentration.

## governance_audit_events
- **DB-enforced**: Company-id based.
- **Route-enforced**: Partial.
- **Risk**: Medium (legacy tenant model + incomplete workspace normalization).
