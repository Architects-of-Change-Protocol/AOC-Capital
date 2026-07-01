create table if not exists public.agent_attestation_nonces (
  nonce text primary key,
  agent_id text not null,
  workspace_id text not null,
  used_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists agent_attestation_nonces_agent_workspace_idx
  on public.agent_attestation_nonces (agent_id, workspace_id);

create index if not exists agent_attestation_nonces_expires_at_idx
  on public.agent_attestation_nonces (expires_at);

-- RLS intentionally disabled: accessed only via service role in server-side security primitives
alter table public.agent_attestation_nonces disable row level security;

create or replace function purge_expired_nonces()
returns void
language sql
security definer
as $$
  delete from public.agent_attestation_nonces where expires_at < now();
$$;
