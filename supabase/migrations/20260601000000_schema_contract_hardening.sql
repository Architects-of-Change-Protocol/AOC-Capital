-- Schema contract hardening migration.
-- Corrects all runtime/DB drift identified in the canonical schema audit of 2026-06-01.
-- All statements are idempotent.

-- ─────────────────────────────────────────────────────────────────────────────
-- DRIFT-01: workspaces.status missing column
-- canonical-workspace-resolver.ts queries .select("id, status") and filters
-- w.status !== "archived" && w.status !== "deleted". Column never existed.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.workspaces
  add column if not exists status text not null default 'active';

alter table public.workspaces
  drop constraint if exists workspaces_status_check;

alter table public.workspaces
  add constraint workspaces_status_check
  check (status in ('active', 'archived', 'deleted'));

-- ─────────────────────────────────────────────────────────────────────────────
-- DRIFT-02: projects.onboarding_payload missing column
-- save-project-onboarding.ts inserts onboarding_payload: payload (jsonb).
-- Column never existed; every insert silently dropped this data.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.projects
  add column if not exists onboarding_payload jsonb;

-- ─────────────────────────────────────────────────────────────────────────────
-- DRIFT-03: workspace_governance RLS type mismatch (text vs uuid)
-- workspace_governance.workspace_id is text.
-- workspace_memberships.workspace_id is uuid.
-- workspace_memberships.user_id is uuid.
-- The original policy compared text IN (uuid[]) and uuid = text — both
-- implicit casts that PostgreSQL rejects, making the policy always deny.
-- Fix: explicit cast workspace_id::uuid and use auth.uid() without ::text.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "workspace_governance_member_access" on public.workspace_governance;

create policy "workspace_governance_member_access"
  on public.workspace_governance
  for all
  using (
    workspace_id::uuid in (
      select workspace_id
      from public.workspace_memberships
      where user_id = auth.uid()
    )
  )
  with check (
    workspace_id::uuid in (
      select workspace_id
      from public.workspace_memberships
      where user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- DRIFT-04: workspace_runtime_state RLS — already functional via ::text cast
-- but add explicit index on user_id to avoid sequential scans on the policy.
-- ─────────────────────────────────────────────────────────────────────────────

create index if not exists workspace_runtime_state_user_id_idx
  on public.workspace_runtime_state (user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- DRIFT-05: workspaces RLS — add policies so members can read their workspaces
-- (previously only projects had RLS; workspaces had no select policy, relying
-- on service-role calls exclusively — fragile against future client queries).
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.workspaces enable row level security;

drop policy if exists "workspace_members_can_select" on public.workspaces;

create policy "workspace_members_can_select"
  on public.workspaces
  for select
  to authenticated
  using (
    id in (
      select workspace_id
      from public.workspace_memberships
      where user_id = auth.uid()
    )
  );
