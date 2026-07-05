// ─── AOC Capital — Investor Constitution Intake — Domain Mapping Tests ──────
// Pure-function tests over the deterministic intake → InvestorConstitution
// mapping. No Supabase / network / LLM calls — the same answers must always
// produce the same constitution.

import { test } from "node:test";
import assert from "node:assert/strict";

const { buildInvestorConstitutionFromIntake } = await import("../src/features/capital/domain/investor-constitution-intake.ts");

function baseAnswers(overrides = {}) {
  return {
    purpose: "grow_wealth_long_term",
    horizon: "5_10y",
    emergencyReserve: "3_6m",
    nearTermNeed: "no",
    riskCapacity: "uncomfortable_manageable",
    emotionalReaction: "wait_but_check_daily",
    fomo: "research_first",
    spendingCurrency: "USD",
    measurementCurrency: "USD",
    concentration: "diversified",
    complexity: "etfs_and_known_stocks",
    summary: "accept_ups_downs_if_plan_makes_sense",
    ...overrides,
  };
}

function build(overrides = {}) {
  return buildInvestorConstitutionFromIntake(baseAnswers(overrides), {
    constitutionId: "constitution-test",
    createdAt: "2026-01-01T00:00:00.000Z",
  });
}

// ─── Objective ───────────────────────────────────────────────────────────────

test("protecting existing money maps to capital_preservation", () => {
  const constitution = build({ purpose: "protect_existing_money" });
  assert.equal(constitution.investorObjective, "capital_preservation");
});

test("long-term wealth growth maps to wealth_growth", () => {
  const constitution = build({ purpose: "grow_wealth_long_term" });
  assert.equal(constitution.investorObjective, "wealth_growth");
});

// ─── Horizon ─────────────────────────────────────────────────────────────────

test("less than 1 year maps to less_than_1y", () => {
  const constitution = build({ horizon: "less_than_1y" });
  assert.equal(constitution.timeHorizon, "less_than_1y");
});

// ─── Emergency reserve ───────────────────────────────────────────────────────

test("emergency reserve under 1 month maps to 0_1", () => {
  const constitution = build({ emergencyReserve: "less_than_1m" });
  assert.equal(constitution.emergencyReserveMonths, "0_1");
});

// ─── Liquidity ───────────────────────────────────────────────────────────────

test("near-term need 'probably yes' maps to critical liquidity", () => {
  const constitution = build({ nearTermNeed: "probably_yes" });
  assert.equal(constitution.liquidityRequirement, "critical");
});

// ─── Risk capacity ───────────────────────────────────────────────────────────

test("a 20% drop that would be very serious for real life maps to low riskCapacity", () => {
  const constitution = build({ riskCapacity: "very_serious" });
  assert.equal(constitution.riskCapacity, "low");
});

// ─── Risk tolerance ──────────────────────────────────────────────────────────

test("a panic-driven reaction maps to low riskTolerance", () => {
  const constitution = build({ emotionalReaction: "close_positions" });
  assert.equal(constitution.riskTolerance, "low");
});

test("'I would add exposure' maps to high riskTolerance", () => {
  const constitution = build({ emotionalReaction: "increase_exposure" });
  assert.equal(constitution.riskTolerance, "high");
});

// ─── Knowledge / complexity ──────────────────────────────────────────────────

test("a basic complexity answer sets financialKnowledge to basic", () => {
  const constitution = build({ complexity: "cash_or_broad_etfs" });
  assert.equal(constitution.financialKnowledge, "basic");
});

test("'No sé bien la diferencia' prohibits options, leverage, margin, short_selling, and defi", () => {
  const constitution = build({ complexity: "not_sure_difference" });
  assert.equal(constitution.financialKnowledge, "basic");
  assert.equal(constitution.complexityAllowed, "simple");
  for (const instrument of ["options", "leverage", "margin", "short_selling", "defi"]) {
    assert.ok(constitution.prohibitedInstruments.includes(instrument), `expected ${instrument} to be prohibited`);
  }
});

// ─── Currency ────────────────────────────────────────────────────────────────

test("CRC spending maps spendingCurrency to CRC", () => {
  const constitution = build({ spendingCurrency: "CRC" });
  assert.equal(constitution.spendingCurrency, "CRC");
});

test("USD measurement currency maps baseCurrency to USD", () => {
  const constitution = build({ measurementCurrency: "USD" });
  assert.equal(constitution.baseCurrency, "USD");
});

test("an unconsidered measurement currency defaults baseCurrency to the spending currency", () => {
  const constitution = build({ spendingCurrency: "CRC", measurementCurrency: "not_considered" });
  assert.equal(constitution.baseCurrency, "CRC");
});

// ─── Paper-only / safety invariants ─────────────────────────────────────────

test("all generated constitutions have paperTradingOnly true", () => {
  for (const purpose of ["protect_existing_money", "grow_wealth_long_term", "generate_income", "save_for_specific_goal", "learn_and_simulate", "test_aggressive_strategies", "not_sure"]) {
    const constitution = build({ purpose });
    assert.equal(constitution.paperTradingOnly, true);
  }
});

test("riskCapacity low forces maxCryptoExposurePct to 0", () => {
  const constitution = build({ riskCapacity: "very_serious", complexity: "small_crypto_component" });
  assert.equal(constitution.riskCapacity, "low");
  assert.equal(constitution.maxCryptoExposurePct, 0);
});

test("critical liquidity forces requiresHumanReview true", () => {
  const constitution = build({ nearTermNeed: "probably_yes" });
  assert.equal(constitution.liquidityRequirement, "critical");
  assert.equal(constitution.requiresHumanReview, true);
});

// ─── Additional determinism / conservative-default coverage ────────────────

test("the mapping is deterministic — the same answers always produce the same constitution fields", () => {
  const a = build();
  const b = build();
  assert.deepEqual({ ...a, constitutionId: undefined }, { ...b, constitutionId: undefined });
});

test("basic financial knowledge always caps crypto exposure at 0", () => {
  for (const complexity of ["cash_or_broad_etfs", "not_sure_difference"]) {
    const constitution = build({ complexity });
    assert.equal(constitution.financialKnowledge, "basic");
    assert.equal(constitution.maxCryptoExposurePct, 0);
  }
});

test("intermediate knowledge with an explicitly selected small crypto component allows a small, non-zero crypto exposure", () => {
  const constitution = build({ complexity: "small_crypto_component", riskCapacity: "no_real_impact", emotionalReaction: "increase_exposure" });
  assert.equal(constitution.financialKnowledge, "intermediate");
  assert.ok(constitution.maxCryptoExposurePct > 0);
});

test("concentration in a single asset tightens exposure limits to the conservative defaults", () => {
  const concentrated = build({ concentration: "single_stock" });
  assert.equal(concentrated.maxSingleAssetExposurePct, 10);
  assert.equal(concentrated.maxSectorExposurePct, 25);
});

test("existing concentration in crypto forces maxCryptoExposurePct to 0", () => {
  const constitution = build({ concentration: "crypto", complexity: "small_crypto_component" });
  assert.equal(constitution.maxCryptoExposurePct, 0);
});

test("an uncertain answer anywhere in the questionnaire keeps requiresHumanReview true", () => {
  const constitution = build({ purpose: "not_sure" });
  assert.equal(constitution.requiresHumanReview, true);
});

test("a confident, low-uncertainty questionnaire with no critical liquidity can turn off requiresHumanReview", () => {
  const constitution = build();
  assert.equal(constitution.requiresHumanReview, false);
});

test("version is 0.1-era (numeric 1) and paperTradingOnly/createdAt/updatedAt are always present", () => {
  const constitution = build();
  assert.equal(constitution.version, 1);
  assert.equal(constitution.paperTradingOnly, true);
  assert.ok(constitution.createdAt);
  assert.ok(constitution.updatedAt);
});
