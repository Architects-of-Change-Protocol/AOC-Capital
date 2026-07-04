// ─── AOC Capital Strategy Playbook Domain Layer (v0.1) — Tests ─────────────
// Pure-function tests over the Strategy Playbook domain layer: the Strategy
// Registry, the Suitability Consistency Engine, the Simulation Record schema,
// and the LLM guardrails. No Supabase / network / LLM calls — every rule here
// is deterministic and evaluated in-process, mirroring the pure-data test
// pattern used elsewhere in this suite (e.g.
// tests/aoc-capital-strategy-library.test.mjs).

import { test } from "node:test";
import assert from "node:assert/strict";

const {
  STRATEGY_REGISTRY,
  getStrategyById,
  getActiveSimulationStrategies,
  getAdvisorReviewStrategies,
  getLockedAdvancedStrategies,
} = await import("../src/features/capital/domain/strategy-registry.ts");

const { evaluateStrategySuitability } = await import("../src/features/capital/domain/suitability-rules.ts");

const { createDraftSimulationRecord } = await import("../src/features/capital/domain/simulation-record-schema.ts");

const { validateCapitalLLMOutput, appendRequiredDisclosure, REQUIRED_DISCLOSURE } = await import(
  "../src/features/capital/domain/llm-guardrails.ts"
);

const { buildCapitalExplanationPrompt } = await import("../src/features/capital/prompts/capital-explanation-prompt.ts");

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

function getStrategy(strategyId) {
  const strategy = getStrategyById(strategyId);
  assert.ok(strategy, `expected strategy ${strategyId} to exist`);
  return strategy;
}

// ─── Strategy Registry ───────────────────────────────────────────────────────

test("every strategy in the registry has strategyId, version, status, disclaimer, and explanationTemplate", () => {
  for (const strategy of STRATEGY_REGISTRY) {
    assert.equal(typeof strategy.strategyId, "string");
    assert.equal(typeof strategy.version, "number");
    assert.equal(typeof strategy.status, "string");
    assert.equal(typeof strategy.disclaimer, "string");
    assert.ok(strategy.disclaimer.length > 0);
    assert.equal(typeof strategy.explanationTemplate, "string");
    assert.ok(strategy.explanationTemplate.length > 0);
  }
});

test("the registry contains exactly the 8 MVP strategies", () => {
  const ids = STRATEGY_REGISTRY.map((s) => s.strategyId).sort();
  assert.deepEqual(ids, [
    "balanced_core",
    "capital_preservation",
    "cash_reserve",
    "conservative_income",
    "core_satellite",
    "crypto_satellite",
    "dollar_cost_averaging",
    "global_diversified_growth",
  ]);
});

test("getStrategyById returns the correct strategy", () => {
  const strategy = getStrategyById("balanced_core");
  assert.ok(strategy);
  assert.equal(strategy.strategyId, "balanced_core");
  assert.equal(strategy.name, "Balanced Core");
});

test("getStrategyById returns undefined for an unknown strategy id", () => {
  assert.equal(getStrategyById("not_a_real_strategy"), undefined);
});

test("getActiveSimulationStrategies only returns approved_for_simulation strategies", () => {
  const strategies = getActiveSimulationStrategies();
  assert.ok(strategies.length > 0);
  for (const strategy of strategies) {
    assert.equal(strategy.status, "approved_for_simulation");
  }
});

test("getAdvisorReviewStrategies only returns advisor_review_only strategies", () => {
  const strategies = getAdvisorReviewStrategies();
  assert.ok(strategies.length > 0);
  for (const strategy of strategies) {
    assert.equal(strategy.status, "advisor_review_only");
  }
});

test("getLockedAdvancedStrategies only returns locked_advanced strategies", () => {
  const strategies = getLockedAdvancedStrategies();
  assert.ok(strategies.length > 0);
  for (const strategy of strategies) {
    assert.equal(strategy.status, "locked_advanced");
  }
  assert.ok(strategies.some((s) => s.strategyId === "crypto_satellite"));
});

// ─── Suitability Consistency Engine ─────────────────────────────────────────

test("critical liquidity blocks non-cash-reserve strategies", () => {
  const constitution = makeConstitution({ liquidityRequirement: "critical" });
  const result = evaluateStrategySuitability(constitution, getStrategy("balanced_core"));
  assert.equal(result.allowed, false);
  assert.ok(result.flags.some((f) => f.severity === "blocker" && f.code === "insufficient_liquidity"));
});

test("critical liquidity still allows cash_reserve", () => {
  const constitution = makeConstitution({ liquidityRequirement: "critical" });
  const result = evaluateStrategySuitability(constitution, getStrategy("cash_reserve"));
  assert.equal(result.allowed, true);
});

test("short horizon blocks global diversified growth", () => {
  const constitution = makeConstitution({ timeHorizon: "less_than_1y" });
  const result = evaluateStrategySuitability(constitution, getStrategy("global_diversified_growth"));
  assert.equal(result.allowed, false);
  assert.ok(result.flags.some((f) => f.severity === "blocker" && f.code === "horizon_mismatch"));
});

test("a 1-3y horizon blocks global_diversified_growth, core_satellite, and crypto_satellite", () => {
  const constitution = makeConstitution({ timeHorizon: "1_3y" });
  for (const strategyId of ["global_diversified_growth", "core_satellite", "crypto_satellite"]) {
    const result = evaluateStrategySuitability(constitution, getStrategy(strategyId));
    assert.equal(result.allowed, false, `expected ${strategyId} to be blocked`);
  }
});

test("low risk capacity blocks crypto exposure", () => {
  const constitution = makeConstitution({ riskCapacity: "low" });
  const result = evaluateStrategySuitability(constitution, getStrategy("crypto_satellite"));
  assert.equal(result.allowed, false);
  assert.ok(result.flags.some((f) => f.severity === "blocker" && f.code === "crypto_exposure_risk"));
});

test("basic knowledge blocks core_satellite", () => {
  const constitution = makeConstitution({ financialKnowledge: "basic" });
  const result = evaluateStrategySuitability(constitution, getStrategy("core_satellite"));
  assert.equal(result.allowed, false);
  assert.ok(result.flags.some((f) => f.severity === "blocker" && f.code === "complexity_mismatch"));
});

test("basic knowledge blocks crypto_satellite", () => {
  const constitution = makeConstitution({ financialKnowledge: "basic" });
  const result = evaluateStrategySuitability(constitution, getStrategy("crypto_satellite"));
  assert.equal(result.allowed, false);
});

test("simple complexity only allows cash_reserve, capital_preservation, balanced_core, and dollar_cost_averaging", () => {
  const constitution = makeConstitution({ complexityAllowed: "simple" });
  for (const strategyId of ["cash_reserve", "capital_preservation", "balanced_core", "dollar_cost_averaging"]) {
    assert.equal(evaluateStrategySuitability(constitution, getStrategy(strategyId)).allowed, true, strategyId);
  }
  for (const strategyId of ["conservative_income", "global_diversified_growth", "core_satellite", "crypto_satellite"]) {
    assert.equal(evaluateStrategySuitability(constitution, getStrategy(strategyId)).allowed, false, strategyId);
  }
});

test("no-crypto constitution blocks crypto-enabled strategies", () => {
  const constitution = makeConstitution({ prohibitedInstruments: ["crypto"] });
  const result = evaluateStrategySuitability(constitution, getStrategy("crypto_satellite"));
  assert.equal(result.allowed, false);
  assert.ok(result.flags.some((f) => f.severity === "blocker" && f.code === "crypto_exposure_risk"));
});

test("a lower constitution max crypto exposure than the strategy's produces a crypto_exposure_risk flag", () => {
  const constitution = makeConstitution({ maxCryptoExposurePct: 5 });
  const result = evaluateStrategySuitability(constitution, getStrategy("crypto_satellite"));
  assert.ok(result.flags.some((f) => f.code === "crypto_exposure_risk"));
});

test("currency mismatch (CRC spending / USD base) generates an info flag, not a blocker", () => {
  const constitution = makeConstitution({ spendingCurrency: "CRC", baseCurrency: "USD" });
  const result = evaluateStrategySuitability(constitution, getStrategy("balanced_core"));
  const flag = result.flags.find((f) => f.code === "currency_mismatch");
  assert.ok(flag, "expected a currency_mismatch flag");
  assert.equal(flag.severity, "info");
  assert.equal(result.allowed, true);
});

test("mixed base currency generates an informational FX exposure flag", () => {
  const constitution = makeConstitution({ baseCurrency: "mixed" });
  const result = evaluateStrategySuitability(constitution, getStrategy("balanced_core"));
  const flag = result.flags.find((f) => f.code === "currency_mismatch");
  assert.ok(flag);
  assert.equal(flag.severity, "info");
});

test("strategy single-asset exposure above the constitution's limit generates a concentration_risk flag", () => {
  const constitution = makeConstitution({ maxSingleAssetExposurePct: 10 });
  const result = evaluateStrategySuitability(constitution, getStrategy("crypto_satellite"));
  assert.ok(result.flags.some((f) => f.code === "concentration_risk"));
});

test("a fully permissive constitution allows every approved_for_simulation strategy", () => {
  const constitution = makeConstitution();
  for (const strategy of getActiveSimulationStrategies()) {
    const result = evaluateStrategySuitability(constitution, strategy);
    assert.equal(result.allowed, true, `expected ${strategy.strategyId} to be allowed`);
  }
});

// ─── Simulation Record schema ────────────────────────────────────────────────

test("createDraftSimulationRecord produces a record with mode paper_trading and status draft", () => {
  const record = createDraftSimulationRecord({
    simulationId: "sim-1",
    createdBy: "user-1",
    investorProfileId: "profile-1",
    investorConstitutionId: "constitution-1",
    investorConstitutionVersion: 1,
    strategyId: "balanced_core",
    strategyVersion: 1,
    allocation: [{ assetClass: "us_equities", allocationPct: 30 }],
    assumptions: ["no live market data used"],
    riskFlags: [],
  });
  assert.equal(record.mode, "paper_trading");
  assert.equal(record.status, "draft");
});

test("SimulationRecord never includes broker/order/execution fields", () => {
  const record = createDraftSimulationRecord({
    simulationId: "sim-2",
    createdBy: "user-1",
    investorProfileId: "profile-1",
    investorConstitutionId: "constitution-1",
    investorConstitutionVersion: 1,
    strategyId: "cash_reserve",
    strategyVersion: 1,
    allocation: [],
    assumptions: [],
    riskFlags: [],
  });
  for (const forbiddenKey of ["broker", "exchange", "orderId", "accountId", "executionStatus", "liveTrade", "realOrder"]) {
    assert.equal(Object.prototype.hasOwnProperty.call(record, forbiddenKey), false, `record must not include ${forbiddenKey}`);
  }
});

// ─── LLM guardrails ──────────────────────────────────────────────────────────

test("LLM guardrails catch prohibited buy/sell language", () => {
  const result = validateCapitalLLMOutput("Given your goals, you should buy this fund today.");
  assert.equal(result.valid, false);
  assert.ok(result.violations.some((v) => v.phrase === "you should buy"));
});

test("LLM guardrails catch every listed prohibited phrase", () => {
  const prohibited = [
    "you should buy",
    "you should sell",
    "i recommend buying",
    "i recommend selling",
    "best portfolio for you",
    "guaranteed return",
    "safe investment",
    "this will go up",
    "invest in",
    "execute",
    "place order",
    "live trade",
    "real trade",
    "send to broker",
    "connect exchange",
    "manage your money",
  ];
  for (const phrase of prohibited) {
    const result = validateCapitalLLMOutput(`Some text containing ${phrase} in it.`);
    assert.equal(result.valid, false, `expected "${phrase}" to be flagged`);
  }
});

test("LLM guardrails pass clean explanatory text", () => {
  const result = validateCapitalLLMOutput(
    "This simulation shows a diversified allocation across equities and bonds for illustrative purposes only."
  );
  assert.equal(result.valid, true);
  assert.deepEqual(result.violations, []);
});

test("LLM guardrails append the required disclosure", () => {
  const output = appendRequiredDisclosure("This is a summary of the simulation.");
  assert.ok(output.includes(REQUIRED_DISCLOSURE));
});

test("appendRequiredDisclosure does not duplicate the disclosure if already present", () => {
  const output = appendRequiredDisclosure(`Summary text.\n\n${REQUIRED_DISCLOSURE}`);
  const occurrences = output.split(REQUIRED_DISCLOSURE).length - 1;
  assert.equal(occurrences, 1);
});

// ─── Explanation prompt ──────────────────────────────────────────────────────

test("buildCapitalExplanationPrompt includes the required output sections and ends with the required disclosure", () => {
  const constitution = makeConstitution();
  const strategy = getStrategy("balanced_core");
  const simulation = createDraftSimulationRecord({
    simulationId: "sim-3",
    createdBy: "user-1",
    investorProfileId: "profile-1",
    investorConstitutionId: constitution.constitutionId,
    investorConstitutionVersion: constitution.version,
    strategyId: strategy.strategyId,
    strategyVersion: strategy.version,
    allocation: [{ assetClass: "us_equities", allocationPct: 30 }],
    assumptions: ["no live market data used"],
    riskFlags: [],
  });

  const prompt = buildCapitalExplanationPrompt({ constitution, strategy, simulation, suitabilityFlags: [] });

  for (const section of [
    "Simulation Summary",
    "Why this strategy was considered",
    "Key risks observed",
    "Suitability consistency notes",
    "Scenario limitations",
    "What should be reviewed with a regulated advisor before any real-world decision",
  ]) {
    assert.ok(prompt.includes(section), `expected prompt to include section "${section}"`);
  }

  assert.ok(prompt.trim().endsWith(REQUIRED_DISCLOSURE));
  assert.match(prompt, /must not recommend buying or selling/i);
  assert.match(prompt, /must not invent a strategy/i);
});
