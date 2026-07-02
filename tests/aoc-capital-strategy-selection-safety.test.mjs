// ─── AOC Capital Strategy Library — Selection Safety — Static Source Checks ────
// selectStrategy() (src/lib/capital/strategy-selection-service.ts) is I/O-heavy
// (talks to Supabase), and this codebase has no live-Supabase test harness for
// that kind of module (same rationale as
// tests/aoc-capital-demo-reset-safety.test.mjs and
// tests/aoc-capital-market-data-safety.test.mjs). These tests statically
// inspect the service and API route source to pin down that:
//   - a strategy selection is always validated against the static library
//     before any write
//   - the write goes through the governed, tenant-scoped, service-role client
//   - the audit event write is not swallowed — a failure there fails the
//     whole selection
//   - client-submitted strategy details (name, risk profile, symbols,
//     capabilities) are never persisted from the request body — only the key
//     is read, and everything else is re-derived server-side
//   - selecting a strategy never creates a trade intent or paper position

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const serviceTs = fs.readFileSync("src/lib/capital/strategy-selection-service.ts", "utf8");
const selectRouteTs = fs.readFileSync("src/app/api/capital/strategies/select/route.ts", "utf8");
const getRouteTs = fs.readFileSync("src/app/api/capital/strategies/route.ts", "utf8");

function extractFunction(source, exportSignature) {
  const start = source.indexOf(exportSignature);
  assert.ok(start >= 0, `expected to find "${exportSignature}"`);
  const nextExportFn = source.indexOf("\nexport", start + exportSignature.length);
  return source.slice(start, nextExportFn > start ? nextExportFn : undefined);
}

const selectStrategyBody = extractFunction(serviceTs, "export async function selectStrategy");

test("selectStrategy validates the strategyKey against the static library before any write", () => {
  const validateIndex = selectStrategyBody.indexOf("validateStrategySelection(input.strategyKey)");
  const firstWriteIndex = Math.min(
    ...["getOrCreateDefaultPortfolio(", "privileged(", ".upsert(", "recordAuditEvent("].map((needle) => {
      const index = selectStrategyBody.indexOf(needle);
      return index === -1 ? Infinity : index;
    })
  );
  assert.ok(validateIndex >= 0, "expected selectStrategy to call validateStrategySelection(input.strategyKey)");
  assert.ok(validateIndex < firstWriteIndex, "validation must happen before any write");
});

test("selectStrategy throws for an invalid strategy key instead of persisting anything", () => {
  assert.match(selectStrategyBody, /if \(!validation\.ok\)\s*\{\s*throw new UnknownStrategyKeyError/);
});

test("selectStrategy re-derives the full strategy config from validation.strategy, not from the raw input", () => {
  assert.match(selectStrategyBody, /const strategy = validation\.strategy;/);
  // The upsert payload must be built from `strategy.*` fields, never from a
  // client-supplied name/riskProfile/symbols/capabilities on `input`.
  assert.doesNotMatch(selectStrategyBody, /input\.(strategyName|riskProfile|supportedSymbols|allowedCapabilities|blockedCapabilities)/);
});

test("selectStrategy runs assertStrategyIsPaperOnly as a defense-in-depth guardrail before writing", () => {
  const assertIndex = selectStrategyBody.indexOf("assertStrategyIsPaperOnly(strategy)");
  const writeIndex = selectStrategyBody.indexOf(".upsert(");
  assert.ok(assertIndex >= 0, "expected a call to assertStrategyIsPaperOnly(strategy)");
  assert.ok(assertIndex < writeIndex, "the paper-only guardrail must run before the write");
});

test("selectStrategy always writes paper_only: true and real_execution_locked: true, never a variable derived from client input", () => {
  assert.match(selectStrategyBody, /paper_only:\s*true,/);
  assert.match(selectStrategyBody, /real_execution_locked:\s*true,/);
});

test("selectStrategy writes through the governed service-role client (privileged()), not the plain authenticated client", () => {
  assert.match(selectStrategyBody, /privileged\("capital\/strategy-library"/);
});

test("selectStrategy writes the strategy_selected audit event, and a failure there is not swallowed", () => {
  const auditCallIndex = selectStrategyBody.indexOf('event_type: "strategy_selected"');
  assert.ok(auditCallIndex >= 0, "expected selectStrategy to write a strategy_selected audit event");
  // The audit call must not be wrapped in a try/catch that swallows errors —
  // there should be no catch block between the await recordAuditEvent( call
  // and the function's closing return.
  const afterAudit = selectStrategyBody.slice(selectStrategyBody.indexOf("await recordAuditEvent("));
  assert.doesNotMatch(afterAudit.slice(0, afterAudit.indexOf("return { strategy, profile }")), /catch/);
});

test("selectStrategy never creates a trade intent or paper position", () => {
  assert.doesNotMatch(serviceTs, /createTradeIntent|closePaperPosition|markPositionToMarket|evaluate_and_record_trade_intent/);
});

test("selectStrategy and its route never reference real-execution, broker, API key, or withdrawal capabilities as anything other than blocked-capability strings", () => {
  for (const source of [serviceTs, selectRouteTs, getRouteTs]) {
    assert.doesNotMatch(source, /brokerEnabled|executionEnabled|requiresApiKey|placeOrder|createOrder|executeTrade|orderRouter|apiSecret|privateKey/);
  }
});

test("the POST /select route only reads strategyKey from the request body — no other field is forwarded to selectStrategy", () => {
  const bodyReadMatch = selectRouteTs.match(/const strategyKey = [\s\S]*?;/);
  assert.ok(bodyReadMatch, "expected a single strategyKey extraction from the parsed body");
  assert.doesNotMatch(selectRouteTs, /body\.(strategyName|riskProfile|supportedSymbols|allowedCapabilities|blockedCapabilities|paperOnly|realExecutionLocked)/);
});

test("the POST /select route returns 400 for an unknown strategy key instead of a 500", () => {
  assert.match(selectRouteTs, /UnknownStrategyKeyError/);
  assert.match(selectRouteTs, /status:\s*400/);
});

test("the POST /select route requires auth before doing anything else", () => {
  const authIndex = selectRouteTs.indexOf("requireAuthUser()");
  const bodyIndex = selectRouteTs.indexOf("request.json()");
  assert.ok(authIndex >= 0 && bodyIndex >= 0);
  assert.ok(authIndex < bodyIndex, "auth must be checked before reading the request body");
});

test("the GET /strategies route requires auth and marks the response paperOnly/realExecutionLocked", () => {
  assert.match(getRouteTs, /requireAuthUser\(\)/);
  assert.match(getRouteTs, /paperOnly:\s*true/);
  assert.match(getRouteTs, /realExecutionLocked:\s*true/);
});

// ─── Stale selected strategy handling ───────────────────────────────────────
// resolveSelectedStrategy must surface a stale strategy_key (one removed from
// STRATEGY_LIBRARY since it was selected) as a clear warning, never crash,
// never silently look like "no strategy was ever selected", and never enable
// execution or imply a trade intent / paper position exists. See
// tests/aoc-capital-strategy-selection-resolution.test.mjs for direct,
// pure-function coverage of resolveSelectedStrategy's return values.

const resolveSelectedStrategyBody = extractFunction(serviceTs, "export function resolveSelectedStrategy");

test("resolveSelectedStrategy is a pure read-side helper — it never calls a write function", () => {
  assert.doesNotMatch(resolveSelectedStrategyBody, /\.upsert\(|\.insert\(|\.update\(|\.delete\(|privileged\(|recordAuditEvent\(/);
});

test("resolveSelectedStrategy never creates a trade intent or paper position, even for a stale strategy_key", () => {
  assert.doesNotMatch(resolveSelectedStrategyBody, /createTradeIntent|closePaperPosition|markPositionToMarket|evaluate_and_record_trade_intent/);
});

test("resolveSelectedStrategy returns a staleSelectedStrategy object (not a bare null) when getStrategyByKey finds nothing", () => {
  assert.match(resolveSelectedStrategyBody, /if \(strategy\) \{/);
  assert.match(resolveSelectedStrategyBody, /staleSelectedStrategy:\s*\{/);
  assert.match(resolveSelectedStrategyBody, /reason:\s*"This previously selected strategy is no longer available in the current library\."/);
});

test("resolveSelectedStrategy always returns paperOnly: true and realExecutionLocked: true on every branch, even the stale one", () => {
  const paperOnlyTrueCount = (resolveSelectedStrategyBody.match(/paperOnly:\s*true/g) || []).length;
  const lockedTrueCount = (resolveSelectedStrategyBody.match(/realExecutionLocked:\s*true/g) || []).length;
  assert.ok(paperOnlyTrueCount >= 3, "expected paperOnly: true on the no-profile, resolved, and stale branches");
  assert.ok(lockedTrueCount >= 3, "expected realExecutionLocked: true on the no-profile, resolved, and stale branches");
  assert.doesNotMatch(resolveSelectedStrategyBody, /paperOnly:\s*false|realExecutionLocked:\s*false/);
});

test("the GET /strategies route surfaces staleSelectedStrategy alongside selectedStrategy", () => {
  assert.match(getRouteTs, /staleSelectedStrategy:\s*resolved\.staleSelectedStrategy/);
});
