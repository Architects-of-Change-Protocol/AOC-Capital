// ─── AOC Capital — Live Market Data Provider — Tests ───────────────────────────
// Pure-function tests with an injected fake fetch; no real network calls.
// Confirms the module only ever reads a public price endpoint and always
// resolves to LivePriceUnavailableError (never a raw crash) when disabled,
// unsupported, unreachable, or malformed — see live-price-provider.ts header.

import { test } from "node:test";
import assert from "node:assert/strict";

const {
  LIVE_MARKET_DATA_READ_ONLY,
  LIVE_PRICE_BUCKET_MINUTES,
  LivePriceUnavailableError,
  fetchLivePrice,
  isLiveMarketDataEnabled,
  getLiveMarketDataProvider,
  mapSymbolToProviderId,
  __clearLivePriceCacheForTests,
} = await import("../src/lib/trading/live-price-provider.ts");

test("the module is a hard-coded, always-true read-only guard", () => {
  assert.equal(LIVE_MARKET_DATA_READ_ONLY, true);
});

test("live market data is disabled by default and for any value other than the literal string 'true'", () => {
  assert.equal(isLiveMarketDataEnabled({}), false);
  assert.equal(isLiveMarketDataEnabled({ LIVE_MARKET_DATA_ENABLED: "false" }), false);
  assert.equal(isLiveMarketDataEnabled({ LIVE_MARKET_DATA_ENABLED: "1" }), false);
  assert.equal(isLiveMarketDataEnabled({ LIVE_MARKET_DATA_ENABLED: "TRUE" }), false);
  assert.equal(isLiveMarketDataEnabled({ LIVE_MARKET_DATA_ENABLED: "true" }), true);
});

test("the provider defaults to coingecko regardless of unrecognized configuration", () => {
  assert.equal(getLiveMarketDataProvider({}), "coingecko");
  assert.equal(getLiveMarketDataProvider({ MARKET_DATA_PROVIDER: "some-other-thing" }), "coingecko");
  assert.equal(getLiveMarketDataProvider({ MARKET_DATA_PROVIDER: "coingecko" }), "coingecko");
});

test("known crypto symbols map to a coingecko id; unsupported symbols map to null", () => {
  assert.equal(mapSymbolToProviderId("BTC-USD"), "bitcoin");
  assert.equal(mapSymbolToProviderId("eth-usd"), "ethereum");
  assert.equal(mapSymbolToProviderId("SOL-USD"), "solana");
  assert.equal(mapSymbolToProviderId("AVAX-USD"), "avalanche-2");
  assert.equal(mapSymbolToProviderId("AAPL"), null);
  assert.equal(mapSymbolToProviderId("SPY"), null);
});

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

test("a successful response resolves to the parsed USD price", async () => {
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

test("bucket granularity for live prices is exported and finer than the mock generator's hourly bucket", () => {
  assert.ok(LIVE_PRICE_BUCKET_MINUTES > 0);
  assert.ok(LIVE_PRICE_BUCKET_MINUTES < 60);
});
