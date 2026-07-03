// ─── AOC Capital Submit Draft Intent Audit Payload Hardening (PR #12
// follow-up) — Migration Static Safety ───────────────────────────────────────
// No live Supabase test harness exists in this repo (same rationale as
// tests/aoc-capital-submit-draft-trade-intent-migration-safety.test.mjs), so
// this test statically inspects
// supabase/migrations/20260911000000_aoc_capital_submit_draft_trade_intent_audit_hardening.sql
// to pin down that the trade_intent_submitted_for_review audit_ledger
// payload carries explicit governance evidence — paper-only, no real
// execution, no broker order, no order placed, and the exact draft ->
// risk_constitution_review transition this event represents — while the
// existing symbol/side/quantity/notionalUsd fields, the risk evaluation
// rules, the paper position creation, and the status-transition logic all
// stay byte-for-byte unchanged from 20260910000000.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const MIGRATION_PATH =
  "supabase/migrations/20260911000000_aoc_capital_submit_draft_trade_intent_audit_hardening.sql";
const migrationSql = fs.readFileSync(MIGRATION_PATH, "utf8");

const PRIOR_MIGRATION_PATH =
  "supabase/migrations/20260910000000_aoc_capital_submit_draft_trade_intent_for_review.sql";
const priorMigrationSql = fs.readFileSync(PRIOR_MIGRATION_PATH, "utf8");

function extractFunctionBody(sql, fnName) {
  const re = new RegExp(`create or replace function public\\.${fnName}\\([\\s\\S]*?\\$\\$;`);
  const match = sql.match(re);
  assert.ok(match, `expected to find function public.${fnName}`);
  return match[0];
}

const rpcBody = extractFunctionBody(migrationSql, "submit_draft_trade_intent_for_review");

// ─── The submission audit payload carries explicit governance evidence ─────

const submissionInsertMatch = rpcBody.match(
  /insert into public\.audit_ledger[\s\S]*?'trade_intent_submitted_for_review'[\s\S]*?jsonb_build_object\(([\s\S]*?)\)\);/,
);

test("the trade_intent_submitted_for_review audit payload keeps symbol/side/quantity/notionalUsd", () => {
  assert.ok(submissionInsertMatch, "expected to find the trade_intent_submitted_for_review audit insert");
  const payload = submissionInsertMatch[1];
  assert.match(payload, /'symbol',\s*v_intent\.symbol/);
  assert.match(payload, /'side',\s*v_intent\.side/);
  assert.match(payload, /'quantity',\s*v_intent\.quantity/);
  assert.match(payload, /'notionalUsd',\s*v_intent\.notional_usd/);
});

test("the trade_intent_submitted_for_review audit payload includes all required governance flags", () => {
  const payload = submissionInsertMatch[1];
  assert.match(payload, /'paper_only',\s*true/);
  assert.match(payload, /'real_execution_locked',\s*true/);
  assert.match(payload, /'submitted_from',\s*'draft'/);
  assert.match(payload, /'submitted_to',\s*'risk_constitution_review'/);
  assert.match(payload, /'no_real_execution',\s*true/);
  assert.match(payload, /'no_broker_order',\s*true/);
  assert.match(payload, /'no_order_placed',\s*true/);
});

test("the governance flags are on the submission audit payload, not the decision or position_opened payloads", () => {
  const decisionInsertMatch = rpcBody.match(
    /insert into public\.audit_ledger[\s\S]*?trade_decision_approved' else 'trade_decision_rejected'[\s\S]*?jsonb_build_object\(([\s\S]*?)\)\);/,
  );
  const positionInsertMatch = rpcBody.match(
    /insert into public\.audit_ledger[\s\S]*?'position_opened'[\s\S]*?jsonb_build_object\(([\s\S]*?)\)\);/,
  );
  assert.ok(decisionInsertMatch && positionInsertMatch);
  for (const payload of [decisionInsertMatch[1], positionInsertMatch[1]]) {
    assert.doesNotMatch(payload, /submitted_from|submitted_to|real_execution_locked|no_broker_order|no_order_placed/);
  }
});

// ─── Nothing else changes: risk evaluation, position creation, status transitions, API contract ──

test("this migration does not touch risk evaluation, paper position creation, or status-transition logic — only the submission audit payload differs from 20260910000000", () => {
  const stripSubmissionPayload = (sql) =>
    sql.replace(
      /(insert into public\.audit_ledger[\s\S]*?'trade_intent_submitted_for_review'[\s\S]*?jsonb_build_object\()[\s\S]*?(\)\);)/,
      "$1$2",
    );
  assert.equal(stripSubmissionPayload(rpcBody), stripSubmissionPayload(extractFunctionBody(priorMigrationSql, "submit_draft_trade_intent_for_review")));
});

test("this migration adds no new audit_ledger event type, table, policy, or grant — it only redefines the existing RPC body", () => {
  assert.doesNotMatch(migrationSql, /audit_ledger_event_type_check/);
  assert.doesNotMatch(migrationSql, /create table/i);
  assert.doesNotMatch(migrationSql, /create policy/i);
  assert.doesNotMatch(migrationSql, /grant execute/i);
});

test("the RPC signature (params and return type) is unchanged from 20260910000000 — no API contract change", () => {
  const signature = (sql) =>
    sql.match(/create or replace function public\.submit_draft_trade_intent_for_review\([\s\S]*?returns jsonb/)[0];
  assert.equal(signature(migrationSql), signature(priorMigrationSql));
});
