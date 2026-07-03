-- AOC Capital — Atomic Audit Writes for Strategy Selection and Signal
-- Generation.
--
-- Review finding on Signal Engine v1: strategy selection and signal
-- generation each performed a governed-state write followed by a *separate*
-- application-level audit_ledger insert (src/lib/capital/strategy-selection-
-- service.ts and src/lib/capital/signal-engine-service.ts). If the state
-- write succeeded and the audit write then failed, the API returned an
-- error, but the governed state was already persisted — weakening the
-- guarantee from "every persisted governed state change has audit evidence"
-- to "every successful API response has audit evidence".
--
-- This migration closes that gap with two purpose-built RPC functions that
-- perform the governed write and its audit_ledger event in a single
-- transaction, following the same pattern as evaluate_and_record_trade_intent()
-- (20260901020000_aoc_capital_governed_writes.sql) and close_paper_position()
-- (20260903000000_aoc_capital_position_lifecycle_mtm.sql): if either half
-- fails, the whole function fails and nothing commits.
--
-- Both functions are security definer, scoped to search_path = public, and
-- granted to service_role only — the browser Supabase client has no execute
-- grant, so this does not open a new arbitrary mutation path. RLS on the
-- underlying tables remains SELECT-only for `authenticated` (unchanged by
-- this migration).

-- 1. Strategy selection: upsert portfolio_strategy_profiles + insert the
-- strategy_selected audit event, atomically.
create or replace function public.select_portfolio_strategy_profile_and_audit(
  p_company_id text,
  p_portfolio_id uuid,
  p_strategy_key text,
  p_strategy_name text,
  p_risk_profile text,
  p_supported_symbols text[],
  p_actor text,
  p_audit_payload jsonb
)
returns public.portfolio_strategy_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.portfolio_strategy_profiles;
begin
  if p_company_id is null or length(trim(p_company_id)) = 0 then
    raise exception 'company_id is required';
  end if;

  if p_portfolio_id is null then
    raise exception 'portfolio_id is required';
  end if;

  if p_strategy_key is null or length(trim(p_strategy_key)) = 0 then
    raise exception 'strategy_key is required';
  end if;

  insert into public.portfolio_strategy_profiles (
    company_id,
    portfolio_id,
    strategy_key,
    strategy_name,
    risk_profile,
    supported_symbols,
    paper_only,
    real_execution_locked,
    selected_by,
    selected_at,
    updated_at
  )
  values (
    p_company_id,
    p_portfolio_id,
    p_strategy_key,
    p_strategy_name,
    p_risk_profile,
    p_supported_symbols,
    true,
    true,
    p_actor,
    now(),
    now()
  )
  on conflict (company_id, portfolio_id)
  do update set
    strategy_key = excluded.strategy_key,
    strategy_name = excluded.strategy_name,
    risk_profile = excluded.risk_profile,
    supported_symbols = excluded.supported_symbols,
    paper_only = true,
    real_execution_locked = true,
    selected_by = excluded.selected_by,
    selected_at = now(),
    updated_at = now()
  returning * into v_profile;

  -- Same transaction as the upsert above: if this insert fails (e.g. a
  -- future audit_ledger constraint violation), the upsert rolls back too —
  -- there is no window where the profile is persisted without audit
  -- evidence.
  insert into public.audit_ledger (
    company_id,
    event_type,
    subject_type,
    subject_id,
    actor,
    payload
  )
  values (
    p_company_id,
    'strategy_selected',
    'portfolio',
    p_portfolio_id,
    p_actor,
    p_audit_payload
  );

  return v_profile;
end;
$$;

revoke all on function public.select_portfolio_strategy_profile_and_audit(text, uuid, text, text, text, text[], text, jsonb) from public;
grant execute on function public.select_portfolio_strategy_profile_and_audit(text, uuid, text, text, text, text[], text, jsonb) to service_role;

-- 2. Signal generation: insert a batch of paper_signal_recommendations +
-- insert the signals_generated audit event, atomically.
create or replace function public.insert_paper_signal_recommendations_and_audit(
  p_company_id text,
  p_portfolio_id uuid,
  p_actor text,
  p_signals jsonb,
  p_audit_payload jsonb
)
returns setof public.paper_signal_recommendations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_signal jsonb;
  v_inserted public.paper_signal_recommendations;
begin
  if p_company_id is null or length(trim(p_company_id)) = 0 then
    raise exception 'company_id is required';
  end if;

  if p_portfolio_id is null then
    raise exception 'portfolio_id is required';
  end if;

  if p_signals is null or jsonb_typeof(p_signals) <> 'array' then
    raise exception 'signals must be a JSON array';
  end if;

  if jsonb_array_length(p_signals) = 0 then
    raise exception 'signals array must not be empty';
  end if;

  for v_signal in
    select value from jsonb_array_elements(p_signals)
  loop
    insert into public.paper_signal_recommendations (
      id,
      company_id,
      portfolio_id,
      strategy_key,
      strategy_name,
      symbol,
      action,
      strength,
      confidence_score,
      suggested_notional_usd,
      market_price_usd,
      market_data_source,
      rationale,
      risk_notes,
      blocked_reasons,
      required_user_action,
      paper_only,
      real_execution_locked,
      status,
      generated_at
    )
    values (
      coalesce((v_signal->>'id')::uuid, gen_random_uuid()),
      p_company_id,
      p_portfolio_id,
      v_signal->>'strategy_key',
      v_signal->>'strategy_name',
      v_signal->>'symbol',
      v_signal->>'action',
      v_signal->>'strength',
      coalesce((v_signal->>'confidence_score')::integer, 0),
      nullif(v_signal->>'suggested_notional_usd', '')::numeric,
      nullif(v_signal->>'market_price_usd', '')::numeric,
      coalesce(v_signal->>'market_data_source', 'unavailable'),
      coalesce(v_signal->'rationale', '[]'::jsonb),
      coalesce(v_signal->'risk_notes', '[]'::jsonb),
      coalesce(v_signal->'blocked_reasons', '[]'::jsonb),
      coalesce(v_signal->>'required_user_action', 'Review only'),
      true,
      true,
      coalesce(v_signal->>'status', 'active'),
      coalesce((v_signal->>'generated_at')::timestamptz, now())
    )
    returning * into v_inserted;

    return next v_inserted;
  end loop;

  -- Same transaction as every row insert above: if this fails, plpgsql
  -- aborts the whole function and every row inserted in the loop rolls back
  -- too — there is no window where signals are persisted without audit
  -- evidence, and no window where an audit event exists without the signals
  -- it describes.
  insert into public.audit_ledger (
    company_id,
    event_type,
    subject_type,
    subject_id,
    actor,
    payload
  )
  values (
    p_company_id,
    'signals_generated',
    'portfolio',
    p_portfolio_id,
    p_actor,
    p_audit_payload
  );

  return;
end;
$$;

revoke all on function public.insert_paper_signal_recommendations_and_audit(text, uuid, text, jsonb, jsonb) from public;
grant execute on function public.insert_paper_signal_recommendations_and_audit(text, uuid, text, jsonb, jsonb) to service_role;
