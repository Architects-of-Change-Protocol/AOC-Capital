// ─── AOC Capital Advisor — Initial Risk Constitution — Tests ───────────────────
// Verifies that the advisor-generated constitution is never looser than the
// Level 1 ceiling enforced by risk-policy-engine.ts. Pure-function tests; no
// Supabase / live database required.

import { test } from "node:test";
import assert from "node:assert/strict";

const { generateInitialRiskConstitution } = await import("../src/lib/advisor/constitution.ts");
const {
  MAX_SIMULATED_EXPOSURE_RATIO,
  MAX_DAILY_SIMULATED_LOSS_USD,
  MAX_WEEKLY_SIMULATED_LOSS_USD,
  MAX_OPEN_POSITIONS,
} = await import("../src/lib/trading/risk-policy-engine.ts");

const RISK_PROFILES = ["conservative", "balanced", "growth", "aggressive"];

function ruleFor(constitution, ruleKey) {
  const rule = constitution.find((r) => r.rule_key === ruleKey);
  assert.ok(rule, `expected a rule for ${ruleKey}`);
  return rule;
}

test("no_leverage and no_real_shorts are never relaxed by risk profile", () => {
  for (const riskProfile of RISK_PROFILES) {
    const constitution = generateInitialRiskConstitution(riskProfile);
    assert.equal(ruleFor(constitution, "no_leverage").limit_value, 1);
    assert.equal(ruleFor(constitution, "no_real_shorts").limit_value, null);
  }
});

test("max_simulated_exposure never exceeds the Level 1 ceiling for any risk profile", () => {
  for (const riskProfile of RISK_PROFILES) {
    const constitution = generateInitialRiskConstitution(riskProfile);
    const rule = ruleFor(constitution, "max_simulated_exposure");
    assert.ok(rule.limit_value <= MAX_SIMULATED_EXPOSURE_RATIO);
    assert.ok(rule.limit_value > 0);
  }
});

test("max_daily_simulated_loss never exceeds the Level 1 ceiling for any risk profile", () => {
  for (const riskProfile of RISK_PROFILES) {
    const constitution = generateInitialRiskConstitution(riskProfile);
    const rule = ruleFor(constitution, "max_daily_simulated_loss");
    assert.ok(rule.limit_value <= MAX_DAILY_SIMULATED_LOSS_USD);
    assert.ok(rule.limit_value > 0);
  }
});

test("max_weekly_simulated_loss never exceeds the Level 1 ceiling for any risk profile", () => {
  for (const riskProfile of RISK_PROFILES) {
    const constitution = generateInitialRiskConstitution(riskProfile);
    const rule = ruleFor(constitution, "max_weekly_simulated_loss");
    assert.ok(rule.limit_value <= MAX_WEEKLY_SIMULATED_LOSS_USD);
    assert.ok(rule.limit_value > 0);
  }
});

test("max_open_positions never exceeds the Level 1 ceiling and is always at least 1", () => {
  for (const riskProfile of RISK_PROFILES) {
    const constitution = generateInitialRiskConstitution(riskProfile);
    const rule = ruleFor(constitution, "max_open_positions");
    assert.ok(rule.limit_value <= MAX_OPEN_POSITIONS);
    assert.ok(rule.limit_value >= 1);
  }
});

test("the most conservative profile is at least as strict as the most aggressive profile on every numeric rule", () => {
  const conservative = generateInitialRiskConstitution("conservative");
  const aggressive = generateInitialRiskConstitution("aggressive");

  for (const ruleKey of ["max_simulated_exposure", "max_daily_simulated_loss", "max_weekly_simulated_loss", "max_open_positions"]) {
    const conservativeLimit = ruleFor(conservative, ruleKey).limit_value;
    const aggressiveLimit = ruleFor(aggressive, ruleKey).limit_value;
    assert.ok(conservativeLimit <= aggressiveLimit, `${ruleKey}: expected conservative (${conservativeLimit}) <= aggressive (${aggressiveLimit})`);
  }
});

test("the aggressive profile matches the Level 1 ceiling exactly", () => {
  const constitution = generateInitialRiskConstitution("aggressive");
  assert.equal(ruleFor(constitution, "max_simulated_exposure").limit_value, MAX_SIMULATED_EXPOSURE_RATIO);
  assert.equal(ruleFor(constitution, "max_daily_simulated_loss").limit_value, MAX_DAILY_SIMULATED_LOSS_USD);
  assert.equal(ruleFor(constitution, "max_weekly_simulated_loss").limit_value, MAX_WEEKLY_SIMULATED_LOSS_USD);
  assert.equal(ruleFor(constitution, "max_open_positions").limit_value, MAX_OPEN_POSITIONS);
});

test("mandatory_policy_evaluation and mandatory_audit_ledger are always present", () => {
  for (const riskProfile of RISK_PROFILES) {
    const constitution = generateInitialRiskConstitution(riskProfile);
    assert.ok(constitution.some((r) => r.rule_key === "mandatory_policy_evaluation"));
    assert.ok(constitution.some((r) => r.rule_key === "mandatory_audit_ledger"));
  }
});
