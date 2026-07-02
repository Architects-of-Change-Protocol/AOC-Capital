-- AOC Capital Advisor: guided onboarding that generates an Investment Strategy
-- Brief, Risk Profile, Recommended Capital Level, Allowed/Blocked Capabilities,
-- Initial Risk Constitution, and Suggested Paper Trading Mode before the user
-- starts trading. Advisor-side writes reuse the existing governed write path
-- (service-role client only, see src/lib/trading/trade-service.ts) and the
-- existing portfolios / risk_constitution_rules / audit_ledger tables from
-- 20260901000000_aoc_capital_paper_trading.sql — no new tables are needed since
-- the generated strategy brief and constitution are persisted as audit_ledger
-- payloads. This migration only widens the audit_ledger.event_type constraint
-- to admit the two new advisor-authored event types.

alter table public.audit_ledger drop constraint if exists audit_ledger_event_type_check;

alter table public.audit_ledger add constraint audit_ledger_event_type_check check (event_type in (
  'trade_intent_created',
  'trade_decision_approved',
  'trade_decision_rejected',
  'position_opened',
  'position_closed',
  'advisor_strategy_generated',
  'advisor_constitution_generated'
));
