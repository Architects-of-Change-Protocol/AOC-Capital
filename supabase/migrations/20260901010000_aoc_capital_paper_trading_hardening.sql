-- Follow-up hardening for 20260901000000_aoc_capital_paper_trading.sql:
-- this MVP creates at most one default portfolio per tenant, so make that
-- assumption enforceable and race-safe at the DB level (see
-- getOrCreateDefaultPortfolio in src/lib/trading/trade-service.ts, which
-- falls back to re-reading the existing row on a unique-violation).

alter table public.portfolios
  add constraint portfolios_company_id_key unique (company_id);
