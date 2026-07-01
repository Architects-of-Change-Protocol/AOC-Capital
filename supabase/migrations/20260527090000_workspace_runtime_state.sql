create table if not exists public.workspace_runtime_state (
  company_id text not null,
  workspace_id text not null,
  user_id text not null,
  awakening_state jsonb not null default '{}'::jsonb,
  imprint_state jsonb not null default '{}'::jsonb,
  validation_state jsonb not null default '{}'::jsonb,
  flags jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (company_id, workspace_id, user_id)
);

alter table public.workspace_runtime_state enable row level security;

create policy "workspace_runtime_state_tenant_isolation"
on public.workspace_runtime_state
for all
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);
