-- AOC Capital — live market data for paper trading only (PR #7).
--
-- Activates the 'future_live' source value reserved by
-- 20260903000000_aoc_capital_position_lifecycle_mtm.sql, renaming it to
-- 'live': paper_market_prices.source may now be 'mock' (deterministic
-- fallback, unchanged default), 'manual', or 'live' (a read-only external
-- market data provider — see src/lib/trading/live-price-provider.ts and
-- recordMarketPrice() in src/lib/trading/trade-service.ts). Adds `provider`
-- to record which external source served a live price (e.g. 'coingecko');
-- null for 'mock' and 'manual' rows.
--
-- This migration does not add, alter, or grant access to anything related to
-- order execution, broker/exchange accounts, or trading credentials. Live
-- market data is read-only price information only, gated behind the
-- LIVE_MARKET_DATA_ENABLED environment flag and off by default. Every
-- paper-trading write path (evaluate_and_record_trade_intent,
-- mark_paper_position, mark_all_open_paper_positions, close_paper_position)
-- is unchanged by this migration — they still only ever accept a caller-
-- supplied current/close price and never call an external service directly.

alter table public.paper_market_prices
  add column if not exists provider text null;

alter table public.paper_market_prices drop constraint if exists paper_market_prices_source_check;
alter table public.paper_market_prices add constraint paper_market_prices_source_check check (
  source in ('mock', 'manual', 'live')
);
