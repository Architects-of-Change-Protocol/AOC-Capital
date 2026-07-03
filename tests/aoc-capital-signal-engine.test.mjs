// ─── AOC Capital Signal Engine v1 — Pure Rules Engine — Tests ─────────────────
// Pure-function tests over generatePaperSignals() and its helpers
// (src/lib/capital/signal-engine.ts). No Supabase / live database / network
// calls required — mirrors the pure-data test pattern used elsewhere in this
// suite (e.g. tests/aoc-capital-risk-policy-engine.test.mjs).
//
// "No selected strategy" / "stale selected strategy" fail-safe behavior is a
// service/API-layer concern (signal-engine-service.ts derives the strategy,
// the pure engine is always handed a valid one) — see
// tests/aoc-capital-signal-engine-safety.test.mjs for that coverage.

import { test } from "node:test";
import assert from "node:assert/strict";

const {
  generatePaperSignals,
  calculateAvailableExposureUsd,
  normalizeExposureLimit,
  calculateSuggestedNotionalUsd,
  classifySignalStrength,
  buildSignalRationale,
  buildRiskNotes,
  assertSignalIsPaperOnly,
} = await import("../src/lib/capital/signal-engine.ts");

const FORBIDDEN_ACTION_LANGUAGE = /buy_now|sell_now|execute|place[_ ]order|create[_ ]order|trade[_ ]now|send[_ ]to[_ ]broker/i;

function baseInput(overrides = {}) {
  return {
    generatedAt: "2026-01-01T00:00:00.000Z",
    selectedStrategy: {
      key: "conservative_crypto_trend",
      name: "Conservative Crypto Trend",
      riskProfile: "conservative",
      supportedSymbols: ["BTC-USD", "ETH-USD"],
      allowedCapabilities: [],
      blockedCapabilities: [],
      paperOnly: true,
      realExecutionLocked: true,
    },
    marketPrices: [
      { symbol: "BTC-USD", priceUsd: 50000, asOf: "2026-01-01T00:00:00.000Z", source: "mock", provider: "internal_simulated", paperOnly: true },
      { symbol: "ETH-USD", priceUsd: 3000, asOf: "2026-01-01T00:00:00.000Z", source: "mock", provider: "internal_simulated", paperOnly: true },
      { symbol: "SOL-USD", priceUsd: 150, asOf: "2026-01-01T00:00:00.000Z", source: "mock", provider: "internal_simulated", paperOnly: true },
      { symbol: "AVAX-USD", priceUsd: 30, asOf: "2026-01-01T00:00:00.000Z", source: "mock", provider: "internal_simulated", paperOnly: true },
    ],
    portfolioSummary: {
      baseCapitalUsd: 10000,
      simulatedEquityUsd: 10000,
      exposureUsd: 0,
      exposurePct: 0,
      openPositionsCount: 0,
      dailyRealizedLossUsedUsd: 0,
      weeklyRealizedLossUsedUsd: 0,
    },
    riskLimits: {
      maxExposurePct: 0.6,
      maxOpenPositions: 3,
      maxDailyLossUsd: 20,
      maxWeeklyLossUsd: 40,
      leverageAllowed: false,
      shortsAllowed: false,
      realExecutionAllowed: false,
    },
    performanceContext: {
      totalReturnPct: 5,
      profitFactor: 2,
      maxDrawdownPct: 5,
      currentDrawdownPct: 2,
      riskHealth: "healthy",
      recommendation: "continue_paper_monitoring",
    },
    ...overrides,
  };
}

function withStrategy(input, key, name, riskProfile, supportedSymbols) {
  return { ...input, selectedStrategy: { ...input.selectedStrategy, key, name, riskProfile, supportedSymbols } };
}

const ALL_STRATEGIES = [
  ["conservative_crypto_trend", "Conservative Crypto Trend", "conservative", ["BTC-USD", "ETH-USD"]],
  ["btc_eth_momentum", "BTC/ETH Momentum", "balanced", ["BTC-USD", "ETH-USD"]],
  ["crypto_majors_rotation", "Crypto Majors Rotation", "growth", ["BTC-USD", "ETH-USD", "SOL-USD", "AVAX-USD"]],
  ["risk_off_cash_mode", "Risk-Off Cash Mode", "defensive", ["BTC-USD", "ETH-USD", "SOL-USD", "AVAX-USD"]],
  ["bear_market_research_mode", "Bear Market Research Mode", "research", ["BTC-USD", "ETH-USD", "SOL-USD", "AVAX-USD"]],
];

function inputsForEveryStrategy(overrides = {}) {
  return ALL_STRATEGIES.map(([key, name, riskProfile, symbols]) => withStrategy(baseInput(overrides), key, name, riskProfile, symbols));
}

// ─── 1-4: universal invariants ──────────────────────────────────────────────

test("1. generates signals only for the selected strategy's supported symbols", () => {
  for (const input of inputsForEveryStrategy()) {
    const signals = generatePaperSignals(input);
    assert.deepEqual(
      signals.map((s) => s.symbol).sort(),
      [...input.selectedStrategy.supportedSymbols].sort()
    );
  }
});

test("2. every signal has paperOnly: true", () => {
  for (const input of inputsForEveryStrategy()) {
    for (const signal of generatePaperSignals(input)) assert.equal(signal.paperOnly, true);
  }
});

test("3. every signal has realExecutionLocked: true", () => {
  for (const input of inputsForEveryStrategy()) {
    for (const signal of generatePaperSignals(input)) assert.equal(signal.realExecutionLocked, true);
  }
});

test("4. no signal includes an execution/broker-capability-shaped field", () => {
  const FORBIDDEN_FIELDS = [
    "orderId",
    "order_id",
    "brokerAccountId",
    "apiKey",
    "apiSecret",
    "accountBalance",
    "canExecute",
    "executionEnabled",
    "placeOrder",
    "createOrder",
    "executeTrade",
    "orderRouter",
    "signedRequest",
    "withdraw",
    "side",
    "leverage",
  ];
  for (const input of inputsForEveryStrategy()) {
    for (const signal of generatePaperSignals(input)) {
      for (const field of FORBIDDEN_FIELDS) assert.ok(!(field in signal), `unexpected field "${field}" on a signal`);
    }
  }
});

// ─── 5: Conservative Crypto Trend ───────────────────────────────────────────

test("5. Conservative Crypto Trend generates a small paper_buy_candidate or watch only, matching the BTC/ETH example", () => {
  const signals = generatePaperSignals(baseInput());
  for (const signal of signals) assert.ok(["paper_buy_candidate", "watch"].includes(signal.action));

  const btc = signals.find((s) => s.symbol === "BTC-USD");
  const eth = signals.find((s) => s.symbol === "ETH-USD");
  assert.equal(btc.action, "paper_buy_candidate");
  assert.equal(btc.suggestedNotionalUsd, 150);
  assert.equal(btc.strength, "moderate");
  assert.notEqual(btc.strength, "strong", "conservative never claims strong");
  assert.equal(eth.action, "watch");
  assert.equal(eth.suggestedNotionalUsd, null);
});

test("Conservative Crypto Trend never proposes more than one paper_buy_candidate per generation", () => {
  const signals = generatePaperSignals(baseInput());
  assert.equal(signals.filter((s) => s.action === "paper_buy_candidate").length, 1);
});

// ─── 6: Risk-Off Cash Mode ───────────────────────────────────────────────────

test("6. Risk-Off Cash Mode prefers no_action/reduce_exposure/avoid and never a paper_buy_candidate", () => {
  const elevated = withStrategy(
    baseInput({
      portfolioSummary: {
        baseCapitalUsd: 10000,
        simulatedEquityUsd: 9500,
        exposureUsd: 5000,
        exposurePct: 50,
        openPositionsCount: 2,
        dailyRealizedLossUsedUsd: 15,
        weeklyRealizedLossUsedUsd: 30,
      },
    }),
    "risk_off_cash_mode",
    "Risk-Off Cash Mode",
    "defensive",
    ["BTC-USD", "ETH-USD", "SOL-USD", "AVAX-USD"]
  );
  const signals = generatePaperSignals(elevated);
  for (const signal of signals) {
    assert.notEqual(signal.action, "paper_buy_candidate");
    assert.ok(["no_action", "reduce_exposure", "avoid", "watch"].includes(signal.action));
    assert.equal(signal.suggestedNotionalUsd, null);
  }
  assert.ok(signals.some((s) => s.action === "reduce_exposure"), "expected at least one reduce_exposure given open positions and elevated risk");
});

test("Risk-Off Cash Mode never proposes a paper_buy_candidate even when calm and exposure is very low", () => {
  const calm = withStrategy(baseInput(), "risk_off_cash_mode", "Risk-Off Cash Mode", "defensive", ["BTC-USD", "ETH-USD", "SOL-USD", "AVAX-USD"]);
  const signals = generatePaperSignals(calm);
  for (const signal of signals) {
    assert.notEqual(signal.action, "paper_buy_candidate");
    assert.equal(signal.suggestedNotionalUsd, null);
  }
});

// ─── 7: Bear Market Research Mode ───────────────────────────────────────────

test("7. Bear Market Research Mode never produces a short-like action or a paper_buy_candidate", () => {
  const input = withStrategy(baseInput(), "bear_market_research_mode", "Bear Market Research Mode", "research", ["BTC-USD", "ETH-USD", "SOL-USD", "AVAX-USD"]);
  const signals = generatePaperSignals(input);
  for (const signal of signals) {
    assert.notEqual(signal.action, "paper_buy_candidate");
    assert.doesNotMatch(signal.action, /short/i);
    assert.equal(signal.suggestedNotionalUsd, null);
  }
});

test("Bear Market Research Mode surfaces a blocked_by_risk demonstration with blockedReasons citing the Risk Constitution", () => {
  const input = withStrategy(baseInput(), "bear_market_research_mode", "Bear Market Research Mode", "research", ["BTC-USD", "ETH-USD", "SOL-USD", "AVAX-USD"]);
  const [first] = generatePaperSignals(input);
  assert.equal(first.status, "blocked_by_risk");
  assert.ok(first.blockedReasons.length > 0);
  assert.match(first.blockedReasons.join(" "), /shorts|shortsAllowed/i);
});

// ─── 8-9: hard limits stop a paper_buy_candidate from ever being proposed ───

test("8. exposure at/above the max exposure limit blocks a would-be paper_buy_candidate", () => {
  const input = withStrategy(
    baseInput({
      portfolioSummary: { baseCapitalUsd: 10000, simulatedEquityUsd: 10000, exposureUsd: 6000, exposurePct: 60, openPositionsCount: 0, dailyRealizedLossUsedUsd: 0, weeklyRealizedLossUsedUsd: 0 },
    }),
    "btc_eth_momentum",
    "BTC/ETH Momentum",
    "balanced",
    ["BTC-USD", "ETH-USD"]
  );
  for (const signal of generatePaperSignals(input)) assert.notEqual(signal.action, "paper_buy_candidate");
});

test("9. open positions at the max open positions limit blocks a would-be paper_buy_candidate", () => {
  const input = withStrategy(
    baseInput({
      portfolioSummary: { baseCapitalUsd: 10000, simulatedEquityUsd: 10000, exposureUsd: 0, exposurePct: 0, openPositionsCount: 3, dailyRealizedLossUsedUsd: 0, weeklyRealizedLossUsedUsd: 0 },
    }),
    "btc_eth_momentum",
    "BTC/ETH Momentum",
    "balanced",
    ["BTC-USD", "ETH-USD"]
  );
  for (const signal of generatePaperSignals(input)) assert.notEqual(signal.action, "paper_buy_candidate");
});

// ─── 10-11: the hard risk gate specifically (daily/weekly loss usage) ──────

test("10. daily realized loss usage at/beyond the daily loss limit downgrades a candidate to blocked_by_risk", () => {
  const input = withStrategy(
    baseInput({
      portfolioSummary: { baseCapitalUsd: 10000, simulatedEquityUsd: 9980, exposureUsd: 0, exposurePct: 0, openPositionsCount: 0, dailyRealizedLossUsedUsd: 20, weeklyRealizedLossUsedUsd: 20 },
    }),
    "btc_eth_momentum",
    "BTC/ETH Momentum",
    "balanced",
    ["BTC-USD", "ETH-USD"]
  );
  const signals = generatePaperSignals(input);
  for (const signal of signals) assert.notEqual(signal.action, "paper_buy_candidate");
  const blocked = signals.find((s) => s.status === "blocked_by_risk");
  assert.ok(blocked, "expected the momentum candidate to be downgraded to blocked_by_risk");
  assert.match(blocked.blockedReasons.join(" "), /daily realized loss/i);
});

test("11. weekly realized loss usage at/beyond the weekly loss limit downgrades a candidate to blocked_by_risk", () => {
  const input = withStrategy(
    baseInput({
      portfolioSummary: { baseCapitalUsd: 10000, simulatedEquityUsd: 9960, exposureUsd: 0, exposurePct: 0, openPositionsCount: 0, dailyRealizedLossUsedUsd: 0, weeklyRealizedLossUsedUsd: 40 },
    }),
    "btc_eth_momentum",
    "BTC/ETH Momentum",
    "balanced",
    ["BTC-USD", "ETH-USD"]
  );
  const signals = generatePaperSignals(input);
  for (const signal of signals) assert.notEqual(signal.action, "paper_buy_candidate");
  const blocked = signals.find((s) => s.status === "blocked_by_risk");
  assert.ok(blocked, "expected the momentum candidate to be downgraded to blocked_by_risk");
  assert.match(blocked.blockedReasons.join(" "), /weekly realized loss/i);
});

// ─── 12: minimum meaningful notional threshold ──────────────────────────────

test("12. insufficient available exposure returns watch/no_action, never a sub-$25 paper_buy_candidate", () => {
  const input = withStrategy(
    baseInput({
      portfolioSummary: { baseCapitalUsd: 100, simulatedEquityUsd: 100, exposureUsd: 50, exposurePct: 50, openPositionsCount: 0, dailyRealizedLossUsedUsd: 0, weeklyRealizedLossUsedUsd: 0 },
    }),
    "btc_eth_momentum",
    "BTC/ETH Momentum",
    "balanced",
    ["BTC-USD", "ETH-USD"]
  );
  const signals = generatePaperSignals(input);
  for (const signal of signals) {
    assert.notEqual(signal.action, "paper_buy_candidate");
    assert.ok(["watch", "no_action"].includes(signal.action));
    assert.equal(signal.suggestedNotionalUsd, null);
  }
  assert.ok(signals.some((s) => s.riskNotes.some((note) => /too small for a meaningful paper recommendation/i.test(note))));
});

// ─── 13-14: market data modes ────────────────────────────────────────────────

test("13. live_public market data flows through as observation only — marketDataSource/marketPriceUsd reflect it without altering the deterministic rules", () => {
  const input = baseInput({
    marketPrices: [
      { symbol: "BTC-USD", priceUsd: 51234.56, asOf: "2026-01-01T00:00:00.000Z", source: "live_public", provider: "coingecko", paperOnly: true },
      { symbol: "ETH-USD", priceUsd: 3123.45, asOf: "2026-01-01T00:00:00.000Z", source: "live_public", provider: "coingecko", paperOnly: true },
    ],
  });
  const signals = generatePaperSignals(input);
  const btc = signals.find((s) => s.symbol === "BTC-USD");
  assert.equal(btc.marketDataSource, "live_public");
  assert.equal(btc.marketPriceUsd, 51234.56);
  assert.equal(btc.action, "paper_buy_candidate");
});

test("14. disabled market data degrades gracefully — still returns risk-aware watch/no_action, never crashes", () => {
  const input = baseInput({
    marketPrices: [
      { symbol: "BTC-USD", priceUsd: null, asOf: null, source: "disabled", provider: "none", paperOnly: true },
      { symbol: "ETH-USD", priceUsd: null, asOf: null, source: "disabled", provider: "none", paperOnly: true },
    ],
  });
  const signals = generatePaperSignals(input);
  assert.equal(signals.length, 2);
  for (const signal of signals) {
    assert.equal(signal.marketPriceUsd, null);
    assert.equal(signal.marketDataSource, "disabled");
    assert.notEqual(signal.action, "paper_buy_candidate");
  }
});

// ─── 15: performance breach downgrades signals ──────────────────────────────

test("15. performance riskHealth 'breach' prevents a paper_buy_candidate", () => {
  const input = withStrategy(
    baseInput({
      performanceContext: { totalReturnPct: -10, profitFactor: 0.5, maxDrawdownPct: 40, currentDrawdownPct: 35, riskHealth: "breach", recommendation: "pause" },
    }),
    "btc_eth_momentum",
    "BTC/ETH Momentum",
    "balanced",
    ["BTC-USD", "ETH-USD"]
  );
  for (const signal of generatePaperSignals(input)) assert.notEqual(signal.action, "paper_buy_candidate");
});

test("performance context unavailable (null) never crashes and is noted in riskNotes", () => {
  const input = baseInput({ performanceContext: null });
  const signals = generatePaperSignals(input);
  assert.ok(signals.length > 0);
  for (const signal of signals) {
    assert.ok(signal.riskNotes.some((note) => /performance context unavailable/i.test(note)));
  }
});

// ─── 18: suggestedNotionalUsd is never negative ─────────────────────────────

test("18. suggestedNotionalUsd is never negative across a spread of extreme inputs", () => {
  const scenarios = [
    withStrategy(
      baseInput({
        portfolioSummary: { baseCapitalUsd: 0, simulatedEquityUsd: 0, exposureUsd: 0, exposurePct: 0, openPositionsCount: 0, dailyRealizedLossUsedUsd: 0, weeklyRealizedLossUsedUsd: 0 },
      }),
      "btc_eth_momentum",
      "BTC/ETH Momentum",
      "balanced",
      ["BTC-USD", "ETH-USD"]
    ),
    withStrategy(
      baseInput({
        portfolioSummary: { baseCapitalUsd: 10000, simulatedEquityUsd: 10000, exposureUsd: 20000, exposurePct: 200, openPositionsCount: 0, dailyRealizedLossUsedUsd: 0, weeklyRealizedLossUsedUsd: 0 },
      }),
      "crypto_majors_rotation",
      "Crypto Majors Rotation",
      "growth",
      ["BTC-USD", "ETH-USD", "SOL-USD", "AVAX-USD"]
    ),
  ];
  for (const input of scenarios) {
    for (const signal of generatePaperSignals(input)) {
      assert.ok(signal.suggestedNotionalUsd === null || signal.suggestedNotionalUsd >= 0);
    }
  }
});

// ─── 19: normalizeExposureLimit ─────────────────────────────────────────────

test("19. normalizeExposureLimit treats 60 as a percent and 0.6 as a ratio, both yielding 0.6", () => {
  assert.equal(normalizeExposureLimit(60), 0.6);
  assert.equal(normalizeExposureLimit(0.6), 0.6);
  assert.equal(normalizeExposureLimit(100), 1);
  assert.equal(normalizeExposureLimit(1), 1);
  assert.equal(normalizeExposureLimit(0), 0);
  assert.equal(normalizeExposureLimit(-5), 0);
  assert.equal(normalizeExposureLimit(Number.NaN), 0);
});

// ─── 20: forbidden execution vocabulary ─────────────────────────────────────

test("20. no generated signal action or copy uses buy_now/sell_now/execute/place_order/create_order/trade_now/send_to_broker language", () => {
  const scenarios = [
    ...inputsForEveryStrategy(),
    withStrategy(
      baseInput({ performanceContext: { totalReturnPct: -10, profitFactor: 0.5, maxDrawdownPct: 40, currentDrawdownPct: 35, riskHealth: "breach", recommendation: "pause" } }),
      "btc_eth_momentum",
      "BTC/ETH Momentum",
      "balanced",
      ["BTC-USD", "ETH-USD"]
    ),
  ];
  for (const input of scenarios) {
    for (const signal of generatePaperSignals(input)) {
      assert.doesNotMatch(signal.action, FORBIDDEN_ACTION_LANGUAGE);
      assert.doesNotMatch(signal.requiredUserAction, FORBIDDEN_ACTION_LANGUAGE);
      for (const line of [...signal.rationale, ...signal.riskNotes, ...signal.blockedReasons]) {
        assert.doesNotMatch(line, FORBIDDEN_ACTION_LANGUAGE);
      }
    }
  }
});

// ─── Additional coverage: sizing, strength, rationale/risk-note builders ───

test("calculateAvailableExposureUsd is baseCapitalUsd*maxExposureRatio minus current exposure, floored at 0", () => {
  const input = baseInput({
    portfolioSummary: { baseCapitalUsd: 10000, simulatedEquityUsd: 10000, exposureUsd: 1000, exposurePct: 10, openPositionsCount: 0, dailyRealizedLossUsedUsd: 0, weeklyRealizedLossUsedUsd: 0 },
  });
  assert.equal(calculateAvailableExposureUsd(input), 5000);

  const overExposed = baseInput({
    portfolioSummary: { baseCapitalUsd: 10000, simulatedEquityUsd: 10000, exposureUsd: 9000, exposurePct: 90, openPositionsCount: 0, dailyRealizedLossUsedUsd: 0, weeklyRealizedLossUsedUsd: 0 },
  });
  assert.equal(calculateAvailableExposureUsd(overExposed), 0);
});

test("calculateSuggestedNotionalUsd matches the per-strategy sizing formulas and caps", () => {
  const input = baseInput();
  assert.equal(calculateSuggestedNotionalUsd("conservative_crypto_trend", input), 150);
  assert.equal(calculateSuggestedNotionalUsd("btc_eth_momentum", input), 250);
  assert.equal(calculateSuggestedNotionalUsd("crypto_majors_rotation", input), 220);
  assert.equal(calculateSuggestedNotionalUsd("risk_off_cash_mode", input), null);
  assert.equal(calculateSuggestedNotionalUsd("bear_market_research_mode", input), null);
  assert.equal(calculateSuggestedNotionalUsd("not_a_real_strategy", input), null);
});

test("calculateSuggestedNotionalUsd applies the $25 minimum-meaningful-size floor", () => {
  const tiny = baseInput({
    portfolioSummary: { baseCapitalUsd: 100, simulatedEquityUsd: 100, exposureUsd: 50, exposurePct: 50, openPositionsCount: 0, dailyRealizedLossUsedUsd: 0, weeklyRealizedLossUsedUsd: 0 },
  });
  assert.equal(calculateSuggestedNotionalUsd("btc_eth_momentum", tiny), null);
});

test("classifySignalStrength caps conservative_crypto_trend at moderate, never strong", () => {
  assert.equal(
    classifySignalStrength({ action: "paper_buy_candidate", strategyKey: "conservative_crypto_trend", exposureHeadroomRatio: 0.5, performanceHealthy: true }),
    "moderate"
  );
  assert.equal(
    classifySignalStrength({ action: "paper_buy_candidate", strategyKey: "btc_eth_momentum", exposureHeadroomRatio: 0.5, performanceHealthy: true }),
    "strong"
  );
  assert.equal(classifySignalStrength({ action: "watch", strategyKey: "btc_eth_momentum", exposureHeadroomRatio: 0.5, performanceHealthy: true }), "weak");
});

test("buildSignalRationale never returns an empty array", () => {
  assert.deepEqual(buildSignalRationale({ symbol: "BTC-USD", lines: ["  ", ""] }).length > 0, true);
  assert.deepEqual(buildSignalRationale({ symbol: "BTC-USD", lines: ["a real line"] }), ["a real line"]);
});

test("buildRiskNotes appends the performance-unavailable note only when performanceContext is missing", () => {
  assert.deepEqual(buildRiskNotes({ performanceContext: null, notes: ["custom"] }), ["custom", "Performance context unavailable; signals are based on strategy and portfolio constraints only."]);
  assert.deepEqual(buildRiskNotes({ performanceContext: { riskHealth: "healthy" }, notes: ["custom"] }), ["custom"]);
});

test("assertSignalIsPaperOnly throws for a tampered signal", () => {
  const [signal] = generatePaperSignals(baseInput());
  assert.throws(() => assertSignalIsPaperOnly({ ...signal, paperOnly: false }));
  assert.throws(() => assertSignalIsPaperOnly({ ...signal, realExecutionLocked: false }));
  assert.throws(() => assertSignalIsPaperOnly({ ...signal, confidenceScore: 150 }));
  assert.throws(() => assertSignalIsPaperOnly({ ...signal, confidenceScore: -1 }));
  assert.throws(() => assertSignalIsPaperOnly({ ...signal, suggestedNotionalUsd: -5 }));
  assert.throws(() => assertSignalIsPaperOnly({ ...signal, action: "buy_now" }));
  assert.throws(() => assertSignalIsPaperOnly({ ...signal, status: "not_a_real_status" }));
  assert.doesNotThrow(() => assertSignalIsPaperOnly(signal));
});

test("Crypto Majors Rotation respects the max open positions headroom and never claims relative strength", () => {
  const input = withStrategy(
    baseInput({
      portfolioSummary: { baseCapitalUsd: 10000, simulatedEquityUsd: 10000, exposureUsd: 0, exposurePct: 0, openPositionsCount: 3, dailyRealizedLossUsedUsd: 0, weeklyRealizedLossUsedUsd: 0 },
    }),
    "crypto_majors_rotation",
    "Crypto Majors Rotation",
    "growth",
    ["BTC-USD", "ETH-USD", "SOL-USD", "AVAX-USD"]
  );
  const signals = generatePaperSignals(input);
  for (const signal of signals) assert.notEqual(signal.action, "paper_buy_candidate");
  assert.equal(signals.length, 4);
});
