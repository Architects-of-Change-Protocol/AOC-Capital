create table if not exists capability_verification_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_id text not null unique,
  trust_domain text not null,
  snapshot_hash text not null,
  anchor_state_hash text not null,
  policy_state_hash text not null,
  graph_state_hash text not null,
  revocation_state_hash text not null,
  replay_window_hash text not null,
  created_at timestamptz not null default timezone('utc', now()),
  snapshot_metadata jsonb not null default '{}'::jsonb
);

create table if not exists capability_verification_receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_id text not null unique,
  verifier_id text not null,
  trust_domain text not null,
  verification_decision text not null,
  verification_reason text not null,
  snapshot_hash text not null,
  verifier_state_hash text not null,
  canonical_event_hash text not null,
  verified_at timestamptz not null,
  signature text not null,
  receipt_payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists capability_verification_audit_records (
  id uuid primary key default gen_random_uuid(),
  record_type text not null,
  record_hash text not null,
  record_payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function prevent_verification_evidence_mutation()
returns trigger as $$
begin
  raise exception 'verification evidence is immutable; append a new record instead';
end;
$$ language plpgsql;

drop trigger if exists trg_no_update_snapshots on capability_verification_snapshots;
create trigger trg_no_update_snapshots before update or delete on capability_verification_snapshots
for each row execute function prevent_verification_evidence_mutation();

drop trigger if exists trg_no_update_receipts on capability_verification_receipts;
create trigger trg_no_update_receipts before update or delete on capability_verification_receipts
for each row execute function prevent_verification_evidence_mutation();

drop trigger if exists trg_no_update_audit_records on capability_verification_audit_records;
create trigger trg_no_update_audit_records before update or delete on capability_verification_audit_records
for each row execute function prevent_verification_evidence_mutation();
