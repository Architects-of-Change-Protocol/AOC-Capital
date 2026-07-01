create extension if not exists "pgcrypto";

create table if not exists public.message_analyses (
  id uuid primary key default gen_random_uuid(),
  project_id text,
  raw_message text not null,
  audience text not null,
  tone_score double precision not null,
  blame_score double precision not null,
  ambiguity_score double precision not null,
  overall_risk double precision not null,
  decision jsonb not null,
  ai_output jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_message_analyses_project_created_at
  on public.message_analyses (project_id, created_at desc);
