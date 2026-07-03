// ─── AOC Capital Signal Engine v1 — Safety — Static Source Checks ──────────────
// generateSignals()/listSignalRecommendations() (src/lib/capital/signal-engine-service.ts)
// are I/O-heavy (talk to Supabase) and this codebase has no live-Supabase
// test harness for that kind of module (same rationale as
// tests/aoc-capital-strategy-selection-safety.test.mjs and
// tests/aoc-capital-market-data-safety.test.mjs). These tests statically
// inspect the service and API route source to pin down that:
//   - a missing or stale selected strategy fails safely, before any write
//   - the write goes through the governed, tenant-scoped, service-role client
//   - the audit event write is not swallowed — a failure there fails the
//     whole generation
//   - the POST /generate route never reads strategyKey/symbols/notional/
//     action from the request body — the whole body is never even parsed
//   - signal generation never creates a trade intent or paper position
//   - no signal action ever uses execute/place-order/trade-now language

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const serviceTs = fs.readFileSync("src/lib/capital/signal-engine-service.ts", "utf8");
const engineTs = fs.readFileSync("src/lib/capital/signal-engine.ts", "utf8");
const typesTs = fs.readFileSync("src/lib/capital/signal-engine-types.ts", "utf8");
const generateRouteTs = fs.readFileSync("src/app/api/capital/signals/generate/route.ts", "utf8");
const getRouteTs = fs.readFileSync("src/app/api/capital/signals/route.ts", "utf8");

function extractFunction(source, exportSignature) {
  const start = source.indexOf(exportSignature);
  assert.ok(start >= 0, `expected to find "${exportSignature}"`);
  const nextExportFn = source.indexOf("\nexport", start + exportSignature.length);
  return source.slice(start, nextExportFn > start ? nextExportFn : undefined);
}

const generateSignalsBody = extractFunction(serviceTs, "export async function generateSignals");

// ─── Selected-strategy fail-safe (no strategy / stale strategy) ────────────

test("generateSignals throws NoStrategySelectedError when no strategy profile exists, before building any engine input", () => {
  const noProfileIndex = generateSignalsBody.indexOf("if (!profile) throw new NoStrategySelectedError();");
  const engineInputIndex = generateSignalsBody.indexOf("const engineInput");
  assert.ok(noProfileIndex >= 0, "expected an explicit !profile guard throwing NoStrategySelectedError");
  assert.ok(noProfileIndex < engineInputIndex, "the no-strategy guard must run before building SignalEngineInput");
});

test("generateSignals throws StaleSelectedStrategyError for a stale selection, before building any engine input", () => {
  const staleIndex = generateSignalsBody.indexOf("if (resolved.staleSelectedStrategy || !resolved.selectedStrategy) throw new StaleSelectedStrategyError();");
  const engineInputIndex = generateSignalsBody.indexOf("const engineInput");
  assert.ok(staleIndex >= 0, "expected an explicit staleSelectedStrategy guard throwing StaleSelectedStrategyError");
  assert.ok(staleIndex < engineInputIndex, "the stale-strategy guard must run before building SignalEngineInput");
});

test("the POST /generate route maps NoStrategySelectedError to 400 and StaleSelectedStrategyError to 409", () => {
  assert.match(generateRouteTs, /NoStrategySelectedError[\s\S]*?status:\s*400/);
  assert.match(generateRouteTs, /StaleSelectedStrategyError[\s\S]*?status:\s*409/);
});

// ─── Client input is never trusted ──────────────────────────────────────────

test("the POST /generate route never reads the request body at all — no strategyKey/symbols/notional/action override is possible", () => {
  // Strip the doc comment first — it discusses these terms in prose, but the
  // code itself must never reference them.
  const codeOnly = generateRouteTs.replace(/\/\*\*[\s\S]*?\*\//, "");
  assert.doesNotMatch(codeOnly, /request\.json\(/);
  assert.doesNotMatch(codeOnly, /body\./);
  assert.doesNotMatch(codeOnly, /strategyKey|symbols|notionalUsd|suggestedNotionalUsd|\baction\b\s*[:=]/);
});

test("generateSignals never accepts a client-supplied strategy/symbol/notional override — GenerateSignalsInput is only companyId/actorUserId/actor", () => {
  const inputType = extractFunction(serviceTs, "export type GenerateSignalsInput = {");
  assert.doesNotMatch(inputType, /strategyKey|symbols|notionalUsd|action/i);
});

// ─── Governed write path ────────────────────────────────────────────────────

test("generateSignals writes through the governed service-role client (privileged()), not the plain authenticated client", () => {
  assert.match(generateSignalsBody, /privileged\("capital\/signal-engine"/);
});

test("generateSignals writes the signals_generated audit event, and a failure there is not swallowed", () => {
  const auditCallIndex = generateSignalsBody.indexOf('event_type: "signals_generated"');
  assert.ok(auditCallIndex >= 0, "expected generateSignals to write a signals_generated audit event");
  const afterAudit = generateSignalsBody.slice(generateSignalsBody.indexOf("await recordAuditEvent("));
  assert.doesNotMatch(afterAudit.slice(0, afterAudit.indexOf("return { signals: persisted")), /catch/);
});

test("listSignalRecommendations is read-only — it never inserts, updates, deletes, or writes an audit event", () => {
  const listBody = extractFunction(serviceTs, "export async function listSignalRecommendations");
  assert.doesNotMatch(listBody, /\.insert\(|\.update\(|\.delete\(|\.upsert\(|privileged\(|recordAuditEvent\(/);
});

test("the GET /signals route never generates a new signal batch and never calls generateSignals", () => {
  assert.doesNotMatch(getRouteTs, /generateSignals\(/);
});

// ─── Never touches trade intents or paper positions ─────────────────────────

test("signal generation never creates a trade intent or opens/closes a paper position", () => {
  for (const source of [serviceTs, engineTs]) {
    assert.doesNotMatch(source, /createTradeIntent|closePaperPosition|markPositionToMarket|evaluate_and_record_trade_intent/);
  }
});

test("the signal engine service and pure engine never reference real-execution, broker, API key, or withdrawal capabilities as anything other than blocked-capability strings", () => {
  for (const source of [serviceTs, engineTs, generateRouteTs, getRouteTs]) {
    assert.doesNotMatch(source, /brokerEnabled|executionEnabled|requiresApiKey|placeOrder|createOrder|executeTrade|orderRouter|apiSecret|privateKey/);
  }
});

// ─── Controlled vocabulary ───────────────────────────────────────────────────

test("SignalAction never includes buy_now/sell_now/execute/place_order/create_order/trade_now/send_to_broker", () => {
  const actionType = extractFunction(typesTs, "export type SignalAction =");
  assert.doesNotMatch(actionType, /buy_now|sell_now|execute|place_order|create_order|trade_now|send_to_broker/);
});

test("PaperSignalRecommendation always carries paperOnly: true and realExecutionLocked: true as literal types", () => {
  const recommendationType = extractFunction(typesTs, "export type PaperSignalRecommendation = {");
  assert.match(recommendationType, /paperOnly:\s*true;/);
  assert.match(recommendationType, /realExecutionLocked:\s*true;/);
});

test("SignalEngineInput's riskLimits pin leverageAllowed/shortsAllowed/realExecutionAllowed to the literal type false", () => {
  const inputType = extractFunction(typesTs, "export type SignalEngineInput = {");
  assert.match(inputType, /leverageAllowed:\s*false;/);
  assert.match(inputType, /shortsAllowed:\s*false;/);
  assert.match(inputType, /realExecutionAllowed:\s*false;/);
});

test("generatePaperSignals asserts every signal is paper-only before returning it", () => {
  const generateBody = extractFunction(engineTs, "export function generatePaperSignals");
  assert.match(generateBody, /assertSignalIsPaperOnly\(signal\);/);
});

// ─── UI never shows execution-style CTAs ────────────────────────────────────

test("the /capital/signals page and generate button never show Execute/Place order/Trade now/Send to broker/Connect exchange copy", () => {
  const pageTs = fs.readFileSync("src/app/(protected)/capital/signals/page.tsx", "utf8");
  const buttonTs = fs.readFileSync("src/app/(protected)/capital/signals/generate-signals-button.tsx", "utf8");
  for (const source of [pageTs, buttonTs]) {
    assert.doesNotMatch(source, /\bExecute\b|Place [Oo]rder|Trade [Nn]ow|Send to [Bb]roker|Connect [Ee]xchange/);
  }
});

test("the generate button POSTs with no request body — nothing for it to submit", () => {
  const buttonTs = fs.readFileSync("src/app/(protected)/capital/signals/generate-signals-button.tsx", "utf8");
  const fetchCall = buttonTs.slice(buttonTs.indexOf("fetch(\"/api/capital/signals/generate\""), buttonTs.indexOf("fetch(\"/api/capital/signals/generate\"") + 200);
  assert.doesNotMatch(fetchCall, /body:/);
});
