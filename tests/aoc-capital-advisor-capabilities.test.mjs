// ─── AOC Capital Advisor — Capability Derivation — Tests ───────────────────────
// Verifies that no combination of advisor answers ever enables a real-execution
// capability. Pure-function tests; no Supabase / live database required.

import { test } from "node:test";
import assert from "node:assert/strict";

const { deriveCapabilities, ALWAYS_BLOCKED_CAPABILITIES } = await import("../src/lib/advisor/capabilities.ts");

const REAL_EXECUTION_PATTERN = /real_exec|broker|live_order|withdrawal|api_key|gated_real/i;

const baseIntake = () => ({
  startingCapitalUsd: 1000,
  primaryObjective: "balanced_growth",
  timeHorizon: "medium_term",
  riskAppetite: "moderate",
  maxTolerableDrawdownPct: 15,
  preferredMarkets: ["crypto"],
  autonomyLevel: "assisted",
  tradingMode: "recommendations_only",
  wantsGatedRealExecution: false,
});

test("every ALWAYS_BLOCKED_CAPABILITIES entry is present in blocked, never in allowed", () => {
  const { allowed, blocked } = deriveCapabilities(baseIntake());
  for (const capability of ALWAYS_BLOCKED_CAPABILITIES) {
    assert.ok(blocked.includes(capability));
    assert.ok(!allowed.includes(capability));
  }
});

test("no real-execution capability is ever allowed, even at maximum autonomy and automation", () => {
  const intake = { ...baseIntake(), autonomyLevel: "full_auto", tradingMode: "paper_trading_automation", wantsGatedRealExecution: true };
  const { allowed } = deriveCapabilities(intake);
  for (const capability of allowed) {
    assert.doesNotMatch(capability, REAL_EXECUTION_PATTERN, `unexpected real-execution-shaped capability in allowed list: ${capability}`);
  }
});

test("requesting gated real execution records the preference as blocked, not allowed", () => {
  const withRequest = deriveCapabilities({ ...baseIntake(), wantsGatedRealExecution: true });
  assert.ok(withRequest.blocked.some((c) => c.includes("gated_real_execution")));
  assert.ok(!withRequest.allowed.some((c) => c.includes("gated_real_execution")));
});

test("across every autonomy/tradingMode/gated-execution combination, allowed never contains a real-execution capability", () => {
  const autonomyLevels = ["manual_approval", "assisted", "full_auto"];
  const tradingModes = ["recommendations_only", "paper_trading_automation"];
  const gatedOptions = [true, false];

  for (const autonomyLevel of autonomyLevels) {
    for (const tradingMode of tradingModes) {
      for (const wantsGatedRealExecution of gatedOptions) {
        const { allowed } = deriveCapabilities({ ...baseIntake(), autonomyLevel, tradingMode, wantsGatedRealExecution });
        assert.equal(
          allowed.some((c) => REAL_EXECUTION_PATTERN.test(c)),
          false,
          `combo autonomyLevel=${autonomyLevel} tradingMode=${tradingMode} wantsGatedRealExecution=${wantsGatedRealExecution} leaked a real-execution capability`
        );
      }
    }
  }
});

test("recommendations-only mode still gets simulated capabilities and blocks automated submission", () => {
  const { allowed, blocked } = deriveCapabilities({ ...baseIntake(), tradingMode: "recommendations_only" });
  assert.ok(allowed.includes("manual_trade_intent_submission"));
  assert.ok(blocked.includes("automated_trade_submission"));
});
