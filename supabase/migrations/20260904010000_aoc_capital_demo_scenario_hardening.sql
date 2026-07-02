-- AOC Capital Demo Strategy Sandbox — hardening follow-up (PR #5 review).
--
-- Adds the 'demo_scenario_reset' audit_ledger event type, written once by
-- resetDemoScenario() (src/lib/demo/demo-write-service.ts) after a Reset Demo
-- run completes, so a reset is itself a governed, audited action rather than
-- a silent delete. This migration adds no new tables, columns, or write
-- functions, and grants no new privileges — Reset Demo deletes rows through
-- the same service-role client (privileged()) every other governed write in
-- this module already uses, scoped to company_id and to the exact row ids
-- recorded in the demo_scenario_loaded marker's payload (see manifest.ts).

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
  'demo_scenario_reset'
));
