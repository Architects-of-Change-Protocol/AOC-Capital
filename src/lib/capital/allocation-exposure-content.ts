// Static copy for /capital/allocation — the Allocation & Exposure views.
// Kept as plain data, mirroring portfolio-overview-content.ts, so product
// copy stays easy to review independent of the page component's JSX and is
// testable without rendering React server components.

export const PAGE_TITLE = "Allocation & Exposure";

export const PAGE_SUBTITLE =
  "Read-only view of simulated paper exposure, concentration, and position contribution. Real execution remains locked.";

export const GOVERNANCE_BADGES = ["Paper-only", "Real execution locked", "No broker connected", "No live order routing"] as const;

export const GOVERNANCE_NOTE = "This page is read-only. It does not generate signals, submit drafts, open positions, or enable execution.";

export const EMPTY_NO_OPEN_POSITIONS =
  "No open paper positions yet. Allocation will appear after governed paper positions are approved and opened through the paper simulation flow.";
export const EMPTY_NO_BASE_CAPITAL = "Cash vs invested split is not available because base capital is not modeled for this portfolio.";
export const EMPTY_NO_RISK_LIMIT = "Risk limit proximity is not available yet.";
export const EMPTY_NO_CURRENT_PRICE = "Not available yet.";
export const EMPTY_NO_UNREALIZED_PNL = "No unrealized P&L yet.";
export const EMPTY_NO_NOTES = "No exposure notes yet.";

export const CASH_DERIVED_NOTE = "Derived from base capital and open paper exposure.";

export const SECTION_TITLES = {
  allocationSummary: "Allocation Summary",
  exposureBySymbol: "Exposure by Symbol",
  positionContribution: "Position Contribution",
  concentrationRiskProximity: "Concentration & Risk Proximity",
  cashVsInvested: "Cash vs Invested Simulation",
  pnlContribution: "P&L Contribution",
  allocationTable: "Allocation Table",
  exposureNotes: "Exposure Notes",
} as const;

export const NAV_LINKS = {
  overview: "/capital/overview",
  positions: "/capital/positions",
  tradeIntents: "/capital/trade-intents",
  closedPerformance: "/capital/performance/closed",
  strategyAttribution: "/capital/performance/strategies",
  signalCohorts: "/capital/performance/signals",
} as const;
