// Portfolio-level summary calculation for the Capital Command Center. Pure
// function: the orchestration layer (trade-service.ts) queries Supabase for
// the aggregates below and hands them to computePortfolioSummary(), which has
// no I/O and is fully unit-testable.
//
// Open exposure is the *cost basis* (entry notional) of open positions — the
// same figure the Level 1 max_simulated_exposure rule checks against — kept
// separate from unrealized P&L so "how much capital is committed" and "how is
// that capital performing" are distinct numbers. Daily/weekly realized P&L
// only ever reflects *closed* positions over a rolling 24h / rolling 7d
// window; unrealized P&L on still-open positions never feeds loss-limit
// enforcement (see risk-policy-engine.ts and getPortfolioRiskState()).

import {
  MAX_DAILY_SIMULATED_LOSS_USD,
  MAX_OPEN_POSITIONS,
  MAX_SIMULATED_EXPOSURE_RATIO,
  MAX_WEEKLY_SIMULATED_LOSS_USD,
} from "./risk-policy-engine";

export type StrategyHealth = "healthy" | "caution" | "breached";

export type PortfolioSummaryInput = {
  baseCapitalUsd: number;
  /** Sum of entry_notional_usd across open positions (cost basis, not mark-to-market value). */
  openExposureUsd: number;
  /** Sum of unrealized_pnl_usd across open positions. */
  unrealizedPnlUsd: number;
  /** Sum of realized_pnl_usd across ALL closed positions (all-time). */
  realizedPnlUsd: number;
  /** Sum of realized_pnl_usd for positions closed within the trailing 24h. */
  dailyRealizedPnlUsd: number;
  /** Sum of realized_pnl_usd for positions closed within the trailing 7d. */
  weeklyRealizedPnlUsd: number;
  openPositionsCount: number;
};

export type PortfolioSummaryLimits = {
  maxDailyLossUsd: number;
  maxWeeklyLossUsd: number;
  maxSimulatedExposureRatio: number;
  maxOpenPositions: number;
};

export const DEFAULT_PORTFOLIO_SUMMARY_LIMITS: PortfolioSummaryLimits = {
  maxDailyLossUsd: MAX_DAILY_SIMULATED_LOSS_USD,
  maxWeeklyLossUsd: MAX_WEEKLY_SIMULATED_LOSS_USD,
  maxSimulatedExposureRatio: MAX_SIMULATED_EXPOSURE_RATIO,
  maxOpenPositions: MAX_OPEN_POSITIONS,
};

export type PortfolioSummary = {
  baseCapitalUsd: number;
  simulatedCashUsd: number;
  openExposureUsd: number;
  openExposurePct: number;
  realizedPnlUsd: number;
  unrealizedPnlUsd: number;
  totalPnlUsd: number;
  totalPnlPct: number;
  simulatedEquityUsd: number;
  dailyRealizedPnlUsd: number;
  weeklyRealizedPnlUsd: number;
  maxDailyLossUsd: number;
  maxWeeklyLossUsd: number;
  dailyLossRemainingUsd: number;
  weeklyLossRemainingUsd: number;
  openPositionsCount: number;
  maxOpenPositions: number;
  strategyHealth: StrategyHealth;
};

const CAUTION_LOSS_USAGE_RATIO = 0.5;
const CAUTION_EXPOSURE_USAGE_RATIO = 0.8;

export function computePortfolioSummary(input: PortfolioSummaryInput, limits: PortfolioSummaryLimits = DEFAULT_PORTFOLIO_SUMMARY_LIMITS): PortfolioSummary {
  const { baseCapitalUsd, openExposureUsd, unrealizedPnlUsd, realizedPnlUsd, dailyRealizedPnlUsd, weeklyRealizedPnlUsd, openPositionsCount } = input;
  const { maxDailyLossUsd, maxWeeklyLossUsd, maxSimulatedExposureRatio, maxOpenPositions } = limits;

  const totalPnlUsd = realizedPnlUsd + unrealizedPnlUsd;
  const simulatedEquityUsd = baseCapitalUsd + totalPnlUsd;
  const simulatedCashUsd = baseCapitalUsd - openExposureUsd + realizedPnlUsd;
  const totalPnlPct = baseCapitalUsd > 0 ? (totalPnlUsd / baseCapitalUsd) * 100 : 0;
  const openExposurePct = baseCapitalUsd > 0 ? (openExposureUsd / baseCapitalUsd) * 100 : 0;

  const dailyLossUsedUsd = Math.max(0, -dailyRealizedPnlUsd);
  const weeklyLossUsedUsd = Math.max(0, -weeklyRealizedPnlUsd);
  const dailyLossRemainingUsd = maxDailyLossUsd - dailyLossUsedUsd;
  const weeklyLossRemainingUsd = maxWeeklyLossUsd - weeklyLossUsedUsd;

  const dailyLossUsageRatio = maxDailyLossUsd > 0 ? dailyLossUsedUsd / maxDailyLossUsd : 0;
  const weeklyLossUsageRatio = maxWeeklyLossUsd > 0 ? weeklyLossUsedUsd / maxWeeklyLossUsd : 0;
  const exposureRatio = baseCapitalUsd > 0 ? openExposureUsd / baseCapitalUsd : 0;
  const exposureUsageRatio = maxSimulatedExposureRatio > 0 ? exposureRatio / maxSimulatedExposureRatio : 0;

  const breached =
    dailyLossUsageRatio >= 1 || weeklyLossUsageRatio >= 1 || exposureUsageRatio >= 1 || openPositionsCount >= maxOpenPositions;
  const caution =
    !breached &&
    (dailyLossUsageRatio >= CAUTION_LOSS_USAGE_RATIO ||
      weeklyLossUsageRatio >= CAUTION_LOSS_USAGE_RATIO ||
      exposureUsageRatio >= CAUTION_EXPOSURE_USAGE_RATIO);

  const strategyHealth: StrategyHealth = breached ? "breached" : caution ? "caution" : "healthy";

  return {
    baseCapitalUsd,
    simulatedCashUsd,
    openExposureUsd,
    openExposurePct,
    realizedPnlUsd,
    unrealizedPnlUsd,
    totalPnlUsd,
    totalPnlPct,
    simulatedEquityUsd,
    dailyRealizedPnlUsd,
    weeklyRealizedPnlUsd,
    maxDailyLossUsd,
    maxWeeklyLossUsd,
    dailyLossRemainingUsd,
    weeklyLossRemainingUsd,
    openPositionsCount,
    maxOpenPositions,
    strategyHealth,
  };
}
