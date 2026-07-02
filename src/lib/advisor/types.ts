// AOC Capital Advisor — shared types.
// The advisor is a guided onboarding flow that turns eight questions into a
// Level 1, paper-only strategy recommendation. Nothing here ever unlocks real
// exchange execution — see capabilities.ts for the hard-coded blocklist.

export type PrimaryObjective = "capital_preservation" | "income" | "balanced_growth" | "aggressive_growth" | "speculation";
export type TimeHorizon = "short_term" | "medium_term" | "long_term";
export type RiskAppetite = "conservative" | "moderate" | "aggressive";
export type PreferredMarket = "crypto" | "equities" | "diversified";
export type AutonomyLevel = "manual_approval" | "assisted" | "full_auto";
export type TradingMode = "recommendations_only" | "paper_trading_automation";
export type RiskProfile = "conservative" | "balanced" | "growth" | "aggressive";
export type CapitalTier = "starter" | "standard" | "expanded" | "maximum";
export type SuggestedPaperTradingMode = "guided_manual" | "signal_assisted_manual";

/** Normalized answers to the eight advisor intake questions. */
export type AdvisorIntake = {
  startingCapitalUsd: number;
  primaryObjective: PrimaryObjective;
  timeHorizon: TimeHorizon;
  riskAppetite: RiskAppetite;
  maxTolerableDrawdownPct: number;
  preferredMarkets: PreferredMarket[];
  autonomyLevel: AutonomyLevel;
  tradingMode: TradingMode;
  wantsGatedRealExecution: boolean;
};

export type AdvisorCapabilities = {
  allowed: string[];
  blocked: string[];
};

export type AdvisorConstitutionRule = {
  rule_key: string;
  label: string;
  limit_value: number | null;
  level: number;
  description: string;
};

export type CapitalRecommendation = {
  recommendedBaseCapitalUsd: number;
  tier: CapitalTier;
  sandboxCeilingUsd: number;
  rationale: string;
};

export type StrategyBrief = {
  headline: string;
  summary: string;
  objective: PrimaryObjective;
  timeHorizon: TimeHorizon;
  riskProfile: RiskProfile;
  recommendedBaseCapitalUsd: number;
  allowedCapabilities: string[];
  blockedCapabilities: string[];
  suggestedPaperTradingMode: SuggestedPaperTradingMode;
  recommendationMessage: string;
};

export type AdvisorRecommendation = {
  intake: AdvisorIntake;
  riskProfile: RiskProfile;
  capitalRecommendation: CapitalRecommendation;
  capabilities: AdvisorCapabilities;
  constitution: AdvisorConstitutionRule[];
  brief: StrategyBrief;
};
