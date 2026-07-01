create table if not exists pmo_team_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  invited_by_user_id uuid not null,
  email text not null,
  role text not null,
  domain_focus text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pmo_team_invites_workspace_idx on pmo_team_invites(workspace_id);
create index if not exists pmo_team_invites_email_idx on pmo_team_invites(email);

alter table pmo_team_invites enable row level security;

create policy "workspace members can read own workspace invites"
  on pmo_team_invites for select
  using (
    workspace_id in (
      select workspace_id from workspace_memberships where user_id = auth.uid()
    )
  );
