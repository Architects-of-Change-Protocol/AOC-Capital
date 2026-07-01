begin;

alter table public.onboarding_analyses
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

update public.onboarding_analyses oa
set workspace_id = p.workspace_id
from public.projects p
where oa.project_id = p.id::text and oa.workspace_id is null;

alter table public.onboarding_analyses
  alter column workspace_id set not null;

create index if not exists onboarding_analyses_workspace_project_idx on public.onboarding_analyses(workspace_id, project_id, created_at desc);

alter table public.onboarding_analyses
  add constraint onboarding_analyses_workspace_project_fk
  foreign key (workspace_id, project_id)
  references public.projects(workspace_id, id)
  on delete cascade;

alter table public.project_memories
  add constraint project_memories_workspace_project_fk
  foreign key (workspace_id, project_id)
  references public.projects(workspace_id, id)
  on delete cascade;

alter table public.operational_memory_entries
  add constraint operational_memory_entries_workspace_project_fk
  foreign key (workspace_id, project_id)
  references public.projects(workspace_id, id)
  on delete cascade;

create unique index if not exists projects_workspace_id_id_uniq on public.projects(workspace_id, id);

commit;
