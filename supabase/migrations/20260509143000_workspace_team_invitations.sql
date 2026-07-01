create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  company_id text not null,
  email text not null,
  role text not null check (role in ('owner','admin','pm','viewer')),
  token text not null unique,
  status text not null default 'pending' check (status in ('pending','accepted','expired','revoked')),
  invited_by_user_id uuid not null,
  accepted_by_user_id uuid,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists workspace_invitation_active_unique
  on public.workspace_invitations (workspace_id, email)
  where status = 'pending';

create table if not exists public.workspace_audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  actor_user_id uuid,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.workspace_invitations is 'Tenant-isolated invitation ledger for PMO seats. Pending invites consume seats to prevent over-commit and maintain governance integrity.';
comment on table public.workspace_audit_events is 'Append-only governance events for workspace membership lifecycle. Supports enterprise security reviews and future policy automation.';
