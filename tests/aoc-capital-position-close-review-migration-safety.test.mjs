// ─── AOC Capital Governed Paper Close Position Review (PR #17) — Migration
// Static Safety ───────────────────────────────────────────────────────────
// No live Supabase test harness exists in this repo (same rationale as
// tests/aoc-capital-draft-cancel-migration-safety.test.mjs), so these tests
// statically inspect
// supabase/migrations/20260913000000_aoc_capital_governed_close_position_review.sql
// to pin down that:
//   - paper_positions gains closed_by/close_notional_usd/realized_pnl_pct/
//     close_review_id columns
//   - a new paper_position_close_reviews table is created, scoped by
//     company_id + portfolio_id, with a unique partial index preventing more
//     than one approved close review per position
//   - audit_ledger gains paper_position_close_review_approved and
//     paper_position_closed event types alongside every prior event type
//   - the new RPC locks the paper_positions row FOR UPDATE, scoped by
//     company_id and portfolio_id, and rejects anything ineligible before
//     any write happens
//   - the RPC derives close values only from the locked row's own stored
//     current valuation — never from a client-supplied value and never from
//     a fresh price fetch
//   - the RPC inserts the close review, updates the position to closed, and
//     writes both audit events in the same transaction
//   - the audit payloads carry the required governance flags
//   - the RPC is security definer, scoped to search_path, and granted to
//     service_role only
//   - no new browser-writable (insert/update/delete) policy is introduced

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const MIGRATION_PATH = "supabase/migrations/20260913000000_aoc_capital_governed_close_position_review.sql";
const migrationSql = fs.readFileSync(MIGRATION_PATH, "utf8");

function extractFunctionBody(sql, fnName) {
  const re = new RegExp(`create or replace function public\\.${fnName}\\([\\s\\S]*?\\$\\$;`);
  const match = sql.match(re);
  assert.ok(match, `expected to find function public.${fnName}`);
  return match[0];
}

// ─── paper_positions changes ────────────────────────────────────────────────

test("paper_positions gains closed_by, close_notional_usd, realized_pnl_pct, and close_review_id columns", () => {
  assert.match(migrationSql, /add column if not exists closed_by text null/);
  assert.match(migrationSql, /add column if not exists close_notional_usd numeric null/);
  assert.match(migrationSql, /add column if not exists realized_pnl_pct numeric null/);
  assert.match(migrationSql, /add column if not exists close_review_id uuid null references public\.paper_position_close_reviews\(id\)/);
});

// ─── paper_position_close_reviews table ─────────────────────────────────────

test("paper_position_close_reviews is created, scoped by company_id and portfolio_id, referencing paper_positions", () => {
  assert.match(migrationSql, /create table if not exists public\.paper_position_close_reviews/);
  assert.match(migrationSql, /company_id text not null/);
  assert.match(migrationSql, /portfolio_id uuid not null references public\.portfolios\(id\)/);
  assert.match(migrationSql, /paper_position_id uuid not null references public\.paper_positions\(id\)/);
  assert.match(migrationSql, /decision text not null check \(decision in \('approved', 'rejected'\)\)/);
});

test("a unique partial index prevents more than one approved close review per paper position", () => {
  const indexMatch = migrationSql.match(
    /create unique index if not exists paper_position_close_reviews_one_approved_per_position\s*\n\s*on public\.paper_position_close_reviews\(company_id, portfolio_id, paper_position_id\)\s*\n\s*where decision = 'approved';/
  );
  assert.ok(indexMatch, "expected a unique partial index on (company_id, portfolio_id, paper_position_id) where decision = 'approved'");
});

test("paper_position_close_reviews has RLS enabled with a SELECT-only tenant read policy", () => {
  assert.match(migrationSql, /alter table public\.paper_position_close_reviews enable row level security;/);
  assert.match(migrationSql, /create policy "tenant read paper_position_close_reviews"\s*\n\s*on public\.paper_position_close_reviews for select to authenticated/);
});

// ─── audit_ledger event types ───────────────────────────────────────────────

test("audit_ledger_event_type_check gains paper_position_close_review_approved and paper_position_closed alongside every prior event type", () => {
  assert.match(migrationSql, /'draft_trade_intent_cancelled',\s*\n\s*'paper_position_close_review_approved',\s*\n\s*'paper_position_closed'/);
});

// ─── The atomic RPC ──────────────────────────────────────────────────────────

const rpcBody = extractFunctionBody(migrationSql, "close_paper_position_with_review_and_audit");

test("close_paper_position_with_review_and_audit returns jsonb, is language plpgsql, security definer, and pins search_path", () => {
  assert.match(rpcBody, /returns jsonb/);
  assert.match(rpcBody, /language plpgsql/);
  assert.match(rpcBody, /security definer/);
  assert.match(rpcBody, /set search_path = public, pg_temp/);
});

test("the RPC has no client-suppliable close price/notional/realized P&L/quantity/symbol/status parameter — only ids and an actor", () => {
  const signatureMatch = migrationSql.match(/create or replace function public\.close_paper_position_with_review_and_audit\(([\s\S]*?)\)\s*\nreturns jsonb/);
  assert.ok(signatureMatch);
  const params = signatureMatch[1];
  assert.doesNotMatch(params, /p_close_price|p_close_notional|p_realized_pnl|p_quantity|p_symbol|p_status/);
  assert.match(params, /p_company_id text/);
  assert.match(params, /p_portfolio_id uuid/);
  assert.match(params, /p_paper_position_id uuid/);
  assert.match(params, /p_actor text/);
});

test("the RPC locks the paper_positions row for update, scoped by company_id and portfolio_id", () => {
  const selectIndex = rpcBody.indexOf("select * into v_position");
  const forUpdateIndex = rpcBody.indexOf("for update");
  assert.ok(selectIndex >= 0 && forUpdateIndex >= 0);
  assert.ok(selectIndex < forUpdateIndex);
  const selectClause = rpcBody.slice(selectIndex, forUpdateIndex);
  assert.match(selectClause, /company_id = p_company_id/);
  assert.match(selectClause, /portfolio_id = p_portfolio_id/);
});

test("the RPC rejects an already-closed position and any non-open position before deriving close values", () => {
  const alreadyClosedIndex = rpcBody.indexOf("if v_position.status = 'closed' then");
  const notOpenIndex = rpcBody.indexOf("if v_position.status <> 'open' then");
  const deriveIndex = rpcBody.indexOf("v_close_price_usd := v_position.current_price_usd");
  assert.ok(alreadyClosedIndex >= 0 && notOpenIndex >= 0 && deriveIndex >= 0);
  assert.ok(alreadyClosedIndex < deriveIndex);
  assert.ok(notOpenIndex < deriveIndex);
});

test("the RPC requires current_price_usd, current_notional_usd, entry_notional_usd, and a positive quantity before deriving close values", () => {
  assert.match(rpcBody, /if v_position\.current_price_usd is null or v_position\.current_notional_usd is null then/);
  assert.match(rpcBody, /if v_position\.entry_notional_usd is null then/);
  assert.match(rpcBody, /if v_position\.quantity is null or v_position\.quantity <= 0 then/);
});

test("the RPC rejects a duplicate approved close review for the same position", () => {
  const existsMatch = rpcBody.match(/if exists \(\s*\n\s*select 1\s*\n\s*from public\.paper_position_close_reviews\s*\n\s*where company_id = p_company_id\s*\n\s*and portfolio_id = p_portfolio_id\s*\n\s*and paper_position_id = p_paper_position_id\s*\n\s*and decision = 'approved'/);
  assert.ok(existsMatch, "expected a duplicate-approved-review guard scoped by company_id, portfolio_id, and paper_position_id");
});

test("the RPC derives close price, close notional, and realized P&L only from the locked position's own stored current valuation — never a fresh price fetch", () => {
  assert.match(rpcBody, /v_close_price_usd := v_position\.current_price_usd;/);
  assert.match(rpcBody, /v_close_notional_usd := v_position\.current_notional_usd;/);
  assert.match(rpcBody, /v_entry_notional_usd := v_position\.entry_notional_usd;/);
  assert.match(rpcBody, /v_realized_pnl_usd := v_close_notional_usd - v_entry_notional_usd;/);
  assert.doesNotMatch(rpcBody, /recordMarketPrice|getSimulatedPrice|fetchLivePrice|paper_market_prices/);
});

test("the RPC inserts an approved close review before updating the paper position to closed", () => {
  const insertIndex = rpcBody.indexOf("insert into public.paper_position_close_reviews");
  const updateIndex = rpcBody.indexOf("update public.paper_positions");
  assert.ok(insertIndex >= 0 && updateIndex >= 0);
  assert.ok(insertIndex < updateIndex);
  const insertClause = rpcBody.slice(insertIndex, updateIndex);
  assert.match(insertClause, /'approved', 'approved'/);
});

test("the RPC updates paper_positions to closed and sets closed_at/closed_by/close_price_usd/close_notional_usd/realized_pnl_usd/realized_pnl_pct/close_review_id", () => {
  const updateMatch = rpcBody.match(/update public\.paper_positions\s*\n\s*set\s*\n\s*status = 'closed',\s*\n\s*closed_at = v_now,\s*\n\s*closed_by = p_actor,\s*\n\s*close_price_usd = v_close_price_usd,\s*\n\s*close_notional_usd = v_close_notional_usd,\s*\n\s*realized_pnl_usd = v_realized_pnl_usd,\s*\n\s*realized_pnl_pct = v_realized_pnl_pct,\s*\n\s*close_review_id = v_review\.id/);
  assert.ok(updateMatch);
});

test("the RPC scopes the paper_positions update by company_id and portfolio_id", () => {
  const updateIndex = rpcBody.indexOf("update public.paper_positions");
  const returningIndex = rpcBody.indexOf("returning * into v_position", updateIndex);
  const updateClause = rpcBody.slice(updateIndex, returningIndex);
  assert.match(updateClause, /company_id = p_company_id/);
  assert.match(updateClause, /portfolio_id = p_portfolio_id/);
});

test("the RPC writes the paper_position_close_review_approved audit event after the review insert and position update", () => {
  const updateIndex = rpcBody.indexOf("update public.paper_positions");
  const auditIndex = rpcBody.indexOf("'paper_position_close_review_approved'");
  assert.ok(updateIndex >= 0 && auditIndex >= 0);
  assert.ok(updateIndex < auditIndex);
});

test("the RPC writes the paper_position_closed audit event after the paper_position_close_review_approved audit event", () => {
  const reviewAuditIndex = rpcBody.indexOf("'paper_position_close_review_approved'");
  const closedAuditIndex = rpcBody.indexOf("'paper_position_closed'");
  assert.ok(reviewAuditIndex >= 0 && closedAuditIndex >= 0);
  assert.ok(reviewAuditIndex < closedAuditIndex);
});

const reviewAuditMatch = rpcBody.match(/insert into public\.audit_ledger[\s\S]*?'paper_position_close_review_approved'[\s\S]*?jsonb_build_object\(([\s\S]*?)\)\);/);
const closedAuditMatch = rpcBody.match(/insert into public\.audit_ledger[\s\S]*?'paper_position_closed'[\s\S]*?jsonb_build_object\(([\s\S]*?)\)\);/);

test("the paper_position_close_review_approved audit payload includes all required governance flags", () => {
  assert.ok(reviewAuditMatch, "expected to find the paper_position_close_review_approved audit insert");
  const payload = reviewAuditMatch[1];
  assert.match(payload, /'paper_only',\s*true/);
  assert.match(payload, /'real_execution_locked',\s*true/);
  assert.match(payload, /'valuation_source',\s*'stored_position_current_values'/);
  assert.match(payload, /'no_real_execution',\s*true/);
  assert.match(payload, /'no_broker_order',\s*true/);
  assert.match(payload, /'no_order_placed',\s*true/);
  assert.match(payload, /'no_withdrawal',\s*true/);
  assert.match(payload, /'no_deposit',\s*true/);
});

test("the paper_position_closed audit payload includes all required governance flags", () => {
  assert.ok(closedAuditMatch, "expected to find the paper_position_closed audit insert");
  const payload = closedAuditMatch[1];
  assert.match(payload, /'paper_only',\s*true/);
  assert.match(payload, /'real_execution_locked',\s*true/);
  assert.match(payload, /'no_real_execution',\s*true/);
  assert.match(payload, /'no_broker_order',\s*true/);
  assert.match(payload, /'no_order_placed',\s*true/);
  assert.match(payload, /'no_withdrawal',\s*true/);
  assert.match(payload, /'no_deposit',\s*true/);
});

test("the RPC never deletes paper_positions, trade_intents, or audit_ledger rows", () => {
  assert.doesNotMatch(rpcBody, /delete from public\.paper_positions/);
  assert.doesNotMatch(rpcBody, /delete from public\.trade_intents/);
  assert.doesNotMatch(rpcBody, /delete from public\.audit_ledger/);
});

test("the RPC never references a broker/exchange client or an order-routing path", () => {
  assert.doesNotMatch(rpcBody, /brokerClient|brokerApi|exchangeApi|orderRouter|placeOrder|createOrder/i);
});

test("execute on close_paper_position_with_review_and_audit is revoked from public and granted only to service_role", () => {
  assert.match(migrationSql, /revoke all on function public\.close_paper_position_with_review_and_audit\([^)]*\) from public;/);
  assert.match(migrationSql, /grant execute on function public\.close_paper_position_with_review_and_audit\([^)]*\) to service_role;/);
});

// ─── No new browser mutation path ───────────────────────────────────────────

test("the migration adds no new insert/update/delete policy on any table (browser clients get no new write path)", () => {
  assert.doesNotMatch(migrationSql, /create policy[^;]*for (insert|update|delete)/i);
});

test("the migration does not grant execute to authenticated or anon on the new RPC", () => {
  assert.doesNotMatch(migrationSql, /grant execute[^;]*to authenticated/i);
  assert.doesNotMatch(migrationSql, /grant execute[^;]*to anon/i);
});
