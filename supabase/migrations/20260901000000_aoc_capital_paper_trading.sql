-- AOC Capital paper-trading MVP: portfolios, market signals, trade intents/decisions,
-- paper positions, risk constitution, capital levels, and the audit ledger.
-- Tenant-scoped by company_id, following the pattern established in
-- 20260511110000_governance_audit_events.sql (public.current_company_id()).

create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  name text not null,
  base_capital_usd numeric not null default 1000,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.market_signals (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  symbol text not null,
  signal_type text not null check (signal_type in ('momentum', 'mean_reversion', 'volatility', 'manual')),
  direction text not null check (direction in ('long', 'short', 'neutral')),
  confidence numeric not null default 0.5 check (confidence >= 0 and confidence <= 1),
  note text null,
  created_at timestamptz not null default now()
);

create table if not exists public.trade_intents (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  symbol text not null,
  side text not null check (side in ('buy', 'sell')),
  quantity numeric not null check (quantity > 0),
  notional_usd numeric not null check (notional_usd > 0),
  leverage numeric not null default 1,
  source text not null default 'manual' check (source in ('manual', 'signal')),
  signal_id uuid null references public.market_signals(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'closed')),
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.trade_decisions (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  trade_intent_id uuid not null references public.trade_intents(id) on delete cascade,
  verdict text not null check (verdict in ('approved', 'rejected')),
  reasons jsonb not null default '[]'::jsonb,
  policy_version text not null default 'level-1',
  decided_at timestamptz not null default now()
);

create table if not exists public.paper_positions (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  trade_intent_id uuid not null references public.trade_intents(id) on delete cascade,
  symbol text not null,
  side text not null check (side in ('buy', 'sell')),
  quantity numeric not null,
  entry_price numeric not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz null,
  realized_pnl_usd numeric not null default 0
);

create table if not exists public.risk_constitution_rules (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  rule_key text not null,
  label text not null,
  limit_value numeric null,
  is_active boolean not null default true,
  level int not null default 1,
  description text not null,
  created_at timestamptz not null default now(),
  unique (company_id, rule_key)
);

create table if not exists public.capital_levels (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  level_name text not null,
  threshold_usd numeric not null,
  status text not null default 'locked' check (status in ('locked', 'active', 'breached')),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_ledger (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  event_type text not null check (event_type in (
    'trade_intent_created',
    'trade_decision_approved',
    'trade_decision_rejected',
    'position_opened',
    'position_closed'
  )),
  subject_type text not null,
  subject_id uuid not null,
  actor text not null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists portfolios_company_idx on public.portfolios(company_id);
create index if not exists market_signals_company_idx on public.market_signals(company_id, created_at desc);
create index if not exists trade_intents_company_idx on public.trade_intents(company_id, created_at desc);
create index if not exists trade_intents_portfolio_idx on public.trade_intents(portfolio_id);
create index if not exists trade_decisions_company_idx on public.trade_decisions(company_id, decided_at desc);
create index if not exists trade_decisions_intent_idx on public.trade_decisions(trade_intent_id);
create index if not exists paper_positions_company_idx on public.paper_positions(company_id);
create index if not exists paper_positions_portfolio_idx on public.paper_positions(portfolio_id, status);
create index if not exists risk_constitution_rules_company_idx on public.risk_constitution_rules(company_id);
create index if not exists capital_levels_company_idx on public.capital_levels(company_id, portfolio_id);
create index if not exists audit_ledger_company_idx on public.audit_ledger(company_id, occurred_at desc);

alter table public.portfolios enable row level security;
alter table public.market_signals enable row level security;
alter table public.trade_intents enable row level security;
alter table public.trade_decisions enable row level security;
alter table public.paper_positions enable row level security;
alter table public.risk_constitution_rules enable row level security;
alter table public.capital_levels enable row level security;
alter table public.audit_ledger enable row level security;

create policy if not exists "tenant access portfolios"
  on public.portfolios for all to authenticated
  using (public.current_company_id() = company_id)
  with check (public.current_company_id() = company_id);

create policy if not exists "tenant access market_signals"
  on public.market_signals for all to authenticated
  using (public.current_company_id() = company_id)
  with check (public.current_company_id() = company_id);

create policy if not exists "tenant access trade_intents"
  on public.trade_intents for all to authenticated
  using (public.current_company_id() = company_id)
  with check (public.current_company_id() = company_id);

create policy if not exists "tenant access trade_decisions"
  on public.trade_decisions for all to authenticated
  using (public.current_company_id() = company_id)
  with check (public.current_company_id() = company_id);

create policy if not exists "tenant access paper_positions"
  on public.paper_positions for all to authenticated
  using (public.current_company_id() = company_id)
  with check (public.current_company_id() = company_id);

create policy if not exists "tenant access risk_constitution_rules"
  on public.risk_constitution_rules for all to authenticated
  using (public.current_company_id() = company_id)
  with check (public.current_company_id() = company_id);

create policy if not exists "tenant access capital_levels"
  on public.capital_levels for all to authenticated
  using (public.current_company_id() = company_id)
  with check (public.current_company_id() = company_id);

create policy if not exists "tenant access audit_ledger"
  on public.audit_ledger for all to authenticated
  using (public.current_company_id() = company_id)
  with check (public.current_company_id() = company_id);
