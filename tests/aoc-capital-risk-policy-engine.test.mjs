// ─── AOC Capital — Level 1 Risk Policy Engine — Tests ──────────────────────────
// Pure-function tests; no Supabase / live database required.

import { test } from "node:test";
import assert from "node:assert/strict";

const { evaluateTradeIntent, MAX_OPEN_POSITIONS, MAX_SIMULATED_EXPOSURE_RATIO, MAX_DAILY_SIMULATED_LOSS_USD, MAX_WEEKLY_SIMULATED_LOSS_USD } = await import(
  "../src/lib/trading/risk-policy-engine.ts"
);

const baseState = () => ({
  baseCapitalUsd: 1000,
  currentExposureUsd: 0,
  openPositionCount: 0,
  dailyPnlUsd: 0,
  weeklyPnlUsd: 0,
});

const baseIntent = () => ({ symbol: "BTC-USD", side: "buy", quantity: 1, notionalUsd: 100, leverage: 1 });

test("a valid trade intent within all Level 1 limits is approved", () => {
  const result = evaluateTradeIntent(baseIntent(), baseState());
  assert.equal(result.verdict, "approved");
  assert.ok(result.reasons.every((r) => r.passed));
  assert.equal(result.policyVersion, "level-1");
});

test("leveraged trade intents are rejected (no leverage)", () => {
  const result = evaluateTradeIntent({ ...baseIntent(), leverage: 2 }, baseState());
  assert.equal(result.verdict, "rejected");
  const rule = result.reasons.find((r) => r.ruleKey === "no_leverage");
  assert.equal(rule.passed, false);
});

test("short-side trade intents are rejected (no real shorts)", () => {
  const result = evaluateTradeIntent({ ...baseIntent(), side: "sell" }, baseState());
  assert.equal(result.verdict, "rejected");
  const rule = result.reasons.find((r) => r.ruleKey === "no_real_shorts");
  assert.equal(rule.passed, false);
});

test("trade intents that would exceed 60% simulated exposure are rejected", () => {
  const state = { ...baseState(), currentExposureUsd: 550 };
  const result = evaluateTradeIntent({ ...baseIntent(), notionalUsd: 100 }, state);
  assert.equal((550 + 100) / 1000 > MAX_SIMULATED_EXPOSURE_RATIO, true);
  assert.equal(result.verdict, "rejected");
  const rule = result.reasons.find((r) => r.ruleKey === "max_simulated_exposure");
  assert.equal(rule.passed, false);
});

test("trade intents exactly at the 60% exposure boundary are approved", () => {
  const state = { ...baseState(), currentExposureUsd: 500 };
  const result = evaluateTradeIntent({ ...baseIntent(), notionalUsd: 100 }, state);
  assert.equal((500 + 100) / 1000, MAX_SIMULATED_EXPOSURE_RATIO);
  const rule = result.reasons.find((r) => r.ruleKey === "max_simulated_exposure");
  assert.equal(rule.passed, true);
});

test("new trade intents are rejected once daily simulated loss hits the $20 limit", () => {
  const state = { ...baseState(), dailyPnlUsd: -MAX_DAILY_SIMULATED_LOSS_USD };
  const result = evaluateTradeIntent(baseIntent(), state);
  assert.equal(result.verdict, "rejected");
  const rule = result.reasons.find((r) => r.ruleKey === "max_daily_simulated_loss");
  assert.equal(rule.passed, false);
});

test("new trade intents are rejected once weekly simulated loss hits the $40 limit", () => {
  const state = { ...baseState(), weeklyPnlUsd: -MAX_WEEKLY_SIMULATED_LOSS_USD };
  const result = evaluateTradeIntent(baseIntent(), state);
  assert.equal(result.verdict, "rejected");
  const rule = result.reasons.find((r) => r.ruleKey === "max_weekly_simulated_loss");
  assert.equal(rule.passed, false);
});

test("trade intents are rejected once the portfolio already holds the max open positions", () => {
  const state = { ...baseState(), openPositionCount: MAX_OPEN_POSITIONS };
  const result = evaluateTradeIntent(baseIntent(), state);
  assert.equal(result.verdict, "rejected");
  const rule = result.reasons.find((r) => r.ruleKey === "max_open_positions");
  assert.equal(rule.passed, false);
});

test("every rule is checked regardless of earlier failures (no short-circuiting)", () => {
  const state = { ...baseState(), openPositionCount: MAX_OPEN_POSITIONS, dailyPnlUsd: -MAX_DAILY_SIMULATED_LOSS_USD };
  const result = evaluateTradeIntent({ ...baseIntent(), leverage: 3, side: "sell" }, state);
  assert.equal(result.reasons.length, 6);
  const failedRuleKeys = result.reasons.filter((r) => !r.passed).map((r) => r.ruleKey);
  assert.deepEqual(
    failedRuleKeys.sort(),
    ["max_daily_simulated_loss", "max_open_positions", "no_leverage", "no_real_shorts"].sort()
  );
});
