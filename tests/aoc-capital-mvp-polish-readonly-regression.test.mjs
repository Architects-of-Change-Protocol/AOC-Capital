// ─── AOC Capital MVP Polish & Navigation Consolidation (PR #23) ─────────────
// Read-Only Regression ────────────────────────────────────────────────────
// Pins that the PR #22 read/mutation boundary fix remains intact after this
// PR's navigation/copy/formatting polish, and that none of the new polish
// modules (capital-navigation.ts, capital-display-formatters.ts) or the
// rewritten capital layout introduce a mutation surface, a market-data
// refresh, or an LLM call.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

const HARDENED_GET_ROUTES = ["src/app/api/capital/performance/route.ts", "src/app/api/capital/portfolio/summary/route.ts"];

test("performance and portfolio/summary GET routes still never mark-to-market on a plain read (PR #22 regression)", () => {
  for (const route of HARDENED_GET_ROUTES) {
    const src = fs.readFileSync(route, "utf8");
    assert.match(src, /export async function GET/);
    assert.doesNotMatch(src, /export async function POST/);
    assert.doesNotMatch(src, /markAllOpenPositions\(/);
    assert.doesNotMatch(src, /request\.json\(/);
  }
});

const READ_ONLY_REPORTING_SERVICES = [
  "src/lib/capital/portfolio-overview-service.ts",
  "src/lib/capital/allocation-exposure-service.ts",
  "src/lib/capital/position-detail-service.ts",
  "src/lib/capital/closed-position-performance-service.ts",
  "src/lib/capital/strategy-performance-attribution-service.ts",
  "src/lib/capital/signal-cohort-outcome-service.ts",
  "src/lib/capital/portfolio-governance-snapshot-service.ts",
];

const FORBIDDEN_MUTATION_HELPERS =
  /\bgenerateSignals\(|\bgeneratePaperSignalRecommendations\(|\bconvertSignalToDraftTradeIntent\(|\bcreateDraftTradeIntentFromSignal\(|\bsubmitDraftTradeIntentForReview\(|\bcancelDraftTradeIntent\(|\brequestPaperPositionCloseReview\(|\bclosePaperPosition\(|\bmarkAllOpenPositions\(|\bmarkPositionToMarket\(|\brecordMarketPrice\(/;

test("read-only reporting services still call no mutation helper after this PR's polish changes", () => {
  for (const file of READ_ONLY_REPORTING_SERVICES) {
    const src = stripComments(fs.readFileSync(file, "utf8"));
    assert.doesNotMatch(src, FORBIDDEN_MUTATION_HELPERS, `${file} must not call a mutation helper`);
  }
});

// ─── This PR's new/changed polish modules introduce no mutation surface ────

const POLISH_MODULES = [
  "src/lib/capital/capital-navigation.ts",
  "src/lib/capital/capital-display-formatters.ts",
  "src/app/(protected)/capital/layout.tsx",
];

test("new navigation/formatting polish modules exist", () => {
  for (const file of POLISH_MODULES) {
    assert.ok(fs.existsSync(file), `expected polish module to exist: ${file}`);
  }
});

const FORBIDDEN_ANY_MUTATION_SURFACE =
  /\.rpc\(|\.insert\(|\.update\(|\.upsert\(|\.delete\(|createSupabaseServerClient|anthropic\.messages\.create|openai\.chat\.completions|fetchLivePrice\(|refreshMarketData\(|generateMockPrice\(/;

test("navigation/formatting polish modules call no service, RPC, mutation helper, market-data refresh, or LLM", () => {
  for (const file of POLISH_MODULES) {
    const src = stripComments(fs.readFileSync(file, "utf8"));
    assert.doesNotMatch(src, FORBIDDEN_ANY_MUTATION_SURFACE, `${file} must not introduce a mutation/refresh/LLM surface`);
  }
});

test("capital-navigation.ts exports plain data/getters only, no default export that could be a component with side effects", () => {
  const src = fs.readFileSync("src/lib/capital/capital-navigation.ts", "utf8");
  assert.doesNotMatch(src, /export default/);
  assert.doesNotMatch(src, /"use client"/);
});

// ─── Reporting GET routes still never read a request body (PR #22 regression) ──

const READ_ONLY_GET_ROUTES = [
  "src/app/api/capital/portfolio-overview/route.ts",
  "src/app/api/capital/allocation-exposure/route.ts",
  "src/app/api/capital/positions/[id]/route.ts",
  "src/app/api/capital/performance/closed/route.ts",
  "src/app/api/capital/performance/strategies/route.ts",
  "src/app/api/capital/performance/signals/route.ts",
  "src/app/api/capital/governance/snapshot/route.ts",
];

test("read-only GET routes still never read a request body after this PR's polish changes", () => {
  for (const route of READ_ONLY_GET_ROUTES) {
    const src = fs.readFileSync(route, "utf8");
    assert.doesNotMatch(src, /request\.json\(/, `${route} must not read a request body`);
    assert.doesNotMatch(src, /\.body\b/, `${route} must not read .body`);
  }
});

// ─── No new supabase migration was added by this polish-only PR ───────────

test("no new supabase migration was added for this polish-only PR", () => {
  const migrations = fs.readdirSync("supabase/migrations").filter((f) => f.includes("capital"));
  assert.equal(migrations.length, 16, "PR #23 is polish/navigation-only and must not add a schema migration");
});
