// AOC Capital — Investor Constitution Result (/capital/constitution/result) —
// copy module. Kept separate from the result component so the exact wording
// (and the fact that it stays free of investment-advice / execution
// language) can be tested without rendering React, mirroring the pattern
// used for /capital/constitution/new
// (src/lib/capital/investor-constitution-intake-content.ts).

export const PAGE_TITLE = "Your Investor Constitution v0.1";

export const PAGE_SUBTITLE =
  "Built from your answers to guide educational paper-trading simulations. This is not investment advice.";

export const STATUS_BADGE_PAPER_ONLY = "Paper trading only";
export const STATUS_BADGE_REAL_EXECUTION_LOCKED = "Real execution locked";
export const STATUS_BADGE_HUMAN_REVIEW_REQUIRED = "Human review required";
export const STATUS_BADGE_HUMAN_REVIEW_NOT_REQUIRED = "Human review not required";

export const SECTION_TITLE_SUMMARY = "Constitution Summary";
export const SECTION_TITLE_READING = "AOC Reading";
export const SECTION_TITLE_ELIGIBILITY = "Strategy Eligibility";

export const ELIGIBILITY_SECTION_TITLES = {
  availableForSimulation: "Available for paper simulation",
  blockedByConstitution: "Blocked by Investor Constitution",
  requiresAdvisorReview: "Requires advisor review",
  lockedAdvanced: "Advanced / locked",
  deprecatedOrBlocked: "Deprecated / blocked",
} as const;

export const EMPTY_STATE_NO_STRATEGIES =
  "No strategies are currently available for paper simulation under this Investor Constitution. You can edit your answers or review the blocked reasons.";

export const EMPTY_STATE_ONLY_CASH =
  "Your current constitution prioritizes liquidity. AOC is limiting strategy access to cash-focused simulations.";

export const NO_CONSTITUTION_FOUND_MESSAGE =
  "We couldn't find a generated Investor Constitution for this browser session. Build one first to see your strategy eligibility.";

export const CTA_CONTINUE_TO_SIMULATION = "Continue to Strategy Simulation";
export const CTA_CONTINUE_TO_SIMULATION_DISABLED_REASON = "Simulation builder comes next";

export const ACTION_EDIT_ANSWERS = "Edit answers";
export const ACTION_START_OVER = "Start over";

export const PAPER_ONLY_DISCLAIMER_NOTE =
  "This is a hypothetical, educational paper-trading simulation — not investment advice.";
