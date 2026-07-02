// ─── AOC Capital Strategy Library — Migration Static Safety ────────────────────
// No live Supabase test harness exists in this repo (same rationale as
// tests/aoc-capital-strategy-selection-safety.test.mjs and
// tests/aoc-capital-market-data-safety.test.mjs), so these tests statically
// inspect supabase/migrations/20260906000000_aoc_capital_strategy_library.sql
// to pin down the paper-only / tenant-isolation guarantees the Strategy
// Library depends on: the table shape, the paper-only check constraints, RLS
// being enabled with a tenant-scoped SELECT policy, no browser-writable
// policy, and the strategy_selected audit event type.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migrationSql = fs.readFileSync("supabase/migrations/20260906000000_aoc_capital_strategy_library.sql", "utf8");

test("the migration creates the portfolio_strategy_profiles table", () => {
  assert.match(migrationSql, /create table if not exists public\.portfolio_strategy_profiles/);
});

test("portfolio_strategy_profiles has a company_id column", () => {
  assert.match(migrationSql, /company_id text not null/);
});

test("portfolio_strategy_profiles has a portfolio_id column referencing portfolios", () => {
  assert.match(migrationSql, /portfolio_id uuid not null references public\.portfolios\(id\)/);
});

test("portfolio_strategy_profiles has a unique(company_id, portfolio_id) constraint", () => {
  assert.match(migrationSql, /unique \(company_id, portfolio_id\)/);
});

test("paper_only is boolean not null default true", () => {
  assert.match(migrationSql, /paper_only boolean not null default true/);
});

test("real_execution_locked is boolean not null default true", () => {
  assert.match(migrationSql, /real_execution_locked boolean not null default true/);
});

test("there is a check constraint pinning paper_only = true", () => {
  assert.match(migrationSql, /check \(paper_only = true\)/);
});

test("there is a check constraint pinning real_execution_locked = true", () => {
  assert.match(migrationSql, /check \(real_execution_locked = true\)/);
});

test("row level security is enabled on portfolio_strategy_profiles", () => {
  assert.match(migrationSql, /alter table public\.portfolio_strategy_profiles enable row level security/);
});

test("the SELECT policy is scoped to current_company_id() (tenant guard)", () => {
  const policyMatch = migrationSql.match(/create policy "[^"]*"\s+on public\.portfolio_strategy_profiles for select[\s\S]*?;/);
  assert.ok(policyMatch, "expected a SELECT policy on portfolio_strategy_profiles");
  assert.match(policyMatch[0], /public\.current_company_id\(\)\s*=\s*company_id/);
});

test("there is no public/browser insert, update, or delete policy on portfolio_strategy_profiles", () => {
  assert.doesNotMatch(migrationSql, /create policy[^;]*on public\.portfolio_strategy_profiles for (insert|update|delete)/i);
});

test("the audit_ledger event_type check constraint includes strategy_selected", () => {
  const constraintMatch = migrationSql.match(/audit_ledger_event_type_check check \(event_type in \([\s\S]*?\)\)/);
  assert.ok(constraintMatch, "expected the audit_ledger_event_type_check constraint to be redefined");
  assert.match(constraintMatch[0], /'strategy_selected'/);
});
