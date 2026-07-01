create extension if not exists "pgcrypto";

create table if not exists public.project_suggestions (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  type text not null check (type in ('risk', 'delay', 'clarity', 'escalation')),
  message text not null,
  priority text not null check (priority in ('low', 'medium', 'high')),
  created_at timestamptz not null default now(),
  dismissed boolean not null default false
);

create index if not exists idx_project_suggestions_project_created_at
  on public.project_suggestions (project_id, created_at desc);

create index if not exists idx_project_suggestions_active
  on public.project_suggestions (project_id, dismissed)
  where dismissed = false;
