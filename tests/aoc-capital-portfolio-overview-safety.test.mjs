// ─── AOC Capital Portfolio Overview Dashboard v1 (PR #14) — Safety —
// Static Source Checks ───────────────────────────────────────────────────────
// getPortfolioOverview() (src/lib/capital/portfolio-overview-service.ts) is
// I/O-heavy (talks to Supabase) and this codebase has no live-Supabase test
// harness for that kind of module (same rationale as
// tests/aoc-capital-draft-cancel-safety.test.mjs). These tests statically
// inspect the service and API route source to pin down that this dashboard
// is read-only from a governance perspective: it never generates signals,
// never creates/submits/cancels a draft trade intent, never runs Risk
// Constitution review, never creates a trade decision, never opens/closes/
// marks a paper position, never changes the selected strategy, and never
// references a broker/exchange/real-execution capability.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const serviceTs = fs.readFileSync("src/lib/capital/portfolio-overview-service.ts", "utf8");
const routeTs = fs.readFileSync("src/app/api/capital/portfolio-overview/route.ts", "utf8");

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

test("the service never inserts, updates, or deletes trade_intents/paper_positions/trade_decisions/portfolio_strategy_profiles/paper_signal_recommendations directly", () => {
  for (const table of ["trade_intents", "paper_positions", "trade_decisions", "portfolio_strategy_profiles", "paper_signal_recommendations", "audit_ledger"]) {
    assert.doesNotMatch(serviceTs, new RegExp(`\\.from\\(\\s*"${table}"\\s*\\)\\s*\\.(insert|update|delete|upsert)\\(`), `service must not write ${table} directly`);
  }
});

test("the service never calls generateSignals, selectStrategy, convertSignalToDraftTradeIntent, cancelDraftTradeIntent, or submitDraftTradeIntentForReview", () => {
  assert.doesNotMatch(serviceTs, /\bgenerateSignals\(|\bselectStrategy\(|\bconvertSignalToDraftTradeIntent\(|\bcancelDraftTradeIntent\(|\bsubmitDraftTradeIntentForReview\(/);
});

function stripLineComments(source) {
  return source
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

test("the service never marks positions to market or closes positions — it calls getPortfolioSummary/listPaperPositions, not loadPortfolioOverview/markAllOpenPositions/listPaperPositionsMarked", () => {
  const codeOnly = stripLineComments(serviceTs);
  assert.doesNotMatch(codeOnly, /markPositionToMarket|markAllOpenPositions|closePaperPosition|listPaperPositionsMarked|loadPortfolioOverview/);
  assert.match(serviceTs, /\blistPaperPositions\b/);
  assert.match(serviceTs, /\bgetPortfolioSummary\b/);
});

test("the service never calls recordAuditEvent or otherwise writes an audit event — it only reads audit_ledger via listAuditLedger", () => {
  assert.doesNotMatch(serviceTs, /recordAuditEvent/);
  assert.match(serviceTs, /\blistAuditLedger\b/);
});

test("the service never references broker/API-key/withdrawal/order-routing capabilities", () => {
  assert.doesNotMatch(serviceTs, /brokerEnabled|executionEnabled|requiresApiKey|placeOrder|createOrder|executeTrade|orderRouter|apiSecret|privateKey|withdrawal|deposit/i);
});

test("the service returns paperOnly true, realExecutionLocked true, brokerConnected false, liveOrderRoutingEnabled false as literal governance flags", () => {
  assert.match(serviceTs, /paperOnly:\s*true/);
  assert.match(serviceTs, /realExecutionLocked:\s*true/);
  assert.match(serviceTs, /brokerConnected:\s*false/);
  assert.match(serviceTs, /liveOrderRoutingEnabled:\s*false/);
});

test("the service does not implement its own Risk Constitution engine — it reuses existing strategyHealth from portfolio-summary.ts instead of re-deriving exposure/loss-limit math", () => {
  assert.doesNotMatch(serviceTs, /MAX_SIMULATED_EXPOSURE_RATIO|MAX_DAILY_SIMULATED_LOSS_USD|MAX_WEEKLY_SIMULATED_LOSS_USD|MAX_OPEN_POSITIONS/);
  assert.match(serviceTs, /strategyHealth/);
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

test("the route calls getPortfolioOverview and requireAuthUser, and never a mutation service", () => {
  assert.match(routeTs, /requireAuthUser\(\)/);
  assert.match(routeTs, /getPortfolioOverview\(/);
  assert.doesNotMatch(routeTs, /generateSignals\(|selectStrategy\(|convertSignalToDraftTradeIntent\(|cancelDraftTradeIntent\(|submitDraftTradeIntentForReview\(|createTradeIntent\(/);
});

test("the route never exposes a raw database/thrown error message to the client", () => {
  const getBody = routeTs.slice(routeTs.indexOf("export async function GET"));
  assert.doesNotMatch(getBody, /error\.message/);
});
