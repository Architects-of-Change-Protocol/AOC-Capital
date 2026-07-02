-- AOC Capital — Demo Strategy Sandbox (PR #5).
--
-- Adds a single new audit_ledger event type, 'demo_scenario_loaded', written
-- once by src/lib/demo/demo-write-service.ts after a full canned scenario
-- (advisor confirmation -> trade intents -> risk decisions -> paper positions
-- -> mark-to-market -> closed positions) has been run through the existing
-- governed write paths from PR #1-#4. This migration adds no new tables, no
-- new write functions, and no new privileges — the demo sandbox is a
-- read-and-orchestrate feature that reuses evaluate_and_record_trade_intent(),
-- mark_paper_position(), and close_paper_position() as-is. The event type is
-- also used as the idempotency marker so the demo only loads once per company.

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
  'demo_scenario_loaded'
));
