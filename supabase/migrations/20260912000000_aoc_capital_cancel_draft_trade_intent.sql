-- AOC Capital — Cancel / Withdraw Draft Trade Intent (PR #13).
--
-- Lets a user explicitly withdraw an existing draft paper trade intent
-- (public.trade_intents, status = 'draft' — see
-- 20260909000000_aoc_capital_signal_trade_intent_draft_handoff.sql) before it
-- is ever submitted for Risk Constitution review. This closes the draft
-- lifecycle gap left after PR #12: a draft could be created and submitted,
-- but never cancelled.
--
-- Cancellation is a terminal state, distinct from every other status:
--   - a cancelled draft was never evaluated by the Level 1 risk policy engine
--   - a cancelled draft never has trade_decisions written for it
--   - a cancelled draft never opens (or alters) a paper_positions row
--   - a cancelled draft cannot later be submitted, approved, or rejected
-- Only a trade intent whose status is still exactly 'draft' — and which has
-- no paper_positions row — is eligible; anything already submitted (pending),
-- decided (approved/rejected), closed, or already cancelled is rejected
-- before any write happens.
--
-- If the draft came from a Signal Engine v1 recommendation
-- (paper_signal_recommendation_id is not null), the source signal's converted
-- marker is released — but only if it still points at the draft being
-- cancelled — so the signal can become convertible again if it remains
-- otherwise eligible. The cancelled draft row itself, and the signal row, are
-- never deleted: both remain historical/audit evidence.
--
-- Following the atomic-audit pattern established in
-- 20260908000000_aoc_capital_atomic_audit_writes.sql, the status update, the
-- signal marker release, and the audit event all commit in one transaction,
-- or none of them do. Only a service-role client can call the RPC below; RLS
-- on trade_intents, paper_signal_recommendations, and audit_ledger remains
-- SELECT-only for `authenticated`.

alter table public.trade_intents drop constraint if exists trade_intents_status_check;
alter table public.trade_intents add constraint trade_intents_status_check
  check (status in ('draft', 'pending', 'approved', 'rejected', 'closed', 'cancelled'));

alter table public.trade_intents
  add column if not exists cancelled_at timestamptz null;

alter table public.trade_intents
  add column if not exists cancelled_by text null;

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
  'draft_trade_intent_cancelled'
));

-- Cancels one draft trade intent and, if it came from a signal recommendation
-- whose converted marker still points at this draft, releases that marker —
-- atomically with the draft_trade_intent_cancelled audit event. Never runs
-- the risk policy engine, never touches trade_decisions, and never touches
-- paper_positions except to check none exists for this draft.
create or replace function public.cancel_draft_trade_intent_and_audit(
  p_company_id text,
  p_portfolio_id uuid,
  p_trade_intent_id uuid,
  p_actor text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_intent public.trade_intents;
  v_signal public.paper_signal_recommendations;
  v_signal_released boolean := false;
begin
  if p_company_id is null or length(trim(p_company_id)) = 0 then
    raise exception 'company_id is required';
  end if;

  if p_portfolio_id is null then
    raise exception 'portfolio_id is required';
  end if;

  if p_trade_intent_id is null then
    raise exception 'trade_intent_id is required';
  end if;

  select * into v_intent
    from public.trade_intents
    where id = p_trade_intent_id and company_id = p_company_id and portfolio_id = p_portfolio_id
    for update;

  if not found then
    raise exception 'trade intent not found for this workspace';
  end if;

  if v_intent.status <> 'draft' then
    raise exception 'trade intent status "%" is not cancellable — only a draft can be cancelled', v_intent.status;
  end if;

  if exists (
    select 1 from public.paper_positions where trade_intent_id = v_intent.id
  ) then
    raise exception 'trade intent already has a paper position and cannot be cancelled';
  end if;

  if v_intent.paper_signal_recommendation_id is not null then
    select * into v_signal
      from public.paper_signal_recommendations
      where id = v_intent.paper_signal_recommendation_id
        and company_id = p_company_id
        and portfolio_id = p_portfolio_id
      for update;
  end if;

  update public.trade_intents
    set status = 'cancelled', cancelled_at = now(), cancelled_by = p_actor
    where id = v_intent.id
    returning * into v_intent;

  if v_signal.id is not null and v_signal.converted_trade_intent_id = v_intent.id then
    update public.paper_signal_recommendations
      set converted_trade_intent_id = null, converted_at = null, converted_by = null
      where id = v_signal.id
      returning * into v_signal;
    v_signal_released := true;
  end if;

  -- Same transaction as the status update and signal-marker release above: if
  -- this audit insert fails, the cancellation and the marker release both
  -- roll back too — a draft is never left cancelled without audit evidence.
  insert into public.audit_ledger (company_id, event_type, subject_type, subject_id, actor, payload)
  values (p_company_id, 'draft_trade_intent_cancelled', 'trade_intent', v_intent.id, p_actor,
    jsonb_build_object(
      'paper_only', true,
      'real_execution_locked', true,
      'trade_intent_id', v_intent.id,
      'portfolio_id', p_portfolio_id,
      'source', v_intent.source,
      'paper_signal_recommendation_id', v_intent.paper_signal_recommendation_id,
      'cancelled_from', 'draft',
      'status_after_cancellation', v_intent.status,
      'source_signal_released', v_signal_released,
      'no_risk_review_performed', true,
      'no_paper_position_created', true,
      'no_real_execution', true,
      'no_broker_order', true,
      'no_order_placed', true
    ));

  return jsonb_build_object(
    'intent', to_jsonb(v_intent),
    'signal', case when v_signal.id is not null then to_jsonb(v_signal) else null end
  );
end;
$$;

revoke all on function public.cancel_draft_trade_intent_and_audit(text, uuid, uuid, text) from public;
grant execute on function public.cancel_draft_trade_intent_and_audit(text, uuid, uuid, text) to service_role;
