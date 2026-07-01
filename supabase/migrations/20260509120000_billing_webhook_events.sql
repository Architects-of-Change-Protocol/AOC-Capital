create table if not exists public.billing_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default timezone('utc', now())
);

alter table public.billing_webhook_events enable row level security;

create policy if not exists "service role manages billing_webhook_events"
  on public.billing_webhook_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
