// AOC Capital Strategy Playbook — Strategy Registry (v0.1).
//
// A fixed, versioned catalog of paper-trading simulation strategies. Nothing
// in this module is generated or editable by an LLM — every strategy here was
// authored and reviewed as part of this domain layer. The Suitability
// Consistency Engine (suitability-rules.ts) decides, per investor, which of
// these an investor may see simulated; this module only decides which
// strategies exist and in what lifecycle state.

import type { InvestorObjective, ProhibitedInstrument } from "./investor-constitution-schema";
import type { LiquidityRequirement, FinancialKnowledge, ComplexityAllowed } from "./investor-constitution-schema";
import type { TimeHorizon } from "./investor-constitution-schema";
import { REQUIRED_DISCLOSURE } from "./llm-guardrails";

export type StrategyStatus =
  | "draft"
  | "approved_for_simulation"
  | "advisor_review_only"
  | "locked_advanced"
  | "deprecated"
  | "blocked";

export type NaturalProfile = "very_conservative" | "conservative" | "balanced" | "growth" | "aggressive" | "speculative";

export type AssetClass =
  | "cash"
  | "money_market"
  | "short_term_bonds"
  | "aggregate_bonds"
  | "us_equities"
  | "global_equities"
  | "international_equities"
  | "emerging_markets"
  | "dividend_equities"
  | "reits"
  | "commodities"
  | "gold"
  | "bitcoin_crypto"
  | "thematic_etfs";

export type RiskFlagCode =
  | "insufficient_liquidity"
  | "horizon_mismatch"
  | "risk_capacity_mismatch"
  | "emotional_risk_mismatch"
  | "currency_mismatch"
  | "concentration_risk"
  | "crypto_exposure_risk"
  | "complexity_mismatch"
  | "volatility_risk"
  | "interest_rate_risk"
  | "inflation_risk"
  | "drawdown_risk";

export type AllocationRange = { min: number; max: number };

export type StrategyId =
  | "cash_reserve"
  | "capital_preservation"
  | "conservative_income"
  | "balanced_core"
  | "global_diversified_growth"
  | "dollar_cost_averaging"
  | "core_satellite"
  | "crypto_satellite";

export interface StrategyDefinition {
  strategyId: StrategyId;
  name: string;
  version: number;
  status: StrategyStatus;
  objective: InvestorObjective;
  naturalProfile: NaturalProfile;
  minimumHorizon: TimeHorizon;
  allowedLiquidityRequirements: LiquidityRequirement[];
  allowedKnowledgeLevels: FinancialKnowledge[];
  allowedComplexity: ComplexityAllowed[];
  allowedAssetClasses: AssetClass[];
  prohibitedInstruments: ProhibitedInstrument[];
  allocationRanges: Partial<Record<AssetClass, AllocationRange>>;
  maxCryptoExposurePct: number;
  maxSingleAssetExposurePct: number;
  maxSectorExposurePct: number;
  riskFlags: RiskFlagCode[];
  /** Static, LLM-free copy describing the strategy's design intent. */
  explanationTemplate: string;
  disclaimer: string;
}

const ALL_NON_CRYPTO_INSTRUMENTS: ProhibitedInstrument[] = [
  "crypto",
  "single_stocks",
  "options",
  "leverage",
  "margin",
  "short_selling",
  "defi",
  "illiquid_assets",
  "thematic_etfs",
];

export const STRATEGY_REGISTRY: readonly StrategyDefinition[] = [
  {
    strategyId: "cash_reserve",
    name: "Cash Reserve",
    version: 1,
    status: "approved_for_simulation",
    objective: "capital_preservation",
    naturalProfile: "very_conservative",
    minimumHorizon: "less_than_1y",
    allowedLiquidityRequirements: ["critical", "high", "medium", "low"],
    allowedKnowledgeLevels: ["basic", "intermediate", "advanced"],
    allowedComplexity: ["simple", "moderate", "advanced"],
    allowedAssetClasses: ["cash", "money_market"],
    prohibitedInstruments: ALL_NON_CRYPTO_INSTRUMENTS,
    allocationRanges: {
      cash: { min: 50, max: 100 },
      money_market: { min: 0, max: 50 },
    },
    maxCryptoExposurePct: 0,
    maxSingleAssetExposurePct: 100,
    maxSectorExposurePct: 100,
    riskFlags: ["inflation_risk"],
    explanationTemplate:
      "Cash Reserve holds simulated balances in cash and money-market instruments only. It is designed for capital that must remain available on short notice.",
    disclaimer: REQUIRED_DISCLOSURE,
  },
  {
    strategyId: "capital_preservation",
    name: "Capital Preservation",
    version: 1,
    status: "approved_for_simulation",
    objective: "capital_preservation",
    naturalProfile: "conservative",
    minimumHorizon: "less_than_1y",
    allowedLiquidityRequirements: ["critical", "high", "medium", "low"],
    allowedKnowledgeLevels: ["basic", "intermediate", "advanced"],
    allowedComplexity: ["simple", "moderate", "advanced"],
    allowedAssetClasses: ["cash", "money_market", "short_term_bonds"],
    prohibitedInstruments: ALL_NON_CRYPTO_INSTRUMENTS,
    allocationRanges: {
      cash: { min: 20, max: 40 },
      money_market: { min: 20, max: 40 },
      short_term_bonds: { min: 20, max: 60 },
    },
    maxCryptoExposurePct: 0,
    maxSingleAssetExposurePct: 60,
    maxSectorExposurePct: 60,
    riskFlags: ["interest_rate_risk", "inflation_risk"],
    explanationTemplate:
      "Capital Preservation blends cash, money-market instruments, and short-term bonds to simulate a low-volatility allocation focused on protecting principal.",
    disclaimer: REQUIRED_DISCLOSURE,
  },
  {
    strategyId: "conservative_income",
    name: "Conservative Income",
    version: 1,
    status: "approved_for_simulation",
    objective: "income_generation",
    naturalProfile: "conservative",
    minimumHorizon: "1_3y",
    allowedLiquidityRequirements: ["high", "medium", "low"],
    allowedKnowledgeLevels: ["basic", "intermediate", "advanced"],
    allowedComplexity: ["simple", "moderate", "advanced"],
    allowedAssetClasses: ["short_term_bonds", "aggregate_bonds", "dividend_equities", "reits"],
    prohibitedInstruments: ["crypto", "single_stocks", "options", "leverage", "margin", "short_selling", "defi", "illiquid_assets", "thematic_etfs"],
    allocationRanges: {
      short_term_bonds: { min: 20, max: 40 },
      aggregate_bonds: { min: 20, max: 40 },
      dividend_equities: { min: 10, max: 30 },
      reits: { min: 0, max: 20 },
    },
    maxCryptoExposurePct: 0,
    maxSingleAssetExposurePct: 40,
    maxSectorExposurePct: 40,
    riskFlags: ["interest_rate_risk", "inflation_risk", "volatility_risk"],
    explanationTemplate:
      "Conservative Income simulates a bond- and dividend-fund-heavy allocation designed around income generation rather than growth.",
    disclaimer: REQUIRED_DISCLOSURE,
  },
  {
    strategyId: "balanced_core",
    name: "Balanced Core",
    version: 1,
    status: "approved_for_simulation",
    objective: "wealth_growth",
    naturalProfile: "balanced",
    minimumHorizon: "3_5y",
    allowedLiquidityRequirements: ["high", "medium", "low"],
    allowedKnowledgeLevels: ["basic", "intermediate", "advanced"],
    allowedComplexity: ["simple", "moderate", "advanced"],
    allowedAssetClasses: ["aggregate_bonds", "us_equities", "global_equities", "international_equities"],
    prohibitedInstruments: ALL_NON_CRYPTO_INSTRUMENTS,
    allocationRanges: {
      aggregate_bonds: { min: 30, max: 50 },
      us_equities: { min: 20, max: 40 },
      global_equities: { min: 10, max: 30 },
      international_equities: { min: 0, max: 20 },
    },
    maxCryptoExposurePct: 0,
    maxSingleAssetExposurePct: 40,
    maxSectorExposurePct: 40,
    riskFlags: ["volatility_risk", "interest_rate_risk"],
    explanationTemplate:
      "Balanced Core simulates a diversified mix of bonds and broad equity funds intended as an all-purpose, moderate-risk baseline allocation.",
    disclaimer: REQUIRED_DISCLOSURE,
  },
  {
    strategyId: "global_diversified_growth",
    name: "Global Diversified Growth",
    version: 1,
    status: "approved_for_simulation",
    objective: "wealth_growth",
    naturalProfile: "growth",
    minimumHorizon: "5_10y",
    allowedLiquidityRequirements: ["medium", "low"],
    allowedKnowledgeLevels: ["intermediate", "advanced"],
    allowedComplexity: ["moderate", "advanced"],
    allowedAssetClasses: ["us_equities", "global_equities", "international_equities", "emerging_markets", "reits", "commodities"],
    prohibitedInstruments: ["crypto", "single_stocks", "options", "leverage", "margin", "short_selling", "defi"],
    allocationRanges: {
      us_equities: { min: 20, max: 35 },
      global_equities: { min: 20, max: 35 },
      international_equities: { min: 10, max: 25 },
      emerging_markets: { min: 5, max: 20 },
      reits: { min: 0, max: 15 },
      commodities: { min: 0, max: 10 },
    },
    maxCryptoExposurePct: 0,
    maxSingleAssetExposurePct: 35,
    maxSectorExposurePct: 35,
    riskFlags: ["volatility_risk", "concentration_risk", "drawdown_risk"],
    explanationTemplate:
      "Global Diversified Growth simulates a globally spread equity-heavy allocation across developed, international, and emerging markets, aimed at long-horizon growth.",
    disclaimer: REQUIRED_DISCLOSURE,
  },
  {
    strategyId: "dollar_cost_averaging",
    name: "Dollar-Cost Averaging",
    version: 1,
    status: "approved_for_simulation",
    objective: "wealth_growth",
    naturalProfile: "balanced",
    minimumHorizon: "3_5y",
    allowedLiquidityRequirements: ["high", "medium", "low"],
    allowedKnowledgeLevels: ["basic", "intermediate", "advanced"],
    allowedComplexity: ["simple", "moderate", "advanced"],
    allowedAssetClasses: ["us_equities", "global_equities", "aggregate_bonds"],
    prohibitedInstruments: ALL_NON_CRYPTO_INSTRUMENTS,
    allocationRanges: {
      us_equities: { min: 30, max: 50 },
      global_equities: { min: 20, max: 40 },
      aggregate_bonds: { min: 10, max: 30 },
    },
    maxCryptoExposurePct: 0,
    maxSingleAssetExposurePct: 50,
    maxSectorExposurePct: 50,
    riskFlags: ["volatility_risk"],
    explanationTemplate:
      "Dollar-Cost Averaging simulates fixed, regularly scheduled contributions into a broad equity-and-bond mix rather than a single lump-sum allocation.",
    disclaimer: REQUIRED_DISCLOSURE,
  },
  {
    strategyId: "core_satellite",
    name: "Core-Satellite",
    version: 1,
    status: "advisor_review_only",
    objective: "wealth_growth",
    naturalProfile: "growth",
    minimumHorizon: "5_10y",
    allowedLiquidityRequirements: ["medium", "low"],
    allowedKnowledgeLevels: ["intermediate", "advanced"],
    allowedComplexity: ["advanced"],
    allowedAssetClasses: ["us_equities", "global_equities", "international_equities", "emerging_markets", "thematic_etfs", "reits", "commodities", "gold"],
    prohibitedInstruments: ["crypto", "single_stocks", "options", "leverage", "margin", "short_selling", "defi", "illiquid_assets"],
    allocationRanges: {
      us_equities: { min: 15, max: 25 },
      global_equities: { min: 15, max: 25 },
      international_equities: { min: 10, max: 20 },
      emerging_markets: { min: 5, max: 15 },
      thematic_etfs: { min: 5, max: 15 },
      reits: { min: 0, max: 10 },
      commodities: { min: 0, max: 10 },
      gold: { min: 0, max: 10 },
    },
    maxCryptoExposurePct: 0,
    maxSingleAssetExposurePct: 25,
    maxSectorExposurePct: 25,
    riskFlags: ["volatility_risk", "concentration_risk", "drawdown_risk", "complexity_mismatch"],
    explanationTemplate:
      "Core-Satellite simulates a broad diversified core combined with smaller thematic satellite tilts. It requires advisor review before it may be simulated for an investor.",
    disclaimer: REQUIRED_DISCLOSURE,
  },
  {
    strategyId: "crypto_satellite",
    name: "Crypto Satellite",
    version: 1,
    status: "locked_advanced",
    objective: "controlled_speculation",
    naturalProfile: "speculative",
    minimumHorizon: "10y_plus",
    allowedLiquidityRequirements: ["low"],
    allowedKnowledgeLevels: ["advanced"],
    allowedComplexity: ["advanced"],
    allowedAssetClasses: ["us_equities", "global_equities", "bitcoin_crypto"],
    prohibitedInstruments: ["single_stocks", "options", "leverage", "margin", "short_selling", "defi", "illiquid_assets", "thematic_etfs"],
    allocationRanges: {
      us_equities: { min: 40, max: 60 },
      global_equities: { min: 30, max: 50 },
      bitcoin_crypto: { min: 0, max: 10 },
    },
    maxCryptoExposurePct: 10,
    maxSingleAssetExposurePct: 60,
    maxSectorExposurePct: 60,
    riskFlags: ["crypto_exposure_risk", "volatility_risk", "drawdown_risk", "concentration_risk"],
    explanationTemplate:
      "Crypto Satellite simulates a mostly-equity allocation with a small, capped bitcoin exposure sleeve. It is locked to advanced-only investors given its volatility and drawdown profile.",
    disclaimer: REQUIRED_DISCLOSURE,
  },
];

export function getStrategyById(strategyId: string): StrategyDefinition | undefined {
  return STRATEGY_REGISTRY.find((strategy) => strategy.strategyId === strategyId);
}

export function getActiveSimulationStrategies(): StrategyDefinition[] {
  return STRATEGY_REGISTRY.filter((strategy) => strategy.status === "approved_for_simulation");
}

export function getAdvisorReviewStrategies(): StrategyDefinition[] {
  return STRATEGY_REGISTRY.filter((strategy) => strategy.status === "advisor_review_only");
}

export function getLockedAdvancedStrategies(): StrategyDefinition[] {
  return STRATEGY_REGISTRY.filter((strategy) => strategy.status === "locked_advanced");
}
