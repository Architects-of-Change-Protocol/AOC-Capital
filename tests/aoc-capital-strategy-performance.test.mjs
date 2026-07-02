// ─── AOC Capital — Strategy Performance Review — Tests ─────────────────────────
// Pure-function tests; no Supabase / live database required.

import { test } from "node:test";
import assert from "node:assert/strict";

const {
  computeWinRate,
  computeAvgWin,
  computeAvgLoss,
  computeProfitFactor,
  buildEquityCurve,
  computeMaxDrawdown,
  computeCurrentDrawdown,
  classifyStrategyHealth,
  recommendAdvisorAction,
  computeStrategyPerformance,
  ADVISOR_RECOMMENDATION_ACTIONS,
  MIN_CLOSED_POSITIONS_FOR_REAL_EXECUTION,
} = await import("../src/lib/trading/strategy-performance.ts");

const trade = (realizedPnlUsd, closedAt = "2026-01-01T00:00:00.000Z", symbol = "BTC-USD") => ({ symbol, realizedPnlUsd, closedAt });

// ─── 1. Win rate calculation ────────────────────────────────────────────────

test("win rate is 0 with no closed positions", () => {
  assert.equal(computeWinRate([]), 0);
});

test("win rate is the percentage of closed positions with positive realized P&L", () => {
  const positions = [trade(10), trade(-5), trade(20), trade(-1)];
  assert.equal(computeWinRate(positions), 50);
});

test("win rate is 100 when every closed position was profitable", () => {
  assert.equal(computeWinRate([trade(5), trade(1)]), 100);
});

test("flat trades do not count as wins", () => {
  assert.equal(computeWinRate([trade(0), trade(0), trade(10), trade(-5)]), 25);
});

// ─── 2. Average win / average loss calculation ─────────────────────────────

test("average win is the mean realized P&L of winning trades only", () => {
  const positions = [trade(10), trade(-5), trade(30)];
  assert.equal(computeAvgWin(positions), 20);
});

test("average win is null when there are no winning trades", () => {
  assert.equal(computeAvgWin([trade(-5), trade(-10)]), null);
});

test("average loss is the mean realized P&L of losing trades only (negative)", () => {
  const positions = [trade(10), trade(-5), trade(-15)];
  assert.equal(computeAvgLoss(positions), -10);
});

test("average loss is null when there are no losing trades", () => {
  assert.equal(computeAvgLoss([trade(5), trade(10)]), null);
});

test("flat trades do not count as wins or losses for averages", () => {
  const positions = [trade(0), trade(0), trade(20), trade(-10)];
  assert.equal(computeAvgWin(positions), 20);
  assert.equal(computeAvgLoss(positions), -10);
  assert.equal(computeAvgWin([trade(0), trade(0)]), null);
  assert.equal(computeAvgLoss([trade(0), trade(0)]), null);
});

// ─── 3. Profit factor calculation ───────────────────────────────────────────

test("profit factor is gross wins divided by gross losses", () => {
  const positions = [trade(40), trade(20), trade(-30), trade(-10)];
  assert.equal(computeProfitFactor(positions), 60 / 40);
});

test("profit factor is null when there are no losses yet (undefined, not infinite)", () => {
  assert.equal(computeProfitFactor([trade(10), trade(20)]), null);
});

test("profit factor is below 1 when gross losses exceed gross wins", () => {
  const positions = [trade(10), trade(-30)];
  const profitFactor = computeProfitFactor(positions);
  assert.ok(profitFactor < 1);
  assert.equal(profitFactor, 10 / 30);
});

// ─── 4. Max drawdown calculation ────────────────────────────────────────────

test("max drawdown captures the worst peak-to-trough decline on the equity curve", () => {
  const curve = [
    { atIso: "t0", equityUsd: 1000 },
    { atIso: "t1", equityUsd: 1200 }, // new peak
    { atIso: "t2", equityUsd: 900 }, // 300 off the 1200 peak
    { atIso: "t3", equityUsd: 1100 }, // partial recovery
    { atIso: "t4", equityUsd: 1050 }, // dips again, but less than the t2 trough
  ];
  const maxDrawdown = computeMaxDrawdown(curve);
  assert.equal(maxDrawdown.usd, 300);
  assert.ok(Math.abs(maxDrawdown.pct - 25) < 1e-9);
});

test("max drawdown is zero for a monotonically rising equity curve", () => {
  const curve = [
    { atIso: "t0", equityUsd: 1000 },
    { atIso: "t1", equityUsd: 1050 },
    { atIso: "t2", equityUsd: 1100 },
  ];
  assert.deepEqual(computeMaxDrawdown(curve), { usd: 0, pct: 0 });
});

// ─── 5. Current drawdown calculation ────────────────────────────────────────

test("current drawdown is how far the last equity point sits below the curve's peak", () => {
  const curve = [
    { atIso: "t0", equityUsd: 1000 },
    { atIso: "t1", equityUsd: 1200 }, // peak
    { atIso: "t2", equityUsd: 900 },
    { atIso: "t3", equityUsd: 1140 }, // current — 60 below the 1200 peak
  ];
  const currentDrawdown = computeCurrentDrawdown(curve);
  assert.equal(currentDrawdown.usd, 60);
  assert.ok(Math.abs(currentDrawdown.pct - 5) < 1e-9);
});

test("current drawdown differs from max drawdown when equity has partially recovered", () => {
  const curve = [
    { atIso: "t0", equityUsd: 1000 },
    { atIso: "t1", equityUsd: 1200 },
    { atIso: "t2", equityUsd: 600 }, // worst point — 600 off peak (max drawdown)
    { atIso: "t3", equityUsd: 1150 }, // current — only 50 off peak
  ];
  assert.equal(computeMaxDrawdown(curve).usd, 600);
  assert.equal(computeCurrentDrawdown(curve).usd, 50);
});

test("current drawdown is zero when the equity curve is currently at its peak", () => {
  const curve = [
    { atIso: "t0", equityUsd: 1000 },
    { atIso: "t1", equityUsd: 900 },
    { atIso: "t2", equityUsd: 1050 },
  ];
  assert.deepEqual(computeCurrentDrawdown(curve), { usd: 0, pct: 0 });
});

test("buildEquityCurve derives a curve from base capital, ordered closes, and current unrealized P&L", () => {
  const curve = buildEquityCurve(
    1000,
    [trade(50, "2026-01-02T00:00:00.000Z"), trade(-20, "2026-01-01T00:00:00.000Z")], // deliberately out of order
    10,
    "2026-01-03T00:00:00.000Z"
  );
  assert.equal(curve[0].equityUsd, 1000);
  assert.equal(curve[1].atIso, "2026-01-01T00:00:00.000Z");
  assert.equal(curve[1].equityUsd, 980);
  assert.equal(curve[2].atIso, "2026-01-02T00:00:00.000Z");
  assert.equal(curve[2].equityUsd, 1030);
  assert.equal(curve[3].equityUsd, 1040); // + unrealized P&L
});

// ─── 6. Strategy health classification ──────────────────────────────────────

test("strategy health is healthy when risk usage is healthy and drawdown is low", () => {
  assert.equal(classifyStrategyHealth({ riskHealth: "healthy", currentDrawdownPct: 2 }), "healthy");
});

test("strategy health is caution when the underlying risk-limit usage is caution, even with low drawdown", () => {
  assert.equal(classifyStrategyHealth({ riskHealth: "caution", currentDrawdownPct: 0 }), "caution");
});

test("strategy health escalates to caution once drawdown alone is elevated", () => {
  assert.equal(classifyStrategyHealth({ riskHealth: "healthy", currentDrawdownPct: 20 }), "caution");
});

test("strategy health is breached when the underlying risk-limit usage is breached", () => {
  assert.equal(classifyStrategyHealth({ riskHealth: "breached", currentDrawdownPct: 0 }), "breached");
});

test("strategy health escalates to breached once drawdown alone is severe", () => {
  assert.equal(classifyStrategyHealth({ riskHealth: "healthy", currentDrawdownPct: 35 }), "breached");
});

test("strategy health escalates exactly at the 15% caution drawdown threshold", () => {
  assert.equal(classifyStrategyHealth({ riskHealth: "healthy", currentDrawdownPct: 15 }), "caution");
});

test("strategy health escalates exactly at the 30% breached drawdown threshold", () => {
  assert.equal(classifyStrategyHealth({ riskHealth: "healthy", currentDrawdownPct: 30 }), "breached");
});

// ─── 7. Advisor recommendation when healthy but sample size is too small ───

test("advisor recommends not_ready_for_real_execution when strategy is healthy but the closed-trade sample is small", () => {
  const recommendation = recommendAdvisorAction({ strategyHealth: "healthy", closedPositionsCount: 2, profitFactor: 3, totalReturnPct: 5, winningTradesCount: 2, losingTradesCount: 0, grossWinUsd: 50 });
  assert.equal(recommendation, "not_ready_for_real_execution");
  assert.ok(2 < MIN_CLOSED_POSITIONS_FOR_REAL_EXECUTION);
});

test("full computeStrategyPerformance explains a healthy-but-small-sample strategy in natural language and keeps real execution locked", () => {
  const performance = computeStrategyPerformance({
    baseCapitalUsd: 1000,
    closedPositions: [trade(20, "2026-01-01T00:00:00.000Z"), trade(10, "2026-01-02T00:00:00.000Z")],
    openPositionsCount: 0,
    unrealizedPnlUsd: 0,
    openExposureUsd: 0,
    dailyRealizedPnlUsd: 0,
    weeklyRealizedPnlUsd: 30,
    riskHealth: "healthy",
    nowIso: "2026-01-03T00:00:00.000Z",
  });
  assert.equal(performance.strategyHealth, "healthy");
  assert.equal(performance.advisorRecommendation, "not_ready_for_real_execution");
  assert.equal(performance.realExecutionLocked, true);
  assert.match(performance.advisorExplanation, /sample size is still small/);
  assert.match(performance.advisorExplanation, /real execution remains locked/i);
});

// ─── 8. Advisor recommendation when drawdown is high ───────────────────────

test("advisor recommends reduce_risk once elevated drawdown pushes strategy health to caution", () => {
  const recommendation = recommendAdvisorAction({ strategyHealth: "caution", closedPositionsCount: 20, profitFactor: 2, totalReturnPct: 5, winningTradesCount: 10, losingTradesCount: 2, grossWinUsd: 200 });
  assert.equal(recommendation, "reduce_risk");
});

test("advisor recommends pause once severe drawdown pushes strategy health to breached", () => {
  const recommendation = recommendAdvisorAction({ strategyHealth: "breached", closedPositionsCount: 20, profitFactor: 2, totalReturnPct: 5, winningTradesCount: 10, losingTradesCount: 2, grossWinUsd: 200 });
  assert.equal(recommendation, "pause");
});

test("full computeStrategyPerformance recommends reduce_risk when current drawdown is high", () => {
  // Closed trades swing equity from 1000 -> 1300 (peak) -> 1080 -> current stays near 1080: ~16.9% current drawdown, above the 15% caution threshold.
  const performance = computeStrategyPerformance({
    baseCapitalUsd: 1000,
    closedPositions: [trade(300, "2026-01-01T00:00:00.000Z"), trade(-220, "2026-01-02T00:00:00.000Z")],
    openPositionsCount: 0,
    unrealizedPnlUsd: 0,
    openExposureUsd: 0,
    dailyRealizedPnlUsd: 0,
    weeklyRealizedPnlUsd: 80,
    riskHealth: "healthy",
    nowIso: "2026-01-03T00:00:00.000Z",
  });
  assert.ok(performance.currentDrawdownPct >= 15, `expected drawdown >= 15%, got ${performance.currentDrawdownPct}`);
  assert.equal(performance.strategyHealth, "caution");
  assert.equal(performance.advisorRecommendation, "reduce_risk");
  assert.equal(performance.realExecutionLocked, true);
});

// ─── 9. Advisor recommendation when profit factor is below 1 ───────────────

test("advisor recommends review_required when the closed-trade sample is large enough but profit factor is below 1", () => {
  const recommendation = recommendAdvisorAction({ strategyHealth: "healthy", closedPositionsCount: 12, profitFactor: 0.6, totalReturnPct: 5, winningTradesCount: 6, losingTradesCount: 6, grossWinUsd: 60 });
  assert.equal(recommendation, "review_required");
});

test("full computeStrategyPerformance recommends review_required for a healthy-risk, large-sample, unprofitable strategy", () => {
  const closedPositions = [
    ...Array.from({ length: 6 }, (_, i) => trade(5, `2026-01-01T0${i}:00:00.000Z`)), // 30 gross win
    ...Array.from({ length: 6 }, (_, i) => trade(-10, `2026-01-02T0${i}:00:00.000Z`)), // 60 gross loss
  ];
  const performance = computeStrategyPerformance({
    baseCapitalUsd: 1000,
    closedPositions,
    openPositionsCount: 0,
    unrealizedPnlUsd: 0,
    openExposureUsd: 0,
    dailyRealizedPnlUsd: 0,
    weeklyRealizedPnlUsd: -30,
    riskHealth: "healthy",
    nowIso: "2026-01-03T00:00:00.000Z",
  });
  assert.equal(performance.closedPositionsCount, 12);
  assert.ok(performance.profitFactor < 1);
  assert.equal(performance.strategyHealth, "healthy");
  assert.equal(performance.advisorRecommendation, "review_required");
  assert.equal(performance.realExecutionLocked, true);
  assert.match(performance.advisorExplanation, /profit factor/i);
});

test("10+ all-breakeven trades do not recommend continue", () => {
  const performance = computeStrategyPerformance({
    baseCapitalUsd: 1000,
    closedPositions: Array.from({ length: 12 }, (_, i) => trade(0, `2026-01-01T${String(i).padStart(2, "0")}:00:00.000Z`)),
    openPositionsCount: 0,
    unrealizedPnlUsd: 0,
    openExposureUsd: 0,
    dailyRealizedPnlUsd: 0,
    weeklyRealizedPnlUsd: 0,
    riskHealth: "healthy",
    nowIso: "2026-01-02T00:00:00.000Z",
  });
  assert.equal(performance.totalReturnPct, 0);
  assert.equal(performance.winRatePct, 0);
  assert.equal(performance.avgWinUsd, null);
  assert.equal(performance.avgLossUsd, null);
  assert.equal(performance.profitFactor, null);
  assert.equal(performance.advisorRecommendation, "review_required");
  assert.equal(performance.realExecutionLocked, true);
});

test("large all-winning sample with positive return may continue paper monitoring while real execution stays locked", () => {
  const performance = computeStrategyPerformance({
    baseCapitalUsd: 1000,
    closedPositions: Array.from({ length: 12 }, (_, i) => trade(10, `2026-01-01T${String(i).padStart(2, "0")}:00:00.000Z`)),
    openPositionsCount: 0,
    unrealizedPnlUsd: 0,
    openExposureUsd: 0,
    dailyRealizedPnlUsd: 0,
    weeklyRealizedPnlUsd: 120,
    riskHealth: "healthy",
    nowIso: "2026-01-02T00:00:00.000Z",
  });
  assert.equal(performance.profitFactor, null);
  assert.equal(performance.totalReturnPct, 12);
  assert.equal(performance.advisorRecommendation, "continue");
  assert.match(performance.advisorExplanation, /Continue paper monitoring only/);
  assert.equal(performance.realExecutionLocked, true);
});

test("zero base capital does not produce misleading percentages or continue recommendation", () => {
  const performance = computeStrategyPerformance({
    baseCapitalUsd: 0,
    closedPositions: Array.from({ length: 12 }, (_, i) => trade(10, `2026-01-01T${String(i).padStart(2, "0")}:00:00.000Z`)),
    openPositionsCount: 0,
    unrealizedPnlUsd: 0,
    openExposureUsd: 0,
    dailyRealizedPnlUsd: 0,
    weeklyRealizedPnlUsd: 120,
    riskHealth: "healthy",
    nowIso: "2026-01-02T00:00:00.000Z",
  });
  assert.equal(performance.totalReturnPct, 0);
  assert.equal(performance.exposureUsagePct, 0);
  assert.equal(performance.advisorRecommendation, "review_required");
  assert.equal(performance.realExecutionLocked, true);
});

test("negative base capital does not produce misleading percentages or continue recommendation", () => {
  const performance = computeStrategyPerformance({
    baseCapitalUsd: -1000,
    closedPositions: Array.from({ length: 12 }, (_, i) => trade(10, `2026-01-01T${String(i).padStart(2, "0")}:00:00.000Z`)),
    openPositionsCount: 0,
    unrealizedPnlUsd: 0,
    openExposureUsd: 0,
    dailyRealizedPnlUsd: 0,
    weeklyRealizedPnlUsd: 120,
    riskHealth: "healthy",
    nowIso: "2026-01-02T00:00:00.000Z",
  });
  assert.equal(performance.totalReturnPct, 0);
  assert.equal(performance.exposureUsagePct, 0);
  assert.equal(performance.advisorRecommendation, "review_required");
  assert.equal(performance.realExecutionLocked, true);
});

test("all-flat samples expose no meaningful best or worst trade", () => {
  const performance = computeStrategyPerformance({
    baseCapitalUsd: 1000,
    closedPositions: Array.from({ length: 12 }, (_, i) => trade(0, `2026-01-01T${String(i).padStart(2, "0")}:00:00.000Z`)),
    openPositionsCount: 0,
    unrealizedPnlUsd: 0,
    openExposureUsd: 0,
    dailyRealizedPnlUsd: 0,
    weeklyRealizedPnlUsd: 0,
    riskHealth: "healthy",
    nowIso: "2026-01-02T00:00:00.000Z",
  });
  assert.equal(performance.bestTrade, null);
  assert.equal(performance.worstTrade, null);
});

// ─── 10. No real execution capability is unlocked by performance review ────

test("REAL_EXECUTION_LOCKED-derived result is always true regardless of how good performance looks", () => {
  const excellentPerformance = computeStrategyPerformance({
    baseCapitalUsd: 1000,
    closedPositions: Array.from({ length: 20 }, (_, i) => trade(50, `2026-01-01T${String(i).padStart(2, "0")}:00:00.000Z`)),
    openPositionsCount: 0,
    unrealizedPnlUsd: 0,
    openExposureUsd: 0,
    dailyRealizedPnlUsd: 0,
    weeklyRealizedPnlUsd: 1000,
    riskHealth: "healthy",
    nowIso: "2026-01-02T00:00:00.000Z",
  });
  assert.equal(excellentPerformance.realExecutionLocked, true);
  assert.equal(excellentPerformance.advisorRecommendation, "continue");
});

test("the advisor recommendation enum never contains a value that implies real/live execution", () => {
  const forbiddenTerms = ["execute", "live", "real_trade", "withdraw", "broker"];
  for (const action of ADVISOR_RECOMMENDATION_ACTIONS) {
    for (const forbidden of forbiddenTerms) {
      assert.ok(!action.includes(forbidden), `advisor recommendation "${action}" must not resemble a real-execution capability`);
    }
  }
  assert.deepEqual(ADVISOR_RECOMMENDATION_ACTIONS.sort(), ["continue", "not_ready_for_real_execution", "pause", "reduce_risk", "review_required"].sort());
});

test("computeStrategyPerformance never exposes a field that toggles real execution on", () => {
  const performance = computeStrategyPerformance({
    baseCapitalUsd: 1000,
    closedPositions: [],
    openPositionsCount: 0,
    unrealizedPnlUsd: 0,
    openExposureUsd: 0,
    dailyRealizedPnlUsd: 0,
    weeklyRealizedPnlUsd: 0,
    riskHealth: "healthy",
    nowIso: "2026-01-01T00:00:00.000Z",
  });
  assert.equal(performance.realExecutionLocked, true);
  assert.ok(!("realExecutionUnlocked" in performance));
  assert.ok(!("liveExecutionEnabled" in performance));
});
