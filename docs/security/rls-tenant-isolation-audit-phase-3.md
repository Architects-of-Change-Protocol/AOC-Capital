# Tenant Isolation Audit & Hardening (Prompt 3)

## Table-by-table security classification

| Table | Classification | Notes |
|---|---|---|
| workspaces | workspace/tenant-scoped | Canonical tenant root. |
| workspace_memberships | workspace/tenant-scoped | Authorization boundary (`owner/admin/pm/viewer`). |
| projects | workspace/tenant-scoped | Scoped by `workspace_id`. |
| onboarding_analyses | workspace/tenant-scoped | Scoped by `workspace_id`. |
| operational_memory_entries | workspace/tenant-scoped | Scoped by `workspace_id` and project chain. |
| operational_memory_records | workspace/tenant-scoped | Scoped by `workspace_id`. |
| project_memories | workspace/tenant-scoped | Scoped by `workspace_id`. |
| message_analyses | workspace/tenant-scoped | **Hardened in this PR** with `workspace_id` + RLS. |
| project_suggestions | workspace/tenant-scoped | **Hardened in this PR** with `workspace_id` + RLS. |
| security_events | telemetry/audit-log | Workspace-scoped read for owner/admin. |
| governance_audit_events | telemetry/audit-log | Workspace-scoped read/write by RLS. |
| workspace_audit_events | telemetry/audit-log | **Hardened in this PR** with workspace-member/owner-admin policies. |
| ai_agent_permissions | workspace/tenant-scoped | Scoped by workspace and role-aware writes. |
| governance_execution_grants | workspace/tenant-scoped | Workspace-scoped read, constrained writes. |
| governance_approval_requests | workspace/tenant-scoped | Workspace-scoped review lifecycle. |
| governance_delegations | workspace/tenant-scoped | Owner/admin + delegator/delegatee read. |
| capability_trust_domains | workspace/tenant-scoped | Workspace-admin read; server writes. |
| capability_signing_keys | workspace/tenant-scoped | Workspace-admin read; server writes. |
| capability_verifier_policies | workspace/tenant-scoped | Workspace-admin read; server writes. |
| capability_verifier_handshakes | workspace/tenant-scoped | Workspace-admin read; server writes. |
| capability_trust_events | telemetry/audit-log | Workspace read; server writes. |
| capability_revocation_registry | system/service-only | Client read denied, server writes only. |
| capability_trust_graph_edges | public/global safe | Intentionally global read graph metadata. |
| capability_trust_anchors | public/global safe | Intentionally global read trust roots. |
| verifier_trust_policies | public/global safe | Intentionally global read trust policy snapshots. |
| capability_trust_event_quarantine | public/global safe | Read allowed for governance observability; writes server-only. |
| capability_verification_snapshots | system/service-only | Created without public schema prefix; verify grants manually. |
| capability_verification_receipts | system/service-only | Created without public schema prefix; verify grants manually. |
| capability_verification_audit_records | telemetry/audit-log | Created without public schema prefix; verify grants manually. |
| company_subscriptions | billing/webhook-only | Tenant billing state; RLS tenant policy exists. |
| company_usage | billing/webhook-only | Tenant usage ledger; RLS tenant policy exists. |
| billing_webhook_events | billing/webhook-only | service-role only by policy. |
| early_access_invites | system/service-only | service-role only by policy. |
| trial_licenses | system/service-only | service-role only by policy. |
| workspace_activations | system/service-only | service-role only by policy. |
| early_access_events | telemetry/audit-log | service-role only by policy. |
| first_user_telemetry_events | telemetry/audit-log | **Hardened in this PR** to explicit service-role-only. |
| workspace_invitations | workspace/tenant-scoped | **Hardened in this PR** with FK + RLS role gates. |

## RLS issues found

1. `message_analyses` had no RLS and no canonical tenant identifier.
2. `project_suggestions` had no RLS and no canonical tenant identifier.
3. `workspace_invitations` had no RLS policies and lacked enforced FK to `workspaces`.
4. `workspace_audit_events` had no RLS policies and lacked enforced FK to `workspaces`.
5. `first_user_telemetry_events` had no explicit RLS policy despite containing potentially sensitive metadata.

## RLS/policy changes applied

- Added shared SQL helpers:
  - `public.is_workspace_member(workspace_id uuid)`
  - `public.has_workspace_role(workspace_id uuid, allowed_roles text[])`
- Enabled RLS for all newly audited tenant/telemetry tables above.
- Added tenant-safe `FOR ALL` policies for `message_analyses` and `project_suggestions`.
- Added member-read + owner/admin-mutate policies for `workspace_invitations`.
- Added member-read + owner/admin-insert policies for `workspace_audit_events`.
- Added explicit service-role-only policy for `first_user_telemetry_events`.

## Service-role usage review (summary)

Reviewed `createSupabaseServiceRoleClient` usage across:
- `src/lib/workspaces.ts` (workspace bootstrap only, justified)
- `src/lib/feature-gates.ts` (billing/limits lookups)
- `src/lib/early-access.ts` and early-access API/routes (internal flows)
- `src/lib/first-user-telemetry.ts` (telemetry writes)
- selected protected pages using privileged reads

No new service-role surfaces were introduced in this PR. Remaining improvement target is replacing broad protected-layout/service-role reads with scoped server-client reads where practical.

## API route authorization classification

High-level classes identified:
- Public: `/api/login`, selected onboarding/accept flows.
- Authenticated: most `/api/ai/*`, `/api/projects/*`, `/api/portfolio`, `/api/operational-memory`, `/api/intelligence/*`.
- Workspace-member required: project/workspace data routes through project/workspace guards.
- Owner/admin required: governance write paths, invitation/admin mutations.
- Webhook/system-only: `/api/billing/webhook` and internal service-role support paths.

Detailed per-route matrix should be maintained as follow-up in a dedicated machine-readable inventory file due to route volume.

## Cross-tenant QA checklist

Use two users (A and B) in distinct workspaces.

1. A can read A workspace projects; A cannot read B workspace projects.
2. A cannot insert/update/delete `message_analyses` or `project_suggestions` rows in B workspace.
3. Viewer cannot create/revoke workspace invitations.
4. Non-member cannot read workspace invitations/audit events.
5. Unauthenticated requests to protected APIs return 401/403.
6. Billing webhook and early-access service-role tables remain inaccessible to authenticated users.

## Remaining risks

1. Deterministic verification tables (`capability_verification_*`) were created without explicit `public.` prefix and need direct SQL grant/schema verification in Supabase.
2. Some service-role server components are still broad and should be progressively replaced by RLS-governed server clients + explicit membership checks.
3. Global-read trust tables are intentionally public; verify this aligns with product/legal posture before GA.
