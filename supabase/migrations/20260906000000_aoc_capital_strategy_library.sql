-- AOC Capital Strategy Library (PR #8): lets a user select a paper-only
-- strategy profile for AOC Capital to simulate, govern, and review. The
-- strategy catalog itself is a static TypeScript module
-- (src/lib/capital/strategy-library.ts) — this migration only adds a place to
-- persist which strategy a portfolio currently has selected, plus the new
-- strategy_selected audit event type.
--
-- Selecting a strategy never opens a paper position, creates a trade intent,
-- or unlocks real execution — it only records context for future paper
-- signal generation and display. paper_only and real_execution_locked are
-- constrained to `true` at the database level as a defense-in-depth
-- guardrail on top of the TypeScript literal types in strategy-library.ts.
--
-- Following the governed-writes pattern established in
-- 20260901020000_aoc_capital_governed_writes.sql: this table is SELECT-only
-- for `authenticated` (the browser Supabase client) from the start — all
-- writes go through the service-role client
-- (src/lib/capital/strategy-selection-service.ts, reusing privileged() from
-- src/lib/trading/trade-service.ts).

create table if not exists public.portfolio_strategy_profiles (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  strategy_key text not null,
  strategy_name text not null,
  risk_profile text not null,
  supported_symbols text[] not null default '{}',
  paper_only boolean not null default true,
  real_execution_locked boolean not null default true,
  selected_at timestamptz not null default now(),
  selected_by text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, portfolio_id),
  constraint portfolio_strategy_profiles_paper_only_check check (paper_only = true),
  constraint portfolio_strategy_profiles_execution_locked_check check (real_execution_locked = true)
);

create index if not exists portfolio_strategy_profiles_company_idx on public.portfolio_strategy_profiles(company_id);

alter table public.portfolio_strategy_profiles enable row level security;

create policy "tenant read portfolio_strategy_profiles"
  on public.portfolio_strategy_profiles for select to authenticated
  using (public.current_company_id() = company_id);

alter table public.audit_ledger drop constraint if exists audit_ledger_event_type_check;

alter table public.audit_ledger add constraint audit_ledger_event_type_check check (event_type in (
  'trade_intent_created',
  'trade_decision_approved',
  'trade_decision_rejected',
  'position_opened',
  'position_closed',
  'position_marked_to_market',
  'advisor_strategy_generated',
  'advisor_constitution_generated',
  'demo_scenario_loaded',
  'demo_scenario_reset',
  'strategy_selected'
));
