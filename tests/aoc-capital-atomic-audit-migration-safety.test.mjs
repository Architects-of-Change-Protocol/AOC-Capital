// ─── AOC Capital — Atomic Audit Writes — Migration Static Safety ───────────────
// No live Supabase test harness exists in this repo (same rationale as
// tests/aoc-capital-strategy-library-migration-safety.test.mjs and
// tests/aoc-capital-signal-engine-migration-safety.test.mjs), so these tests
// statically inspect
// supabase/migrations/20260908000000_aoc_capital_atomic_audit_writes.sql to
// pin down that:
//   - the strategy-selection and signal-generation governed writes each
//     share a transaction boundary with their audit_ledger event (via a
//     purpose-built RPC function), closing the partial-write window where
//     governed state could persist without audit evidence
//   - both RPCs are security definer, scoped to search_path = public, and
//     granted to service_role only — never to a browser-reachable role
//   - no new browser-writable (insert/update/delete) policy is introduced
//   - paper_only and real_execution_locked remain pinned to true

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migrationSql = fs.readFileSync("supabase/migrations/20260908000000_aoc_capital_atomic_audit_writes.sql", "utf8");

// ─── Strategy selection RPC ─────────────────────────────────────────────────

test("the migration creates or replaces select_portfolio_strategy_profile_and_audit", () => {
  assert.match(migrationSql, /create or replace function public\.select_portfolio_strategy_profile_and_audit/);
});

test("select_portfolio_strategy_profile_and_audit returns public.portfolio_strategy_profiles", () => {
  const fnMatch = migrationSql.match(/create or replace function public\.select_portfolio_strategy_profile_and_audit\([\s\S]*?\$\$;/);
  assert.ok(fnMatch, "expected to find the full function body");
  assert.match(fnMatch[0], /returns public\.portfolio_strategy_profiles/);
});

test("select_portfolio_strategy_profile_and_audit is language plpgsql, security definer, and pins search_path = public", () => {
  const fnMatch = migrationSql.match(/create or replace function public\.select_portfolio_strategy_profile_and_audit\([\s\S]*?\$\$;/);
  assert.ok(fnMatch);
  assert.match(fnMatch[0], /language plpgsql/);
  assert.match(fnMatch[0], /security definer/);
  assert.match(fnMatch[0], /set search_path = public/);
});

test("select_portfolio_strategy_profile_and_audit upserts into portfolio_strategy_profiles", () => {
  const fnMatch = migrationSql.match(/create or replace function public\.select_portfolio_strategy_profile_and_audit\([\s\S]*?\$\$;/);
  assert.ok(fnMatch);
  assert.match(fnMatch[0], /insert into public\.portfolio_strategy_profiles/);
  assert.match(fnMatch[0], /on conflict \(company_id, portfolio_id\)\s*\n\s*do update set/);
});

test("select_portfolio_strategy_profile_and_audit inserts a strategy_selected event into audit_ledger in the same function body", () => {
  const fnMatch = migrationSql.match(/create or replace function public\.select_portfolio_strategy_profile_and_audit\([\s\S]*?\$\$;/);
  assert.ok(fnMatch);
  assert.match(fnMatch[0], /insert into public\.audit_ledger/);
  assert.match(fnMatch[0], /'strategy_selected'/);
});

test("select_portfolio_strategy_profile_and_audit writes paper_only true and real_execution_locked true, never a variable", () => {
  const fnMatch = migrationSql.match(/create or replace function public\.select_portfolio_strategy_profile_and_audit\([\s\S]*?\$\$;/);
  assert.ok(fnMatch);
  assert.match(fnMatch[0], /true,\s*\n\s*true,\s*\n\s*p_actor,/);
  assert.doesNotMatch(fnMatch[0], /paper_only\s*=\s*p_|real_execution_locked\s*=\s*p_/);
});

test("select_portfolio_strategy_profile_and_audit's audit insert happens after the profile upsert, inside the same function (one transaction)", () => {
  const fnMatch = migrationSql.match(/create or replace function public\.select_portfolio_strategy_profile_and_audit\([\s\S]*?\$\$;/);
  assert.ok(fnMatch);
  const upsertIndex = fnMatch[0].indexOf("insert into public.portfolio_strategy_profiles");
  const auditIndex = fnMatch[0].indexOf("insert into public.audit_ledger");
  assert.ok(upsertIndex >= 0 && auditIndex >= 0);
  assert.ok(upsertIndex < auditIndex, "the profile upsert must run before the audit insert, in the same function body");
});

test("execute on select_portfolio_strategy_profile_and_audit is revoked from public and granted only to service_role", () => {
  assert.match(migrationSql, /revoke all on function public\.select_portfolio_strategy_profile_and_audit\([^)]*\) from public;/);
  assert.match(migrationSql, /grant execute on function public\.select_portfolio_strategy_profile_and_audit\([^)]*\) to service_role;/);
});

// ─── Signal generation RPC ──────────────────────────────────────────────────

test("the migration creates or replaces insert_paper_signal_recommendations_and_audit", () => {
  assert.match(migrationSql, /create or replace function public\.insert_paper_signal_recommendations_and_audit/);
});

test("insert_paper_signal_recommendations_and_audit returns setof public.paper_signal_recommendations", () => {
  const fnMatch = migrationSql.match(/create or replace function public\.insert_paper_signal_recommendations_and_audit\([\s\S]*?\$\$;/);
  assert.ok(fnMatch, "expected to find the full function body");
  assert.match(fnMatch[0], /returns setof public\.paper_signal_recommendations/);
});

test("insert_paper_signal_recommendations_and_audit is language plpgsql, security definer, and pins search_path = public", () => {
  const fnMatch = migrationSql.match(/create or replace function public\.insert_paper_signal_recommendations_and_audit\([\s\S]*?\$\$;/);
  assert.ok(fnMatch);
  assert.match(fnMatch[0], /language plpgsql/);
  assert.match(fnMatch[0], /security definer/);
  assert.match(fnMatch[0], /set search_path = public/);
});

test("insert_paper_signal_recommendations_and_audit inserts into paper_signal_recommendations", () => {
  const fnMatch = migrationSql.match(/create or replace function public\.insert_paper_signal_recommendations_and_audit\([\s\S]*?\$\$;/);
  assert.ok(fnMatch);
  assert.match(fnMatch[0], /insert into public\.paper_signal_recommendations/);
});

test("insert_paper_signal_recommendations_and_audit inserts a signals_generated event into audit_ledger in the same function body", () => {
  const fnMatch = migrationSql.match(/create or replace function public\.insert_paper_signal_recommendations_and_audit\([\s\S]*?\$\$;/);
  assert.ok(fnMatch);
  assert.match(fnMatch[0], /insert into public\.audit_ledger/);
  assert.match(fnMatch[0], /'signals_generated'/);
});

test("insert_paper_signal_recommendations_and_audit writes paper_only true and real_execution_locked true, never a variable", () => {
  const fnMatch = migrationSql.match(/create or replace function public\.insert_paper_signal_recommendations_and_audit\([\s\S]*?\$\$;/);
  assert.ok(fnMatch);
  assert.match(fnMatch[0], /true,\s*\n\s*true,\s*\n\s*coalesce\(v_signal->>'status'/);
});

test("insert_paper_signal_recommendations_and_audit's audit insert happens after the row-insert loop, inside the same function (one transaction)", () => {
  const fnMatch = migrationSql.match(/create or replace function public\.insert_paper_signal_recommendations_and_audit\([\s\S]*?\$\$;/);
  assert.ok(fnMatch);
  const loopIndex = fnMatch[0].indexOf("for v_signal in");
  const auditIndex = fnMatch[0].indexOf("insert into public.audit_ledger");
  assert.ok(loopIndex >= 0 && auditIndex >= 0);
  assert.ok(loopIndex < auditIndex, "the signal row insert loop must run before the audit insert, in the same function body");
});

test("insert_paper_signal_recommendations_and_audit rejects a non-array or empty signals payload before writing anything", () => {
  const fnMatch = migrationSql.match(/create or replace function public\.insert_paper_signal_recommendations_and_audit\([\s\S]*?\$\$;/);
  assert.ok(fnMatch);
  assert.match(fnMatch[0], /jsonb_typeof\(p_signals\)\s*<>\s*'array'/);
  assert.match(fnMatch[0], /jsonb_array_length\(p_signals\)\s*=\s*0/);
});

test("execute on insert_paper_signal_recommendations_and_audit is revoked from public and granted only to service_role", () => {
  assert.match(migrationSql, /revoke all on function public\.insert_paper_signal_recommendations_and_audit\([^)]*\) from public;/);
  assert.match(migrationSql, /grant execute on function public\.insert_paper_signal_recommendations_and_audit\([^)]*\) to service_role;/);
});

// ─── No new browser mutation path ───────────────────────────────────────────

test("the migration adds no new insert/update/delete policy on any table (browser clients get no new write path)", () => {
  assert.doesNotMatch(migrationSql, /create policy[^;]*for (insert|update|delete)/i);
});

test("the migration does not grant execute to authenticated or anon on either RPC", () => {
  assert.doesNotMatch(migrationSql, /grant execute[^;]*to authenticated/i);
  assert.doesNotMatch(migrationSql, /grant execute[^;]*to anon/i);
});
