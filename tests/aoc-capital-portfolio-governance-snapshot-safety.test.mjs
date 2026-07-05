// ─── AOC Capital Portfolio Governance Snapshot v1 (PR #21) — Safety —
// Static Source Checks ──────────────────────────────────────────────────────
// getPortfolioGovernanceSnapshot() is I/O-heavy (it composes four other
// read-only reports) and this codebase has no live-Supabase test harness for
// that kind of module (same rationale as
// tests/aoc-capital-signal-cohort-outcome-safety.test.mjs). These tests
// statically inspect the service, API route, and page source to pin down
// that this report is read-only from a governance perspective: it never
// queries a table directly, never calls a governed mutation RPC, never
// generates a signal, never creates/submits/cancels a draft trade intent,
// never runs Risk Constitution review, never creates/closes/marks a paper
// position, never requests a close review, never refreshes valuation, never
// mutates an audit record, never mutates a strategy or portfolio record,
// never calls the LLM, and never references a broker/exchange/real-execution
// capability.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const serviceTs = fs.readFileSync("src/lib/capital/portfolio-governance-snapshot-service.ts", "utf8");
const contentTs = fs.readFileSync("src/lib/capital/portfolio-governance-snapshot-content.ts", "utf8");
const routeTs = fs.readFileSync("src/app/api/capital/governance/snapshot/route.ts", "utf8");
const pageTsx = fs.readFileSync("src/app/(protected)/capital/governance/snapshot/page.tsx", "utf8");

test("the service file exists", () => {
  assert.ok(serviceTs.length > 0);
});

test("the API route file exists", () => {
  assert.ok(routeTs.length > 0);
});

test("the page file exists", () => {
  assert.ok(pageTsx.length > 0);
});

// ─── The service never queries a table directly — it only composes the four
// existing read-only reports ─────────────────────────────────────────────────

test("the service never calls .from( against any table — it composes existing read-only reports instead of querying directly", () => {
  assert.doesNotMatch(serviceTs, /\.from\(/);
});

test("the service never calls .rpc( at all — it is a pure composition/aggregation layer, not a write path", () => {
  assert.doesNotMatch(serviceTs, /\.rpc\(/);
});

test("the service never inserts, updates, upserts, or deletes any table", () => {
  assert.doesNotMatch(serviceTs, /\.(insert|update|delete|upsert)\(/);
});

test("the service only imports the four existing read-only report functions, never a mutation service", () => {
  assert.match(serviceTs, /getAllocationExposureOverview/);
  assert.match(serviceTs, /getClosedPositionPerformance/);
  assert.match(serviceTs, /getStrategyPerformanceAttribution/);
  assert.match(serviceTs, /getSignalCohortOutcomes/);
});

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

test("the service never calls a forbidden mutation helper function", () => {
  assert.doesNotMatch(
    serviceTs,
    /\bgenerateSignals\(|\bgeneratePaperSignalRecommendations\(|\bconvertSignalToDraftTradeIntent\(|\bcreateDraftTradeIntentFromSignal\(|\bsubmitDraftTradeIntentForReview\(|\bcancelDraftTradeIntent\(|\brequestPaperPositionCloseReview\(|\bclosePaperPosition\(|\bmarkAllOpenPositions\(|\bmarkPositionToMarket\(|\brecordMarketPrice\(|\bcreateTradeIntent\(|\bselectStrategy\(|\brecordAuditEvent\(/,
  );
});

test("the service never marks positions to market, closes positions, or generates signals", () => {
  assert.doesNotMatch(serviceTs, /listPaperPositionsMarked|markAllOpenPositions|markPositionToMarket|closePaperPosition|loadPortfolioOverview|generatePaperSignals\(/);
});

test("the service never calls the LLM", () => {
  assert.doesNotMatch(serviceTs, /callLlm|anthropic|openai|chatCompletion|generateText\(/i);
});

test("the service never references broker/API-key/withdrawal/order-routing/real-execution capabilities beyond the required literal safety-flag fields (brokerConnected/withdrawalsEnabled/depositsEnabled, always false)", () => {
  assert.doesNotMatch(
    serviceTs,
    /\bbroker\b|brokerEnabled|executionEnabled|requiresApiKey|placeOrder|createOrder|executeTrade|orderRouter|apiSecret|privateKey|withdraw(?!alsEnabled)|deposit(?!sEnabled)|accountBalance/i,
  );
});

test("the service returns the required literal governance flags", () => {
  assert.match(serviceTs, /paperOnly:\s*true/);
  assert.match(serviceTs, /readOnly:\s*true/);
  assert.match(serviceTs, /realExecutionLocked:\s*true/);
  assert.match(serviceTs, /brokerConnected:\s*false/);
  assert.match(serviceTs, /liveOrderRoutingEnabled:\s*false/);
  assert.match(serviceTs, /marketDataFetched:\s*false/);
  assert.match(serviceTs, /mutationsPerformed:\s*false/);
  assert.match(serviceTs, /llmCalled:\s*false/);
  assert.match(serviceTs, /investmentAdviceProvided:\s*false/);
});

test("the service never infers a source chain, cohort, or attribution from a symbol alone — it never reads a `.symbol` field off any report row", () => {
  assert.doesNotMatch(serviceTs, /\.symbol\b/);
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

test("the route requires auth and calls getPortfolioGovernanceSnapshot, never a mutation service", () => {
  assert.match(routeTs, /requireAuthUser\(\)/);
  assert.match(routeTs, /getPortfolioGovernanceSnapshot\(/);
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
  assert.doesNotMatch(pageTsx, />\s*Convert Signal\s*</i);
});

// ─── Broad safety grep across the new surfaces (mirrors the PR's own grep) ──
// Applied to the service and route only — the actual behavior-bearing code
// where a real broker/order/withdrawal/deposit surface would materialize
// (a client, an API call, a secret). The page and content module legitimately
// contain approved safety-negation copy ("No broker connected", "No
// withdrawal/deposit surface introduced by this PR") that this PR's own
// acceptance criteria explicitly list as an allowed hit.

const FORBIDDEN_SURFACE_PATTERN = /apiSecret|privateKey|placeOrder|createOrder|executeTrade|orderRouter|signedRequest|accountBalance/i;

test("the service and route never introduce a broker/order/withdrawal/deposit code surface", () => {
  for (const [name, source] of [
    ["service", serviceTs],
    ["route", routeTs],
  ]) {
    assert.doesNotMatch(source, FORBIDDEN_SURFACE_PATTERN, `${name} must not introduce a forbidden surface`);
  }
});

test("the page and content module never reference a broker client, order-routing call, or credential surface (safety-negation copy is allowed)", () => {
  for (const [name, source] of [
    ["page", pageTsx],
    ["content", contentTs],
  ]) {
    assert.doesNotMatch(source, FORBIDDEN_SURFACE_PATTERN, `${name} must not introduce a forbidden surface`);
    assert.doesNotMatch(source, /brokerClient|brokerApi|brokerSdk|orderRouter|placeOrder|createOrder/i, `${name} must not reference a broker/order-routing code surface`);
  }
});

test("no schema migration is added for this PR", () => {
  const migrationFiles = fs.readdirSync("supabase/migrations").filter((f) => f.includes("governance_snapshot") || f.includes("governance-snapshot"));
  assert.equal(migrationFiles.length, 0, "PR #21 is reporting-only and should not require a schema migration");
});
