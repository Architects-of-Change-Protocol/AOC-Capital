-- AOC Capital — Position lifecycle + mark-to-market (PR #3).
--
-- Extends paper_positions with the fields needed to mark open positions to a
-- deterministic simulated market price (unrealized P&L) and to close them with
-- a server-calculated realized P&L. Renames the original entry_price column to
-- entry_price_usd for naming consistency with the new *_usd fields. Adds
-- paper_market_prices as the deterministic mock pricing source consumed by
-- src/lib/trading/mock-price-generator.ts — no live market data API, no API
-- keys, no exchange dependency; prices are a pure function of symbol + a UTC
-- time bucket.
--
-- Daily/weekly loss windows are rolling 24h / rolling 7d (not UTC calendar
-- windows), matching the existing evaluate_and_record_trade_intent() exposure
-- and loss checks below and getPortfolioRiskState() in
-- src/lib/trading/trade-service.ts. Both windows only ever sum realized_pnl_usd
-- from *closed* positions — unrealized P&L on open positions never feeds Level 1
-- loss-limit enforcement. Before this migration those two rules were dead paths,
-- since nothing ever set paper_positions.status = 'closed'; close_paper_position()
-- below is what makes them live.

alter table public.paper_positions rename column entry_price to entry_price_usd;

alter table public.paper_positions
  add column if not exists entry_notional_usd numeric not null default 0,
  add column if not exists current_price_usd numeric not null default 0,
  add column if not exists current_notional_usd numeric not null default 0,
  add column if not exists unrealized_pnl_usd numeric not null default 0,
  add column if not exists unrealized_pnl_pct numeric not null default 0,
  add column if not exists close_price_usd numeric null,
  add column if not exists close_reason text null,
  add column if not exists last_marked_at timestamptz null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.paper_positions drop constraint if exists paper_positions_close_reason_check;
alter table public.paper_positions add constraint paper_positions_close_reason_check check (
  close_reason is null or close_reason in (
    'user_requested', 'risk_review', 'strategy_exit', 'stop_loss', 'take_profit', 'system_rebalance', 'manual_test'
  )
);

-- Backfill any pre-existing rows so the new *_usd fields are consistent with
-- entry_price_usd/quantity (idempotent — only touches rows never backfilled).
update public.paper_positions
  set entry_notional_usd = quantity * entry_price_usd,
      current_price_usd = entry_price_usd,
      current_notional_usd = quantity * entry_price_usd,
      created_at = coalesce(created_at, opened_at)
  where entry_notional_usd = 0;

-- Deterministic simulated market price ledger. Rows are written by the mock
-- price generator (source = 'mock') as it marks positions; 'manual' and
-- 'future_live' are reserved for later levels and are not produced by this PR.
create table if not exists public.paper_market_prices (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  symbol text not null,
  price_usd numeric not null,
  as_of timestamptz not null,
  source text not null default 'mock' check (source in ('mock', 'manual', 'future_live')),
  created_at timestamptz not null default now(),
  unique (company_id, symbol, as_of)
);

create index if not exists paper_market_prices_company_idx on public.paper_market_prices(company_id, symbol, as_of desc);

alter table public.paper_market_prices enable row level security;

drop policy if exists "tenant read paper_market_prices" on public.paper_market_prices;
create policy "tenant read paper_market_prices"
  on public.paper_market_prices for select to authenticated
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
  'advisor_constitution_generated'
));

-- Re-create evaluate_and_record_trade_intent (see 20260901020000) so the paper
-- position it opens populates the new *_usd fields under their new names.
create or replace function public.evaluate_and_record_trade_intent(
  p_company_id text,
  p_portfolio_id uuid,
  p_symbol text,
  p_side text,
  p_quantity numeric,
  p_notional_usd numeric,
  p_leverage numeric,
  p_source text,
  p_signal_id uuid,
  p_created_by text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_intent_id uuid;
  v_intent_created_at timestamptz;
  v_base_capital numeric;
  v_current_exposure numeric := 0;
  v_open_count int := 0;
  v_daily_pnl numeric := 0;
  v_weekly_pnl numeric := 0;
  v_reasons jsonb := '[]'::jsonb;
  v_passed boolean;
  v_all_passed boolean := true;
  v_verdict text;
  v_decision_id uuid;
  v_decided_at timestamptz;
  v_position jsonb := null;
  v_entry_price numeric;
  v_position_id uuid;
  v_now timestamptz := now();
begin
  if p_side not in ('buy', 'sell') then
    raise exception 'invalid side: %', p_side;
  end if;
  if p_quantity <= 0 or p_notional_usd <= 0 then
    raise exception 'quantity and notional_usd must be positive';
  end if;

  if p_signal_id is not null and not exists (
    select 1 from public.market_signals where id = p_signal_id and company_id = p_company_id
  ) then
    raise exception 'invalid signalId: signal not found for this workspace';
  end if;

  -- Serialize the whole evaluate -> decide -> open sequence per portfolio so
  -- concurrent trade intents can't both evaluate against the same stale snapshot.
  perform pg_advisory_xact_lock(hashtext(p_portfolio_id::text));

  insert into public.trade_intents (company_id, portfolio_id, symbol, side, quantity, notional_usd, leverage, source, signal_id, created_by, status)
  values (p_company_id, p_portfolio_id, p_symbol, p_side, p_quantity, p_notional_usd, p_leverage, coalesce(p_source, 'manual'), p_signal_id, p_created_by, 'pending')
  returning id, created_at into v_intent_id, v_intent_created_at;

  insert into public.audit_ledger (company_id, event_type, subject_type, subject_id, actor, payload)
  values (p_company_id, 'trade_intent_created', 'trade_intent', v_intent_id, p_created_by,
    jsonb_build_object('symbol', p_symbol, 'side', p_side, 'quantity', p_quantity, 'notionalUsd', p_notional_usd));

  select base_capital_usd into v_base_capital from public.portfolios where id = p_portfolio_id;
  if v_base_capital is null then
    raise exception 'portfolio % not found', p_portfolio_id;
  end if;

  select coalesce(sum(quantity * entry_price_usd), 0), count(*)
    into v_current_exposure, v_open_count
    from public.paper_positions
    where portfolio_id = p_portfolio_id and status = 'open';

  -- Rolling 24h / rolling 7d windows over realized P&L only (see header note).
  select coalesce(sum(realized_pnl_usd) filter (where closed_at >= v_now - interval '1 day'), 0),
         coalesce(sum(realized_pnl_usd), 0)
    into v_daily_pnl, v_weekly_pnl
    from public.paper_positions
    where portfolio_id = p_portfolio_id and status = 'closed' and closed_at >= v_now - interval '7 days';

  -- no_leverage
  v_passed := p_leverage = 1;
  v_all_passed := v_all_passed and v_passed;
  v_reasons := v_reasons || jsonb_build_array(jsonb_build_object(
    'ruleKey', 'no_leverage', 'label', 'No leverage', 'passed', v_passed,
    'detail', case when v_passed then 'Trade uses 1x (unleveraged) exposure.'
                   else format('Trade requests %sx leverage; Level 1 requires exactly 1x.', p_leverage) end));

  -- no_real_shorts
  v_passed := p_side <> 'sell';
  v_all_passed := v_all_passed and v_passed;
  v_reasons := v_reasons || jsonb_build_array(jsonb_build_object(
    'ruleKey', 'no_real_shorts', 'label', 'No real shorts', 'passed', v_passed,
    'detail', case when v_passed then 'Trade is a long (buy) intent.'
                   else 'Short-side trade intents are not permitted at Level 1.' end));

  -- max_simulated_exposure
  v_passed := (v_current_exposure + p_notional_usd) / nullif(v_base_capital, 0) <= 0.6;
  v_all_passed := v_all_passed and v_passed;
  v_reasons := v_reasons || jsonb_build_array(jsonb_build_object(
    'ruleKey', 'max_simulated_exposure', 'label', 'Max 60% simulated exposure', 'passed', v_passed,
    'detail', format('Projected exposure would be %s%% of base capital (limit 60%%).',
      round((((v_current_exposure + p_notional_usd) / nullif(v_base_capital, 0)) * 100)::numeric, 1))));

  -- max_daily_simulated_loss
  v_passed := v_daily_pnl > -20;
  v_all_passed := v_all_passed and v_passed;
  v_reasons := v_reasons || jsonb_build_array(jsonb_build_object(
    'ruleKey', 'max_daily_simulated_loss', 'label', 'Max daily simulated loss $20', 'passed', v_passed,
    'detail', format('Daily simulated P&L (rolling 24h, realized only) is $%s (limit -$20.00).', round(v_daily_pnl::numeric, 2))));

  -- max_weekly_simulated_loss
  v_passed := v_weekly_pnl > -40;
  v_all_passed := v_all_passed and v_passed;
  v_reasons := v_reasons || jsonb_build_array(jsonb_build_object(
    'ruleKey', 'max_weekly_simulated_loss', 'label', 'Max weekly simulated loss $40', 'passed', v_passed,
    'detail', format('Weekly simulated P&L (rolling 7d, realized only) is $%s (limit -$40.00).', round(v_weekly_pnl::numeric, 2))));

  -- max_open_positions
  v_passed := v_open_count < 3;
  v_all_passed := v_all_passed and v_passed;
  v_reasons := v_reasons || jsonb_build_array(jsonb_build_object(
    'ruleKey', 'max_open_positions', 'label', 'Max 3 open paper positions', 'passed', v_passed,
    'detail', format('Portfolio currently holds %s open paper position(s) (limit 3).', v_open_count)));

  v_verdict := case when v_all_passed then 'approved' else 'rejected' end;

  insert into public.trade_decisions (company_id, trade_intent_id, verdict, reasons, policy_version)
  values (p_company_id, v_intent_id, v_verdict, v_reasons, 'level-1')
  returning id, decided_at into v_decision_id, v_decided_at;

  update public.trade_intents set status = v_verdict where id = v_intent_id;

  insert into public.audit_ledger (company_id, event_type, subject_type, subject_id, actor, payload)
  values (p_company_id, case when v_verdict = 'approved' then 'trade_decision_approved' else 'trade_decision_rejected' end,
    'trade_intent', v_intent_id, 'risk-policy-engine',
    jsonb_build_object('verdict', v_verdict, 'reasons', v_reasons, 'policyVersion', 'level-1'));

  if v_verdict = 'approved' then
    v_entry_price := p_notional_usd / p_quantity;
    insert into public.paper_positions (
      company_id, portfolio_id, trade_intent_id, symbol, side, quantity,
      entry_price_usd, entry_notional_usd, current_price_usd, current_notional_usd, status
    )
    values (
      p_company_id, p_portfolio_id, v_intent_id, p_symbol, p_side, p_quantity,
      v_entry_price, p_notional_usd, v_entry_price, p_notional_usd, 'open'
    )
    returning id into v_position_id;

    insert into public.audit_ledger (company_id, event_type, subject_type, subject_id, actor, payload)
    values (p_company_id, 'position_opened', 'paper_position', v_position_id, 'risk-policy-engine',
      jsonb_build_object('symbol', p_symbol, 'quantity', p_quantity, 'entryPriceUsd', v_entry_price, 'paperOnly', true));

    select jsonb_build_object(
      'id', id, 'company_id', company_id, 'portfolio_id', portfolio_id, 'trade_intent_id', trade_intent_id,
      'symbol', symbol, 'side', side, 'quantity', quantity, 'entry_price_usd', entry_price_usd,
      'entry_notional_usd', entry_notional_usd, 'current_price_usd', current_price_usd,
      'current_notional_usd', current_notional_usd, 'unrealized_pnl_usd', unrealized_pnl_usd,
      'unrealized_pnl_pct', unrealized_pnl_pct, 'realized_pnl_usd', realized_pnl_usd, 'status', status,
      'opened_at', opened_at, 'closed_at', closed_at, 'close_price_usd', close_price_usd,
      'close_reason', close_reason, 'last_marked_at', last_marked_at, 'created_at', created_at, 'updated_at', updated_at
    ) into v_position
    from public.paper_positions where id = v_position_id;
  end if;

  return jsonb_build_object(
    'intent', jsonb_build_object(
      'id', v_intent_id, 'company_id', p_company_id, 'portfolio_id', p_portfolio_id, 'symbol', p_symbol,
      'side', p_side, 'quantity', p_quantity, 'notional_usd', p_notional_usd, 'leverage', p_leverage,
      'source', coalesce(p_source, 'manual'), 'signal_id', p_signal_id, 'status', v_verdict,
      'created_by', p_created_by, 'created_at', v_intent_created_at
    ),
    'decision', jsonb_build_object(
      'id', v_decision_id, 'company_id', p_company_id, 'trade_intent_id', v_intent_id, 'verdict', v_verdict,
      'reasons', v_reasons, 'policy_version', 'level-1', 'decided_at', v_decided_at
    ),
    'position', v_position
  );
end;
$$;

revoke all on function public.evaluate_and_record_trade_intent(text, uuid, text, text, numeric, numeric, numeric, text, uuid, text) from public;
grant execute on function public.evaluate_and_record_trade_intent(text, uuid, text, text, numeric, numeric, numeric, text, uuid, text) to service_role;

-- Marks a single open paper position to a simulated current price. Optionally
-- writes a position_marked_to_market audit event (used for explicit, user-
-- triggered marks — see mark_paper_position() caller in trade-service.ts) so
-- routine bulk refreshes (mark-all) don't spam the audit ledger.
create or replace function public.mark_paper_position(
  p_company_id text,
  p_position_id uuid,
  p_current_price_usd numeric,
  p_actor text,
  p_write_audit boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_position record;
  v_direction numeric;
  v_unrealized_pnl numeric;
  v_unrealized_pnl_pct numeric;
  v_marked_at timestamptz := now();
begin
  if p_current_price_usd is null or p_current_price_usd <= 0 then
    raise exception 'current price must be positive';
  end if;

  select * into v_position from public.paper_positions
    where id = p_position_id and company_id = p_company_id
    for update;

  if not found then
    raise exception 'paper position not found for this workspace';
  end if;
  if v_position.status <> 'open' then
    raise exception 'paper position is not open';
  end if;

  -- Level 1 never creates side = 'sell' positions (no_real_shorts always
  -- rejects them); this direction flip only guards defensively should one
  -- ever exist, without enabling new short creation.
  v_direction := case when v_position.side = 'buy' then 1 else -1 end;
  v_unrealized_pnl := v_direction * (p_current_price_usd - v_position.entry_price_usd) * v_position.quantity;
  v_unrealized_pnl_pct := case when v_position.entry_notional_usd > 0 then (v_unrealized_pnl / v_position.entry_notional_usd) * 100 else 0 end;

  update public.paper_positions set
    current_price_usd = p_current_price_usd,
    current_notional_usd = v_position.quantity * p_current_price_usd,
    unrealized_pnl_usd = v_unrealized_pnl,
    unrealized_pnl_pct = v_unrealized_pnl_pct,
    last_marked_at = v_marked_at,
    updated_at = v_marked_at
  where id = p_position_id;

  if p_write_audit then
    insert into public.audit_ledger (company_id, event_type, subject_type, subject_id, actor, payload)
    values (p_company_id, 'position_marked_to_market', 'paper_position', p_position_id, p_actor,
      jsonb_build_object(
        'symbol', v_position.symbol, 'currentPriceUsd', p_current_price_usd,
        'unrealizedPnlUsd', v_unrealized_pnl, 'unrealizedPnlPct', v_unrealized_pnl_pct, 'paperOnly', true
      ));
  end if;

  return jsonb_build_object(
    'id', v_position.id, 'company_id', v_position.company_id, 'portfolio_id', v_position.portfolio_id,
    'trade_intent_id', v_position.trade_intent_id, 'symbol', v_position.symbol, 'side', v_position.side,
    'quantity', v_position.quantity, 'entry_price_usd', v_position.entry_price_usd,
    'entry_notional_usd', v_position.entry_notional_usd, 'current_price_usd', p_current_price_usd,
    'current_notional_usd', v_position.quantity * p_current_price_usd, 'unrealized_pnl_usd', v_unrealized_pnl,
    'unrealized_pnl_pct', v_unrealized_pnl_pct, 'realized_pnl_usd', v_position.realized_pnl_usd, 'status', v_position.status,
    'opened_at', v_position.opened_at, 'closed_at', v_position.closed_at, 'close_price_usd', v_position.close_price_usd,
    'close_reason', v_position.close_reason, 'last_marked_at', v_marked_at, 'created_at', v_position.created_at,
    'updated_at', v_marked_at
  );
end;
$$;

revoke all on function public.mark_paper_position(text, uuid, numeric, text, boolean) from public;
grant execute on function public.mark_paper_position(text, uuid, numeric, text, boolean) to service_role;

-- Bulk mark-to-market for every open position in a portfolio, in one
-- transaction. Never writes audit events — see mark_paper_position() above for
-- the audited single-position path used by explicit user-triggered marks.
create or replace function public.mark_all_open_paper_positions(
  p_company_id text,
  p_portfolio_id uuid,
  p_marks jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_mark jsonb;
  v_position record;
  v_direction numeric;
  v_unrealized_pnl numeric;
  v_unrealized_pnl_pct numeric;
  v_marked_at timestamptz := now();
  v_results jsonb := '[]'::jsonb;
  v_position_id uuid;
  v_price numeric;
begin
  for v_mark in select * from jsonb_array_elements(coalesce(p_marks, '[]'::jsonb))
  loop
    v_position_id := (v_mark->>'position_id')::uuid;
    v_price := (v_mark->>'current_price_usd')::numeric;
    if v_position_id is null or v_price is null or v_price <= 0 then
      continue;
    end if;

    select * into v_position from public.paper_positions
      where id = v_position_id and company_id = p_company_id and portfolio_id = p_portfolio_id and status = 'open'
      for update;

    if not found then
      continue;
    end if;

    v_direction := case when v_position.side = 'buy' then 1 else -1 end;
    v_unrealized_pnl := v_direction * (v_price - v_position.entry_price_usd) * v_position.quantity;
    v_unrealized_pnl_pct := case when v_position.entry_notional_usd > 0 then (v_unrealized_pnl / v_position.entry_notional_usd) * 100 else 0 end;

    update public.paper_positions set
      current_price_usd = v_price,
      current_notional_usd = v_position.quantity * v_price,
      unrealized_pnl_usd = v_unrealized_pnl,
      unrealized_pnl_pct = v_unrealized_pnl_pct,
      last_marked_at = v_marked_at,
      updated_at = v_marked_at
    where id = v_position_id;

    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'id', v_position_id, 'current_price_usd', v_price, 'unrealized_pnl_usd', v_unrealized_pnl, 'unrealized_pnl_pct', v_unrealized_pnl_pct
    ));
  end loop;

  return jsonb_build_object('marked', v_results);
end;
$$;

revoke all on function public.mark_all_open_paper_positions(text, uuid, jsonb) from public;
grant execute on function public.mark_all_open_paper_positions(text, uuid, jsonb) to service_role;

-- Closes an open paper position: verifies tenant + open status, calculates
-- realized P&L server-side from a caller-supplied simulated close price,
-- freezes unrealized P&L, marks the originating trade intent closed, and
-- writes the position_closed audit event — all in one transaction, so either
-- everything below commits or nothing does (if the audit insert fails, the
-- whole close is rolled back).
create or replace function public.close_paper_position(
  p_company_id text,
  p_position_id uuid,
  p_close_price_usd numeric,
  p_close_reason text,
  p_actor text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_position record;
  v_direction numeric;
  v_realized_pnl numeric;
  v_realized_pnl_pct numeric;
  v_closed_at timestamptz := now();
begin
  if p_close_reason not in (
    'user_requested', 'risk_review', 'strategy_exit', 'stop_loss', 'take_profit', 'system_rebalance', 'manual_test'
  ) then
    raise exception 'invalid close_reason: %', p_close_reason;
  end if;
  if p_close_price_usd is null or p_close_price_usd <= 0 then
    raise exception 'close price must be positive';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_position_id::text));

  select * into v_position from public.paper_positions
    where id = p_position_id and company_id = p_company_id
    for update;

  if not found then
    raise exception 'paper position not found for this workspace';
  end if;
  if v_position.status <> 'open' then
    raise exception 'paper position is not open';
  end if;

  v_direction := case when v_position.side = 'buy' then 1 else -1 end;
  v_realized_pnl := v_direction * (p_close_price_usd - v_position.entry_price_usd) * v_position.quantity;
  v_realized_pnl_pct := case when v_position.entry_notional_usd > 0 then (v_realized_pnl / v_position.entry_notional_usd) * 100 else 0 end;

  update public.paper_positions set
    status = 'closed',
    close_price_usd = p_close_price_usd,
    close_reason = p_close_reason,
    closed_at = v_closed_at,
    realized_pnl_usd = v_realized_pnl,
    current_price_usd = p_close_price_usd,
    current_notional_usd = v_position.quantity * p_close_price_usd,
    unrealized_pnl_usd = 0,
    unrealized_pnl_pct = 0,
    last_marked_at = v_closed_at,
    updated_at = v_closed_at
  where id = p_position_id;

  update public.trade_intents set status = 'closed'
    where id = v_position.trade_intent_id and company_id = p_company_id;

  insert into public.audit_ledger (company_id, event_type, subject_type, subject_id, actor, payload)
  values (p_company_id, 'position_closed', 'paper_position', p_position_id, p_actor,
    jsonb_build_object(
      'portfolioId', v_position.portfolio_id,
      'paperPositionId', p_position_id,
      'symbol', v_position.symbol,
      'side', v_position.side,
      'quantity', v_position.quantity,
      'entryPriceUsd', v_position.entry_price_usd,
      'closePriceUsd', p_close_price_usd,
      'realizedPnlUsd', v_realized_pnl,
      'realizedPnlPct', v_realized_pnl_pct,
      'closeReason', p_close_reason,
      'closedAt', v_closed_at,
      'paperOnly', true
    ));

  return jsonb_build_object(
    'id', v_position.id, 'company_id', v_position.company_id, 'portfolio_id', v_position.portfolio_id,
    'trade_intent_id', v_position.trade_intent_id, 'symbol', v_position.symbol, 'side', v_position.side,
    'quantity', v_position.quantity, 'entry_price_usd', v_position.entry_price_usd,
    'entry_notional_usd', v_position.entry_notional_usd, 'current_price_usd', p_close_price_usd,
    'current_notional_usd', v_position.quantity * p_close_price_usd, 'unrealized_pnl_usd', 0,
    'unrealized_pnl_pct', 0, 'realized_pnl_usd', v_realized_pnl, 'status', 'closed',
    'opened_at', v_position.opened_at, 'closed_at', v_closed_at, 'close_price_usd', p_close_price_usd,
    'close_reason', p_close_reason, 'last_marked_at', v_closed_at, 'created_at', v_position.created_at,
    'updated_at', v_closed_at
  );
end;
$$;

revoke all on function public.close_paper_position(text, uuid, numeric, text, text) from public;
grant execute on function public.close_paper_position(text, uuid, numeric, text, text) to service_role;
