// ─── AOC Capital — Deterministic Mock Price Generator — Tests ──────────────────
// Pure-function tests; no Supabase / live database / network calls required.

import { test } from "node:test";
import assert from "node:assert/strict";

const { getSimulatedPrice, timeBucketStart, basePriceForSymbol } = await import("../src/lib/trading/mock-price-generator.ts");

test("returns a stable price for the same symbol within the same time bucket", () => {
  const at = new Date("2026-07-02T10:15:00Z");
  const first = getSimulatedPrice("BTC-USD", at);
  const second = getSimulatedPrice("BTC-USD", new Date("2026-07-02T10:59:59Z"));
  assert.equal(first, second);
});

test("returns a different price for a different time bucket", () => {
  const bucketOne = getSimulatedPrice("BTC-USD", new Date("2026-07-02T10:00:00Z"));
  const bucketTwo = getSimulatedPrice("BTC-USD", new Date("2026-07-02T14:00:00Z"));
  assert.notEqual(bucketOne, bucketTwo);
});

test("different symbols in the same bucket get different prices", () => {
  const at = new Date("2026-07-02T10:00:00Z");
  const btc = getSimulatedPrice("BTC-USD", at);
  const eth = getSimulatedPrice("ETH-USD", at);
  assert.notEqual(btc, eth);
});

test("price stays within +/-8% of the symbol's base price", () => {
  const base = basePriceForSymbol("BTC-USD");
  for (const hour of [0, 3, 6, 9, 12, 15, 18, 21]) {
    const price = getSimulatedPrice("BTC-USD", new Date(Date.UTC(2026, 6, 2, hour)));
    assert.ok(price >= base * 0.92 && price <= base * 1.08, `price ${price} out of range for base ${base}`);
  }
});

test("an unknown symbol still gets a stable, deterministic price via the default base price", () => {
  const at = new Date("2026-07-02T10:00:00Z");
  const first = getSimulatedPrice("UNKNOWN-SYM", at);
  const second = getSimulatedPrice("UNKNOWN-SYM", at);
  assert.equal(first, second);
  assert.ok(first > 0);
});

test("timeBucketStart floors a timestamp to the start of its hour bucket", () => {
  const bucket = timeBucketStart(new Date("2026-07-02T10:47:33Z"));
  assert.equal(bucket.toISOString(), "2026-07-02T10:00:00.000Z");
});

test("no network calls or randomness: repeated calls across many invocations are identical", () => {
  const at = new Date("2026-07-02T00:00:00Z");
  const prices = Array.from({ length: 20 }, () => getSimulatedPrice("SPY", at));
  assert.ok(prices.every((p) => p === prices[0]));
});
