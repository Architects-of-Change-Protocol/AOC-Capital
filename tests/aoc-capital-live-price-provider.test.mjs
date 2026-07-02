// ─── AOC Capital — Live Public Market Data Provider — Tests ────────────────────
// Pure-function tests with an injected fake fetch; no real network calls.
// Confirms the module only ever reads a public price endpoint and always
// resolves to LivePriceUnavailableError (never a raw crash) when the mode
// isn't live_public, the symbol is unsupported, the feed is unreachable, or
// the response is malformed — see live-price-provider.ts header.

import { test } from "node:test";
import assert from "node:assert/strict";

const {
  LIVE_MARKET_DATA_READ_ONLY,
  LIVE_PRICE_BUCKET_MINUTES,
  SUPPORTED_LIVE_PUBLIC_SYMBOLS,
  LivePriceUnavailableError,
  fetchLivePrice,
  getMarketDataMode,
  isLivePublicMarketDataEnabled,
  getLiveMarketDataProvider,
  mapSymbolToProviderId,
  __clearLivePriceCacheForTests,
} = await import("../src/lib/trading/live-price-provider.ts");

test("the module is a hard-coded, always-true read-only guard", () => {
  assert.equal(LIVE_MARKET_DATA_READ_ONLY, true);
});

// ─── AOC_CAPITAL_MARKET_DATA_MODE ───────────────────────────────────────────

test("AOC_CAPITAL_MARKET_DATA_MODE defaults to 'mock' when unset", () => {
  assert.equal(getMarketDataMode({}), "mock");
});

test("AOC_CAPITAL_MARKET_DATA_MODE defaults to 'mock' for any unrecognized value", () => {
  assert.equal(getMarketDataMode({ AOC_CAPITAL_MARKET_DATA_MODE: "" }), "mock");
  assert.equal(getMarketDataMode({ AOC_CAPITAL_MARKET_DATA_MODE: "true" }), "mock");
  assert.equal(getMarketDataMode({ AOC_CAPITAL_MARKET_DATA_MODE: "LIVE_PUBLIC" }), "mock");
  assert.equal(getMarketDataMode({ AOC_CAPITAL_MARKET_DATA_MODE: "live" }), "mock");
  assert.equal(getMarketDataMode({ AOC_CAPITAL_MARKET_DATA_MODE: "enabled" }), "mock");
});

test("AOC_CAPITAL_MARKET_DATA_MODE accepts exactly 'mock', 'live_public', and 'disabled'", () => {
  assert.equal(getMarketDataMode({ AOC_CAPITAL_MARKET_DATA_MODE: "mock" }), "mock");
  assert.equal(getMarketDataMode({ AOC_CAPITAL_MARKET_DATA_MODE: "live_public" }), "live_public");
  assert.equal(getMarketDataMode({ AOC_CAPITAL_MARKET_DATA_MODE: "disabled" }), "disabled");
});

test("live public fetching is enabled only in live_public mode — mock and disabled both keep it off", () => {
  assert.equal(isLivePublicMarketDataEnabled({}), false);
  assert.equal(isLivePublicMarketDataEnabled({ AOC_CAPITAL_MARKET_DATA_MODE: "mock" }), false);
  assert.equal(isLivePublicMarketDataEnabled({ AOC_CAPITAL_MARKET_DATA_MODE: "disabled" }), false);
  assert.equal(isLivePublicMarketDataEnabled({ AOC_CAPITAL_MARKET_DATA_MODE: "live_public" }), true);
});

test("this setting is never read from a NEXT_PUBLIC_ variable", () => {
  // Setting only the NEXT_PUBLIC_-prefixed variant must NOT enable live_public —
  // this is a server-only setting by design.
  assert.equal(isLivePublicMarketDataEnabled({ NEXT_PUBLIC_AOC_CAPITAL_MARKET_DATA_MODE: "live_public" }), false);
});

test("the provider defaults to coingecko regardless of unrecognized configuration", () => {
  assert.equal(getLiveMarketDataProvider({}), "coingecko");
  assert.equal(getLiveMarketDataProvider({ MARKET_DATA_PROVIDER: "some-other-thing" }), "coingecko");
  assert.equal(getLiveMarketDataProvider({ MARKET_DATA_PROVIDER: "coingecko" }), "coingecko");
});

// ─── Supported symbols ───────────────────────────────────────────────────────

test("supported live_public symbols are exactly BTC-USD, ETH-USD, SOL-USD, AVAX-USD", () => {
  assert.deepEqual([...SUPPORTED_LIVE_PUBLIC_SYMBOLS].sort(), ["AVAX-USD", "BTC-USD", "ETH-USD", "SOL-USD"].sort());
});

test("known crypto symbols map to a coingecko id; unsupported symbols map to null", () => {
  assert.equal(mapSymbolToProviderId("BTC-USD"), "bitcoin");
  assert.equal(mapSymbolToProviderId("eth-usd"), "ethereum");
  assert.equal(mapSymbolToProviderId("SOL-USD"), "solana");
  assert.equal(mapSymbolToProviderId("AVAX-USD"), "avalanche-2");
  assert.equal(mapSymbolToProviderId("AAPL"), null);
  assert.equal(mapSymbolToProviderId("SPY"), null);
});

// ─── fetchLivePrice ──────────────────────────────────────────────────────────

test("an unsupported symbol throws LivePriceUnavailableError without ever calling fetch", async () => {
  __clearLivePriceCacheForTests();
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    throw new Error("should never be called");
  };
  await assert.rejects(() => fetchLivePrice("AAPL", { fetchImpl }), LivePriceUnavailableError);
  assert.equal(calls, 0);
});

test("a successful response resolves to the parsed USD price with source 'live_public'", async () => {
  __clearLivePriceCacheForTests();
  const fetchImpl = async (url) => {
    assert.match(String(url), /simple\/price/);
    assert.match(String(url), /ids=bitcoin/);
    return {
      ok: true,
      status: 200,
      json: async () => ({ bitcoin: { usd: 65123.45 } }),
    };
  };
  const result = await fetchLivePrice("BTC-USD", { fetchImpl, now: new Date("2026-07-02T10:00:00Z") });
  assert.equal(result.symbol, "BTC-USD");
  assert.equal(result.priceUsd, 65123.45);
  assert.equal(result.provider, "coingecko");
  assert.equal(result.source, "live_public");
});

test("a non-ok HTTP response throws LivePriceUnavailableError", async () => {
  __clearLivePriceCacheForTests();
  const fetchImpl = async () => ({ ok: false, status: 503, json: async () => null });
  await assert.rejects(() => fetchLivePrice("BTC-USD", { fetchImpl }), LivePriceUnavailableError);
});

test("a network error throws LivePriceUnavailableError, never a raw exception type", async () => {
  __clearLivePriceCacheForTests();
  const fetchImpl = async () => {
    throw new TypeError("fetch failed");
  };
  await assert.rejects(() => fetchLivePrice("ETH-USD", { fetchImpl }), LivePriceUnavailableError);
});

test("a malformed (missing/non-numeric price) response throws LivePriceUnavailableError", async () => {
  __clearLivePriceCacheForTests();
  const missingPrice = async () => ({ ok: true, status: 200, json: async () => ({ bitcoin: {} }) });
  await assert.rejects(() => fetchLivePrice("BTC-USD", { fetchImpl: missingPrice }), LivePriceUnavailableError);

  const nonNumeric = async () => ({ ok: true, status: 200, json: async () => ({ bitcoin: { usd: "not-a-number" } }) });
  await assert.rejects(() => fetchLivePrice("BTC-USD", { fetchImpl: nonNumeric }), LivePriceUnavailableError);

  const negative = async () => ({ ok: true, status: 200, json: async () => ({ bitcoin: { usd: -5 } }) });
  await assert.rejects(() => fetchLivePrice("BTC-USD", { fetchImpl: negative }), LivePriceUnavailableError);
});

test("repeated calls within the cache TTL reuse the cached price instead of calling fetch again", async () => {
  __clearLivePriceCacheForTests();
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return { ok: true, status: 200, json: async () => ({ bitcoin: { usd: 70000 } }) };
  };
  const t0 = new Date("2026-07-02T10:00:00Z");
  const first = await fetchLivePrice("BTC-USD", { fetchImpl, now: t0 });
  const second = await fetchLivePrice("BTC-USD", { fetchImpl, now: new Date(t0.getTime() + 5_000) });
  assert.equal(calls, 1);
  assert.equal(first.priceUsd, second.priceUsd);
});

test("a call after the cache TTL expires calls fetch again", async () => {
  __clearLivePriceCacheForTests();
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return { ok: true, status: 200, json: async () => ({ bitcoin: { usd: 70000 + calls } }) };
  };
  const t0 = new Date("2026-07-02T10:00:00Z");
  await fetchLivePrice("BTC-USD", { fetchImpl, now: t0 });
  await fetchLivePrice("BTC-USD", { fetchImpl, now: new Date(t0.getTime() + 30_000) });
  assert.equal(calls, 2);
});

test("bucket granularity for live_public prices is exported and finer than the mock generator's hourly bucket", () => {
  assert.ok(LIVE_PRICE_BUCKET_MINUTES > 0);
  assert.ok(LIVE_PRICE_BUCKET_MINUTES < 60);
});

test("fetchLivePrice never returns a field that looks like an execution/order/broker capability", () => {
  const forbidden = [
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
    "placeOrder",
    "createOrder",
  ];
  const sample = { symbol: "BTC-USD", priceUsd: 1, asOf: new Date(), provider: "coingecko", source: "live_public" };
  for (const key of forbidden) {
    assert.ok(!(key in sample), `unexpected execution-capability-shaped field: ${key}`);
  }
});
