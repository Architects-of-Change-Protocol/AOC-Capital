// ─── AOC Capital Portfolio Simulation Builder (v0.1) — Domain Tests ─────────
// Pure-function tests over src/features/capital/domain/portfolio-simulation-builder.ts:
// deterministic default allocation, assumption/allocation validation, and
// draft assembly. No LLM / network / Supabase calls — mirrors the pure-data
// test pattern in tests/aoc-capital-constitution-result-eligibility.test.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";

const {
  buildDefaultAllocationForStrategy,
  validateSimulationAssumptions,
  validateDraftSimulationAllocation,
  buildPortfolioSimulationDraft,
  getSimulationBuilderEligibility,
  StrategyStatusNotEligibleForSimulationError,
  StrategyNotSuitableForConstitutionError,
} = await import("../src/features/capital/domain/portfolio-simulation-builder.ts");

const { getStrategyById } = await import("../src/features/capital/domain/strategy-registry.ts");

// ─── Fixtures ────────────────────────────────────────────────────────────────

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

function makeAssumptions(overrides = {}) {
  return {
    initialAmount: 10000,
    monthlyContribution: 0,
    timeHorizonYears: 5,
    rebalanceFrequency: "quarterly",
    ...overrides,
  };
}

const ALL_STRATEGY_IDS = [
  "cash_reserve",
  "capital_preservation",
  "conservative_income",
  "balanced_core",
  "global_diversified_growth",
  "dollar_cost_averaging",
  "core_satellite",
  "crypto_satellite",
];

function totalOf(allocation) {
  return allocation.reduce((sum, entry) => sum + entry.percentage, 0);
}

// ─── buildDefaultAllocationForStrategy ──────────────────────────────────────

test("default allocation totals 100 for every registry strategy under a permissive constitution", () => {
  const constitution = makeConstitution();
  for (const strategyId of ALL_STRATEGY_IDS) {
    const strategy = getStrategyById(strategyId);
    const allocation = buildDefaultAllocationForStrategy(strategy, constitution);
    assert.ok(allocation.length > 0, `expected a non-empty allocation for ${strategyId}`);
    assert.ok(Math.abs(totalOf(allocation) - 100) < 0.01, `expected ${strategyId} allocation to total 100, got ${totalOf(allocation)}`);
  }
});

test("default allocation only uses asset classes from strategy.allowedAssetClasses", () => {
  const constitution = makeConstitution();
  const strategy = getStrategyById("balanced_core");
  const allocation = buildDefaultAllocationForStrategy(strategy, constitution);
  for (const entry of allocation) {
    assert.ok(strategy.allowedAssetClasses.includes(entry.assetClass));
  }
});

test("default allocation only uses asset classes with a defined strategy allocation range", () => {
  const constitution = makeConstitution();
  for (const strategyId of ALL_STRATEGY_IDS) {
    const strategy = getStrategyById(strategyId);
    const allocation = buildDefaultAllocationForStrategy(strategy, constitution);
    for (const entry of allocation) {
      assert.ok(strategy.allocationRanges[entry.assetClass], `${strategyId}: ${entry.assetClass} has no allocation range`);
    }
  }
});

test("default allocation respects each strategy's min/max range", () => {
  const constitution = makeConstitution();
  for (const strategyId of ALL_STRATEGY_IDS) {
    const strategy = getStrategyById(strategyId);
    const allocation = buildDefaultAllocationForStrategy(strategy, constitution);
    for (const entry of allocation) {
      const range = strategy.allocationRanges[entry.assetClass];
      assert.ok(entry.percentage >= range.min - 0.01, `${strategyId}: ${entry.assetClass} below min`);
      assert.ok(entry.percentage <= range.max + 0.01, `${strategyId}: ${entry.assetClass} above max`);
    }
  }
});

test("default allocation respects constitution.maxCryptoExposurePct", () => {
  const constitution = makeConstitution({ maxCryptoExposurePct: 5 });
  const strategy = getStrategyById("crypto_satellite");
  const allocation = buildDefaultAllocationForStrategy(strategy, constitution);
  const crypto = allocation.find((entry) => entry.assetClass === "bitcoin_crypto");
  assert.ok(crypto);
  assert.ok(crypto.percentage <= 5.01);
});

test("a no-crypto constitution sets bitcoin_crypto allocation to 0", () => {
  const constitution = makeConstitution({ prohibitedInstruments: ["crypto"], maxCryptoExposurePct: 0 });
  const strategy = getStrategyById("crypto_satellite");
  const allocation = buildDefaultAllocationForStrategy(strategy, constitution);
  const crypto = allocation.find((entry) => entry.assetClass === "bitcoin_crypto");
  assert.ok(crypto);
  assert.equal(crypto.percentage, 0);
  assert.ok(Math.abs(totalOf(allocation) - 100) < 0.01);
});

test("low riskCapacity sets bitcoin_crypto allocation to 0", () => {
  const constitution = makeConstitution({ riskCapacity: "low" });
  const strategy = getStrategyById("crypto_satellite");
  const allocation = buildDefaultAllocationForStrategy(strategy, constitution);
  const crypto = allocation.find((entry) => entry.assetClass === "bitcoin_crypto");
  assert.ok(crypto);
  assert.equal(crypto.percentage, 0);
});

test("critical liquidity biases allocation toward cash or money_market when available", () => {
  const constitution = makeConstitution({ liquidityRequirement: "critical" });
  const strategy = getStrategyById("capital_preservation");
  const allocation = buildDefaultAllocationForStrategy(strategy, constitution);
  const cash = allocation.find((entry) => entry.assetClass === "cash");
  assert.ok(cash);
  assert.ok(cash.percentage >= 35, `expected cash to be biased high under critical liquidity, got ${cash.percentage}`);
});

test("default allocation never includes a prohibited asset class (thematic_etfs) when the constitution prohibits it", () => {
  const constitution = makeConstitution({ prohibitedInstruments: ["thematic_etfs"] });
  const strategy = getStrategyById("core_satellite");
  const allocation = buildDefaultAllocationForStrategy(strategy, constitution);
  const thematic = allocation.find((entry) => entry.assetClass === "thematic_etfs");
  if (thematic) assert.equal(thematic.percentage, 0);
});

// ─── validateSimulationAssumptions ───────────────────────────────────────────

test("validateSimulationAssumptions rejects initialAmount <= 0", () => {
  const issues = validateSimulationAssumptions(makeAssumptions({ initialAmount: 0 }));
  assert.ok(issues.some((issue) => issue.code === "invalid_initial_amount"));
});

test("validateSimulationAssumptions rejects monthlyContribution < 0", () => {
  const issues = validateSimulationAssumptions(makeAssumptions({ monthlyContribution: -1 }));
  assert.ok(issues.some((issue) => issue.code === "invalid_monthly_contribution"));
});

test("validateSimulationAssumptions rejects timeHorizonYears <= 0", () => {
  const issues = validateSimulationAssumptions(makeAssumptions({ timeHorizonYears: 0 }));
  assert.ok(issues.some((issue) => issue.code === "invalid_time_horizon"));
});

test("validateSimulationAssumptions rejects an invalid rebalance frequency", () => {
  const issues = validateSimulationAssumptions(makeAssumptions({ rebalanceFrequency: "weekly" }));
  assert.ok(issues.some((issue) => issue.code === "invalid_rebalance_frequency"));
});

test("validateSimulationAssumptions returns no issues for valid assumptions", () => {
  const issues = validateSimulationAssumptions(makeAssumptions());
  assert.equal(issues.length, 0);
});

// ─── validateDraftSimulationAllocation ───────────────────────────────────────

test("validateDraftSimulationAllocation rejects a total below 100", () => {
  const constitution = makeConstitution();
  const strategy = getStrategyById("balanced_core");
  const result = validateDraftSimulationAllocation({
    constitution,
    strategy,
    allocation: [{ assetClass: "aggregate_bonds", percentage: 30 }],
  });
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "allocation_total_below_100"));
});

test("validateDraftSimulationAllocation rejects a total above 100", () => {
  const constitution = makeConstitution();
  const strategy = getStrategyById("balanced_core");
  const result = validateDraftSimulationAllocation({
    constitution,
    strategy,
    allocation: [
      { assetClass: "aggregate_bonds", percentage: 40 },
      { assetClass: "us_equities", percentage: 40 },
      { assetClass: "global_equities", percentage: 30 },
    ],
  });
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "allocation_total_above_100"));
});

test("validateDraftSimulationAllocation rejects a negative allocation", () => {
  const constitution = makeConstitution();
  const strategy = getStrategyById("balanced_core");
  const result = validateDraftSimulationAllocation({
    constitution,
    strategy,
    allocation: [
      { assetClass: "aggregate_bonds", percentage: -10 },
      { assetClass: "us_equities", percentage: 110 },
    ],
  });
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "negative_allocation"));
});

test("validateDraftSimulationAllocation rejects an allocation above 100", () => {
  const constitution = makeConstitution();
  const strategy = getStrategyById("cash_reserve");
  const result = validateDraftSimulationAllocation({
    constitution,
    strategy,
    allocation: [{ assetClass: "cash", percentage: 120 }],
  });
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "allocation_above_100"));
});

test("validateDraftSimulationAllocation rejects an asset class not allowed by the strategy", () => {
  const constitution = makeConstitution();
  const strategy = getStrategyById("cash_reserve");
  const result = validateDraftSimulationAllocation({
    constitution,
    strategy,
    allocation: [
      { assetClass: "cash", percentage: 50 },
      { assetClass: "bitcoin_crypto", percentage: 50 },
    ],
  });
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "asset_class_not_allowed"));
});

test("validateDraftSimulationAllocation rejects an asset class with a missing allocation range", () => {
  const constitution = makeConstitution();
  const strategy = getStrategyById("cash_reserve");
  const brokenStrategy = { ...strategy, allowedAssetClasses: [...strategy.allowedAssetClasses, "gold"] };
  const result = validateDraftSimulationAllocation({
    constitution,
    strategy: brokenStrategy,
    allocation: [
      { assetClass: "cash", percentage: 50 },
      { assetClass: "gold", percentage: 50 },
    ],
  });
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "missing_allocation_range"));
});

test("validateDraftSimulationAllocation rejects an allocation below the strategy minimum", () => {
  const constitution = makeConstitution();
  const strategy = getStrategyById("capital_preservation");
  const result = validateDraftSimulationAllocation({
    constitution,
    strategy,
    allocation: [
      { assetClass: "cash", percentage: 5 },
      { assetClass: "money_market", percentage: 35 },
      { assetClass: "short_term_bonds", percentage: 60 },
    ],
  });
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "allocation_below_strategy_min"));
});

test("validateDraftSimulationAllocation rejects an allocation above the strategy maximum", () => {
  const constitution = makeConstitution();
  const strategy = getStrategyById("capital_preservation");
  const result = validateDraftSimulationAllocation({
    constitution,
    strategy,
    allocation: [
      { assetClass: "cash", percentage: 45 },
      { assetClass: "money_market", percentage: 20 },
      { assetClass: "short_term_bonds", percentage: 35 },
    ],
  });
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "allocation_above_strategy_max"));
});

test("validateDraftSimulationAllocation rejects crypto above the constitution's max exposure", () => {
  const constitution = makeConstitution({ maxCryptoExposurePct: 5 });
  const strategy = getStrategyById("crypto_satellite");
  const result = validateDraftSimulationAllocation({
    constitution,
    strategy,
    allocation: [
      { assetClass: "us_equities", percentage: 45 },
      { assetClass: "global_equities", percentage: 45 },
      { assetClass: "bitcoin_crypto", percentage: 10 },
    ],
  });
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "crypto_exceeds_constitution_limit"));
});

test("validateDraftSimulationAllocation rejects any crypto when prohibited", () => {
  const constitution = makeConstitution({ prohibitedInstruments: ["crypto"], maxCryptoExposurePct: 0 });
  const strategy = getStrategyById("crypto_satellite");
  const result = validateDraftSimulationAllocation({
    constitution,
    strategy,
    allocation: [
      { assetClass: "us_equities", percentage: 48 },
      { assetClass: "global_equities", percentage: 47 },
      { assetClass: "bitcoin_crypto", percentage: 5 },
    ],
  });
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "crypto_prohibited"));
});

test("validateDraftSimulationAllocation rejects any crypto when riskCapacity is low", () => {
  const constitution = makeConstitution({ riskCapacity: "low" });
  const strategy = getStrategyById("crypto_satellite");
  const result = validateDraftSimulationAllocation({
    constitution,
    strategy,
    allocation: [
      { assetClass: "us_equities", percentage: 48 },
      { assetClass: "global_equities", percentage: 47 },
      { assetClass: "bitcoin_crypto", percentage: 5 },
    ],
  });
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "crypto_blocked_by_low_capacity"));
});

test("validateDraftSimulationAllocation accepts a valid in-range allocation", () => {
  const constitution = makeConstitution();
  const strategy = getStrategyById("balanced_core");
  const result = validateDraftSimulationAllocation({
    constitution,
    strategy,
    allocation: [
      { assetClass: "aggregate_bonds", percentage: 40 },
      { assetClass: "us_equities", percentage: 30 },
      { assetClass: "global_equities", percentage: 20 },
      { assetClass: "international_equities", percentage: 10 },
    ],
  });
  assert.equal(result.valid, true);
  assert.equal(result.totalAllocationPct, 100);
});

// ─── buildPortfolioSimulationDraft ───────────────────────────────────────────

function validAllocationFor(strategyId) {
  const strategy = getStrategyById(strategyId);
  const constitution = makeConstitution();
  return buildDefaultAllocationForStrategy(strategy, constitution);
}

test("buildPortfolioSimulationDraft rejects blocked strategies", () => {
  const constitution = makeConstitution({ liquidityRequirement: "critical" });
  const strategy = getStrategyById("balanced_core");
  assert.throws(
    () =>
      buildPortfolioSimulationDraft({
        constitution,
        strategy,
        assumptions: makeAssumptions(),
        allocation: validAllocationFor("balanced_core"),
      }),
    StrategyNotSuitableForConstitutionError
  );
});

test("buildPortfolioSimulationDraft rejects advisor_review_only strategies", () => {
  const constitution = makeConstitution();
  const strategy = getStrategyById("core_satellite");
  assert.throws(
    () =>
      buildPortfolioSimulationDraft({
        constitution,
        strategy,
        assumptions: makeAssumptions(),
        allocation: validAllocationFor("core_satellite"),
      }),
    StrategyStatusNotEligibleForSimulationError
  );
});

test("buildPortfolioSimulationDraft rejects locked_advanced strategies", () => {
  const constitution = makeConstitution();
  const strategy = getStrategyById("crypto_satellite");
  assert.throws(
    () =>
      buildPortfolioSimulationDraft({
        constitution,
        strategy,
        assumptions: makeAssumptions(),
        allocation: validAllocationFor("crypto_satellite"),
      }),
    StrategyStatusNotEligibleForSimulationError
  );
});

test("buildPortfolioSimulationDraft rejects deprecated/blocked strategies if present in the registry", () => {
  const constitution = makeConstitution();
  const strategy = { ...getStrategyById("cash_reserve"), status: "deprecated" };
  assert.throws(
    () =>
      buildPortfolioSimulationDraft({
        constitution,
        strategy,
        assumptions: makeAssumptions(),
        allocation: validAllocationFor("cash_reserve"),
      }),
    StrategyStatusNotEligibleForSimulationError
  );
});

test("buildPortfolioSimulationDraft includes paperOnly true, realExecutionLocked true, and mode paper_trading", () => {
  const constitution = makeConstitution();
  const strategy = getStrategyById("balanced_core");
  const draft = buildPortfolioSimulationDraft({
    constitution,
    strategy,
    assumptions: makeAssumptions(),
    allocation: validAllocationFor("balanced_core"),
  });
  assert.equal(draft.paperOnly, true);
  assert.equal(draft.realExecutionLocked, true);
  assert.equal(draft.mode, "paper_trading");
});

test("buildPortfolioSimulationDraft includes strategyVersion and constitutionVersion", () => {
  const constitution = makeConstitution({ version: 3 });
  const strategy = getStrategyById("balanced_core");
  const draft = buildPortfolioSimulationDraft({
    constitution,
    strategy,
    assumptions: makeAssumptions(),
    allocation: validAllocationFor("balanced_core"),
  });
  assert.equal(draft.strategyVersion, strategy.version);
  assert.equal(draft.constitutionVersion, 3);
});

test("buildPortfolioSimulationDraft includes suitabilityFlags matching evaluateStrategySuitability", async () => {
  const { evaluateStrategySuitability } = await import("../src/features/capital/domain/suitability-rules.ts");
  const constitution = makeConstitution({ maxSingleAssetExposurePct: 10 });
  const strategy = getStrategyById("balanced_core");
  const draft = buildPortfolioSimulationDraft({
    constitution,
    strategy,
    assumptions: makeAssumptions(),
    allocation: validAllocationFor("balanced_core"),
  });
  const direct = evaluateStrategySuitability(constitution, strategy);
  assert.deepEqual(draft.suitabilityFlags, direct.flags);
});

test("buildPortfolioSimulationDraft never includes broker, exchange, orderId, accountId, or executionStatus fields", () => {
  const constitution = makeConstitution();
  const strategy = getStrategyById("balanced_core");
  const draft = buildPortfolioSimulationDraft({
    constitution,
    strategy,
    assumptions: makeAssumptions(),
    allocation: validAllocationFor("balanced_core"),
  });
  for (const forbiddenKey of ["broker", "exchange", "orderId", "accountId", "executionStatus", "liveOrder", "realOrder", "tradeIntentId"]) {
    assert.ok(!(forbiddenKey in draft), `draft should not include ${forbiddenKey}`);
  }
});

test("buildPortfolioSimulationDraft returns validation.valid false (not a throw) for a user-correctable allocation problem", () => {
  const constitution = makeConstitution();
  const strategy = getStrategyById("balanced_core");
  const draft = buildPortfolioSimulationDraft({
    constitution,
    strategy,
    assumptions: makeAssumptions(),
    allocation: [{ assetClass: "aggregate_bonds", percentage: 30 }],
  });
  assert.equal(draft.validation.valid, false);
  assert.ok(draft.validation.issues.some((issue) => issue.code === "allocation_total_below_100"));
});

// ─── getSimulationBuilderEligibility ─────────────────────────────────────────

test("getSimulationBuilderEligibility only returns approved_for_simulation, suitable strategies as selectable", () => {
  const constitution = makeConstitution();
  const eligibility = getSimulationBuilderEligibility(constitution);
  assert.ok(eligibility.selectable.length > 0);
  for (const card of eligibility.selectable) {
    assert.equal(card.status, "approved_for_simulation");
    assert.equal(card.allowed, true);
  }
});

test("getSimulationBuilderEligibility separates advisor-review, blocked, and locked groups", () => {
  const constitution = makeConstitution();
  const eligibility = getSimulationBuilderEligibility(constitution);
  assert.ok(eligibility.requiresAdvisorReview.some((card) => card.strategyId === "core_satellite"));
  assert.ok(eligibility.lockedAdvanced.some((card) => card.strategyId === "crypto_satellite"));

  const restrictive = getSimulationBuilderEligibility(makeConstitution({ liquidityRequirement: "critical" }));
  assert.ok(restrictive.blockedByConstitution.some((card) => card.strategyId === "balanced_core"));
});
