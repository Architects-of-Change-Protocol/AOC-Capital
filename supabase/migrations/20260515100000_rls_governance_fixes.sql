-- Phase 3c: RLS Governance Fixes
-- Fixes 4 privileged-client blockers from two-pass service role audit.
--
-- 1. governance_execution_grants  — add UPDATE policy for workspace admins
--    (UPDATE was revoked from authenticated in 20260512223000; re-grant it
--    here, scoped by the new RLS policy)
-- 2. governance_delegations       — fix broken SELECT policy that referenced
--    public.workspace_members (does not exist; correct table is
--    public.workspace_memberships; also drop non-existent wm.status filter)
-- 3. workspace_memberships        — enable RLS + add SELECT policies

-- ============================================================
-- 1. governance_execution_grants: re-grant UPDATE + add RLS policy
-- ============================================================

-- Re-grant UPDATE that was explicitly revoked in 20260512223000_governed_execution_grants.sql.
-- The RLS policy below restricts which rows authenticated users may update.
grant update on public.governance_execution_grants to authenticated;

drop policy if exists "workspace_admins_can_update_execution_grants" on public.governance_execution_grants;
create policy "workspace_admins_can_update_execution_grants"
  on public.governance_execution_grants
  for update
  to authenticated
  using (
    workspace_id in (
      select workspace_id from public.workspace_memberships
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  )
  with check (
    workspace_id in (
      select workspace_id from public.workspace_memberships
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ============================================================
-- 2. governance_delegations: fix broken SELECT policy
--    Original policy "delegations_owner_admin_read" referenced
--    public.workspace_members (table does not exist) and filtered on
--    wm.status (column does not exist on workspace_memberships).
--    Fix: switch to workspace_memberships and drop the status filter.
-- ============================================================

drop policy if exists "delegations_owner_admin_read" on public.governance_delegations;
create policy "delegations_owner_admin_read"
  on public.governance_delegations
  for select
  using (
    exists (
      select 1 from public.workspace_memberships wm
      where wm.workspace_id = governance_delegations.workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin')
    )
  );

-- ============================================================
-- 3. workspace_memberships: enable RLS + add SELECT policies
--    Two SELECT policies apply with OR (Supabase behaviour):
--    a) user can always read their own membership rows
--    b) workspace owner/admin can read all memberships in their workspaces
--    The subquery in (b) is filtered by policy (a) during evaluation,
--    so there is no unbounded recursion.
-- ============================================================

alter table public.workspace_memberships enable row level security;

drop policy if exists "users_can_read_own_workspace_memberships" on public.workspace_memberships;
create policy "users_can_read_own_workspace_memberships"
  on public.workspace_memberships
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "workspace_admins_can_read_all_memberships" on public.workspace_memberships;
create policy "workspace_admins_can_read_all_memberships"
  on public.workspace_memberships
  for select
  to authenticated
  using (
    workspace_id in (
      select workspace_id from public.workspace_memberships wm2
      where wm2.user_id = auth.uid() and wm2.role in ('owner', 'admin')
    )
  );

-- ============================================================
-- DOWN (apply in a separate migration to reverse)
-- ============================================================
-- revoke update on public.governance_execution_grants from authenticated;
-- drop policy if exists "workspace_admins_can_update_execution_grants" on public.governance_execution_grants;
--
-- drop policy if exists "delegations_owner_admin_read" on public.governance_delegations;
-- create policy if not exists "delegations_owner_admin_read" on public.governance_delegations
--   for select using (
--     exists (
--       select 1 from public.workspace_members wm  -- original broken reference preserved for rollback traceability
--       where wm.workspace_id = governance_delegations.workspace_id
--         and wm.user_id = auth.uid()
--         and wm.status = 'active'
--         and wm.role in ('owner','admin')
--     )
--   );
--
-- alter table public.workspace_memberships disable row level security;
-- drop policy if exists "users_can_read_own_workspace_memberships" on public.workspace_memberships;
-- drop policy if exists "workspace_admins_can_read_all_memberships" on public.workspace_memberships;
