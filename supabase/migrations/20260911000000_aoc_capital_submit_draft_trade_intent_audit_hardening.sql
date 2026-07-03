-- AOC Capital — Submit Draft Intent Audit Payload Hardening (PR #12 follow-up).
--
-- Enriches the trade_intent_submitted_for_review audit_ledger payload written
-- by public.submit_draft_trade_intent_for_review()
-- (20260910000000_aoc_capital_submit_draft_trade_intent_for_review.sql) with
-- explicit governance evidence, so the audit trail itself states — not just
-- implies via the absence of broker/order code — that submission is a
-- paper-only, non-executing transition:
--   - paper_only / real_execution_locked / no_real_execution / no_broker_order
--     / no_order_placed: explicit governance flags
--   - submitted_from / submitted_to: the exact status transition this event
--     represents ('draft' -> 'risk_constitution_review')
--
-- This is payload-only. It does not touch risk evaluation, paper position
-- creation, or status transition logic — v_intent.status is still set to the
-- Level 1 verdict ('approved'/'rejected') further down in the same function,
-- unchanged from 20260910000000. submitted_to describes the review stage this
-- audit event marks entry into, not a column value.
create or replace function public.submit_draft_trade_intent_for_review(
  p_company_id text,
  p_portfolio_id uuid,
  p_intent_id uuid,
  p_actor text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_intent public.trade_intents;
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
  if p_company_id is null or length(trim(p_company_id)) = 0 then
    raise exception 'company_id is required';
  end if;
  if p_portfolio_id is null then
    raise exception 'portfolio_id is required';
  end if;
  if p_intent_id is null then
    raise exception 'intent_id is required';
  end if;

  -- Serialize the whole submit -> evaluate -> decide -> open sequence per
  -- portfolio, same as evaluate_and_record_trade_intent(), so a submitted
  -- draft can't race a manually-created trade intent past a portfolio-wide
  -- exposure or position-count limit.
  perform pg_advisory_xact_lock(hashtext(p_portfolio_id::text));

  select * into v_intent
    from public.trade_intents
    where id = p_intent_id and company_id = p_company_id and portfolio_id = p_portfolio_id
    for update;

  if not found then
    raise exception 'trade intent not found for this workspace';
  end if;

  if v_intent.status <> 'draft' then
    raise exception 'trade intent status "%" is not submittable for review — only a draft can be submitted', v_intent.status;
  end if;

  insert into public.audit_ledger (company_id, event_type, subject_type, subject_id, actor, payload)
  values (p_company_id, 'trade_intent_submitted_for_review', 'trade_intent', v_intent.id, p_actor,
    jsonb_build_object(
      'symbol', v_intent.symbol,
      'side', v_intent.side,
      'quantity', v_intent.quantity,
      'notionalUsd', v_intent.notional_usd,
      'paper_only', true,
      'real_execution_locked', true,
      'submitted_from', 'draft',
      'submitted_to', 'risk_constitution_review',
      'no_real_execution', true,
      'no_broker_order', true,
      'no_order_placed', true
    ));

  select base_capital_usd into v_base_capital from public.portfolios where id = p_portfolio_id;
  if v_base_capital is null then
    raise exception 'portfolio % not found', p_portfolio_id;
  end if;

  select coalesce(sum(quantity * entry_price_usd), 0), count(*)
    into v_current_exposure, v_open_count
    from public.paper_positions
    where portfolio_id = p_portfolio_id and status = 'open';

  -- Rolling 24h / rolling 7d windows over realized P&L only, matching
  -- evaluate_and_record_trade_intent() exactly (see that function's header
  -- note in 20260903000000_aoc_capital_position_lifecycle_mtm.sql).
  select coalesce(sum(realized_pnl_usd) filter (where closed_at >= v_now - interval '1 day'), 0),
         coalesce(sum(realized_pnl_usd), 0)
    into v_daily_pnl, v_weekly_pnl
    from public.paper_positions
    where portfolio_id = p_portfolio_id and status = 'closed' and closed_at >= v_now - interval '7 days';

  -- no_leverage
  v_passed := v_intent.leverage = 1;
  v_all_passed := v_all_passed and v_passed;
  v_reasons := v_reasons || jsonb_build_array(jsonb_build_object(
    'ruleKey', 'no_leverage', 'label', 'No leverage', 'passed', v_passed,
    'detail', case when v_passed then 'Trade uses 1x (unleveraged) exposure.'
                   else format('Trade requests %sx leverage; Level 1 requires exactly 1x.', v_intent.leverage) end));

  -- no_real_shorts
  v_passed := v_intent.side <> 'sell';
  v_all_passed := v_all_passed and v_passed;
  v_reasons := v_reasons || jsonb_build_array(jsonb_build_object(
    'ruleKey', 'no_real_shorts', 'label', 'No real shorts', 'passed', v_passed,
    'detail', case when v_passed then 'Trade is a long (buy) intent.'
                   else 'Short-side trade intents are not permitted at Level 1.' end));

  -- max_simulated_exposure
  v_passed := (v_current_exposure + v_intent.notional_usd) / nullif(v_base_capital, 0) <= 0.6;
  v_all_passed := v_all_passed and v_passed;
  v_reasons := v_reasons || jsonb_build_array(jsonb_build_object(
    'ruleKey', 'max_simulated_exposure', 'label', 'Max 60% simulated exposure', 'passed', v_passed,
    'detail', format('Projected exposure would be %s%% of base capital (limit 60%%).',
      round((((v_current_exposure + v_intent.notional_usd) / nullif(v_base_capital, 0)) * 100)::numeric, 1))));

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
  values (p_company_id, v_intent.id, v_verdict, v_reasons, 'level-1')
  returning id, decided_at into v_decision_id, v_decided_at;

  update public.trade_intents set status = v_verdict where id = v_intent.id
    returning * into v_intent;

  insert into public.audit_ledger (company_id, event_type, subject_type, subject_id, actor, payload)
  values (p_company_id, case when v_verdict = 'approved' then 'trade_decision_approved' else 'trade_decision_rejected' end,
    'trade_intent', v_intent.id, 'risk-policy-engine',
    jsonb_build_object('verdict', v_verdict, 'reasons', v_reasons, 'policyVersion', 'level-1'));

  if v_verdict = 'approved' then
    v_entry_price := v_intent.notional_usd / v_intent.quantity;
    insert into public.paper_positions (
      company_id, portfolio_id, trade_intent_id, symbol, side, quantity,
      entry_price_usd, entry_notional_usd, current_price_usd, current_notional_usd, status
    )
    values (
      p_company_id, p_portfolio_id, v_intent.id, v_intent.symbol, v_intent.side, v_intent.quantity,
      v_entry_price, v_intent.notional_usd, v_entry_price, v_intent.notional_usd, 'open'
    )
    returning id into v_position_id;

    insert into public.audit_ledger (company_id, event_type, subject_type, subject_id, actor, payload)
    values (p_company_id, 'position_opened', 'paper_position', v_position_id, 'risk-policy-engine',
      jsonb_build_object('symbol', v_intent.symbol, 'quantity', v_intent.quantity, 'entryPriceUsd', v_entry_price, 'paperOnly', true));

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
    'intent', to_jsonb(v_intent),
    'decision', jsonb_build_object(
      'id', v_decision_id, 'company_id', p_company_id, 'trade_intent_id', v_intent.id, 'verdict', v_verdict,
      'reasons', v_reasons, 'policy_version', 'level-1', 'decided_at', v_decided_at
    ),
    'position', v_position
  );
end;
$$;
