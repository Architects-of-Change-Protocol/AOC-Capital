// ─── AOC Capital Position Detail & Lifecycle Timeline v1 (PR #16) — Safety —
// Static Source Checks ───────────────────────────────────────────────────────
// getPositionDetail() (src/lib/capital/position-detail-service.ts) is
// I/O-heavy (talks to Supabase) and this codebase has no live-Supabase test
// harness for that kind of module (same rationale as
// tests/aoc-capital-allocation-exposure-safety.test.mjs). These tests
// statically inspect the service, API route, and page source to pin down
// that this view is read-only from a governance perspective: it never
// generates signals, never creates/submits/cancels a draft trade intent,
// never runs Risk Constitution review, never creates a trade decision, never
// opens/closes/marks a paper position, never changes the selected strategy,
// and never references a broker/exchange/real-execution capability.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const serviceTs = fs.readFileSync("src/lib/capital/position-detail-service.ts", "utf8");
const routeTs = fs.readFileSync("src/app/api/capital/positions/[id]/route.ts", "utf8");
const pageTsx = fs.readFileSync("src/app/(protected)/capital/positions/[id]/page.tsx", "utf8");

function stripLineComments(source) {
  return source
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

// ─── The service never calls a mutation RPC ─────────────────────────────────

const FORBIDDEN_MUTATION_RPCS = [
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

test("the service never inserts, updates, upserts, or deletes any governed table directly", () => {
  for (const table of ["trade_intents", "paper_positions", "trade_decisions", "portfolio_strategy_profiles", "paper_signal_recommendations", "audit_ledger"]) {
    assert.doesNotMatch(serviceTs, new RegExp(`\\.from\\(\\s*"${table}"\\s*\\)\\s*\\.(insert|update|delete|upsert)\\(`), `service must not write ${table} directly`);
  }
});

test("the service never calls generateSignals, selectStrategy, convertSignalToDraftTradeIntent, cancelDraftTradeIntent, submitDraftTradeIntentForReview, or createTradeIntent", () => {
  assert.doesNotMatch(
    serviceTs,
    /\bgenerateSignals\(|\bselectStrategy\(|\bconvertSignalToDraftTradeIntent\(|\bcancelDraftTradeIntent\(|\bsubmitDraftTradeIntentForReview\(|\bcreateTradeIntent\(/
  );
});

test("the service never marks positions to market or closes positions — it calls getPaperPosition, not markPositionToMarket/markAllOpenPositions/closePaperPosition/listPaperPositionsMarked/loadPortfolioOverview", () => {
  const codeOnly = stripLineComments(serviceTs);
  assert.doesNotMatch(codeOnly, /markPositionToMarket|markAllOpenPositions|closePaperPosition|listPaperPositionsMarked|loadPortfolioOverview/);
  assert.match(serviceTs, /\bgetPaperPosition\b/);
});

test("the service never calls recordAuditEvent or writes an audit event", () => {
  assert.doesNotMatch(serviceTs, /recordAuditEvent/);
});

test("the service never references broker/API-key/withdrawal/order-routing capabilities", () => {
  assert.doesNotMatch(serviceTs, /brokerEnabled|executionEnabled|requiresApiKey|placeOrder|createOrder|executeTrade|orderRouter|apiSecret|privateKey|withdrawal|deposit/i);
});

test("the service returns paperOnly true, realExecutionLocked true, brokerConnected false, liveOrderRoutingEnabled false, readOnly true as literal governance flags", () => {
  assert.match(serviceTs, /paperOnly:\s*true/);
  assert.match(serviceTs, /realExecutionLocked:\s*true/);
  assert.match(serviceTs, /brokerConnected:\s*false/);
  assert.match(serviceTs, /liveOrderRoutingEnabled:\s*false/);
  assert.match(serviceTs, /readOnly:\s*true/);
});

test("the service scopes the position lookup by company_id and the resolved default portfolio", () => {
  assert.match(serviceTs, /getOrCreateDefaultPortfolio\(/);
  assert.match(serviceTs, /position\.portfolio_id\s*!==\s*portfolio\.id/);
});

test("the service scopes trade intent, decision, signal, and audit reads by company_id", () => {
  assert.match(serviceTs, /\.eq\("company_id",\s*companyId\)/);
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

test("the route calls getPositionDetail and requireAuthUser, and never a mutation service", () => {
  assert.match(routeTs, /requireAuthUser\(\)/);
  assert.match(routeTs, /getPositionDetail\(/);
  assert.doesNotMatch(routeTs, /generateSignals\(|selectStrategy\(|convertSignalToDraftTradeIntent\(|cancelDraftTradeIntent\(|submitDraftTradeIntentForReview\(|createTradeIntent\(/);
});

test("the route returns 404 for a not-found position and never exposes a raw database/thrown error message", () => {
  assert.match(routeTs, /status:\s*404/);
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
    /PositionActions|MarkAllButton|GenerateSignalsButton|ConvertSignalToDraftButton|CancelDraftButton|SubmitDraftForReviewButton|StrategySelectButton|CloseButton|RefreshButton/
  );
});

test("the page never renders a close-position or refresh-valuation control", () => {
  assert.doesNotMatch(pageTsx, /[Cc]lose [Pp]osition|[Rr]efresh [Vv]aluation/);
});

// ─── No unjustified schema migration ────────────────────────────────────────

test("no new supabase migration file was added for this PR's date range without justification", () => {
  const migrationsDir = "supabase/migrations";
  const files = fs.readdirSync(migrationsDir);
  const positionDetailMigrations = files.filter((f) => f.toLowerCase().includes("position_detail") || f.toLowerCase().includes("position-detail"));
  assert.deepEqual(positionDetailMigrations, [], "Position Detail v1 must not add a schema migration");
});
