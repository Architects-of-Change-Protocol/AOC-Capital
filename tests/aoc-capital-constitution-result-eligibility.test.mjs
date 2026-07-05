// ─── AOC Capital — Investor Constitution Result & Strategy Eligibility (v0.1)
// — Domain Tests ─────────────────────────────────────────────────────────────
// Pure-function tests over the two new result-page domain helpers:
// buildInvestorConstitutionReading (deterministic AOC Reading copy) and
// buildStrategyEligibilitySummary (Strategy Registry + Suitability
// Consistency Engine grouping). No LLM / network / Supabase calls — mirrors
// the pure-data test pattern in tests/aoc-capital-strategy-playbook-domain.test.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";

const { buildInvestorConstitutionReading } = await import(
  "../src/features/capital/domain/investor-constitution-reading.ts"
);

const { buildStrategyEligibilitySummary } = await import(
  "../src/features/capital/domain/strategy-eligibility-summary.ts"
);

const { evaluateStrategySuitability } = await import("../src/features/capital/domain/suitability-rules.ts");
const { getStrategyById } = await import("../src/features/capital/domain/strategy-registry.ts");

// ─── Test fixtures ───────────────────────────────────────────────────────────

function makeConstitution(overrides = {}) {
  return {
    constitutionId: "constitution-1",
    version: 1,
    investorObjective: "wealth_growth",
    timeHorizon: "5_10y",
    baseCurrency: "USD",
    spendingCurrency: "USD",
    liquidityRequirement: "medium",
    emergencyReserveMonths: "3_6",
    riskTolerance: "medium",
    riskCapacity: "medium",
    financialKnowledge: "advanced",
    complexityAllowed: "advanced",
    hasDependents: false,
    debtLevel: "low",
    maxSingleAssetExposurePct: 100,
    maxCryptoExposurePct: 100,
    maxSectorExposurePct: 100,
    prohibitedInstruments: [],
    preferredReviewFrequency: "annual",
    requiresHumanReview: false,
    paperTradingOnly: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function allStrategyIds(summary) {
  return [
    ...summary.availableForSimulation,
    ...summary.blockedByConstitution,
    ...summary.requiresAdvisorReview,
    ...summary.lockedAdvanced,
    ...summary.deprecatedOrBlocked,
  ].map((card) => card.strategyId);
}

// ─── buildInvestorConstitutionReading ───────────────────────────────────────

test("reading returns a liquidity warning for critical liquidity", () => {
  const insights = buildInvestorConstitutionReading(makeConstitution({ liquidityRequirement: "critical" }));
  assert.ok(insights.some((i) => i.id === "liquidity_critical"));
  assert.ok(insights.some((i) => /restrict aggressive simulations/i.test(i.message)));
});

test("reading detects a gap between high risk tolerance and low risk capacity", () => {
  const insights = buildInvestorConstitutionReading(makeConstitution({ riskTolerance: "high", riskCapacity: "low" }));
  assert.ok(insights.some((i) => i.id === "risk_tolerance_capacity_gap"));
  assert.ok(insights.some((i) => /conservative limits/i.test(i.message)));
});

test("reading does not flag a risk tolerance/capacity gap when tolerance is not high", () => {
  const insights = buildInvestorConstitutionReading(makeConstitution({ riskTolerance: "medium", riskCapacity: "low" }));
  assert.ok(!insights.some((i) => i.id === "risk_tolerance_capacity_gap"));
});

test("reading detects basic financial knowledge and lists the restricted instruments", () => {
  const insights = buildInvestorConstitutionReading(makeConstitution({ financialKnowledge: "basic" }));
  const flag = insights.find((i) => i.id === "basic_knowledge_complexity");
  assert.ok(flag);
  for (const instrument of ["leverage", "margin", "options", "short selling", "DeFi"]) {
    assert.ok(flag.message.includes(instrument), `expected message to mention ${instrument}`);
  }
});

test("reading detects a currency mismatch between spending and base currency", () => {
  const insights = buildInvestorConstitutionReading(makeConstitution({ spendingCurrency: "CRC", baseCurrency: "USD" }));
  const flag = insights.find((i) => i.id === "currency_mismatch");
  assert.ok(flag);
  assert.match(flag.message, /currency exposure/i);
});

test("reading does not flag currency mismatch when spending and base currency match", () => {
  const insights = buildInvestorConstitutionReading(makeConstitution({ spendingCurrency: "USD", baseCurrency: "USD" }));
  assert.ok(!insights.some((i) => i.id === "currency_mismatch"));
});

test("reading detects crypto exposure blocked when max crypto exposure is 0", () => {
  const insights = buildInvestorConstitutionReading(makeConstitution({ maxCryptoExposurePct: 0 }));
  const flag = insights.find((i) => i.id === "crypto_blocked");
  assert.ok(flag);
  assert.match(flag.message, /crypto exposure is blocked/i);
});

test("reading falls back to a baseline insight when no specific trigger applies", () => {
  const insights = buildInvestorConstitutionReading(
    makeConstitution({ maxCryptoExposurePct: 50, spendingCurrency: "USD", baseCurrency: "USD" })
  );
  assert.ok(insights.length >= 1);
  assert.ok(insights.every((i) => typeof i.message === "string" && i.message.length > 0));
});

// ─── buildStrategyEligibilitySummary ────────────────────────────────────────

test("a fully permissive constitution returns available strategies", () => {
  const summary = buildStrategyEligibilitySummary(makeConstitution());
  assert.ok(summary.availableForSimulation.length > 0);
  assert.ok(summary.availableForSimulation.some((c) => c.strategyId === "balanced_core"));
});

test("every strategy in the registry appears in exactly one eligibility bucket", () => {
  const summary = buildStrategyEligibilitySummary(makeConstitution());
  const ids = allStrategyIds(summary);
  assert.equal(new Set(ids).size, ids.length, "expected no strategy to appear in more than one bucket");
  assert.equal(ids.length, 8, "expected all 8 registry strategies to be grouped");
});

test("critical liquidity leaves only cash_reserve available for simulation", () => {
  const summary = buildStrategyEligibilitySummary(makeConstitution({ liquidityRequirement: "critical" }));
  assert.deepEqual(
    summary.availableForSimulation.map((c) => c.strategyId),
    ["cash_reserve"]
  );
});

test("critical liquidity blocks other approved_for_simulation strategies", () => {
  const summary = buildStrategyEligibilitySummary(makeConstitution({ liquidityRequirement: "critical" }));
  const blockedIds = summary.blockedByConstitution.map((c) => c.strategyId);
  for (const strategyId of ["capital_preservation", "conservative_income", "balanced_core", "global_diversified_growth", "dollar_cost_averaging"]) {
    assert.ok(blockedIds.includes(strategyId), `expected ${strategyId} to be blocked under critical liquidity`);
  }
});

test("short time horizon blocks global_diversified_growth from availability", () => {
  const summary = buildStrategyEligibilitySummary(makeConstitution({ timeHorizon: "less_than_1y" }));
  const availableIds = summary.availableForSimulation.map((c) => c.strategyId);
  assert.ok(!availableIds.includes("global_diversified_growth"));
  assert.ok(summary.blockedByConstitution.some((c) => c.strategyId === "global_diversified_growth"));
});

test("basic financial knowledge blocks core_satellite from availability", () => {
  const summary = buildStrategyEligibilitySummary(makeConstitution({ financialKnowledge: "basic" }));
  const availableIds = summary.availableForSimulation.map((c) => c.strategyId);
  const advisorReviewIds = summary.requiresAdvisorReview.map((c) => c.strategyId);
  assert.ok(!availableIds.includes("core_satellite"));
  assert.ok(!advisorReviewIds.includes("core_satellite"));
});

test("a no-crypto constitution results in crypto_satellite never being available", () => {
  const summary = buildStrategyEligibilitySummary(makeConstitution({ prohibitedInstruments: ["crypto"], maxCryptoExposurePct: 0 }));
  const cryptoCard = allStrategyIds(summary).includes("crypto_satellite");
  assert.ok(cryptoCard);
  assert.ok(!summary.availableForSimulation.some((c) => c.strategyId === "crypto_satellite"));
  const card = [...summary.lockedAdvanced, ...summary.blockedByConstitution].find((c) => c.strategyId === "crypto_satellite");
  assert.ok(card, "expected crypto_satellite to be present in lockedAdvanced or blockedByConstitution");
  assert.equal(card.allowed, false);
});

test("advisor_review_only strategies are grouped into requiresAdvisorReview when suitable", () => {
  const summary = buildStrategyEligibilitySummary(makeConstitution());
  assert.ok(summary.requiresAdvisorReview.some((c) => c.strategyId === "core_satellite"));
  assert.ok(summary.requiresAdvisorReview.every((c) => c.status === "advisor_review_only"));
});

test("locked_advanced strategies are always grouped into lockedAdvanced", () => {
  const permissive = buildStrategyEligibilitySummary(makeConstitution());
  const restrictive = buildStrategyEligibilitySummary(makeConstitution({ financialKnowledge: "basic", riskCapacity: "low" }));
  assert.ok(permissive.lockedAdvanced.some((c) => c.strategyId === "crypto_satellite"));
  assert.ok(restrictive.lockedAdvanced.some((c) => c.strategyId === "crypto_satellite"));
  assert.ok(permissive.lockedAdvanced.every((c) => c.status === "locked_advanced"));
});

test("strategy versions from the registry are preserved in the eligibility summary", () => {
  const summary = buildStrategyEligibilitySummary(makeConstitution());
  const card = summary.availableForSimulation.find((c) => c.strategyId === "balanced_core");
  assert.ok(card);
  assert.equal(card.version, getStrategyById("balanced_core").version);
});

test("suitability flags in the eligibility summary match the Suitability Consistency Engine directly", () => {
  const constitution = makeConstitution({ maxSingleAssetExposurePct: 10 });
  const summary = buildStrategyEligibilitySummary(constitution);
  const card = summary.lockedAdvanced.find((c) => c.strategyId === "crypto_satellite");
  assert.ok(card);

  const direct = evaluateStrategySuitability(constitution, getStrategyById("crypto_satellite"));
  assert.deepEqual(card.suitability, direct);
  assert.deepEqual(card.suitability.flags, direct.flags);
});

test("buildStrategyEligibilitySummary does not duplicate suitability rules (allowed always matches evaluateStrategySuitability)", () => {
  const constitution = makeConstitution({ timeHorizon: "1_3y" });
  const summary = buildStrategyEligibilitySummary(constitution);
  for (const card of allStrategyIdCards(summary)) {
    const direct = evaluateStrategySuitability(constitution, getStrategyById(card.strategyId));
    assert.equal(card.allowed, direct.allowed, `${card.strategyId} allowed mismatch`);
  }
});

function allStrategyIdCards(summary) {
  return [
    ...summary.availableForSimulation,
    ...summary.blockedByConstitution,
    ...summary.requiresAdvisorReview,
    ...summary.lockedAdvanced,
    ...summary.deprecatedOrBlocked,
  ];
}
