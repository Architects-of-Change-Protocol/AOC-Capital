-- AOC Capital — Signal Recommendation to Trade Intent Draft Handoff (PR #11).
--
-- Lets a user explicitly convert an active paper_buy_candidate signal
-- recommendation (public.paper_signal_recommendations, Signal Engine v1)
-- into a *draft* paper trade intent. This is a new status on the existing
-- public.trade_intents table, not a new table — a draft is a trade intent
-- that has not yet been evaluated by the Level 1 risk policy engine.
--
-- Note: public.trade_intents.signal_id already references
-- public.market_signals (the older, unrelated mock "Market Signals" feed —
-- see src/app/(protected)/capital/market-signals). That column and its
-- immediate-evaluation flow (evaluate_and_record_trade_intent) are untouched
-- by this migration. This PR adds a separate paper_signal_recommendation_id
-- column so a Signal Engine v1 recommendation can be linked without
-- disturbing the existing market_signals-based flow.
--
-- Guarantees preserved by this handoff, following the governed-writes
-- pattern established in 20260908000000_aoc_capital_atomic_audit_writes.sql:
--   - creating a draft never runs the Level 1 risk policy engine
--   - creating a draft never opens a paper position
--   - creating a draft never enables real execution
--   - the draft insert, marking the source signal converted, and the audit
--     event all commit in one transaction (or none of them do)
--   - only a service-role client can call the RPC below; RLS on both tables
--     remains SELECT-only for `authenticated`

alter table public.trade_intents drop constraint if exists trade_intents_status_check;
alter table public.trade_intents add constraint trade_intents_status_check
  check (status in ('draft', 'pending', 'approved', 'rejected', 'closed'));

alter table public.trade_intents drop constraint if exists trade_intents_source_check;
alter table public.trade_intents add constraint trade_intents_source_check
  check (source in ('manual', 'signal', 'signal_recommendation'));

alter table public.trade_intents
  add column if not exists paper_signal_recommendation_id uuid null
    references public.paper_signal_recommendations(id) on delete set null;

create index if not exists trade_intents_paper_signal_recommendation_idx
  on public.trade_intents(paper_signal_recommendation_id)
  where paper_signal_recommendation_id is not null;

alter table public.paper_signal_recommendations
  add column if not exists converted_trade_intent_id uuid null
    references public.trade_intents(id) on delete set null;

alter table public.paper_signal_recommendations
  add column if not exists converted_at timestamptz null;

alter table public.paper_signal_recommendations
  add column if not exists converted_by text null;

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
  'signal_converted_to_draft_trade_intent'
));

-- Converts one active paper_buy_candidate signal into a draft trade intent,
-- marks the signal converted, and records the audit event, atomically.
-- Side/quantity/notional are always derived server-side from the signal row
-- itself (side is always 'buy' — the only side a paper_buy_candidate can
-- represent) — there is no client-supplied symbol/side/quantity/notional
-- parameter for this function to trust. Locks the signal row for update so
-- two concurrent conversion requests for the same signal can't both succeed.
create or replace function public.create_draft_trade_intent_from_signal_and_audit(
  p_company_id text,
  p_portfolio_id uuid,
  p_signal_id uuid,
  p_actor text,
  p_audit_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_signal public.paper_signal_recommendations;
  v_intent public.trade_intents;
  v_quantity numeric;
begin
  if p_company_id is null or length(trim(p_company_id)) = 0 then
    raise exception 'company_id is required';
  end if;

  if p_portfolio_id is null then
    raise exception 'portfolio_id is required';
  end if;

  if p_signal_id is null then
    raise exception 'signal_id is required';
  end if;

  select * into v_signal
    from public.paper_signal_recommendations
    where id = p_signal_id and company_id = p_company_id and portfolio_id = p_portfolio_id
    for update;

  if not found then
    raise exception 'signal not found for this workspace';
  end if;

  if v_signal.converted_trade_intent_id is not null then
    raise exception 'signal already converted to a draft trade intent';
  end if;

  if v_signal.action <> 'paper_buy_candidate' then
    raise exception 'signal action "%" is not convertible to a draft trade intent', v_signal.action;
  end if;

  if v_signal.status <> 'active' then
    raise exception 'signal status "%" is not convertible to a draft trade intent', v_signal.status;
  end if;

  if v_signal.suggested_notional_usd is null or v_signal.suggested_notional_usd <= 0 then
    raise exception 'signal has no suggested notional to convert';
  end if;

  if v_signal.market_price_usd is null or v_signal.market_price_usd <= 0 then
    raise exception 'signal has no observed market price to size a draft trade intent from';
  end if;

  v_quantity := v_signal.suggested_notional_usd / v_signal.market_price_usd;

  insert into public.trade_intents (
    company_id, portfolio_id, symbol, side, quantity, notional_usd, leverage,
    source, paper_signal_recommendation_id, created_by, status
  )
  values (
    p_company_id, p_portfolio_id, v_signal.symbol, 'buy', v_quantity, v_signal.suggested_notional_usd, 1,
    'signal_recommendation', p_signal_id, p_actor, 'draft'
  )
  returning * into v_intent;

  update public.paper_signal_recommendations
    set converted_trade_intent_id = v_intent.id, converted_at = now(), converted_by = p_actor
    where id = p_signal_id
    returning * into v_signal;

  -- Same transaction as the insert/update above: if this fails, both the
  -- draft trade intent and the signal's converted marker roll back too —
  -- there is no window where a draft exists without audit evidence.
  insert into public.audit_ledger (company_id, event_type, subject_type, subject_id, actor, payload)
  values (p_company_id, 'signal_converted_to_draft_trade_intent', 'trade_intent', v_intent.id, p_actor, p_audit_payload);

  return jsonb_build_object('intent', to_jsonb(v_intent), 'signal', to_jsonb(v_signal));
end;
$$;

revoke all on function public.create_draft_trade_intent_from_signal_and_audit(text, uuid, uuid, text, jsonb) from public;
grant execute on function public.create_draft_trade_intent_from_signal_and_audit(text, uuid, uuid, text, jsonb) to service_role;
