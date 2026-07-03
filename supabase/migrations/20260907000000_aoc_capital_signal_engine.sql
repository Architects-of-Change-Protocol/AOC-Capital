-- AOC Capital Signal Engine v1: deterministic, transparent, paper-only
-- signal recommendations derived from the selected strategy, market data,
-- portfolio/risk state, and Strategy Performance Review context. See
-- src/lib/capital/signal-engine.ts for the pure rules engine and
-- src/lib/capital/signal-engine-service.ts for the governed write path.
--
-- A signal is a recommendation only. Generating one never creates a trade
-- intent, never opens a paper position, and never unlocks real execution —
-- paper_only and real_execution_locked are constrained to `true` at the
-- database level, on top of the TypeScript literal types in
-- signal-engine-types.ts. Following the governed-writes pattern established
-- in 20260906000000_aoc_capital_strategy_library.sql: this table is
-- SELECT-only for `authenticated` (the browser Supabase client) — all writes
-- go through the service-role client (signal-engine-service.ts, reusing
-- privileged() from src/lib/trading/trade-service.ts), and every generation
-- is paired with a signals_generated audit event.

create table if not exists public.paper_signal_recommendations (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  strategy_key text not null,
  strategy_name text not null,
  symbol text not null,
  action text not null check (
    action in (
      'paper_buy_candidate',
      'watch',
      'reduce_exposure',
      'avoid',
      'no_action'
    )
  ),
  strength text not null check (
    strength in ('weak', 'moderate', 'strong')
  ),
  confidence_score integer not null check (
    confidence_score >= 0 and confidence_score <= 100
  ),
  suggested_notional_usd numeric null check (
    suggested_notional_usd is null or suggested_notional_usd >= 0
  ),
  market_price_usd numeric null,
  market_data_source text not null default 'unavailable',
  rationale jsonb not null default '[]'::jsonb,
  risk_notes jsonb not null default '[]'::jsonb,
  blocked_reasons jsonb not null default '[]'::jsonb,
  required_user_action text not null,
  paper_only boolean not null default true,
  real_execution_locked boolean not null default true,
  status text not null default 'active' check (
    status in ('active', 'expired', 'blocked_by_risk', 'superseded')
  ),
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint paper_signal_recommendations_paper_only_check
    check (paper_only = true),

  constraint paper_signal_recommendations_real_execution_locked_check
    check (real_execution_locked = true)
);

create index if not exists paper_signal_recommendations_company_portfolio_idx
  on public.paper_signal_recommendations(company_id, portfolio_id, generated_at desc);

create index if not exists paper_signal_recommendations_strategy_idx
  on public.paper_signal_recommendations(company_id, strategy_key, generated_at desc);

alter table public.paper_signal_recommendations enable row level security;

create policy "tenant read paper_signal_recommendations"
  on public.paper_signal_recommendations for select to authenticated
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
  'strategy_selected',
  'signals_generated'
));
