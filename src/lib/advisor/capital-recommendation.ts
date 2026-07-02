// AOC Capital Advisor — recommended capital level.
// The user's stated starting capital is always clamped to a sandbox ceiling
// determined by their risk profile, so the advisor never recommends a larger
// simulated base capital than is prudent for that profile — regardless of how
// much the user says they'd start with.

import type { CapitalRecommendation, CapitalTier, RiskProfile } from "./types";

export const SANDBOX_CEILING_BY_RISK_PROFILE: Record<RiskProfile, number> = {
  conservative: 1000,
  balanced: 2500,
  growth: 5000,
  aggressive: 10000,
};

const DEFAULT_STARTING_CAPITAL_USD = 1000;

function tierFor(recommendedBaseCapitalUsd: number): CapitalTier {
  if (recommendedBaseCapitalUsd <= 1000) return "starter";
  if (recommendedBaseCapitalUsd <= 2500) return "standard";
  if (recommendedBaseCapitalUsd <= 5000) return "expanded";
  return "maximum";
}

export function recommendCapitalLevel(startingCapitalUsd: number, riskProfile: RiskProfile): CapitalRecommendation {
  const sandboxCeilingUsd = SANDBOX_CEILING_BY_RISK_PROFILE[riskProfile];
  const requested = Number.isFinite(startingCapitalUsd) && startingCapitalUsd > 0 ? startingCapitalUsd : DEFAULT_STARTING_CAPITAL_USD;
  const recommendedBaseCapitalUsd = Math.min(requested, sandboxCeilingUsd);
  const tier = tierFor(recommendedBaseCapitalUsd);

  const rationale =
    requested > sandboxCeilingUsd
      ? `Requested $${requested.toFixed(2)} exceeds the Level 1 sandbox ceiling for a ${riskProfile} risk profile, so the recommended starting simulated capital is capped at $${sandboxCeilingUsd.toFixed(2)}.`
      : `Requested $${requested.toFixed(2)} is within the Level 1 sandbox ceiling for a ${riskProfile} risk profile ($${sandboxCeilingUsd.toFixed(2)}), so it is used as-is.`;

  return { recommendedBaseCapitalUsd, tier, sandboxCeilingUsd, rationale };
}
