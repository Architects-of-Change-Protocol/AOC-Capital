// AOC Capital — Strategy Performance Review (PR #4).
//
// Pure calculation module: computeStrategyPerformance() and its building
// blocks have no I/O and are fully unit-testable (see
// tests/aoc-capital-strategy-performance.test.mjs). The orchestration layer
// (trade-service.ts) reads paper_positions + the existing portfolio summary
// and hands the aggregates below to this module.
//
// This module is paper-only and read-only: it never writes to the database,
// never talks to a live market data source, and never unlocks real
// execution. Every StrategyPerformance result carries realExecutionLocked:
// true unconditionally (see REAL_EXECUTION_LOCKED / test #10) — this module
// has no mechanism to set it to false. AdvisorRecommendationAction is a
// closed enum of paper-only actions (continue/reduce_risk/pause/
// review_required/not_ready_for_real_execution); none of them enable live
// order routing, broker integration, or withdrawals.

import type { StrategyHealth } from "./portfolio-summary";
import { MAX_DAILY_SIMULATED_LOSS_USD, MAX_SIMULATED_EXPOSURE_RATIO, MAX_WEEKLY_SIMULATED_LOSS_USD } from "./risk-policy-engine";

export const REAL_EXECUTION_LOCKED = true as const;

/** Below this many closed paper trades, the sample is too small to judge real-world viability — regardless of how healthy the strategy looks so far. */
export const MIN_CLOSED_POSITIONS_FOR_REAL_EXECUTION = 10;

/** Current drawdown thresholds (percent of the equity curve's peak) that escalate performance-level strategy health beyond what risk-limit usage alone implies. */
export const CAUTION_DRAWDOWN_PCT = 15;
export const BREACHED_DRAWDOWN_PCT = 30;

/** A profit factor below 1.0 means gross losses exceed gross wins — the strategy is losing money on average. */
export const LOW_PROFIT_FACTOR_THRESHOLD = 1;

export type AdvisorRecommendationAction = "continue" | "reduce_risk" | "pause" | "review_required" | "not_ready_for_real_execution";

export const ADVISOR_RECOMMENDATION_ACTIONS: AdvisorRecommendationAction[] = [
  "continue",
  "reduce_risk",
  "pause",
  "review_required",
  "not_ready_for_real_execution",
];

export type ClosedTradeInput = {
  symbol: string;
  realizedPnlUsd: number;
  closedAt: string;
};

export type TradeHighlight = {
  symbol: string;
  realizedPnlUsd: number;
  closedAt: string;
};

export type EquityPoint = {
  atIso: string;
  equityUsd: number;
};

export type DrawdownResult = {
  usd: number;
  pct: number;
};

/** Percentage of closed trades that were profitable. Returns 0 for an empty sample (not undefined/NaN) so callers can render it directly. */
export function computeWinRate(closedPositions: ClosedTradeInput[]): number {
  if (closedPositions.length === 0) return 0;
  const wins = closedPositions.filter((p) => p.realizedPnlUsd > 0).length;
  return (wins / closedPositions.length) * 100;
}

/** Average P&L of winning trades only. Null (not 0) when there are no wins yet, so callers can distinguish "no data" from "average win of $0". */
export function computeAvgWin(closedPositions: ClosedTradeInput[]): number | null {
  const wins = closedPositions.filter((p) => p.realizedPnlUsd > 0);
  if (wins.length === 0) return null;
  return wins.reduce((sum, p) => sum + p.realizedPnlUsd, 0) / wins.length;
}

/** Average P&L of losing trades only (a negative number). Null when there are no losses yet. */
export function computeAvgLoss(closedPositions: ClosedTradeInput[]): number | null {
  const losses = closedPositions.filter((p) => p.realizedPnlUsd < 0);
  if (losses.length === 0) return null;
  return losses.reduce((sum, p) => sum + p.realizedPnlUsd, 0) / losses.length;
}

/**
 * Gross wins divided by gross losses (both positive magnitudes). Null when
 * there are no losses yet — profit factor is undefined until there's a loss
 * to compare against, not "infinite" or "0".
 */
export function computeProfitFactor(closedPositions: ClosedTradeInput[]): number | null {
  const grossWinUsd = closedPositions.filter((p) => p.realizedPnlUsd > 0).reduce((sum, p) => sum + p.realizedPnlUsd, 0);
  const grossLossUsd = Math.abs(closedPositions.filter((p) => p.realizedPnlUsd < 0).reduce((sum, p) => sum + p.realizedPnlUsd, 0));
  if (grossLossUsd === 0) return null;
  return grossWinUsd / grossLossUsd;
}

/**
 * Derives a simulated equity curve from closed positions (in the order they
 * closed) plus the current unrealized P&L on still-open positions. This is
 * the "initial version derived from closed positions and mark-to-market
 * state" — no separate time-series table is required for this PR. Always
 * has at least two points (a starting point at base capital, and a current
 * point reflecting mark-to-market state), even with zero closed trades.
 */
export function buildEquityCurve(baseCapitalUsd: number, closedPositions: ClosedTradeInput[], unrealizedPnlUsd: number, nowIso: string = new Date().toISOString()): EquityPoint[] {
  const sorted = [...closedPositions].sort((a, b) => a.closedAt.localeCompare(b.closedAt));

  const curve: EquityPoint[] = [{ atIso: sorted[0]?.closedAt ?? nowIso, equityUsd: baseCapitalUsd }];
  let running = baseCapitalUsd;
  for (const position of sorted) {
    running += position.realizedPnlUsd;
    curve.push({ atIso: position.closedAt, equityUsd: running });
  }
  curve.push({ atIso: nowIso, equityUsd: running + unrealizedPnlUsd });

  return curve;
}

/** Worst peak-to-trough decline anywhere along the equity curve (the historical worst case, not necessarily where the curve is now). */
export function computeMaxDrawdown(curve: EquityPoint[]): DrawdownResult {
  if (curve.length === 0) return { usd: 0, pct: 0 };

  let peak = curve[0].equityUsd;
  let maxDrawdownUsd = 0;
  let maxDrawdownPct = 0;

  for (const point of curve) {
    if (point.equityUsd > peak) peak = point.equityUsd;
    const drawdownUsd = peak - point.equityUsd;
    if (drawdownUsd > maxDrawdownUsd) {
      maxDrawdownUsd = drawdownUsd;
      maxDrawdownPct = peak > 0 ? (drawdownUsd / peak) * 100 : 0;
    }
  }

  return { usd: maxDrawdownUsd, pct: maxDrawdownPct };
}

/** How far the equity curve's current (last) point sits below its highest point so far — "where are we right now," as opposed to the historical worst case. */
export function computeCurrentDrawdown(curve: EquityPoint[]): DrawdownResult {
  if (curve.length === 0) return { usd: 0, pct: 0 };

  const peak = curve.reduce((max, point) => Math.max(max, point.equityUsd), curve[0].equityUsd);
  const current = curve[curve.length - 1].equityUsd;
  const usd = Math.max(0, peak - current);
  const pct = peak > 0 ? (usd / peak) * 100 : 0;

  return { usd, pct };
}

/**
 * Performance-level strategy health. Starts from the existing risk-limit
 * health (Level 1 exposure/loss-limit usage, computed by
 * computePortfolioSummary()) and escalates further if the equity curve's
 * current drawdown is elevated — a strategy can be fully within its Level 1
 * limits at this instant and still be in a deteriorating drawdown.
 */
export function classifyStrategyHealth(input: { riskHealth: StrategyHealth; currentDrawdownPct: number }): StrategyHealth {
  if (input.riskHealth === "breached" || input.currentDrawdownPct >= BREACHED_DRAWDOWN_PCT) return "breached";
  if (input.riskHealth === "caution" || input.currentDrawdownPct >= CAUTION_DRAWDOWN_PCT) return "caution";
  return "healthy";
}

/**
 * Advisor recommendation for what the user should do next. Order matters:
 * a breach or caution on risk/drawdown always wins over sample-size or
 * profit-factor considerations. Every branch is paper-only — none of them
 * ever return a value that unlocks real execution (see test #10).
 */
export function recommendAdvisorAction(input: { strategyHealth: StrategyHealth; closedPositionsCount: number; profitFactor: number | null }): AdvisorRecommendationAction {
  if (input.strategyHealth === "breached") return "pause";
  if (input.strategyHealth === "caution") return "reduce_risk";
  if (input.closedPositionsCount < MIN_CLOSED_POSITIONS_FOR_REAL_EXECUTION) return "not_ready_for_real_execution";
  if (input.profitFactor !== null && input.profitFactor < LOW_PROFIT_FACTOR_THRESHOLD) return "review_required";
  return "continue";
}

function bestTrade(closedPositions: ClosedTradeInput[]): TradeHighlight | null {
  if (closedPositions.length === 0) return null;
  return closedPositions.reduce((best, p) => (p.realizedPnlUsd > best.realizedPnlUsd ? p : best), closedPositions[0]);
}

function worstTrade(closedPositions: ClosedTradeInput[]): TradeHighlight | null {
  if (closedPositions.length === 0) return null;
  return closedPositions.reduce((worst, p) => (p.realizedPnlUsd < worst.realizedPnlUsd ? p : worst), closedPositions[0]);
}

function buildAdvisorExplanation(input: {
  strategyHealth: StrategyHealth;
  advisorRecommendation: AdvisorRecommendationAction;
  closedPositionsCount: number;
  totalReturnPct: number;
  profitFactor: number | null;
  currentDrawdownPct: number;
  weeklyLossUsagePct: number;
}): string {
  const sentences: string[] = [];

  if (input.strategyHealth === "healthy") {
    sentences.push(
      `Your strategy is currently healthy. It has respected all Level 1 limits, maintained exposure below the allowed ceiling, and produced a ${
        input.totalReturnPct >= 0 ? "positive" : "negative"
      } simulated return of ${input.totalReturnPct.toFixed(2)}%.`
    );
  } else if (input.strategyHealth === "caution") {
    sentences.push(
      `Your strategy needs attention. Simulated risk usage or drawdown is elevated (current drawdown ${input.currentDrawdownPct.toFixed(
        1
      )}%), even though no Level 1 limit has been fully breached yet.`
    );
  } else {
    sentences.push(
      `Your strategy is not ready for real execution. Weekly loss usage is at ${input.weeklyLossUsagePct.toFixed(1)}%, ${
        input.profitFactor !== null ? `profit factor is ${input.profitFactor.toFixed(2)}` : "there is not yet enough closed-trade data to calculate a profit factor"
      }, and drawdown is at ${input.currentDrawdownPct.toFixed(1)}%.`
    );
  }

  switch (input.advisorRecommendation) {
    case "not_ready_for_real_execution":
      sentences.push(`The sample size is still small (${input.closedPositionsCount} closed paper trade${input.closedPositionsCount === 1 ? "" : "s"}), so real execution remains locked.`);
      break;
    case "review_required":
      sentences.push("Profit factor is below 1.0, so this strategy should be reviewed before continuing. Real execution remains locked.");
      break;
    case "reduce_risk":
      sentences.push("Consider reducing exposure or position size until risk usage returns to a comfortable range. Real execution remains locked and gated for a future review.");
      break;
    case "pause":
      sentences.push("Paper trading should be paused until the breached limit is resolved. Real execution remains locked.");
      break;
    case "continue":
      sentences.push("Real execution remains locked and gated for a future review.");
      break;
  }

  return sentences.join(" ");
}

export type StrategyPerformance = {
  startingCapitalUsd: number;
  simulatedEquityUsd: number;
  realizedPnlUsd: number;
  unrealizedPnlUsd: number;
  totalPnlUsd: number;
  totalReturnPct: number;
  closedPositionsCount: number;
  openPositionsCount: number;
  winRatePct: number;
  avgWinUsd: number | null;
  avgLossUsd: number | null;
  profitFactor: number | null;
  maxDrawdownUsd: number;
  maxDrawdownPct: number;
  currentDrawdownUsd: number;
  currentDrawdownPct: number;
  bestTrade: TradeHighlight | null;
  worstTrade: TradeHighlight | null;
  exposureUsagePct: number;
  dailyLossUsagePct: number;
  weeklyLossUsagePct: number;
  strategyHealth: StrategyHealth;
  advisorRecommendation: AdvisorRecommendationAction;
  advisorExplanation: string;
  /** Always true. Strategy Performance Review is read-only analytics over paper data — it never grants a real-execution capability. */
  realExecutionLocked: true;
};

export type StrategyPerformanceInput = {
  baseCapitalUsd: number;
  closedPositions: ClosedTradeInput[];
  openPositionsCount: number;
  unrealizedPnlUsd: number;
  openExposureUsd: number;
  dailyRealizedPnlUsd: number;
  weeklyRealizedPnlUsd: number;
  /** Existing Level 1 risk-limit health from computePortfolioSummary() (portfolio-summary.ts) — the starting point for the broader performance-level health below. */
  riskHealth: StrategyHealth;
  maxDailyLossUsd?: number;
  maxWeeklyLossUsd?: number;
  maxSimulatedExposureRatio?: number;
  nowIso?: string;
};

/** Aggregates every Strategy Performance Review metric from paper-trading data already on hand. Pure function — no I/O, paper-only, never unlocks real execution. */
export function computeStrategyPerformance(input: StrategyPerformanceInput): StrategyPerformance {
  const maxDailyLossUsd = input.maxDailyLossUsd ?? MAX_DAILY_SIMULATED_LOSS_USD;
  const maxWeeklyLossUsd = input.maxWeeklyLossUsd ?? MAX_WEEKLY_SIMULATED_LOSS_USD;
  const maxSimulatedExposureRatio = input.maxSimulatedExposureRatio ?? MAX_SIMULATED_EXPOSURE_RATIO;
  const nowIso = input.nowIso ?? new Date().toISOString();

  const realizedPnlUsd = input.closedPositions.reduce((sum, p) => sum + p.realizedPnlUsd, 0);
  const totalPnlUsd = realizedPnlUsd + input.unrealizedPnlUsd;
  const simulatedEquityUsd = input.baseCapitalUsd + totalPnlUsd;
  const totalReturnPct = input.baseCapitalUsd > 0 ? (totalPnlUsd / input.baseCapitalUsd) * 100 : 0;

  const equityCurve = buildEquityCurve(input.baseCapitalUsd, input.closedPositions, input.unrealizedPnlUsd, nowIso);
  const maxDrawdown = computeMaxDrawdown(equityCurve);
  const currentDrawdown = computeCurrentDrawdown(equityCurve);

  const profitFactor = computeProfitFactor(input.closedPositions);

  const strategyHealth = classifyStrategyHealth({ riskHealth: input.riskHealth, currentDrawdownPct: currentDrawdown.pct });
  const advisorRecommendation = recommendAdvisorAction({ strategyHealth, closedPositionsCount: input.closedPositions.length, profitFactor });

  const maxExposureUsd = input.baseCapitalUsd * maxSimulatedExposureRatio;
  const exposureUsagePct = maxExposureUsd > 0 ? (input.openExposureUsd / maxExposureUsd) * 100 : 0;
  const dailyLossUsagePct = maxDailyLossUsd > 0 ? (Math.max(0, -input.dailyRealizedPnlUsd) / maxDailyLossUsd) * 100 : 0;
  const weeklyLossUsagePct = maxWeeklyLossUsd > 0 ? (Math.max(0, -input.weeklyRealizedPnlUsd) / maxWeeklyLossUsd) * 100 : 0;

  const advisorExplanation = buildAdvisorExplanation({
    strategyHealth,
    advisorRecommendation,
    closedPositionsCount: input.closedPositions.length,
    totalReturnPct,
    profitFactor,
    currentDrawdownPct: currentDrawdown.pct,
    weeklyLossUsagePct,
  });

  return {
    startingCapitalUsd: input.baseCapitalUsd,
    simulatedEquityUsd,
    realizedPnlUsd,
    unrealizedPnlUsd: input.unrealizedPnlUsd,
    totalPnlUsd,
    totalReturnPct,
    closedPositionsCount: input.closedPositions.length,
    openPositionsCount: input.openPositionsCount,
    winRatePct: computeWinRate(input.closedPositions),
    avgWinUsd: computeAvgWin(input.closedPositions),
    avgLossUsd: computeAvgLoss(input.closedPositions),
    profitFactor,
    maxDrawdownUsd: maxDrawdown.usd,
    maxDrawdownPct: maxDrawdown.pct,
    currentDrawdownUsd: currentDrawdown.usd,
    currentDrawdownPct: currentDrawdown.pct,
    bestTrade: bestTrade(input.closedPositions),
    worstTrade: worstTrade(input.closedPositions),
    exposureUsagePct,
    dailyLossUsagePct,
    weeklyLossUsagePct,
    strategyHealth,
    advisorRecommendation,
    advisorExplanation,
    realExecutionLocked: REAL_EXECUTION_LOCKED,
  };
}
