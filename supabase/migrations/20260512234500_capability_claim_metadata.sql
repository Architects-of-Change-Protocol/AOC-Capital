alter table public.governance_execution_grants
  add column if not exists capability_claim_hash text,
  add column if not exists capability_claim_version text,
  add column if not exists capability_claim_issued_at timestamptz,
  add column if not exists capability_claim_key_id text,
  add column if not exists capability_claim_type text;

alter table public.governance_delegations
  add column if not exists capability_claim_hash text,
  add column if not exists capability_claim_version text,
  add column if not exists capability_claim_issued_at timestamptz,
  add column if not exists capability_claim_key_id text,
  add column if not exists capability_claim_type text;
