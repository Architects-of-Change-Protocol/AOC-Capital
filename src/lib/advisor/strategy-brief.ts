// AOC Capital Advisor — Investment Strategy Brief generation.

import type { AdvisorCapabilities, AdvisorIntake, CapitalRecommendation, RiskProfile, StrategyBrief, SuggestedPaperTradingMode } from "./types";

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const OBJECTIVE_COPY: Record<AdvisorIntake["primaryObjective"], string> = {
  capital_preservation: "preserving capital",
  income: "generating steady simulated income",
  balanced_growth: "balanced growth",
  aggressive_growth: "aggressive growth",
  speculation: "speculative, high-conviction positioning",
};

const HORIZON_COPY: Record<AdvisorIntake["timeHorizon"], string> = {
  short_term: "a short-term (under 1 year) horizon",
  medium_term: "a medium-term (1-5 year) horizon",
  long_term: "a long-term (5+ year) horizon",
};

export function suggestPaperTradingMode(intake: AdvisorIntake): SuggestedPaperTradingMode {
  if (intake.tradingMode === "paper_trading_automation" && intake.autonomyLevel !== "manual_approval") {
    // No automation engine exists in this PR — the closest available mode is
    // signal-assisted manual submission, still gated by the risk policy engine.
    return "signal_assisted_manual";
  }
  return "guided_manual";
}

export function generateStrategyBrief(input: {
  intake: AdvisorIntake;
  riskProfile: RiskProfile;
  capitalRecommendation: CapitalRecommendation;
  capabilities: AdvisorCapabilities;
}): StrategyBrief {
  const { intake, riskProfile, capitalRecommendation, capabilities } = input;
  const suggestedPaperTradingMode = suggestPaperTradingMode(intake);
  const markets = intake.preferredMarkets.join(", ");

  return {
    headline: `${capitalize(riskProfile)} paper-trading strategy — Level 1 Governed Paper Sandbox`,
    summary:
      `Targeting ${OBJECTIVE_COPY[intake.primaryObjective]} over ${HORIZON_COPY[intake.timeHorizon]}, ` +
      `with a ${riskProfile} risk profile across ${markets}. Starting simulated capital: $${capitalRecommendation.recommendedBaseCapitalUsd.toFixed(2)}. ` +
      `All trading is simulated paper trading, governed by the Level 1 risk policy engine — no real exchange execution is connected.`,
    objective: intake.primaryObjective,
    timeHorizon: intake.timeHorizon,
    riskProfile,
    recommendedBaseCapitalUsd: capitalRecommendation.recommendedBaseCapitalUsd,
    allowedCapabilities: capabilities.allowed,
    blockedCapabilities: capabilities.blocked,
    suggestedPaperTradingMode,
    recommendationMessage: "Based on your answers, I recommend starting in Level 1: Governed Paper Sandbox.",
  };
}
