// ─── AOC Capital Cancel / Withdraw Draft Trade Intent (PR #13) — Migration
// Static Safety ───────────────────────────────────────────────────────────
// No live Supabase test harness exists in this repo (same rationale as
// tests/aoc-capital-submit-draft-trade-intent-migration-safety.test.mjs), so
// these tests statically inspect
// supabase/migrations/20260912000000_aoc_capital_cancel_draft_trade_intent.sql
// to pin down that:
//   - trade_intents gains a 'cancelled' status alongside every prior status
//   - trade_intents gains cancelled_at/cancelled_by columns
//   - audit_ledger gains a 'draft_trade_intent_cancelled' event type
//   - the new RPC locks the existing draft row (never inserts a new intent),
//     validates it is still status = 'draft', scoped by company_id and
//     portfolio_id, and rejects anything else
//   - the RPC rejects a draft that already has a paper_positions row
//   - the RPC locks the source signal row (if any) before releasing its
//     converted marker, and only releases it when it still points at this
//     draft
//   - the RPC never inserts trade_decisions or paper_positions, and never
//     calls the risk-evaluation RPCs
//   - the audit payload carries the required governance flags
//   - the RPC is security definer, scoped to search_path, and granted to
//     service_role only
//   - no new browser-writable (insert/update/delete) policy is introduced

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const MIGRATION_PATH = "supabase/migrations/20260912000000_aoc_capital_cancel_draft_trade_intent.sql";
const migrationSql = fs.readFileSync(MIGRATION_PATH, "utf8");

function extractFunctionBody(sql, fnName) {
  const re = new RegExp(`create or replace function public\\.${fnName}\\([\\s\\S]*?\\$\\$;`);
  const match = sql.match(re);
  assert.ok(match, `expected to find function public.${fnName}`);
  return match[0];
}

// ─── trade_intents changes ──────────────────────────────────────────────────

test("trade_intents status check constraint gains 'cancelled' alongside every prior status", () => {
  assert.match(
    migrationSql,
    /trade_intents_status_check\s*\n\s*check \(status in \('draft', 'pending', 'approved', 'rejected', 'closed', 'cancelled'\)\)/
  );
});

test("trade_intents gains cancelled_at and cancelled_by columns", () => {
  assert.match(migrationSql, /add column if not exists cancelled_at timestamptz null/);
  assert.match(migrationSql, /add column if not exists cancelled_by text null/);
});

// ─── audit_ledger event type ────────────────────────────────────────────────

test("audit_ledger_event_type_check gains 'draft_trade_intent_cancelled' alongside every prior event type", () => {
  assert.match(migrationSql, /'trade_intent_submitted_for_review',\s*\n\s*'draft_trade_intent_cancelled'/);
});

// ─── The atomic RPC ──────────────────────────────────────────────────────────

const rpcBody = extractFunctionBody(migrationSql, "cancel_draft_trade_intent_and_audit");

test("cancel_draft_trade_intent_and_audit returns jsonb, is language plpgsql, security definer, and pins search_path", () => {
  assert.match(rpcBody, /returns jsonb/);
  assert.match(rpcBody, /language plpgsql/);
  assert.match(rpcBody, /security definer/);
  assert.match(rpcBody, /set search_path = public, pg_temp/);
});

test("the RPC has no client-suppliable symbol/side/quantity/notional/strategy/status parameter — only ids and an actor", () => {
  const signatureMatch = migrationSql.match(/create or replace function public\.cancel_draft_trade_intent_and_audit\(([\s\S]*?)\)\s*\nreturns jsonb/);
  assert.ok(signatureMatch);
  const params = signatureMatch[1];
  assert.doesNotMatch(params, /p_symbol|p_side|p_quantity|p_notional|p_strategy|p_status|p_cancellation_reason/);
  assert.match(params, /p_company_id text/);
  assert.match(params, /p_portfolio_id uuid/);
  assert.match(params, /p_trade_intent_id uuid/);
  assert.match(params, /p_actor text/);
});

test("the RPC locks the existing trade intent row for update, scoped by company_id and portfolio_id — it never inserts a new trade_intents row", () => {
  const selectIndex = rpcBody.indexOf("select * into v_intent");
  const forUpdateIndex = rpcBody.indexOf("for update");
  assert.ok(selectIndex >= 0 && forUpdateIndex >= 0);
  assert.ok(selectIndex < forUpdateIndex);
  const selectClause = rpcBody.slice(selectIndex, forUpdateIndex);
  assert.match(selectClause, /company_id = p_company_id/);
  assert.match(selectClause, /portfolio_id = p_portfolio_id/);
  assert.doesNotMatch(rpcBody, /insert into public\.trade_intents/);
});

test("the RPC rejects any trade intent whose status is not 'draft'", () => {
  assert.match(rpcBody, /v_intent\.status <> 'draft'/);
});

test("the RPC rejects a draft that already has a paper_positions row", () => {
  const existsIndex = rpcBody.indexOf("select 1 from public.paper_positions where trade_intent_id = v_intent.id");
  assert.ok(existsIndex >= 0);
});

test("the RPC locks the source signal row for update, scoped by company_id and portfolio_id, when the draft has a paper_signal_recommendation_id", () => {
  const branch = rpcBody.match(/if v_intent\.paper_signal_recommendation_id is not null then[\s\S]*?end if;/);
  assert.ok(branch);
  assert.match(branch[0], /select \* into v_signal/);
  assert.match(branch[0], /for update/);
  assert.match(branch[0], /company_id = p_company_id/);
  assert.match(branch[0], /portfolio_id = p_portfolio_id/);
});

test("the RPC updates trade_intents status to 'cancelled' and sets cancelled_at/cancelled_by", () => {
  const updateMatch = rpcBody.match(/update public\.trade_intents\s*\n\s*set status = 'cancelled', cancelled_at = now\(\), cancelled_by = p_actor/);
  assert.ok(updateMatch);
});

test("the RPC clears converted_trade_intent_id/converted_at/converted_by only when the source signal's converted_trade_intent_id still matches this draft", () => {
  const guardIndex = rpcBody.indexOf("if v_signal.id is not null and v_signal.converted_trade_intent_id = v_intent.id then");
  assert.ok(guardIndex >= 0, "expected the release to be guarded by v_signal.converted_trade_intent_id = v_intent.id");
  const releaseBranch = rpcBody.slice(guardIndex);
  assert.match(releaseBranch, /set converted_trade_intent_id = null, converted_at = null, converted_by = null/);
});

test("the RPC locks the draft row before locking the source signal row, and locks the source signal row before releasing its marker", () => {
  const intentLockIndex = rpcBody.indexOf("select * into v_intent");
  const signalLockIndex = rpcBody.indexOf("select * into v_signal");
  const releaseIndex = rpcBody.indexOf("set converted_trade_intent_id = null");
  assert.ok(intentLockIndex >= 0 && signalLockIndex >= 0 && releaseIndex >= 0);
  assert.ok(intentLockIndex < signalLockIndex);
  assert.ok(signalLockIndex < releaseIndex);
});

test("the RPC inserts the draft_trade_intent_cancelled audit event after the status update and any signal-marker release, in the same function (one transaction)", () => {
  const statusUpdateIndex = rpcBody.indexOf("set status = 'cancelled'");
  const releaseIndex = rpcBody.indexOf("set converted_trade_intent_id = null");
  const auditIndex = rpcBody.indexOf("'draft_trade_intent_cancelled'");
  assert.ok(statusUpdateIndex >= 0 && releaseIndex >= 0 && auditIndex >= 0);
  assert.ok(statusUpdateIndex < auditIndex);
  assert.ok(releaseIndex < auditIndex);
});

const auditInsertMatch = rpcBody.match(/insert into public\.audit_ledger[\s\S]*?'draft_trade_intent_cancelled'[\s\S]*?jsonb_build_object\(([\s\S]*?)\)\);/);

test("the draft_trade_intent_cancelled audit payload includes all required governance flags", () => {
  assert.ok(auditInsertMatch, "expected to find the draft_trade_intent_cancelled audit insert");
  const payload = auditInsertMatch[1];
  assert.match(payload, /'paper_only',\s*true/);
  assert.match(payload, /'real_execution_locked',\s*true/);
  assert.match(payload, /'cancelled_from',\s*'draft'/);
  assert.match(payload, /'no_risk_review_performed',\s*true/);
  assert.match(payload, /'no_paper_position_created',\s*true/);
  assert.match(payload, /'no_real_execution',\s*true/);
  assert.match(payload, /'no_broker_order',\s*true/);
  assert.match(payload, /'no_order_placed',\s*true/);
  assert.match(payload, /'source_signal_released',\s*v_signal_released/);
});

test("the RPC never inserts trade_decisions or paper_positions, and never calls a risk-evaluation RPC", () => {
  assert.doesNotMatch(rpcBody, /insert into public\.trade_decisions/);
  assert.doesNotMatch(rpcBody, /insert into public\.paper_positions/);
  assert.doesNotMatch(rpcBody, /evaluate_and_record_trade_intent|submit_draft_trade_intent_for_review|pg_advisory_xact_lock/);
});

test("the RPC never deletes trade_intents or paper_signal_recommendations rows", () => {
  assert.doesNotMatch(rpcBody, /delete from public\.trade_intents/);
  assert.doesNotMatch(rpcBody, /delete from public\.paper_signal_recommendations/);
});

test("execute on cancel_draft_trade_intent_and_audit is revoked from public and granted only to service_role", () => {
  assert.match(migrationSql, /revoke all on function public\.cancel_draft_trade_intent_and_audit\([^)]*\) from public;/);
  assert.match(migrationSql, /grant execute on function public\.cancel_draft_trade_intent_and_audit\([^)]*\) to service_role;/);
});

// ─── No new browser mutation path ───────────────────────────────────────────

test("the migration adds no new insert/update/delete policy on any table (browser clients get no new write path)", () => {
  assert.doesNotMatch(migrationSql, /create policy[^;]*for (insert|update|delete)/i);
});

test("the migration does not grant execute to authenticated or anon on the new RPC", () => {
  assert.doesNotMatch(migrationSql, /grant execute[^;]*to authenticated/i);
  assert.doesNotMatch(migrationSql, /grant execute[^;]*to anon/i);
});
