// ─── AOC Capital Strategy Library — Static Catalog — Tests ──────────────────────
// Pure-function tests over the static Strategy Library module (PR #8); no
// Supabase / live database / network calls required. Mirrors the pure-data
// test pattern used elsewhere in this suite (e.g.
// tests/aoc-capital-risk-policy-engine.test.mjs).

import { test } from "node:test";
import assert from "node:assert/strict";

const {
  APPROVED_STRATEGY_SYMBOLS,
  ALWAYS_BLOCKED_STRATEGY_CAPABILITIES,
  getStrategyLibrary,
  getAvailableStrategies,
  getStrategyByKey,
  validateStrategySelection,
  assertStrategyIsPaperOnly,
} = await import("../src/lib/capital/strategy-library.ts");

// 1. library contains at least 5 strategies
test("the library contains at least 5 strategies", () => {
  const library = getStrategyLibrary();
  assert.ok(library.length >= 5, `expected at least 5 strategies, got ${library.length}`);
});

// 2. every strategy has a unique key
test("every strategy has a unique key", () => {
  const keys = getStrategyLibrary().map((s) => s.key);
  assert.equal(new Set(keys).size, keys.length);
});

// 3. every strategy is paperOnly true
test("every strategy has paperOnly: true", () => {
  for (const strategy of getStrategyLibrary()) {
    assert.equal(strategy.paperOnly, true, `${strategy.key} must be paperOnly: true`);
  }
});

// 4. every strategy has realExecutionLocked true
test("every strategy has realExecutionLocked: true", () => {
  for (const strategy of getStrategyLibrary()) {
    assert.equal(strategy.realExecutionLocked, true, `${strategy.key} must be realExecutionLocked: true`);
  }
});

// 5-9. every strategy blocks the required capability set
test("every strategy blocks real_execution, broker_integration, trading_api_keys, withdrawals, and live_order_routing", () => {
  for (const strategy of getStrategyLibrary()) {
    for (const capability of ["real_execution", "broker_integration", "trading_api_keys", "withdrawals", "live_order_routing"]) {
      assert.ok(strategy.blockedCapabilities.includes(capability), `${strategy.key} must block ${capability}`);
    }
  }
});

test("every strategy blocks real_money_trading", () => {
  for (const strategy of getStrategyLibrary()) {
    assert.ok(strategy.blockedCapabilities.includes("real_money_trading"), `${strategy.key} must block real_money_trading`);
  }
});

test("ALWAYS_BLOCKED_STRATEGY_CAPABILITIES matches the required guardrail set", () => {
  assert.deepEqual(
    [...ALWAYS_BLOCKED_STRATEGY_CAPABILITIES].sort(),
    ["broker_integration", "live_order_routing", "real_execution", "real_money_trading", "trading_api_keys", "withdrawals"].sort()
  );
});

// 10. supported symbols are from the approved universe
test("every strategy's supported symbols are from the approved universe", () => {
  for (const strategy of getStrategyLibrary()) {
    for (const symbol of strategy.supportedSymbols) {
      assert.ok(APPROVED_STRATEGY_SYMBOLS.includes(symbol), `${strategy.key} references unsupported symbol ${symbol}`);
    }
  }
});

test("the approved symbol universe is exactly the crypto majors: BTC-USD, ETH-USD, SOL-USD, AVAX-USD", () => {
  assert.deepEqual([...APPROVED_STRATEGY_SYMBOLS].sort(), ["AVAX-USD", "BTC-USD", "ETH-USD", "SOL-USD"].sort());
});

// 11. getStrategyByKey returns the correct strategy
test("getStrategyByKey returns the correct strategy", () => {
  const strategy = getStrategyByKey("conservative_crypto_trend");
  assert.ok(strategy);
  assert.equal(strategy.name, "Conservative Crypto Trend");
  assert.equal(strategy.riskProfile, "conservative");
});

// 12. invalid strategy key returns null or throws a validation error
test("getStrategyByKey returns null for an unknown key", () => {
  assert.equal(getStrategyByKey("not_a_real_strategy"), null);
});

test("validateStrategySelection returns ok:false for an unknown key", () => {
  const result = validateStrategySelection("not_a_real_strategy");
  assert.equal(result.ok, false);
  assert.ok(result.error.length > 0);
});

test("validateStrategySelection returns ok:false for a missing/empty key", () => {
  assert.equal(validateStrategySelection(undefined).ok, false);
  assert.equal(validateStrategySelection(null).ok, false);
  assert.equal(validateStrategySelection("").ok, false);
  assert.equal(validateStrategySelection(42).ok, false);
});

test("validateStrategySelection returns ok:true with the resolved strategy for a valid key", () => {
  const result = validateStrategySelection("btc_eth_momentum");
  assert.equal(result.ok, true);
  assert.equal(result.strategy.key, "btc_eth_momentum");
});

// 13. Bear Market Research Mode does not enable shorts in Level 1
test("Bear Market Research Mode blocks real shorts and paper shorts in Level 1", () => {
  const strategy = getStrategyByKey("bear_market_research_mode");
  assert.ok(strategy);
  assert.ok(strategy.blockedCapabilities.includes("real_shorts"));
  assert.ok(strategy.blockedCapabilities.includes("paper_shorts_in_level_1"));
  // "rejected_short_intent_demonstrations" is allowed — it's about showing a
  // short intent get rejected, not about enabling one.
  assert.ok(!strategy.allowedCapabilities.includes("shorts"), "shorts must never be an allowed capability");
  assert.ok(!strategy.allowedCapabilities.includes("real_shorts"), "real_shorts must never be an allowed capability");
});

// 14. Risk-Off Cash Mode includes no-trade/cash behavior
test("Risk-Off Cash Mode includes cash / no-trade posture in its allowed capabilities", () => {
  const strategy = getStrategyByKey("risk_off_cash_mode");
  assert.ok(strategy);
  assert.ok(strategy.allowedCapabilities.includes("recommend_cash_no_trade_posture"));
  assert.equal(strategy.riskProfile, "defensive");
});

// 15. Crypto Majors Rotation includes BTC/ETH/SOL/AVAX only
test("Crypto Majors Rotation supports exactly BTC-USD, ETH-USD, SOL-USD, AVAX-USD", () => {
  const strategy = getStrategyByKey("crypto_majors_rotation");
  assert.ok(strategy);
  assert.deepEqual([...strategy.supportedSymbols].sort(), ["AVAX-USD", "BTC-USD", "ETH-USD", "SOL-USD"].sort());
});

// ─── Additional guardrail coverage ──────────────────────────────────────────

test("assertStrategyIsPaperOnly does not throw for any strategy in the library", () => {
  for (const strategy of getStrategyLibrary()) {
    assert.doesNotThrow(() => assertStrategyIsPaperOnly(strategy));
  }
});

test("assertStrategyIsPaperOnly throws if paperOnly is not true", () => {
  const strategy = { ...getStrategyByKey("conservative_crypto_trend"), paperOnly: false };
  assert.throws(() => assertStrategyIsPaperOnly(strategy));
});

test("assertStrategyIsPaperOnly throws if realExecutionLocked is not true", () => {
  const strategy = { ...getStrategyByKey("conservative_crypto_trend"), realExecutionLocked: false };
  assert.throws(() => assertStrategyIsPaperOnly(strategy));
});

test("assertStrategyIsPaperOnly throws if a required blocked capability is missing", () => {
  const base = getStrategyByKey("conservative_crypto_trend");
  const strategy = { ...base, blockedCapabilities: base.blockedCapabilities.filter((c) => c !== "withdrawals") };
  assert.throws(() => assertStrategyIsPaperOnly(strategy));
});

test("assertStrategyIsPaperOnly throws if a supported symbol falls outside the approved universe", () => {
  const base = getStrategyByKey("conservative_crypto_trend");
  const strategy = { ...base, supportedSymbols: [...base.supportedSymbols, "DOGE-USD"] };
  assert.throws(() => assertStrategyIsPaperOnly(strategy));
});

test("no strategy's allowed capabilities include any always-blocked capability", () => {
  for (const strategy of getStrategyLibrary()) {
    for (const blocked of ALWAYS_BLOCKED_STRATEGY_CAPABILITIES) {
      assert.ok(!strategy.allowedCapabilities.includes(blocked), `${strategy.key} must never allow ${blocked}`);
    }
  }
});

test("getAvailableStrategies never returns a locked strategy", () => {
  for (const strategy of getAvailableStrategies()) {
    assert.notEqual(strategy.status, "locked");
  }
});

test("getStrategyLibrary returns a fresh copy each call — mutating one call's result never leaks into another", () => {
  const first = getStrategyLibrary();
  first[0].blockedCapabilities.push("mutated");
  first[0].supportedSymbols.push("MUTATED-USD");
  const second = getStrategyLibrary();
  assert.ok(!second[0].blockedCapabilities.includes("mutated"));
  assert.ok(!second[0].supportedSymbols.includes("MUTATED-USD"));
});

test("every strategy has non-empty name, description, objective, suggestedCapitalLevel, timeHorizon, and bestFor", () => {
  for (const strategy of getStrategyLibrary()) {
    assert.ok(strategy.name.length > 0, `${strategy.key} missing name`);
    assert.ok(strategy.description.length > 0, `${strategy.key} missing description`);
    assert.ok(strategy.objective.length > 0, `${strategy.key} missing objective`);
    assert.ok(strategy.suggestedCapitalLevel.length > 0, `${strategy.key} missing suggestedCapitalLevel`);
    assert.ok(strategy.timeHorizon.length > 0, `${strategy.key} missing timeHorizon`);
    assert.ok(strategy.bestFor.length > 0, `${strategy.key} missing bestFor`);
  }
});

test("the library includes the five named PR #8 strategies", () => {
  const keys = getStrategyLibrary().map((s) => s.key);
  assert.ok(keys.includes("conservative_crypto_trend"));
  assert.ok(keys.includes("btc_eth_momentum"));
  assert.ok(keys.includes("crypto_majors_rotation"));
  assert.ok(keys.includes("risk_off_cash_mode"));
  assert.ok(keys.includes("bear_market_research_mode"));
});
