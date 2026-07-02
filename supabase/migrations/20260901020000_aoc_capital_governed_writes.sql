-- Follow-up hardening for 20260901000000_aoc_capital_paper_trading.sql, addressing
-- two review findings on PR #1:
--
-- 1. The original "for all" policies let any authenticated tenant member write
--    directly to governed tables (trade_intents, paper_positions, trade_decisions,
--    audit_ledger, ...), bypassing the risk policy engine entirely. Tighten every
--    table to SELECT-only for `authenticated`; all writes now go through the
--    service-role client (src/lib/trading/trade-service.ts) or the function below.
--
-- 2. Risk evaluation read portfolio state and wrote a decision/position with no
--    locking, so two concurrent trade intents near a limit could both pass
--    evaluation. evaluate_and_record_trade_intent() performs the entire
--    evaluate -> decide -> open sequence in one transaction, serialized per
--    portfolio via pg_advisory_xact_lock, so concurrent requests can't race past
--    the Level 1 limits. This duplicates the six rules from
--    src/lib/trading/risk-policy-engine.ts as the authoritative enforcement copy;
--    risk-policy-engine.ts remains the tested/display copy used by the UI and unit
--    tests. Keep the two in sync when Level 1 rules change.

drop policy if exists "tenant access portfolios" on public.portfolios;
drop policy if exists "tenant access market_signals" on public.market_signals;
drop policy if exists "tenant access trade_intents" on public.trade_intents;
drop policy if exists "tenant access trade_decisions" on public.trade_decisions;
drop policy if exists "tenant access paper_positions" on public.paper_positions;
drop policy if exists "tenant access risk_constitution_rules" on public.risk_constitution_rules;
drop policy if exists "tenant access capital_levels" on public.capital_levels;
drop policy if exists "tenant access audit_ledger" on public.audit_ledger;

create policy "tenant read portfolios" on public.portfolios for select to authenticated using (public.current_company_id() = company_id);
create policy "tenant read market_signals" on public.market_signals for select to authenticated using (public.current_company_id() = company_id);
create policy "tenant read trade_intents" on public.trade_intents for select to authenticated using (public.current_company_id() = company_id);
create policy "tenant read trade_decisions" on public.trade_decisions for select to authenticated using (public.current_company_id() = company_id);
create policy "tenant read paper_positions" on public.paper_positions for select to authenticated using (public.current_company_id() = company_id);
create policy "tenant read risk_constitution_rules" on public.risk_constitution_rules for select to authenticated using (public.current_company_id() = company_id);
create policy "tenant read capital_levels" on public.capital_levels for select to authenticated using (public.current_company_id() = company_id);
create policy "tenant read audit_ledger" on public.audit_ledger for select to authenticated using (public.current_company_id() = company_id);

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

  select coalesce(sum(quantity * entry_price), 0), count(*)
    into v_current_exposure, v_open_count
    from public.paper_positions
    where portfolio_id = p_portfolio_id and status = 'open';

  select coalesce(sum(realized_pnl_usd) filter (where closed_at >= now() - interval '1 day'), 0),
         coalesce(sum(realized_pnl_usd), 0)
    into v_daily_pnl, v_weekly_pnl
    from public.paper_positions
    where portfolio_id = p_portfolio_id and status = 'closed' and closed_at >= now() - interval '7 days';

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
    'detail', format('Daily simulated P&L is $%s (limit -$20.00).', round(v_daily_pnl::numeric, 2))));

  -- max_weekly_simulated_loss
  v_passed := v_weekly_pnl > -40;
  v_all_passed := v_all_passed and v_passed;
  v_reasons := v_reasons || jsonb_build_array(jsonb_build_object(
    'ruleKey', 'max_weekly_simulated_loss', 'label', 'Max weekly simulated loss $40', 'passed', v_passed,
    'detail', format('Weekly simulated P&L is $%s (limit -$40.00).', round(v_weekly_pnl::numeric, 2))));

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
    insert into public.paper_positions (company_id, portfolio_id, trade_intent_id, symbol, side, quantity, entry_price, status)
    values (p_company_id, p_portfolio_id, v_intent_id, p_symbol, p_side, p_quantity, v_entry_price, 'open')
    returning id into v_position_id;

    insert into public.audit_ledger (company_id, event_type, subject_type, subject_id, actor, payload)
    values (p_company_id, 'position_opened', 'paper_position', v_position_id, 'risk-policy-engine',
      jsonb_build_object('symbol', p_symbol, 'quantity', p_quantity, 'entryPrice', v_entry_price));

    select jsonb_build_object(
      'id', id, 'company_id', company_id, 'portfolio_id', portfolio_id, 'trade_intent_id', trade_intent_id,
      'symbol', symbol, 'side', side, 'quantity', quantity, 'entry_price', entry_price, 'status', status,
      'opened_at', opened_at, 'closed_at', closed_at, 'realized_pnl_usd', realized_pnl_usd
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
