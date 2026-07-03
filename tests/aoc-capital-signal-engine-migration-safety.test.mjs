// ─── AOC Capital Signal Engine v1 — Migration Static Safety ────────────────────
// No live Supabase test harness exists in this repo (same rationale as
// tests/aoc-capital-strategy-library-migration-safety.test.mjs), so these
// tests statically inspect
// supabase/migrations/20260907000000_aoc_capital_signal_engine.sql to pin
// down the paper-only / tenant-isolation guarantees the Signal Engine
// depends on: the table shape, the paper-only check constraints, RLS being
// enabled with a tenant-scoped SELECT policy, no browser-writable policy,
// and the signals_generated audit event type.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migrationSql = fs.readFileSync("supabase/migrations/20260907000000_aoc_capital_signal_engine.sql", "utf8");

test("1. the migration creates the paper_signal_recommendations table", () => {
  assert.match(migrationSql, /create table if not exists public\.paper_signal_recommendations/);
});

test("2. paper_signal_recommendations has a company_id column", () => {
  assert.match(migrationSql, /company_id text not null/);
});

test("3. paper_signal_recommendations has a portfolio_id column referencing portfolios", () => {
  assert.match(migrationSql, /portfolio_id uuid not null references public\.portfolios\(id\)/);
});

test("4. there is an action check constraint covering exactly the controlled vocabulary", () => {
  const actionMatch = migrationSql.match(/action text not null check \(\s*action in \(([\s\S]*?)\)\s*\)/);
  assert.ok(actionMatch, "expected an action check constraint");
  const values = actionMatch[1].match(/'([a-z_]+)'/g).map((v) => v.replace(/'/g, ""));
  assert.deepEqual(values.sort(), ["avoid", "no_action", "paper_buy_candidate", "reduce_exposure", "watch"].sort());
});

test("5. there is a strength check constraint covering exactly weak/moderate/strong", () => {
  const strengthMatch = migrationSql.match(/strength text not null check \(\s*strength in \(([\s\S]*?)\)\s*\)/);
  assert.ok(strengthMatch, "expected a strength check constraint");
  const values = strengthMatch[1].match(/'([a-z]+)'/g).map((v) => v.replace(/'/g, ""));
  assert.deepEqual(values.sort(), ["moderate", "strong", "weak"].sort());
});

test("6. there is a confidence_score 0-100 check constraint", () => {
  assert.match(migrationSql, /confidence_score >= 0 and confidence_score <= 100/);
});

test("7. paper_only is boolean not null default true", () => {
  assert.match(migrationSql, /paper_only boolean not null default true/);
});

test("8. real_execution_locked is boolean not null default true", () => {
  assert.match(migrationSql, /real_execution_locked boolean not null default true/);
});

test("9. there is a check constraint pinning paper_only = true", () => {
  assert.match(migrationSql, /check \(paper_only = true\)/);
});

test("10. there is a check constraint pinning real_execution_locked = true", () => {
  assert.match(migrationSql, /check \(real_execution_locked = true\)/);
});

test("11. row level security is enabled on paper_signal_recommendations", () => {
  assert.match(migrationSql, /alter table public\.paper_signal_recommendations enable row level security/);
});

test("12. the SELECT policy is scoped to current_company_id() (tenant guard)", () => {
  const policyMatch = migrationSql.match(/create policy "[^"]*"\s+on public\.paper_signal_recommendations for select[\s\S]*?;/);
  assert.ok(policyMatch, "expected a SELECT policy on paper_signal_recommendations");
  assert.match(policyMatch[0], /public\.current_company_id\(\)\s*=\s*company_id/);
});

test("13. there is no public/browser insert, update, or delete policy on paper_signal_recommendations", () => {
  assert.doesNotMatch(migrationSql, /create policy[^;]*on public\.paper_signal_recommendations for (insert|update|delete)/i);
});

test("14. the audit_ledger event_type check constraint includes signals_generated", () => {
  const constraintMatch = migrationSql.match(/audit_ledger_event_type_check check \(event_type in \([\s\S]*?\)\)/);
  assert.ok(constraintMatch, "expected the audit_ledger_event_type_check constraint to be redefined");
  assert.match(constraintMatch[0], /'signals_generated'/);
  // Widening this constraint must never drop a previously-allowed event type.
  for (const previous of [
    "trade_intent_created",
    "trade_decision_approved",
    "trade_decision_rejected",
    "position_opened",
    "position_closed",
    "position_marked_to_market",
    "advisor_strategy_generated",
    "advisor_constitution_generated",
    "demo_scenario_loaded",
    "demo_scenario_reset",
    "strategy_selected",
  ]) {
    assert.match(constraintMatch[0], new RegExp(`'${previous}'`), `expected ${previous} to remain allowed`);
  }
});

test("suggested_notional_usd can never be negative at the database level", () => {
  assert.match(migrationSql, /suggested_notional_usd numeric null check \(\s*suggested_notional_usd is null or suggested_notional_usd >= 0\s*\)/);
});

test("there is a status check constraint covering exactly active/expired/blocked_by_risk/superseded", () => {
  const statusMatch = migrationSql.match(/status text not null default 'active' check \(\s*status in \(([\s\S]*?)\)\s*\)/);
  assert.ok(statusMatch, "expected a status check constraint");
  const values = statusMatch[1].match(/'([a-z_]+)'/g).map((v) => v.replace(/'/g, ""));
  assert.deepEqual(values.sort(), ["active", "blocked_by_risk", "expired", "superseded"].sort());
});

test("indexes exist for (company_id, portfolio_id, generated_at) and (company_id, strategy_key, generated_at)", () => {
  assert.match(migrationSql, /create index if not exists paper_signal_recommendations_company_portfolio_idx\s+on public\.paper_signal_recommendations\(company_id, portfolio_id, generated_at desc\)/);
  assert.match(migrationSql, /create index if not exists paper_signal_recommendations_strategy_idx\s+on public\.paper_signal_recommendations\(company_id, strategy_key, generated_at desc\)/);
});
