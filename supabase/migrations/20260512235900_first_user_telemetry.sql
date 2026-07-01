create table if not exists public.first_user_telemetry_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  user_id uuid references auth.users(id) on delete set null,
  workspace_id uuid references public.workspaces(id) on delete set null,
  invite_id uuid references public.early_access_invites(id) on delete set null,
  session_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists first_user_telemetry_events_event_created_idx on public.first_user_telemetry_events(event_type, created_at desc);
create index if not exists first_user_telemetry_events_session_created_idx on public.first_user_telemetry_events(session_id, created_at desc);
