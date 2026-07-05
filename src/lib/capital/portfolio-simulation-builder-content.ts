// AOC Capital — Portfolio Simulation Builder (/capital/simulations/new) — copy
// module. Kept separate from the page/content component so the exact wording
// (and the fact that it stays free of investment-advice / execution
// language) can be tested without rendering React, mirroring the pattern
// used for /capital/constitution/result
// (src/lib/capital/investor-constitution-result-content.ts).

import type { RebalanceFrequency } from "@/features/capital/domain/portfolio-simulation-builder";

export const PAGE_TITLE = "Build a Paper Portfolio Simulation";

export const PAGE_SUBTITLE =
  "Use your Investor Constitution and an approved strategy to create a hypothetical allocation. This is educational paper trading only and not investment advice.";

export const STATUS_BADGE_PAPER_ONLY = "Paper trading only";
export const STATUS_BADGE_NO_REAL_ORDER = "No real order";
export const STATUS_BADGE_REAL_EXECUTION_LOCKED = "Real execution locked";

export const NO_CONSTITUTION_HEADING = "Create an Investor Constitution before building a simulation.";
export const NO_CONSTITUTION_COPY =
  "AOC Capital needs your Investor Constitution to determine which paper strategies can be simulated.";
export const NO_CONSTITUTION_CTA = "Create Investor Constitution";

export const SECTION_TITLE_CONSTITUTION_SUMMARY = "Your Investor Constitution";

export const SECTION_TITLE_STRATEGY_SELECTION = "Select an approved paper strategy";

export const STRATEGY_GROUP_TITLES = {
  requiresAdvisorReview: "Requires advisor review",
  blockedByConstitution: "Blocked by Investor Constitution",
  lockedAdvanced: "Advanced / locked",
  deprecatedOrBlocked: "Deprecated / blocked",
} as const;

export const SECTION_TITLE_ASSUMPTIONS = "Simulation Assumptions";

export const ASSUMPTIONS_LABELS = {
  initialAmount: "Initial simulated amount",
  monthlyContribution: "Monthly simulated contribution",
  timeHorizonYears: "Simulation horizon",
  rebalanceFrequency: "Rebalance frequency",
} as const;

export const REBALANCE_FREQUENCY_LABELS: Record<RebalanceFrequency, string> = {
  none: "No rebalancing",
  monthly: "Monthly",
  quarterly: "Quarterly",
  semiannual: "Every 6 months",
  annual: "Annual",
};

export const DEFAULT_INITIAL_AMOUNT = 10000;
export const DEFAULT_MONTHLY_CONTRIBUTION = 0;
export const DEFAULT_TIME_HORIZON_YEARS = 5;
export const DEFAULT_REBALANCE_FREQUENCY: RebalanceFrequency = "quarterly";

export const SECTION_TITLE_ALLOCATION = "Hypothetical Allocation";

export const ALLOCATION_GENERATED_NOTE =
  "This allocation is generated from the selected strategy's approved ranges and your Investor Constitution.";

export const ALLOCATION_TOTAL_LABEL = "Total allocation";
export const ALLOCATION_TOTAL_REQUIREMENT_NOTE = "Must equal 100%";

export const CTA_VALIDATE = "Validate Paper Simulation";
export const CTA_CREATE_SIMULATION_RECORD = "Create Simulation Record";
export const CTA_CREATE_SIMULATION_RECORD_DISABLED_REASON = "Simulation record persistence comes next.";

export const SECTION_TITLE_VALIDATION = "Paper Simulation Validation";
export const VALIDATION_VALID_HEADING = "Valid paper simulation draft";
export const VALIDATION_VALID_COPY =
  "This draft passed allocation and constitution checks. It remains a paper simulation. No real order will be placed.";
export const VALIDATION_INVALID_HEADING = "Invalid paper simulation draft";

export const SAFETY_FOOTER_LINES = [
  "Paper trading only.",
  "Not investment advice.",
  "Real execution locked.",
  "No real order will be placed.",
];
