// ─── AOC Capital Strategy-Level Performance Attribution v1 (PR #19) — Safety
// — Static Source Checks ──────────────────────────────────────────────────────
// getStrategyPerformanceAttribution() is I/O-heavy (talks to Supabase) and
// this codebase has no live-Supabase test harness for that kind of module
// (same rationale as tests/aoc-capital-closed-position-performance-safety.
// test.mjs). These tests statically inspect the service, API route, and page
// source to pin down that this report is read-only from a governance
// perspective: it never generates a signal, never creates/submits/cancels a
// draft trade intent, never runs Risk Constitution review, never
// creates/closes/marks a paper position, never requests a close review, never
// refreshes valuation, never mutates an audit record, never mutates a
// strategy or portfolio record, and never references a
// broker/exchange/real-execution capability.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const serviceTs = fs.readFileSync("src/lib/capital/strategy-performance-attribution-service.ts", "utf8");
const routeTs = fs.readFileSync("src/app/api/capital/performance/strategies/route.ts", "utf8");
const pageTsx = fs.readFileSync("src/app/(protected)/capital/performance/strategies/page.tsx", "utf8");

test("the service file exists", () => {
  assert.ok(serviceTs.length > 0);
});

test("the API route file exists", () => {
  assert.ok(routeTs.length > 0);
});

test("the page file exists", () => {
  assert.ok(pageTsx.length > 0);
});

// ─── The service never calls any governed mutation RPC or mutation helper ───

const FORBIDDEN_MUTATION_RPCS = [
  "close_paper_position_with_review_and_audit",
  "create_draft_trade_intent_from_signal_and_audit",
  "submit_draft_trade_intent_for_review",
  "cancel_draft_trade_intent_and_audit",
  "evaluate_and_record_trade_intent",
  "insert_paper_signal_recommendations_and_audit",
  "select_portfolio_strategy_profile_and_audit",
  "mark_paper_position",
  "mark_all_open_paper_positions",
  "close_paper_position",
];

test("the service never calls any governed mutation RPC", () => {
  for (const rpc of FORBIDDEN_MUTATION_RPCS) {
    assert.doesNotMatch(serviceTs, new RegExp(rpc), `service must not call ${rpc}`);
  }
});

test("the service never calls .rpc( at all — it is a pure read aggregation, not a write path", () => {
  assert.doesNotMatch(serviceTs, /\.rpc\(/);
});

test("the service never inserts, updates, upserts, or deletes any table directly", () => {
  for (const table of [
    "paper_positions",
    "paper_position_close_reviews",
    "trade_intents",
    "trade_decisions",
    "portfolio_strategy_profiles",
    "paper_signal_recommendations",
    "audit_ledger",
    "portfolios",
  ]) {
    assert.doesNotMatch(serviceTs, new RegExp(`\\.from\\(\\s*"${table}"\\s*\\)\\s*\\.(insert|update|delete|upsert)\\(`), `service must not write ${table} directly`);
  }
});

test("the service never calls a forbidden mutation helper function", () => {
  assert.doesNotMatch(
    serviceTs,
    /\bgenerateSignals\(|\bconvertSignalToDraftTradeIntent\(|\bsubmitDraftTradeIntentForReview\(|\bcancelDraftTradeIntent\(|\brequestPaperPositionCloseReview\(|\bclosePaperPosition\(|\bmarkAllOpenPositions\(|\bmarkPositionToMarket\(|\brecordMarketPrice\(|\bcreateTradeIntent\(|\bselectStrategy\(|\brecordAuditEvent\(/,
  );
});

test("the service never marks positions to market, closes positions, or generates signals — it reads paper_positions and paper_signal_recommendations directly", () => {
  assert.doesNotMatch(serviceTs, /listPaperPositionsMarked|markAllOpenPositions|markPositionToMarket|closePaperPosition|loadPortfolioOverview|generatePaperSignals\(/);
});

test("the service never references broker/API-key/withdrawal/order-routing/real-execution capabilities", () => {
  assert.doesNotMatch(
    serviceTs,
    /\bbroker\b|brokerEnabled|executionEnabled|requiresApiKey|placeOrder|createOrder|executeTrade|orderRouter|apiSecret|privateKey|withdrawal|deposit|accountBalance/i,
  );
});

test("the service scopes every portfolio-level read by both company_id and portfolio_id", () => {
  const scopedQueries = serviceTs.match(/\.from\("(paper_positions|trade_intents|paper_signal_recommendations|paper_position_close_reviews)"\)[\s\S]*?;/g) ?? [];
  assert.ok(scopedQueries.length > 0, "expected at least one scoped query against a portfolio-level table");
  for (const query of scopedQueries) {
    assert.match(query, /\.eq\("company_id",\s*companyId\)/, `query must scope by company_id: ${query.slice(0, 80)}`);
    assert.match(query, /\.eq\("portfolio_id",\s*portfolioId\)/, `query must scope by portfolio_id: ${query.slice(0, 80)}`);
  }
});

test("the service scopes its trade_decisions read by company_id (a company-scoped table, no portfolio_id column)", () => {
  const query = serviceTs.match(/\.from\("trade_decisions"\)[\s\S]*?;/)?.[0] ?? "";
  assert.match(query, /\.eq\("company_id",\s*companyId\)/);
});

test("the service scopes its audit_ledger read by company_id", () => {
  const auditQuery = serviceTs.match(/\.from\("audit_ledger"\)[\s\S]*?;/)?.[0] ?? "";
  assert.match(auditQuery, /\.eq\("company_id",\s*companyId\)/);
});

test("the service returns the required literal governance flags", () => {
  assert.match(serviceTs, /paperOnly:\s*true/);
  assert.match(serviceTs, /readOnly:\s*true/);
  assert.match(serviceTs, /realExecutionLocked:\s*true/);
  assert.match(serviceTs, /brokerConnected:\s*false/);
  assert.match(serviceTs, /liveOrderRoutingEnabled:\s*false/);
  assert.match(serviceTs, /marketDataFetched:\s*false/);
  assert.match(serviceTs, /mutationsPerformed:\s*false/);
  assert.match(serviceTs, /investmentAdviceProvided:\s*false/);
});

test("the service never infers a strategy attribution from a symbol alone", () => {
  assert.doesNotMatch(serviceTs, /strategyKey:\s*\w*\.?symbol\b/i);
});

// ─── The API route is GET-only, read-only, no mutation calls ───────────────

test("the route defines GET and no POST/PUT/PATCH/DELETE handler", () => {
  assert.match(routeTs, /export async function GET/);
  assert.doesNotMatch(routeTs, /export async function POST/);
  assert.doesNotMatch(routeTs, /export async function PUT/);
  assert.doesNotMatch(routeTs, /export async function PATCH/);
  assert.doesNotMatch(routeTs, /export async function DELETE/);
});

test("the route never reads a request body", () => {
  assert.doesNotMatch(routeTs, /request\.json\(/);
  assert.doesNotMatch(routeTs, /\.body\b/);
});

test("the route requires auth and calls getStrategyPerformanceAttribution, never a mutation service", () => {
  assert.match(routeTs, /requireAuthUser\(\)/);
  assert.match(routeTs, /getStrategyPerformanceAttribution\(/);
  assert.doesNotMatch(routeTs, /requestPaperPositionCloseReview\(|closePaperPosition\(|generateSignals\(|createTradeIntent\(|selectStrategy\(/);
});

test("the route never exposes a raw database/thrown error message to the client", () => {
  const getBody = routeTs.slice(routeTs.indexOf("export async function GET"));
  assert.doesNotMatch(getBody, /error\.message/);
});

// ─── The page never renders a mutation form/button ──────────────────────────

test("the page never renders a form or calls fetch (no client-side mutation)", () => {
  assert.doesNotMatch(pageTsx, /<form\b/);
  assert.doesNotMatch(pageTsx, /fetch\(/);
});

test("the page never imports a mutation button component from other capital screens", () => {
  assert.doesNotMatch(
    pageTsx,
    /RequestPaperCloseReviewButton|PositionActions|MarkAllButton|GenerateSignalsButton|ConvertSignalToDraftButton|CancelDraftButton|SubmitDraftForReviewButton|StrategySelectButton/,
  );
});

test("the page never renders a mutation action", () => {
  assert.doesNotMatch(pageTsx, />\s*Close Position\s*</i);
  assert.doesNotMatch(pageTsx, />\s*Request (Paper )?Close Review\s*</i);
  assert.doesNotMatch(pageTsx, />\s*Refresh Valuation\s*</i);
  assert.doesNotMatch(pageTsx, />\s*Generate Signals?\s*</i);
  assert.doesNotMatch(pageTsx, />\s*Create Draft\s*</i);
  assert.doesNotMatch(pageTsx, />\s*Submit (for )?Review\s*</i);
  assert.doesNotMatch(pageTsx, />\s*Cancel Draft\s*</i);
});

// ─── Broad safety grep across the new surfaces (mirrors the PR's own grep) ──

const FORBIDDEN_SURFACE_PATTERN =
  /broker(?!\s*Connected)|withdraw|deposit|apiSecret|privateKey|placeOrder|createOrder|executeTrade|orderRouter|signedRequest|accountBalance/i;

test("the new service/route/page never introduce a broker/order/withdrawal/deposit surface", () => {
  for (const [name, source] of [
    ["service", serviceTs],
    ["route", routeTs],
    ["page", pageTsx],
  ]) {
    assert.doesNotMatch(source, FORBIDDEN_SURFACE_PATTERN, `${name} must not introduce a forbidden surface`);
  }
});

test("no schema migration is added for this PR", () => {
  const migrationFiles = fs
    .readdirSync("supabase/migrations")
    .filter((f) => f.includes("strategy_performance_attribution") || f.includes("strategy-performance-attribution"));
  assert.equal(migrationFiles.length, 0, "PR #19 is reporting-only and should not require a schema migration");
});
