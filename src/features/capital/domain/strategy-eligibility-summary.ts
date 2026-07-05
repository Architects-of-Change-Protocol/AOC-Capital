// AOC Capital Strategy Playbook — Strategy Eligibility Summary (v0.1).
//
// Connects an Investor Constitution to the Strategy Registry and the
// Suitability Consistency Engine, grouping every registry strategy into
// exactly one eligibility bucket for display on the constitution result
// page. This module does not duplicate suitability rules — it only calls
// evaluateStrategySuitability and sorts the result. It never creates a
// simulation, trade intent, or recommendation.

import type { InvestorConstitution } from "./investor-constitution-schema";
import { STRATEGY_REGISTRY, type AllocationRange, type AssetClass, type RiskFlagCode, type StrategyStatus } from "./strategy-registry";
import { evaluateStrategySuitability, type SuitabilityResult } from "./suitability-rules";
import type { InvestorObjective } from "./investor-constitution-schema";

export type StrategyEligibilityCard = {
  strategyId: string;
  name: string;
  version: number;
  status: StrategyStatus;
  objective: InvestorObjective;
  allowed: boolean;
  suitability: SuitabilityResult;
  riskFlags: RiskFlagCode[];
  allocationRangeSummary: string;
  explanationTemplate: string;
  disclaimer: string;
};

export type StrategyEligibilitySummary = {
  availableForSimulation: StrategyEligibilityCard[];
  blockedByConstitution: StrategyEligibilityCard[];
  requiresAdvisorReview: StrategyEligibilityCard[];
  lockedAdvanced: StrategyEligibilityCard[];
  deprecatedOrBlocked: StrategyEligibilityCard[];
};

function formatAllocationRange(assetClass: AssetClass, range: AllocationRange): string {
  return `${assetClass.replace(/_/g, " ")} ${range.min}-${range.max}%`;
}

function buildAllocationRangeSummary(allocationRanges: Partial<Record<AssetClass, AllocationRange>>): string {
  const entries = Object.entries(allocationRanges) as [AssetClass, AllocationRange][];
  if (entries.length === 0) return "No allocation range defined.";
  return entries.map(([assetClass, range]) => formatAllocationRange(assetClass, range)).join(", ");
}

/**
 * Evaluates every strategy in the registry against a constitution and groups
 * it into exactly one eligibility bucket:
 *  - deprecated/blocked status always lands in deprecatedOrBlocked
 *  - locked_advanced status always lands in lockedAdvanced (it is locked
 *    regardless of suitability)
 *  - anything the Suitability Consistency Engine blocks lands in
 *    blockedByConstitution
 *  - advisor_review_only strategies that are allowed (or warning-only) land
 *    in requiresAdvisorReview
 *  - approved_for_simulation strategies that are allowed land in
 *    availableForSimulation
 */
export function buildStrategyEligibilitySummary(constitution: InvestorConstitution): StrategyEligibilitySummary {
  const summary: StrategyEligibilitySummary = {
    availableForSimulation: [],
    blockedByConstitution: [],
    requiresAdvisorReview: [],
    lockedAdvanced: [],
    deprecatedOrBlocked: [],
  };

  for (const strategy of STRATEGY_REGISTRY) {
    const suitability = evaluateStrategySuitability(constitution, strategy);

    const card: StrategyEligibilityCard = {
      strategyId: strategy.strategyId,
      name: strategy.name,
      version: strategy.version,
      status: strategy.status,
      objective: strategy.objective,
      allowed: suitability.allowed,
      suitability,
      riskFlags: strategy.riskFlags,
      allocationRangeSummary: buildAllocationRangeSummary(strategy.allocationRanges),
      explanationTemplate: strategy.explanationTemplate,
      disclaimer: strategy.disclaimer,
    };

    if (strategy.status === "deprecated" || strategy.status === "blocked") {
      summary.deprecatedOrBlocked.push(card);
      continue;
    }

    if (strategy.status === "locked_advanced") {
      summary.lockedAdvanced.push(card);
      continue;
    }

    if (!suitability.allowed) {
      summary.blockedByConstitution.push(card);
      continue;
    }

    if (strategy.status === "advisor_review_only") {
      summary.requiresAdvisorReview.push(card);
      continue;
    }

    if (strategy.status === "approved_for_simulation") {
      summary.availableForSimulation.push(card);
      continue;
    }

    // Any other status (e.g. draft) is not yet ready to be shown as
    // available — default to the conservative bucket.
    summary.blockedByConstitution.push(card);
  }

  return summary;
}
