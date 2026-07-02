// ─── AOC Capital — Portfolio Summary Calculation — Tests ───────────────────────
// Pure-function tests; no Supabase / live database required.

import { test } from "node:test";
import assert from "node:assert/strict";

const { computePortfolioSummary, DEFAULT_PORTFOLIO_SUMMARY_LIMITS } = await import("../src/lib/trading/portfolio-summary.ts");

const LIMITS = { maxDailyLossUsd: 20, maxWeeklyLossUsd: 40, maxSimulatedExposureRatio: 0.6, maxOpenPositions: 3 };

const baseInput = () => ({
  baseCapitalUsd: 1000,
  openExposureUsd: 0,
  unrealizedPnlUsd: 0,
  realizedPnlUsd: 0,
  dailyRealizedPnlUsd: 0,
  weeklyRealizedPnlUsd: 0,
  openPositionsCount: 0,
});

test("exposure summary is calculated correctly", () => {
  const summary = computePortfolioSummary({ ...baseInput(), openExposureUsd: 300 }, LIMITS);
  assert.equal(summary.openExposureUsd, 300);
  assert.equal(summary.openExposurePct, 30);
});

test("total simulated equity is base capital plus realized plus unrealized P&L", () => {
  const summary = computePortfolioSummary({ ...baseInput(), realizedPnlUsd: 50, unrealizedPnlUsd: -10 }, LIMITS);
  assert.equal(summary.totalPnlUsd, 40);
  assert.equal(summary.simulatedEquityUsd, 1040);
  assert.equal(summary.totalPnlPct, 4);
});

test("simulated cash is base capital minus open exposure plus all-time realized P&L", () => {
  const summary = computePortfolioSummary({ ...baseInput(), openExposureUsd: 200, realizedPnlUsd: 30 }, LIMITS);
  assert.equal(summary.simulatedCashUsd, 1000 - 200 + 30);
});

test("daily loss remaining is calculated correctly", () => {
  const summary = computePortfolioSummary({ ...baseInput(), dailyRealizedPnlUsd: -8 }, LIMITS);
  assert.equal(summary.dailyLossRemainingUsd, 12);
});

test("weekly loss remaining is calculated correctly", () => {
  const summary = computePortfolioSummary({ ...baseInput(), weeklyRealizedPnlUsd: -18 }, LIMITS);
  assert.equal(summary.weeklyLossRemainingUsd, 22);
});

test("a profitable day does not reduce loss-remaining below the full limit", () => {
  const summary = computePortfolioSummary({ ...baseInput(), dailyRealizedPnlUsd: 15 }, LIMITS);
  assert.equal(summary.dailyLossRemainingUsd, 20);
});

test("strategy health is healthy when well within all limits", () => {
  const summary = computePortfolioSummary({ ...baseInput(), openExposureUsd: 100, dailyRealizedPnlUsd: -2, weeklyRealizedPnlUsd: -5 }, LIMITS);
  assert.equal(summary.strategyHealth, "healthy");
});

test("strategy health is caution once daily loss usage reaches 50%", () => {
  const summary = computePortfolioSummary({ ...baseInput(), dailyRealizedPnlUsd: -10 }, LIMITS); // 10/20 = 50%
  assert.equal(summary.strategyHealth, "caution");
});

test("strategy health is caution once weekly loss usage reaches 50%", () => {
  const summary = computePortfolioSummary({ ...baseInput(), weeklyRealizedPnlUsd: -20 }, LIMITS); // 20/40 = 50%
  assert.equal(summary.strategyHealth, "caution");
});

test("strategy health is caution once exposure usage reaches 80% of the exposure limit", () => {
  // 80% of the 60% exposure ratio limit = 48% of base capital
  const summary = computePortfolioSummary({ ...baseInput(), openExposureUsd: 480 }, LIMITS);
  assert.equal(summary.strategyHealth, "caution");
});

test("strategy health is breached once the daily loss limit is fully used", () => {
  const summary = computePortfolioSummary({ ...baseInput(), dailyRealizedPnlUsd: -20 }, LIMITS);
  assert.equal(summary.strategyHealth, "breached");
});

test("strategy health is breached once the weekly loss limit is fully used", () => {
  const summary = computePortfolioSummary({ ...baseInput(), weeklyRealizedPnlUsd: -40 }, LIMITS);
  assert.equal(summary.strategyHealth, "breached");
});

test("strategy health is breached once exposure hits the 60% exposure limit", () => {
  const summary = computePortfolioSummary({ ...baseInput(), openExposureUsd: 600 }, LIMITS);
  assert.equal(summary.strategyHealth, "breached");
});

test("strategy health is breached once open position count reaches the max", () => {
  const summary = computePortfolioSummary({ ...baseInput(), openPositionsCount: 3 }, LIMITS);
  assert.equal(summary.strategyHealth, "breached");
});

test("default limits are wired to the Level 1 risk policy constants", () => {
  assert.equal(DEFAULT_PORTFOLIO_SUMMARY_LIMITS.maxDailyLossUsd, 20);
  assert.equal(DEFAULT_PORTFOLIO_SUMMARY_LIMITS.maxWeeklyLossUsd, 40);
  assert.equal(DEFAULT_PORTFOLIO_SUMMARY_LIMITS.maxSimulatedExposureRatio, 0.6);
  assert.equal(DEFAULT_PORTFOLIO_SUMMARY_LIMITS.maxOpenPositions, 3);
});
