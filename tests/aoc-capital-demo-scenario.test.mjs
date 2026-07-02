// ─── AOC Capital Demo Strategy Sandbox — Scenario Plan — Tests ─────────────────
// Pure-function tests; no Supabase / live database / network calls required.
// Replays the scripted plan against the real risk policy engine (the same
// evaluateTradeIntent() the SQL RPC mirrors) to prove the "coherent story" is
// only coherent because it fits inside the real Level 1 ceilings — not
// because anything about governance is bypassed.

import { test } from "node:test";
import assert from "node:assert/strict";

const { buildDemoScenarioPlan, DEMO_INTAKE } = await import("../src/lib/demo/scenario.ts");
const { runAdvisorRecommendation } = await import("../src/lib/advisor/advisor-engine.ts");
const { evaluateTradeIntent } = await import("../src/lib/trading/risk-policy-engine.ts");
const { getSimulatedPrice } = await import("../src/lib/trading/mock-price-generator.ts");

const NOW = new Date("2026-07-02T15:00:00Z");

test("DEMO_INTAKE maps to a growth risk profile with a $5,000 recommended base capital", () => {
  const recommendation = runAdvisorRecommendation(DEMO_INTAKE);
  assert.equal(recommendation.riskProfile, "growth");
  assert.equal(recommendation.capitalRecommendation.recommendedBaseCapitalUsd, 5000);
});

test("buildDemoScenarioPlan is deterministic within the same UTC hour bucket", () => {
  const first = buildDemoScenarioPlan(NOW);
  const second = buildDemoScenarioPlan(new Date("2026-07-02T15:59:00Z"));
  assert.deepEqual(first, second);
});

test("buildDemoScenarioPlan produces a different plan for a different hour bucket", () => {
  const first = buildDemoScenarioPlan(NOW);
  const later = buildDemoScenarioPlan(new Date("2026-07-02T19:00:00Z"));
  assert.notDeepEqual(first, later);
});

test("the plan's action order is submit x3, submit (rejected), close x2, submit", () => {
  const plan = buildDemoScenarioPlan(NOW);
  assert.deepEqual(
    plan.map((action) => (action.kind === "submit_intent" ? `submit:${action.step.id}` : `close:${action.close.refId}`)),
    ["submit:btc_signal_win", "submit:eth_signal_hold", "submit:sol_manual_loss", "submit:aapl_overleveraged_rejected", "close:btc_signal_win", "close:sol_manual_loss", "submit:aapl_manual_hold"]
  );
});

/** Replays the plan against the real risk policy engine, mirroring what evaluate_and_record_trade_intent() does. */
function replayPlan(plan) {
  const state = { baseCapitalUsd: 5000, currentExposureUsd: 0, openPositionCount: 0, dailyPnlUsd: 0, weeklyPnlUsd: 0 };
  const openBySymbolStepId = new Map();
  const decisions = [];

  for (const action of plan) {
    if (action.kind === "submit_intent") {
      const step = action.step;
      const evaluation = evaluateTradeIntent(
        { symbol: step.symbol, side: step.side, quantity: step.quantity, notionalUsd: step.notionalUsd, leverage: step.leverage },
        state
      );
      decisions.push({ id: step.id, evaluation });
      if (evaluation.verdict === "approved") {
        const entryPriceUsd = step.notionalUsd / step.quantity;
        state.currentExposureUsd += step.notionalUsd;
        state.openPositionCount += 1;
        openBySymbolStepId.set(step.id, { entryPriceUsd, notionalUsd: step.notionalUsd, quantity: step.quantity });
      }
      continue;
    }

    const open = openBySymbolStepId.get(action.close.refId);
    if (!open) continue;
    // Close price is the same simulated price the entry was steered against —
    // replicated here via the plan's own construction (entry = simPrice * factor).
    state.currentExposureUsd -= open.notionalUsd;
    state.openPositionCount -= 1;
    openBySymbolStepId.delete(action.close.refId);
  }

  return decisions;
}

test("the scripted plan is approved for the three initial opens and the final AAPL open, and rejected only for the over-leveraged attempt", () => {
  const plan = buildDemoScenarioPlan(NOW);
  const decisions = replayPlan(plan);

  const verdictById = new Map(decisions.map((d) => [d.id, d.evaluation.verdict]));
  assert.equal(verdictById.get("btc_signal_win"), "approved");
  assert.equal(verdictById.get("eth_signal_hold"), "approved");
  assert.equal(verdictById.get("sol_manual_loss"), "approved");
  assert.equal(verdictById.get("aapl_overleveraged_rejected"), "rejected");
  assert.equal(verdictById.get("aapl_manual_hold"), "approved");
});

test("the over-leveraged AAPL attempt is rejected on both no_leverage and max_open_positions simultaneously", () => {
  const plan = buildDemoScenarioPlan(NOW);
  const decisions = replayPlan(plan);
  const rejected = decisions.find((d) => d.id === "aapl_overleveraged_rejected");

  const failing = rejected.evaluation.reasons.filter((r) => !r.passed).map((r) => r.ruleKey);
  assert.ok(failing.includes("no_leverage"));
  assert.ok(failing.includes("max_open_positions"));
});

test("every submitted intent stays within the real Level 1 exposure ceiling (60% of base capital)", () => {
  const plan = buildDemoScenarioPlan(NOW);
  for (const action of plan) {
    if (action.kind !== "submit_intent") continue;
    assert.ok(action.step.notionalUsd > 0);
    assert.ok(action.step.quantity > 0);
    assert.ok(action.step.notionalUsd <= 5000 * 0.6);
  }
});

test("closing BTC-USD and SOL-USD at the same-bucket simulated price realizes a win and a loss respectively", () => {
  const plan = buildDemoScenarioPlan(NOW);
  const btc = plan.find((a) => a.kind === "submit_intent" && a.step.id === "btc_signal_win").step;
  const sol = plan.find((a) => a.kind === "submit_intent" && a.step.id === "sol_manual_loss").step;

  const btcEntryPrice = btc.notionalUsd / btc.quantity;
  const solEntryPrice = sol.notionalUsd / sol.quantity;
  const btcClosePrice = getSimulatedPrice("BTC-USD", NOW);
  const solClosePrice = getSimulatedPrice("SOL-USD", NOW);

  const btcRealizedPnlUsd = (btcClosePrice - btcEntryPrice) * btc.quantity;
  const solRealizedPnlUsd = (solClosePrice - solEntryPrice) * sol.quantity;

  assert.ok(btcRealizedPnlUsd > 0, `expected BTC-USD to realize a gain, got ${btcRealizedPnlUsd}`);
  assert.ok(solRealizedPnlUsd < 0, `expected SOL-USD to realize a loss, got ${solRealizedPnlUsd}`);
  // Both stay comfortably inside the real $20 daily / $40 weekly loss ceiling.
  assert.ok(btcRealizedPnlUsd + solRealizedPnlUsd > -20);
});
