// ─── AOC Capital Submit Draft Intent for Risk Constitution Review (PR #12)
// — Migration Static Safety ───────────────────────────────────────────────────
// No live Supabase test harness exists in this repo (same rationale as
// tests/aoc-capital-signal-trade-intent-handoff-migration-safety.test.mjs), so
// these tests statically inspect
// supabase/migrations/20260910000000_aoc_capital_submit_draft_trade_intent_for_review.sql
// to pin down that:
//   - audit_ledger gains a 'trade_intent_submitted_for_review' event type
//   - the new RPC locks the existing draft row (never inserts a new intent),
//     validates it is still status = 'draft', and rejects anything else
//   - the RPC has no client-suppliable symbol/side/quantity/notional/leverage
//     parameter — only ids and an actor
//   - submission is audited before the risk verdict is known, and the
//     verdict, decision, and (if approved) the paper position all commit in
//     the same transaction as the submission audit event
//   - the RPC runs the exact same 6 Level 1 rules, in the same order, as
//     evaluate_and_record_trade_intent()
//   - the RPC is security definer, scoped to search_path = public, and
//     granted to service_role only
//   - no new browser-writable (insert/update/delete) policy is introduced

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const MIGRATION_PATH = "supabase/migrations/20260910000000_aoc_capital_submit_draft_trade_intent_for_review.sql";
const migrationSql = fs.readFileSync(MIGRATION_PATH, "utf8");

const POSITION_LIFECYCLE_MIGRATION_PATH = "supabase/migrations/20260903000000_aoc_capital_position_lifecycle_mtm.sql";
const positionLifecycleSql = fs.readFileSync(POSITION_LIFECYCLE_MIGRATION_PATH, "utf8");

function extractFunctionBody(sql, fnName) {
  const re = new RegExp(`create or replace function public\\.${fnName}\\([\\s\\S]*?\\$\\$;`);
  const match = sql.match(re);
  assert.ok(match, `expected to find function public.${fnName}`);
  return match[0];
}

// ─── audit_ledger event type ────────────────────────────────────────────────

test("audit_ledger_event_type_check gains 'trade_intent_submitted_for_review' alongside every prior event type", () => {
  assert.match(migrationSql, /'signal_converted_to_draft_trade_intent',\s*\n\s*'trade_intent_submitted_for_review'/);
});

// ─── The atomic RPC ──────────────────────────────────────────────────────────

const rpcBody = extractFunctionBody(migrationSql, "submit_draft_trade_intent_for_review");

test("submit_draft_trade_intent_for_review returns jsonb, is language plpgsql, security definer, and pins search_path = public", () => {
  assert.match(rpcBody, /returns jsonb/);
  assert.match(rpcBody, /language plpgsql/);
  assert.match(rpcBody, /security definer/);
  assert.match(rpcBody, /set search_path = public/);
});

test("the RPC has no client-suppliable symbol/side/quantity/notional/leverage parameter — only ids and an actor", () => {
  const signatureMatch = migrationSql.match(/create or replace function public\.submit_draft_trade_intent_for_review\(([\s\S]*?)\)\s*returns jsonb/);
  assert.ok(signatureMatch);
  const params = signatureMatch[1];
  assert.doesNotMatch(params, /p_symbol|p_side|p_quantity|p_notional|p_leverage/);
  assert.match(params, /p_company_id text/);
  assert.match(params, /p_portfolio_id uuid/);
  assert.match(params, /p_intent_id uuid/);
  assert.match(params, /p_actor text/);
});

test("the RPC locks the existing trade intent row for update — it never inserts a new trade_intents row", () => {
  const selectIndex = rpcBody.indexOf("select * into v_intent");
  const forUpdateIndex = rpcBody.indexOf("for update");
  assert.ok(selectIndex >= 0 && forUpdateIndex >= 0);
  assert.ok(selectIndex < forUpdateIndex);
  assert.doesNotMatch(rpcBody, /insert into public\.trade_intents/);
});

test("the RPC rejects any trade intent whose status is not 'draft'", () => {
  assert.match(rpcBody, /v_intent\.status <> 'draft'/);
});

test("the RPC serializes evaluation per portfolio with the same advisory lock as evaluate_and_record_trade_intent", () => {
  assert.match(rpcBody, /pg_advisory_xact_lock\(hashtext\(p_portfolio_id::text\)\)/);
});

test("the RPC writes the submission audit event before computing the risk verdict, so submission is always independently evidenced", () => {
  const submissionAuditIndex = rpcBody.indexOf("'trade_intent_submitted_for_review'");
  const verdictIndex = rpcBody.indexOf("v_verdict := case when v_all_passed");
  assert.ok(submissionAuditIndex >= 0 && verdictIndex >= 0);
  assert.ok(submissionAuditIndex < verdictIndex);
});

test("the RPC derives every rule input from the existing draft row (v_intent) — never from a caller-supplied symbol/side/quantity/notional/leverage", () => {
  assert.match(rpcBody, /v_intent\.leverage = 1/);
  assert.match(rpcBody, /v_intent\.side <> 'sell'/);
  assert.match(rpcBody, /v_current_exposure \+ v_intent\.notional_usd/);
});

test("the RPC runs the same 6 Level 1 rule keys, in the same order, as evaluate_and_record_trade_intent", () => {
  const expectedOrder = [
    "no_leverage",
    "no_real_shorts",
    "max_simulated_exposure",
    "max_daily_simulated_loss",
    "max_weekly_simulated_loss",
    "max_open_positions",
  ];
  const evaluateFnBody = extractFunctionBody(positionLifecycleSql, "evaluate_and_record_trade_intent");

  for (const source of [rpcBody, evaluateFnBody]) {
    const indices = expectedOrder.map((key) => source.indexOf(`'ruleKey', '${key}'`));
    for (const index of indices) assert.ok(index >= 0, "expected every Level 1 rule key to be present");
    for (let i = 1; i < indices.length; i += 1) {
      assert.ok(indices[i - 1] < indices[i], "rule keys must appear in the same order in both functions");
    }
  }
});

test("the RPC writes trade_decisions and updates trade_intents.status to the verdict, then writes the decision audit event", () => {
  const decisionInsertIndex = rpcBody.indexOf("insert into public.trade_decisions");
  const statusUpdateIndex = rpcBody.indexOf("update public.trade_intents set status = v_verdict");
  const decisionAuditIndex = rpcBody.indexOf("trade_decision_approved' else 'trade_decision_rejected'");
  assert.ok(decisionInsertIndex >= 0 && statusUpdateIndex >= 0 && decisionAuditIndex >= 0);
  assert.ok(decisionInsertIndex < statusUpdateIndex);
  assert.ok(statusUpdateIndex < decisionAuditIndex);
});

test("the RPC only opens a paper position when the verdict is 'approved', and audits position_opened in the same transaction", () => {
  const approvedBranch = rpcBody.match(/if v_verdict = 'approved' then[\s\S]*?end if;/);
  assert.ok(approvedBranch);
  assert.match(approvedBranch[0], /insert into public\.paper_positions/);
  assert.match(approvedBranch[0], /'position_opened'/);
});

test("execute on submit_draft_trade_intent_for_review is revoked from public and granted only to service_role", () => {
  assert.match(migrationSql, /revoke all on function public\.submit_draft_trade_intent_for_review\([^)]*\) from public;/);
  assert.match(migrationSql, /grant execute on function public\.submit_draft_trade_intent_for_review\([^)]*\) to service_role;/);
});

// ─── No new browser mutation path ───────────────────────────────────────────

test("the migration adds no new insert/update/delete policy on any table (browser clients get no new write path)", () => {
  assert.doesNotMatch(migrationSql, /create policy[^;]*for (insert|update|delete)/i);
});

test("the migration does not grant execute to authenticated or anon on the new RPC", () => {
  assert.doesNotMatch(migrationSql, /grant execute[^;]*to authenticated/i);
  assert.doesNotMatch(migrationSql, /grant execute[^;]*to anon/i);
});
