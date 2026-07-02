// ─── AOC Capital — Market Data Safety — Static Source Checks ───────────────────
// recordMarketPrice() / getMarketDataSnapshot() (src/lib/trading/trade-service.ts)
// and the Demo Strategy Sandbox's mark/close calls (src/lib/demo/demo-write-service.ts)
// are I/O-heavy (talk to Supabase) and this codebase has no live-Supabase test
// harness for that kind of module (see tests/aoc-capital-demo-reset-safety.test.mjs
// for the same rationale and pattern). Rather than skip coverage of these
// safety-critical properties entirely, these tests statically inspect the
// functions' source to pin down:
//   - the live public feed is only ever attempted when live_public mode is on
//     (mock/disabled modes never call fetchLivePrice)
//   - a live fetch failure always falls back to the simulated price rather
//     than propagating
//   - every Market Data snapshot entry is explicitly marked paperOnly: true
//   - no field anywhere in that snapshot is shaped like an execution/broker
//     capability
//   - the Demo Strategy Sandbox always forces mock pricing on its own
//     marks/closes, regardless of the configured market data mode

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const tradeServiceTs = fs.readFileSync("src/lib/trading/trade-service.ts", "utf8");
const demoWriteServiceTs = fs.readFileSync("src/lib/demo/demo-write-service.ts", "utf8");

function extractBlock(source, startSignature) {
  const start = source.indexOf(startSignature);
  assert.ok(start >= 0, `expected to find "${startSignature}"`);
  const searchFrom = start + startSignature.length;
  const rest = source.slice(searchFrom);
  const boundaryMatch = rest.match(/\n(export |async function )/);
  const end = boundaryMatch ? searchFrom + boundaryMatch.index : source.length;
  return source.slice(start, end);
}

const recordMarketPriceBody = extractBlock(tradeServiceTs, "async function recordMarketPrice(");
const marketDataSnapshotBody = extractBlock(tradeServiceTs, "export async function getMarketDataSnapshot(");
const marketDataSnapshotEntryType = extractBlock(tradeServiceTs, "export type MarketDataSnapshotEntry = {");

const FORBIDDEN_EXECUTION_FIELDS = [
  "orderId",
  "order_id",
  "brokerAccountId",
  "broker_account_id",
  "apiKey",
  "api_key",
  "apiSecret",
  "api_secret",
  "accountBalance",
  "account_balance",
  "canExecute",
  "executionEnabled",
  "tradingEnabled",
  "placeOrder",
  "createOrder",
  "executeTrade",
  "orderRouter",
  "signedRequest",
  "withdraw",
];

test("recordMarketPrice only attempts the live public feed when isLivePublicMarketDataEnabled() is true (mock/disabled never fetch)", () => {
  const guardIndex = recordMarketPriceBody.indexOf("if (!options.forceMock && isLivePublicMarketDataEnabled())");
  const fetchIndex = recordMarketPriceBody.indexOf("fetchLivePrice(");
  assert.ok(guardIndex >= 0, "expected the live-fetch branch to be gated by isLivePublicMarketDataEnabled()");
  assert.ok(fetchIndex >= 0, "expected a fetchLivePrice( call inside recordMarketPrice");
  assert.ok(guardIndex < fetchIndex, "the isLivePublicMarketDataEnabled() guard must run before fetchLivePrice(...) is ever called");
});

test("recordMarketPrice falls back to the deterministic simulated price when the live feed is unavailable", () => {
  const catchGuardIndex = recordMarketPriceBody.indexOf("if (!(error instanceof LivePriceUnavailableError)) throw error;");
  const simulatedPriceIndex = recordMarketPriceBody.indexOf("getSimulatedPrice(symbol, at)");
  assert.ok(catchGuardIndex >= 0, "expected LivePriceUnavailableError to be caught and swallowed (not rethrown)");
  assert.ok(simulatedPriceIndex >= 0, "expected a fallback call to getSimulatedPrice");
  assert.ok(catchGuardIndex < simulatedPriceIndex, "the fallback simulated price must be computed after swallowing a live-fetch failure");
});

test("recordMarketPrice never places, prepares, or routes an order — no execution-shaped identifiers appear in its body", () => {
  for (const field of FORBIDDEN_EXECUTION_FIELDS) {
    assert.ok(!recordMarketPriceBody.includes(field), `unexpected execution-capability-shaped identifier in recordMarketPrice: ${field}`);
  }
});

test("getMarketDataSnapshot marks every entry paperOnly: true", () => {
  assert.ok(marketDataSnapshotBody.includes("paperOnly: true,"), "expected every pushed entry to include the literal paperOnly: true");
});

test("MarketDataSnapshotEntry's type and construction carry no execution-capability-shaped fields", () => {
  for (const field of FORBIDDEN_EXECUTION_FIELDS) {
    assert.ok(!marketDataSnapshotEntryType.includes(field), `unexpected execution-capability-shaped field in MarketDataSnapshotEntry: ${field}`);
    assert.ok(!marketDataSnapshotBody.includes(field), `unexpected execution-capability-shaped field in getMarketDataSnapshot: ${field}`);
  }
});

test("the demo scenario always forces mock pricing on its close and mark calls, regardless of market data mode", () => {
  const closeCallIndex = demoWriteServiceTs.indexOf("await closePaperPosition({");
  const markCallIndex = demoWriteServiceTs.indexOf("await markPositionToMarket(companyId, position.id, actor, actorUserId,");
  assert.ok(closeCallIndex >= 0, "expected demo-write-service.ts to call closePaperPosition");
  assert.ok(markCallIndex >= 0, "expected demo-write-service.ts to call markPositionToMarket");

  const closeCallBlock = demoWriteServiceTs.slice(closeCallIndex, demoWriteServiceTs.indexOf("});", closeCallIndex));
  assert.match(closeCallBlock, /forceMockPrice:\s*true/, "closePaperPosition in the demo must pass forceMockPrice: true");

  const markCallLine = demoWriteServiceTs.slice(markCallIndex, demoWriteServiceTs.indexOf("\n", markCallIndex));
  assert.match(markCallLine, /forceMockPrice:\s*true/, "markPositionToMarket in the demo must pass forceMockPrice: true");
});
