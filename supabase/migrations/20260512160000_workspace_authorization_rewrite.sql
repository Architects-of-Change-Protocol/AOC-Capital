create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Workspace',
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_memberships (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner','admin','pm','viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

alter table public.projects add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

insert into public.workspaces (id, name, created_by_user_id)
select gen_random_uuid(), coalesce(p.name, 'Workspace'), p.user_id
from public.projects p
where p.workspace_id is null;

with project_workspace as (
  select p.id as project_id, w.id as workspace_id, p.user_id
  from public.projects p
  join public.workspaces w on w.created_by_user_id = p.user_id
  where p.workspace_id is null
)
update public.projects p
set workspace_id = pw.workspace_id
from project_workspace pw
where p.id = pw.project_id;

insert into public.workspace_memberships (workspace_id, user_id, role)
select distinct p.workspace_id, p.user_id, 'owner'
from public.projects p
where p.workspace_id is not null
on conflict (workspace_id, user_id) do nothing;

alter table public.projects alter column workspace_id set not null;
create index if not exists projects_workspace_id_created_at_idx on public.projects (workspace_id, created_at desc);

alter table public.operational_memory_entries add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
update public.operational_memory_entries ome
set workspace_id = p.workspace_id
from public.projects p
where ome.project_id = p.id::text and ome.workspace_id is null;
alter table public.operational_memory_entries alter column workspace_id set not null;

alter table public.project_memories add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
update public.project_memories pm
set workspace_id = p.workspace_id
from public.projects p
where pm.project_id = p.id::text and pm.workspace_id is null;
alter table public.project_memories alter column workspace_id set not null;

-- Canonical membership-chain RLS

drop policy if exists "users can select own projects" on public.projects;
drop policy if exists "users can insert own projects" on public.projects;
drop policy if exists "users can update own projects" on public.projects;
drop policy if exists "users can delete own projects" on public.projects;
create policy "workspace members can select projects" on public.projects for select to authenticated using (
  exists (select 1 from public.workspace_memberships wm where wm.workspace_id = projects.workspace_id and wm.user_id = auth.uid())
);
create policy "workspace members can insert projects" on public.projects for insert to authenticated with check (
  exists (select 1 from public.workspace_memberships wm where wm.workspace_id = projects.workspace_id and wm.user_id = auth.uid())
);
create policy "workspace members can update projects" on public.projects for update to authenticated using (
  exists (select 1 from public.workspace_memberships wm where wm.workspace_id = projects.workspace_id and wm.user_id = auth.uid())
) with check (
  exists (select 1 from public.workspace_memberships wm where wm.workspace_id = projects.workspace_id and wm.user_id = auth.uid())
);
create policy "workspace members can delete projects" on public.projects for delete to authenticated using (
  exists (select 1 from public.workspace_memberships wm where wm.workspace_id = projects.workspace_id and wm.user_id = auth.uid())
);

drop policy if exists "tenant access operational_memory_entries" on public.operational_memory_entries;
create policy "workspace chain operational memory access" on public.operational_memory_entries for all to authenticated using (
  exists (
    select 1 from public.projects p
    join public.workspace_memberships wm on wm.workspace_id = p.workspace_id
    where p.id::text = operational_memory_entries.project_id and wm.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.projects p
    join public.workspace_memberships wm on wm.workspace_id = p.workspace_id
    where p.id::text = operational_memory_entries.project_id and wm.user_id = auth.uid()
  )
);

drop policy if exists "tenant access project_memories" on public.project_memories;
create policy "workspace chain project memories access" on public.project_memories for all to authenticated using (
  exists (
    select 1 from public.projects p
    join public.workspace_memberships wm on wm.workspace_id = p.workspace_id
    where p.id::text = project_memories.project_id and wm.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.projects p
    join public.workspace_memberships wm on wm.workspace_id = p.workspace_id
    where p.id::text = project_memories.project_id and wm.user_id = auth.uid()
  )
);
