create type public.trial_status as enum ('pending', 'active', 'expired', 'revoked');

create table public.early_access_invites (
  id uuid primary key default gen_random_uuid(),
  invite_email text not null,
  invite_token_hash text not null unique,
  invite_note text,
  inviter_user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  requires_approval boolean not null default false,
  approved_at timestamptz,
  approved_by_user_id uuid references auth.users(id) on delete set null,
  workspace_id uuid references public.workspaces(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trial_licenses (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null unique references public.early_access_invites(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  trial_start_at timestamptz,
  trial_end_at timestamptz,
  trial_status public.trial_status not null default 'pending',
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trial_dates_valid check (trial_end_at is null or trial_start_at is null or trial_end_at >= trial_start_at)
);

create table public.workspace_activations (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null unique references public.early_access_invites(id) on delete cascade,
  trial_license_id uuid not null unique references public.trial_licenses(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  activated_by_user_id uuid not null references auth.users(id) on delete cascade,
  runtime_authority_linkage jsonb not null default '{}'::jsonb,
  governance_profile jsonb not null default '{}'::jsonb,
  explainability_defaults jsonb not null default '{}'::jsonb,
  machine_governance_defaults jsonb not null default '{}'::jsonb,
  starter_cognition_state jsonb not null default '{}'::jsonb,
  operational_memory_namespace text not null,
  activated_at timestamptz not null default now(),
  initialization_status text not null default 'succeeded',
  initialization_error text,
  created_at timestamptz not null default now()
);

create table public.early_access_events (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid references public.early_access_invites(id) on delete set null,
  trial_license_id uuid references public.trial_licenses(id) on delete set null,
  workspace_id uuid references public.workspaces(id) on delete set null,
  event_type text not null,
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index early_access_invites_invite_email_idx on public.early_access_invites(invite_email);
create index trial_licenses_status_idx on public.trial_licenses(trial_status);
create index early_access_events_event_type_idx on public.early_access_events(event_type);

alter table public.early_access_invites enable row level security;
alter table public.trial_licenses enable row level security;
alter table public.workspace_activations enable row level security;
alter table public.early_access_events enable row level security;

create policy "service role full access on early access invites"
on public.early_access_invites
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "service role full access on trial licenses"
on public.trial_licenses
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "service role full access on workspace activations"
on public.workspace_activations
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "service role full access on early access events"
on public.early_access_events
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_early_access_invites_updated_at before update on public.early_access_invites
for each row execute function public.touch_updated_at();

create trigger trg_trial_licenses_updated_at before update on public.trial_licenses
for each row execute function public.touch_updated_at();
