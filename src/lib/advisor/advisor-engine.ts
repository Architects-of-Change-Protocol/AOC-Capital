// AOC Capital Advisor — top-level pure orchestrator.
// Combines intake classification, risk profiling, capital recommendation,
// capability derivation, constitution generation, and brief generation into a
// single AdvisorRecommendation. No I/O — safe to call for a stateless preview
// as well as immediately before the governed write path persists the result.

import { recommendCapitalLevel } from "./capital-recommendation";
import { deriveCapabilities } from "./capabilities";
import { generateInitialRiskConstitution } from "./constitution";
import { mapRiskProfile } from "./risk-profile";
import { generateStrategyBrief } from "./strategy-brief";
import type { AdvisorIntake, AdvisorRecommendation } from "./types";

export function runAdvisorRecommendation(intake: AdvisorIntake): AdvisorRecommendation {
  const riskProfile = mapRiskProfile(intake);
  const capitalRecommendation = recommendCapitalLevel(intake.startingCapitalUsd, riskProfile);
  const capabilities = deriveCapabilities(intake);
  const constitution = generateInitialRiskConstitution(riskProfile);
  const brief = generateStrategyBrief({ intake, riskProfile, capitalRecommendation, capabilities });

  return { intake, riskProfile, capitalRecommendation, capabilities, constitution, brief };
}
