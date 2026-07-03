-- AOC Capital — Governed Paper Close Position Review (PR #17).
--
-- Introduces the first position-*closing* mutation in the governed paper
-- lifecycle. Signals recommend. Humans create drafts. Humans submit drafts.
-- Risk Constitution decides. Paper simulation opens positions only after
-- approval. This migration adds the mirror-image governed step at the other
-- end of the lifecycle: paper positions may be closed only through an
-- explicit, user-confirmed, atomic, audited governed close review — never
-- automatically, never from a client-supplied price/notional/P&L, and never
-- connected to any broker/exchange/order-routing path.
--
-- public.paper_positions already carries close_price_usd/close_reason/
-- closed_at/status from 20260901000000 + 20260903000000 (an older, separate
-- direct-close path — see close_paper_position() — that refreshes a market
-- price before closing). This governed review path is deliberately
-- independent of that one: it never refreshes valuation, it only ever reads
-- the position's already-stored current_price_usd/current_notional_usd, and
-- it always leaves an explicit paper_position_close_reviews governance
-- record behind, distinct from a plain price-refresh-and-close.
--
-- Following the atomic-audit pattern established in
-- 20260908000000_aoc_capital_atomic_audit_writes.sql: the close review
-- record, the paper_positions close mutation, and both audit events commit
-- in one transaction, or none of them do. Only a service-role client can
-- call the RPC below; RLS on paper_positions and the new close-review table
-- remains SELECT-only for `authenticated`.

alter table public.paper_positions
  add column if not exists closed_by text null;

alter table public.paper_positions
  add column if not exists close_notional_usd numeric null;

alter table public.paper_positions
  add column if not exists realized_pnl_pct numeric null;

create table if not exists public.paper_position_close_reviews (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  paper_position_id uuid not null references public.paper_positions(id) on delete cascade,
  trade_intent_id uuid null references public.trade_intents(id) on delete set null,
  requested_by text not null,
  requested_at timestamptz not null default now(),
  decision text not null check (decision in ('approved', 'rejected')),
  status text not null check (status in ('approved', 'rejected')),
  close_price_usd numeric null,
  close_notional_usd numeric null,
  entry_notional_usd numeric null,
  realized_pnl_usd numeric null,
  realized_pnl_pct numeric null,
  valuation_source text not null default 'stored_position_current_values',
  review_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.paper_positions
  add column if not exists close_review_id uuid null references public.paper_position_close_reviews(id) on delete set null;

create index if not exists paper_position_close_reviews_company_portfolio_position_idx
  on public.paper_position_close_reviews(company_id, portfolio_id, paper_position_id);

create index if not exists paper_position_close_reviews_company_portfolio_requested_idx
  on public.paper_position_close_reviews(company_id, portfolio_id, requested_at desc);

-- At most one *approved* close review may ever exist per paper position —
-- this is the database-level backstop behind the RPC's own duplicate check
-- below, so a race can never leave two approved reviews (and therefore two
-- conflicting realized-P&L records) for the same position.
create unique index if not exists paper_position_close_reviews_one_approved_per_position
  on public.paper_position_close_reviews(company_id, portfolio_id, paper_position_id)
  where decision = 'approved';

alter table public.paper_position_close_reviews enable row level security;

drop policy if exists "tenant read paper_position_close_reviews" on public.paper_position_close_reviews;
create policy "tenant read paper_position_close_reviews"
  on public.paper_position_close_reviews for select to authenticated
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
  'signals_generated',
  'signal_converted_to_draft_trade_intent',
  'trade_intent_submitted_for_review',
  'draft_trade_intent_cancelled',
  'paper_position_close_review_approved',
  'paper_position_closed'
));

-- Atomically validates and closes one open paper position through a
-- deterministic, rule-based governed close review. No client-suppliable
-- close price, close notional, realized P&L, quantity, symbol, or status —
-- every value written here is derived server-side from the already-stored
-- paper_positions row this function locks. Real execution remains locked:
-- this function never calls a broker/exchange/order-routing path, and none
-- exists anywhere in this schema.
create or replace function public.close_paper_position_with_review_and_audit(
  p_company_id text,
  p_portfolio_id uuid,
  p_paper_position_id uuid,
  p_actor text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_position public.paper_positions;
  v_review public.paper_position_close_reviews;
  v_close_price_usd numeric;
  v_close_notional_usd numeric;
  v_entry_notional_usd numeric;
  v_realized_pnl_usd numeric;
  v_realized_pnl_pct numeric;
  v_now timestamptz := now();
begin
  if p_company_id is null or length(trim(p_company_id)) = 0 then
    raise exception 'company_id is required';
  end if;

  if p_portfolio_id is null then
    raise exception 'portfolio_id is required';
  end if;

  if p_paper_position_id is null then
    raise exception 'paper_position_id is required';
  end if;

  if p_actor is null or length(trim(p_actor)) = 0 then
    raise exception 'actor is required';
  end if;

  select * into v_position
    from public.paper_positions
    where id = p_paper_position_id
      and company_id = p_company_id
      and portfolio_id = p_portfolio_id
    for update;

  if not found then
    raise exception 'Paper position not found';
  end if;

  if v_position.status = 'closed' then
    raise exception 'Paper position already closed';
  end if;

  if v_position.status <> 'open' then
    raise exception 'Only open paper positions can be submitted for close review';
  end if;

  if v_position.current_price_usd is null or v_position.current_notional_usd is null then
    raise exception 'Paper position requires stored valuation before close review';
  end if;

  if v_position.entry_notional_usd is null then
    raise exception 'Paper position requires stored valuation before close review';
  end if;

  if v_position.quantity is null or v_position.quantity <= 0 then
    raise exception 'Paper position requires stored valuation before close review';
  end if;

  if exists (
    select 1
    from public.paper_position_close_reviews
    where company_id = p_company_id
      and portfolio_id = p_portfolio_id
      and paper_position_id = p_paper_position_id
      and decision = 'approved'
  ) then
    raise exception 'Paper position already has an approved close review';
  end if;

  -- Close values are derived only from the stored position row locked
  -- above — never from a caller-supplied price/notional/P&L, and never
  -- from a freshly-fetched market price (no valuation refresh here).
  v_close_price_usd := v_position.current_price_usd;
  v_close_notional_usd := v_position.current_notional_usd;
  v_entry_notional_usd := v_position.entry_notional_usd;
  v_realized_pnl_usd := v_close_notional_usd - v_entry_notional_usd;
  v_realized_pnl_pct := case when v_entry_notional_usd > 0 then v_realized_pnl_usd / v_entry_notional_usd else null end;

  insert into public.paper_position_close_reviews (
    company_id, portfolio_id, paper_position_id, trade_intent_id, requested_by, requested_at,
    decision, status, close_price_usd, close_notional_usd, entry_notional_usd,
    realized_pnl_usd, realized_pnl_pct, valuation_source, review_payload
  )
  values (
    p_company_id, p_portfolio_id, v_position.id, v_position.trade_intent_id, p_actor, v_now,
    'approved', 'approved', v_close_price_usd, v_close_notional_usd, v_entry_notional_usd,
    v_realized_pnl_usd, v_realized_pnl_pct, 'stored_position_current_values',
    jsonb_build_object(
      'paper_only', true,
      'real_execution_locked', true,
      'review_type', 'paper_position_close',
      'decision', 'approved',
      'valuation_source', 'stored_position_current_values',
      'no_real_execution', true,
      'no_broker_order', true,
      'no_order_placed', true,
      'no_withdrawal', true,
      'no_deposit', true
    )
  )
  returning * into v_review;

  update public.paper_positions
  set
    status = 'closed',
    closed_at = v_now,
    closed_by = p_actor,
    close_price_usd = v_close_price_usd,
    close_notional_usd = v_close_notional_usd,
    realized_pnl_usd = v_realized_pnl_usd,
    realized_pnl_pct = v_realized_pnl_pct,
    close_review_id = v_review.id,
    unrealized_pnl_usd = 0,
    unrealized_pnl_pct = 0,
    last_marked_at = v_now,
    updated_at = v_now
  where id = v_position.id
    and company_id = p_company_id
    and portfolio_id = p_portfolio_id
  returning * into v_position;

  -- Same transaction as the review insert and position update above: if
  -- either audit insert below fails, the whole close rolls back — a
  -- position is never left closed (or reviewed) without audit evidence.
  insert into public.audit_ledger (company_id, event_type, subject_type, subject_id, actor, payload)
  values (p_company_id, 'paper_position_close_review_approved', 'paper_position', v_position.id, p_actor,
    jsonb_build_object(
      'paper_only', true,
      'real_execution_locked', true,
      'paper_position_id', v_position.id,
      'portfolio_id', p_portfolio_id,
      'trade_intent_id', v_position.trade_intent_id,
      'close_review_id', v_review.id,
      'close_price_usd', v_close_price_usd,
      'close_notional_usd', v_close_notional_usd,
      'entry_notional_usd', v_entry_notional_usd,
      'realized_pnl_usd', v_realized_pnl_usd,
      'realized_pnl_pct', v_realized_pnl_pct,
      'valuation_source', 'stored_position_current_values',
      'no_real_execution', true,
      'no_broker_order', true,
      'no_order_placed', true,
      'no_withdrawal', true,
      'no_deposit', true
    ));

  insert into public.audit_ledger (company_id, event_type, subject_type, subject_id, actor, payload)
  values (p_company_id, 'paper_position_closed', 'paper_position', v_position.id, p_actor,
    jsonb_build_object(
      'paper_only', true,
      'real_execution_locked', true,
      'paper_position_id', v_position.id,
      'portfolio_id', p_portfolio_id,
      'close_review_id', v_review.id,
      'status_after_close', v_position.status,
      'closed_at', v_position.closed_at,
      'realized_pnl_usd', v_realized_pnl_usd,
      'no_real_execution', true,
      'no_broker_order', true,
      'no_order_placed', true,
      'no_withdrawal', true,
      'no_deposit', true
    ));

  return jsonb_build_object('position', to_jsonb(v_position), 'closeReview', to_jsonb(v_review));
end;
$$;

revoke all on function public.close_paper_position_with_review_and_audit(text, uuid, uuid, text) from public;
grant execute on function public.close_paper_position_with_review_and_audit(text, uuid, uuid, text) to service_role;
