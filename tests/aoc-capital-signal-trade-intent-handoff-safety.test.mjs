// ─── AOC Capital Signal Recommendation to Trade Intent Draft Handoff (PR #11)
// — Safety — Static Source Checks ────────────────────────────────────────────
// convertSignalToDraftTradeIntent() (src/lib/capital/signal-trade-intent-
// handoff-service.ts) is I/O-heavy (talks to Supabase) and this codebase has
// no live-Supabase test harness for that kind of module (same rationale as
// tests/aoc-capital-strategy-selection-safety.test.mjs and
// tests/aoc-capital-signal-engine-safety.test.mjs). These tests statically
// inspect the service, API route, and UI source to pin down that:
//   - the signal is always re-read fresh from the database by id — never a
//     client-supplied symbol/side/quantity/notional
//   - a non-convertible signal (wrong action, wrong status, no notional, no
//     price, already converted) is rejected before any write
//   - the write goes through the governed, tenant-scoped, service-role client
//   - the draft insert, marking the signal converted, and the audit event all
//     commit atomically through create_draft_trade_intent_from_signal_and_audit()
//   - this flow never evaluates the Level 1 risk policy engine and never
//     opens a paper position — the draft always lands with status "draft"
//   - the UI never shows execution-style CTAs and never POSTs a request body

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const serviceTs = fs.readFileSync("src/lib/capital/signal-trade-intent-handoff-service.ts", "utf8");
const routeTs = fs.readFileSync("src/app/api/capital/signals/[id]/convert-to-draft/route.ts", "utf8");
const buttonTs = fs.readFileSync("src/app/(protected)/capital/signals/convert-signal-to-draft-button.tsx", "utf8");
const pageTs = fs.readFileSync("src/app/(protected)/capital/signals/page.tsx", "utf8");
const tradeServiceTs = fs.readFileSync("src/lib/trading/trade-service.ts", "utf8");
const contractTs = fs.readFileSync("src/lib/trading/database-contract.ts", "utf8");

function extractFunction(source, exportSignature) {
  const start = source.indexOf(exportSignature);
  assert.ok(start >= 0, `expected to find "${exportSignature}"`);
  const nextExportFn = source.indexOf("\nexport", start + exportSignature.length);
  return source.slice(start, nextExportFn > start ? nextExportFn : undefined);
}

const convertBody = extractFunction(serviceTs, "export async function convertSignalToDraftTradeIntent");

// ─── Signal is always re-read fresh, never trusted from the client ─────────

test("convertSignalToDraftTradeIntent re-reads the signal from the database by id before doing anything else", () => {
  const readIndex = convertBody.indexOf("getSignalForConversion(input.companyId, input.portfolioId, input.signalId)");
  const rpcIndex = convertBody.indexOf(".rpc(");
  assert.ok(readIndex >= 0, "expected the signal to be re-read server-side by id");
  assert.ok(readIndex < rpcIndex, "the signal must be read and validated before the RPC call");
});

test("ConvertSignalToDraftTradeIntentInput only carries companyId/actorUserId/actor/portfolioId/signalId — no symbol/side/quantity/notional override", () => {
  const inputType = extractFunction(serviceTs, "export type ConvertSignalToDraftTradeIntentInput = {");
  assert.doesNotMatch(inputType, /symbol|side|quantity|notionalUsd/i);
});

test("the POST /convert-to-draft route never reads the request body — no symbol/side/quantity/notional override is possible", () => {
  const codeOnly = routeTs.replace(/\/\*\*[\s\S]*?\*\//, "");
  assert.doesNotMatch(codeOnly, /request\.json\(/);
  assert.doesNotMatch(codeOnly, /body\./);
});

// ─── Non-convertible signals are rejected before any write ─────────────────

test("assertConvertible rejects an already-converted signal, a non-paper_buy_candidate action, a non-active status, a missing suggested notional, and a missing market price", () => {
  const assertBody = extractFunction(serviceTs, "function assertConvertible");
  assert.match(assertBody, /SignalAlreadyConvertedError/);
  assert.match(assertBody, /signal\.action !== "paper_buy_candidate"/);
  assert.match(assertBody, /signal\.status !== "active"/);
  assert.match(assertBody, /suggested_notional_usd === null/);
  assert.match(assertBody, /market_price_usd === null/);
});

test("convertSignalToDraftTradeIntent calls assertConvertible before the RPC call", () => {
  const assertIndex = convertBody.indexOf("assertConvertible(signal)");
  const rpcIndex = convertBody.indexOf(".rpc(");
  assert.ok(assertIndex >= 0 && assertIndex < rpcIndex);
});

test("the route maps SignalNotFoundError to 404, SignalAlreadyConvertedError to 409, and SignalNotConvertibleError to 400", () => {
  assert.match(routeTs, /SignalNotFoundError[\s\S]*?status:\s*404/);
  assert.match(routeTs, /SignalAlreadyConvertedError[\s\S]*?status:\s*409/);
  assert.match(routeTs, /SignalNotConvertibleError[\s\S]*?status:\s*400/);
});

// ─── Governed write path ────────────────────────────────────────────────────

test("convertSignalToDraftTradeIntent writes through the governed service-role client (privileged()), not the plain authenticated client", () => {
  assert.match(convertBody, /privileged\("capital\/signal-trade-intent-handoff"/);
});

test("convertSignalToDraftTradeIntent calls the create_draft_trade_intent_from_signal_and_audit RPC to persist the draft and audit event atomically", () => {
  assert.match(convertBody, /\.rpc\(\s*"create_draft_trade_intent_from_signal_and_audit"/);
});

test("the service never calls recordAuditEvent — the audit write happens inside the atomic RPC, not as a separate application-level write", () => {
  assert.doesNotMatch(serviceTs, /recordAuditEvent/);
});

test("the service never inserts directly into trade_intents or paper_signal_recommendations from the application layer — only the atomic RPC writes those tables", () => {
  assert.doesNotMatch(serviceTs, /\.from\(\s*"trade_intents"\s*\)\s*\.(insert|update)\(/);
  assert.doesNotMatch(serviceTs, /\.from\(\s*"paper_signal_recommendations"\s*\)\s*\.(insert|update)\(/);
});

// ─── Never evaluates risk, never opens a position, never enables execution ─

test("the handoff service and route never call the risk-evaluation or position write paths in code (prose in comments may still name them)", () => {
  for (const source of [serviceTs, routeTs]) {
    const codeOnly = source.replace(/\/\*\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    assert.doesNotMatch(codeOnly, /createTradeIntent\(|\.rpc\(\s*"evaluate_and_record_trade_intent"|closePaperPosition\(|markPositionToMarket\(/);
  }
});

test("the handoff service never references real-execution, broker, API key, or withdrawal capabilities as anything other than blocked-capability strings", () => {
  for (const source of [serviceTs, routeTs, buttonTs]) {
    assert.doesNotMatch(source, /brokerEnabled|executionEnabled|requiresApiKey|placeOrder|createOrder|executeTrade|orderRouter|apiSecret|privateKey/);
  }
});

test("the draft trade intent is always created with status 'draft', never 'pending' or 'approved'", () => {
  assert.match(serviceTs, /draft_status:\s*"draft"/);
});

// ─── Controlled vocabulary / UI ─────────────────────────────────────────────

test("the convert button and signals page never show Execute/Place order/Trade now/Send to broker/Connect exchange copy", () => {
  for (const source of [pageTs, buttonTs]) {
    assert.doesNotMatch(source, /\bExecute\b|Place [Oo]rder|Trade [Nn]ow|Send to [Bb]roker|Connect [Ee]xchange/);
  }
});

test("the convert button POSTs with no request body — nothing for it to submit", () => {
  const fetchIndex = buttonTs.indexOf('fetch(`/api/capital/signals/${signalId}/convert-to-draft`');
  assert.ok(fetchIndex >= 0);
  const fetchCall = buttonTs.slice(fetchIndex, fetchIndex + 200);
  assert.doesNotMatch(fetchCall, /body:/);
});

test("isConvertibleToDraft on the signals page requires an active paper_buy_candidate, not already converted, with a suggested notional and a market price", () => {
  const fnBody = extractFunction(pageTs, "function isConvertibleToDraft");
  assert.match(fnBody, /signal\.action === "paper_buy_candidate"/);
  assert.match(fnBody, /signal\.status === "active"/);
  assert.match(fnBody, /!signal\.converted_trade_intent_id/);
  assert.match(fnBody, /signal\.suggested_notional_usd/);
  assert.match(fnBody, /signal\.market_price_usd/);
});

// ─── Database contract stays in sync ────────────────────────────────────────

test("TradeIntentStatus includes 'draft' and TradeIntentSource includes 'signal_recommendation'", () => {
  assert.match(contractTs, /export type TradeIntentStatus = "draft"/);
  assert.match(contractTs, /export type TradeIntentSource = "manual" \| "signal" \| "signal_recommendation"/);
});

test("TradeIntentRow declares paper_signal_recommendation_id and PaperSignalRecommendationRow declares converted_trade_intent_id", () => {
  assert.match(contractTs, /paper_signal_recommendation_id:\s*string \| null;/);
  assert.match(contractTs, /converted_trade_intent_id:\s*string \| null;/);
});

test("AuditLedgerEventType includes signal_converted_to_draft_trade_intent", () => {
  assert.match(contractTs, /"signal_converted_to_draft_trade_intent"/);
});

test("listTradeIntents selects paper_signal_recommendation_id so drafts are distinguishable in the UI", () => {
  const listBody = extractFunction(tradeServiceTs, "export async function listTradeIntents");
  assert.match(listBody, /paper_signal_recommendation_id/);
});
