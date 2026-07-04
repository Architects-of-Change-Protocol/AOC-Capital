// AOC Capital Strategy Playbook — Suitability Consistency Rules (v0.1).
//
// A deterministic, side-effect-free evaluation of whether a given strategy is
// consistent with a given Investor Constitution. Nothing here calls an LLM,
// a database, or a market data source — the same (constitution, strategy)
// pair always produces the same result, which is what lets the LLM
// explanation layer treat these flags as ground truth rather than something
// it has to reason about itself.

import type { InvestorConstitution } from "./investor-constitution-schema";
import type { NaturalProfile, RiskFlagCode, StrategyDefinition } from "./strategy-registry";

export type SuitabilitySeverity = "info" | "warning" | "blocker";

export type SuitabilityFlag = {
  code: RiskFlagCode;
  severity: SuitabilitySeverity;
  message: string;
};

export type SuitabilityResult = {
  strategyId: string;
  allowed: boolean;
  flags: SuitabilityFlag[];
};

/** Strategies whose natural risk/return profile is growth-oriented or more aggressive. */
const AGGRESSIVE_NATURAL_PROFILES: NaturalProfile[] = ["growth", "aggressive", "speculative"];

const SHORT_HORIZON_ALLOWED_STRATEGIES = new Set(["cash_reserve", "capital_preservation"]);
const MEDIUM_HORIZON_BLOCKED_STRATEGIES = new Set(["global_diversified_growth", "core_satellite", "crypto_satellite"]);
const SIMPLE_COMPLEXITY_ALLOWED_STRATEGIES = new Set(["cash_reserve", "capital_preservation", "balanced_core", "dollar_cost_averaging"]);
const BASIC_KNOWLEDGE_BLOCKED_STRATEGIES = new Set(["core_satellite", "crypto_satellite"]);

function isEmergencyReserveBelowThreeMonths(months: InvestorConstitution["emergencyReserveMonths"]): boolean {
  return months === "0_1" || months === "1_3";
}

export function evaluateStrategySuitability(
  constitution: InvestorConstitution,
  strategy: StrategyDefinition
): SuitabilityResult {
  const flags: SuitabilityFlag[] = [];

  // ─── Liquidity ─────────────────────────────────────────────────────────────

  if (
    isEmergencyReserveBelowThreeMonths(constitution.emergencyReserveMonths) &&
    (constitution.liquidityRequirement === "critical" || constitution.liquidityRequirement === "high")
  ) {
    flags.push({
      code: "insufficient_liquidity",
      severity: "warning",
      message: "Emergency reserve is below 3 months while liquidity requirement is critical or high.",
    });
  }

  if (constitution.liquidityRequirement === "critical" && strategy.strategyId !== "cash_reserve") {
    flags.push({
      code: "insufficient_liquidity",
      severity: "blocker",
      message: "Critical liquidity requirement permits only the cash_reserve strategy.",
    });
  }

  // ─── Horizon ───────────────────────────────────────────────────────────────

  if (constitution.timeHorizon === "less_than_1y" && !SHORT_HORIZON_ALLOWED_STRATEGIES.has(strategy.strategyId)) {
    flags.push({
      code: "horizon_mismatch",
      severity: "blocker",
      message: "A time horizon under 1 year permits only cash_reserve and capital_preservation.",
    });
  }

  if (constitution.timeHorizon === "1_3y" && MEDIUM_HORIZON_BLOCKED_STRATEGIES.has(strategy.strategyId)) {
    flags.push({
      code: "horizon_mismatch",
      severity: "blocker",
      message: "A 1-3 year time horizon is not consistent with this strategy's growth/satellite risk profile.",
    });
  }

  // ─── Risk ──────────────────────────────────────────────────────────────────

  const isAggressiveStrategy = AGGRESSIVE_NATURAL_PROFILES.includes(strategy.naturalProfile);

  if (constitution.riskTolerance === "high" && constitution.riskCapacity === "low" && isAggressiveStrategy) {
    flags.push({
      code: "risk_capacity_mismatch",
      severity: "blocker",
      message: "High stated risk tolerance is not backed by risk capacity for this strategy's aggressive profile.",
    });
  }

  if (constitution.riskTolerance === "low" && isAggressiveStrategy) {
    flags.push({
      code: "emotional_risk_mismatch",
      severity: strategy.naturalProfile === "speculative" ? "blocker" : "warning",
      message: "Low risk tolerance is not consistent with this strategy's volatility, which can prompt panic-driven decisions.",
    });
  }

  // ─── Knowledge / complexity ──────────────────────────────────────────────

  if (constitution.financialKnowledge === "basic" && BASIC_KNOWLEDGE_BLOCKED_STRATEGIES.has(strategy.strategyId)) {
    flags.push({
      code: "complexity_mismatch",
      severity: "blocker",
      message: "Basic financial knowledge does not permit core_satellite or crypto_satellite.",
    });
  }

  if (constitution.complexityAllowed === "simple" && !SIMPLE_COMPLEXITY_ALLOWED_STRATEGIES.has(strategy.strategyId)) {
    flags.push({
      code: "complexity_mismatch",
      severity: "blocker",
      message: "Simple complexity tolerance permits only cash_reserve, capital_preservation, balanced_core, and dollar_cost_averaging.",
    });
  }

  // ─── Crypto ────────────────────────────────────────────────────────────────

  if (constitution.prohibitedInstruments.includes("crypto") && strategy.maxCryptoExposurePct > 0) {
    flags.push({
      code: "crypto_exposure_risk",
      severity: "blocker",
      message: "The investor constitution prohibits crypto, so no crypto-enabled strategy is allowed.",
    });
  }

  if (constitution.maxCryptoExposurePct < strategy.maxCryptoExposurePct) {
    flags.push({
      code: "crypto_exposure_risk",
      severity: constitution.maxCryptoExposurePct <= 0 ? "blocker" : "warning",
      message: `Strategy crypto exposure (${strategy.maxCryptoExposurePct}%) exceeds the constitution's max crypto exposure (${constitution.maxCryptoExposurePct}%).`,
    });
  }

  if (constitution.riskCapacity === "low" && strategy.maxCryptoExposurePct > 0) {
    flags.push({
      code: "crypto_exposure_risk",
      severity: "blocker",
      message: "Low risk capacity requires crypto exposure to be 0%.",
    });
  }

  // ─── Currency ──────────────────────────────────────────────────────────────

  if (constitution.spendingCurrency === "CRC" && constitution.baseCurrency === "USD") {
    flags.push({
      code: "currency_mismatch",
      severity: "info",
      message: "Spending currency (CRC) differs from base currency (USD); simulated results carry FX exposure.",
    });
  }

  if (constitution.baseCurrency === "mixed") {
    flags.push({
      code: "currency_mismatch",
      severity: "info",
      message: "Base currency is mixed; simulated results carry FX exposure across currencies.",
    });
  }

  // ─── Concentration ─────────────────────────────────────────────────────────

  if (strategy.maxSingleAssetExposurePct > constitution.maxSingleAssetExposurePct) {
    flags.push({
      code: "concentration_risk",
      severity: "warning",
      message: `Strategy max single-asset exposure (${strategy.maxSingleAssetExposurePct}%) exceeds the constitution's limit (${constitution.maxSingleAssetExposurePct}%).`,
    });
  }

  if (strategy.maxSectorExposurePct > constitution.maxSectorExposurePct) {
    flags.push({
      code: "concentration_risk",
      severity: "warning",
      message: `Strategy max sector exposure (${strategy.maxSectorExposurePct}%) exceeds the constitution's limit (${constitution.maxSectorExposurePct}%).`,
    });
  }

  const allowed = !flags.some((flag) => flag.severity === "blocker");

  return { strategyId: strategy.strategyId, allowed, flags };
}
