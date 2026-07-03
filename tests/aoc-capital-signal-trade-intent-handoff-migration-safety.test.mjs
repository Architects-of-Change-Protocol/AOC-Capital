// ─── AOC Capital Signal Recommendation to Trade Intent Draft Handoff (PR #11)
// — Migration Static Safety ───────────────────────────────────────────────────
// No live Supabase test harness exists in this repo (same rationale as
// tests/aoc-capital-atomic-audit-migration-safety.test.mjs and
// tests/aoc-capital-signal-engine-migration-safety.test.mjs), so these tests
// statically inspect
// supabase/migrations/20260909000000_aoc_capital_signal_trade_intent_draft_handoff.sql
// to pin down that:
//   - trade_intents gains a 'draft' status and a 'signal_recommendation'
//     source, and a paper_signal_recommendation_id link, without touching the
//     existing signal_id -> market_signals column/flow
//   - paper_signal_recommendations gains conversion-tracking columns
//   - the new RPC performs the draft insert, the signal's converted marker,
//     and the audit event in one transaction, is security definer, scoped to
//     search_path = public, and granted to service_role only
//   - the RPC always derives side ('buy'), quantity, and notional from the
//     signal row itself — never from a caller-supplied parameter
//   - no new browser-writable (insert/update/delete) policy is introduced

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const MIGRATION_PATH = "supabase/migrations/20260909000000_aoc_capital_signal_trade_intent_draft_handoff.sql";
const migrationSql = fs.readFileSync(MIGRATION_PATH, "utf8");

function extractFunctionBody(sql, fnName) {
  const re = new RegExp(`create or replace function public\\.${fnName}\\([\\s\\S]*?\\$\\$;`);
  const match = sql.match(re);
  assert.ok(match, `expected to find function public.${fnName}`);
  return match[0];
}

// ─── trade_intents changes ──────────────────────────────────────────────────

test("trade_intents status check constraint gains 'draft' alongside the existing statuses", () => {
  assert.match(migrationSql, /trade_intents_status_check\s*\n\s*check \(status in \('draft', 'pending', 'approved', 'rejected', 'closed'\)\)/);
});

test("trade_intents source check constraint gains 'signal_recommendation' alongside 'manual' and 'signal'", () => {
  assert.match(migrationSql, /trade_intents_source_check\s*\n\s*check \(source in \('manual', 'signal', 'signal_recommendation'\)\)/);
});

test("trade_intents gains a paper_signal_recommendation_id column referencing paper_signal_recommendations, distinct from the existing signal_id -> market_signals column", () => {
  assert.match(migrationSql, /add column if not exists paper_signal_recommendation_id uuid null\s*\n\s*references public\.paper_signal_recommendations\(id\) on delete set null/);
  assert.doesNotMatch(migrationSql, /alter table public\.trade_intents[\s\S]*?drop column[\s\S]*?signal_id/);
});

// ─── paper_signal_recommendations changes ───────────────────────────────────

test("paper_signal_recommendations gains converted_trade_intent_id, converted_at, and converted_by columns", () => {
  assert.match(migrationSql, /add column if not exists converted_trade_intent_id uuid null\s*\n\s*references public\.trade_intents\(id\) on delete set null/);
  assert.match(migrationSql, /add column if not exists converted_at timestamptz null/);
  assert.match(migrationSql, /add column if not exists converted_by text null/);
});

// ─── audit_ledger event type ────────────────────────────────────────────────

test("audit_ledger_event_type_check gains 'signal_converted_to_draft_trade_intent' alongside every prior event type", () => {
  assert.match(migrationSql, /'signals_generated',\s*\n\s*'signal_converted_to_draft_trade_intent'/);
});

// ─── The atomic RPC ──────────────────────────────────────────────────────────

const rpcBody = extractFunctionBody(migrationSql, "create_draft_trade_intent_from_signal_and_audit");

test("create_draft_trade_intent_from_signal_and_audit returns jsonb, is language plpgsql, security definer, and pins search_path = public", () => {
  assert.match(rpcBody, /returns jsonb/);
  assert.match(rpcBody, /language plpgsql/);
  assert.match(rpcBody, /security definer/);
  assert.match(rpcBody, /set search_path = public/);
});

test("the RPC has no client-suppliable symbol/side/quantity/notional parameter — only ids and an actor/payload", () => {
  const signatureMatch = migrationSql.match(/create or replace function public\.create_draft_trade_intent_from_signal_and_audit\(([\s\S]*?)\)\s*\nreturns jsonb/);
  assert.ok(signatureMatch);
  const params = signatureMatch[1];
  assert.doesNotMatch(params, /p_symbol|p_side|p_quantity|p_notional/);
  assert.match(params, /p_company_id text/);
  assert.match(params, /p_portfolio_id uuid/);
  assert.match(params, /p_signal_id uuid/);
  assert.match(params, /p_actor text/);
  assert.match(params, /p_audit_payload jsonb/);
});

test("the RPC locks the signal row for update before validating it, to serialize concurrent conversion attempts", () => {
  const selectIndex = rpcBody.indexOf("select * into v_signal");
  const forUpdateIndex = rpcBody.indexOf("for update");
  assert.ok(selectIndex >= 0 && forUpdateIndex >= 0);
  assert.ok(selectIndex < forUpdateIndex);
});

test("the RPC rejects an already-converted signal, a non-paper_buy_candidate action, a non-active status, a missing suggested notional, and a missing market price", () => {
  assert.match(rpcBody, /v_signal\.converted_trade_intent_id is not null/);
  assert.match(rpcBody, /v_signal\.action <> 'paper_buy_candidate'/);
  assert.match(rpcBody, /v_signal\.status <> 'active'/);
  assert.match(rpcBody, /v_signal\.suggested_notional_usd is null or v_signal\.suggested_notional_usd <= 0/);
  assert.match(rpcBody, /v_signal\.market_price_usd is null or v_signal\.market_price_usd <= 0/);
});

test("the RPC always derives side as 'buy' and quantity from suggested_notional_usd / market_price_usd — never a caller-supplied side or quantity", () => {
  assert.match(rpcBody, /v_quantity := v_signal\.suggested_notional_usd \/ v_signal\.market_price_usd/);
  assert.match(rpcBody, /'buy', v_quantity, v_signal\.suggested_notional_usd, 1,/);
});

test("the RPC inserts the trade intent with status 'draft', never 'pending' or 'approved'", () => {
  const insertMatch = rpcBody.match(/insert into public\.trade_intents \([\s\S]*?returning \* into v_intent;/);
  assert.ok(insertMatch);
  assert.match(insertMatch[0], /'signal_recommendation', p_signal_id, p_actor, 'draft'/);
});

test("the RPC marks the source signal converted (converted_trade_intent_id/converted_at/converted_by) in the same transaction as the draft insert", () => {
  const draftInsertIndex = rpcBody.indexOf("insert into public.trade_intents (");
  const markConvertedIndex = rpcBody.indexOf("update public.paper_signal_recommendations");
  assert.ok(draftInsertIndex >= 0 && markConvertedIndex >= 0);
  assert.ok(draftInsertIndex < markConvertedIndex);
  assert.match(rpcBody, /set converted_trade_intent_id = v_intent\.id, converted_at = now\(\), converted_by = p_actor/);
});

test("the RPC's audit insert happens after the draft insert and the converted-marker update, inside the same function (one transaction)", () => {
  const markConvertedIndex = rpcBody.indexOf("update public.paper_signal_recommendations");
  const auditIndex = rpcBody.indexOf("insert into public.audit_ledger");
  assert.ok(markConvertedIndex >= 0 && auditIndex >= 0);
  assert.ok(markConvertedIndex < auditIndex, "the converted-marker update must run before the audit insert, in the same function body");
  assert.match(rpcBody, /'signal_converted_to_draft_trade_intent'/);
});

test("the RPC never evaluates the risk policy engine and never opens a paper position", () => {
  assert.doesNotMatch(rpcBody, /paper_positions|trade_decisions|advisory_lock/);
});

test("execute on create_draft_trade_intent_from_signal_and_audit is revoked from public and granted only to service_role", () => {
  assert.match(migrationSql, /revoke all on function public\.create_draft_trade_intent_from_signal_and_audit\([^)]*\) from public;/);
  assert.match(migrationSql, /grant execute on function public\.create_draft_trade_intent_from_signal_and_audit\([^)]*\) to service_role;/);
});

// ─── No new browser mutation path ───────────────────────────────────────────

test("the migration adds no new insert/update/delete policy on any table (browser clients get no new write path)", () => {
  assert.doesNotMatch(migrationSql, /create policy[^;]*for (insert|update|delete)/i);
});

test("the migration does not grant execute to authenticated or anon on the new RPC", () => {
  assert.doesNotMatch(migrationSql, /grant execute[^;]*to authenticated/i);
  assert.doesNotMatch(migrationSql, /grant execute[^;]*to anon/i);
});
