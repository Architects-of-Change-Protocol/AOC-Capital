// Static copy for /capital/performance/signals — Signal Cohort Outcome
// Tracking v1 (PR #20). Kept as plain data, mirroring
// strategy-performance-attribution-content.ts, so product copy stays easy to
// review independent of the page component's JSX and is testable without
// rendering React server components.

export const PAGE_TITLE = "Signal Cohort Outcomes";

export const PAGE_SUBTITLE =
  "Read-only tracking of how paper signal recommendations moved through the governed simulation lifecycle. Real execution remains locked.";

export const GOVERNANCE_BADGES = [
  "Paper-only",
  "Signal cohorts",
  "Read-only",
  "Real execution locked",
  "No broker connected",
  "No live order routing",
  "No advice",
] as const;

export const HEADER_NOTE =
  "This page tracks simulated outcomes for paper signal recommendations only where the source chain is available. It does not generate signals, create drafts, place orders, or provide investment advice.";

export const EMPTY_NOT_AVAILABLE = "Not available";

export const EMPTY_NO_SIGNAL_COHORTS = "No signal cohort activity yet. Cohorts will appear once paper signal recommendations are generated for this portfolio.";

export const LIFECYCLE_FUNNEL_NOTE = "This is a signal lifecycle funnel, not signal advice.";

export const SIMULATED_OUTCOME_NOTE = "This is a simulated paper outcome distribution — a descriptive read of governed paper outcomes, not a real-world trading result.";

export const GOVERNANCE_COMPLETENESS_NOTE =
  "Source-chain completeness measures how much of the simulated paper lifecycle can be traced from a signal recommendation to downstream outcomes.";

export const UNCONVERTED_INCOMPLETE_HISTORICAL_NOTE =
  "These records remain visible for historical reporting, but AOC Capital could not resolve a complete signal outcome chain.";

export const METHODOLOGY_NOTES = [
  "Cohort tracking uses only stored paper-capital records.",
  "Signal outcomes are tracked only when source-chain links are available.",
  "No outcome is inferred from symbol alone.",
  "Realized P&L uses recorded paper close values.",
  "Unrealized P&L uses latest stored valuation only.",
  "No live market data is fetched on this page.",
  "No mark-to-market update is triggered.",
  "No signal is generated from this page.",
  "No trade intent is created from this page.",
  "No position can be closed from this page.",
  "No real order was placed.",
  "No broker is connected.",
  "Real execution remains locked.",
] as const;

export const READ_ONLY_NOTE = "This page is read-only and reports simulated paper outcomes only. It does not provide investment advice.";

export const SECTION_TITLES = {
  cohortHeader: "Signal Cohort Header",
  outcomeSummary: "Signal Outcome Summary",
  lifecycleFunnel: "Signal Lifecycle Funnel",
  cohortConversionRates: "Cohort Conversion Rates",
  riskReviewOutcomes: "Risk Review Outcomes by Signal Cohort",
  positionOutcomes: "Position Outcomes by Signal Cohort",
  realizedPnl: "Realized P&L by Signal Cohort",
  unrealizedPnl: "Unrealized P&L / Open Exposure by Signal Cohort",
  governanceCompleteness: "Governance & Source-Chain Completeness",
  cohortTable: "Signal Cohort Table",
  unconvertedIncompleteHistorical: "Unconverted / Incomplete / Historical Signals",
  methodologySafety: "Methodology & Safety Notes",
  relatedLinks: "Related Links",
} as const;

export const LINK_COPY = {
  viewSignals: "View Signals",
  viewSourceChain: "View Source Chain",
  viewPositions: "View Positions",
  viewStrategyAttribution: "View Strategy Attribution",
  viewClosedPerformance: "View Closed Performance",
  viewDetail: "View Detail",
} as const;

export const NAV_LINKS = {
  overview: "/capital/overview",
  allocation: "/capital/allocation",
  positions: "/capital/positions",
  signals: "/capital/signals",
  tradeIntents: "/capital/trade-intents",
  strategies: "/capital/strategies",
  performance: "/capital/performance",
  closedPerformance: "/capital/performance/closed",
  strategyAttribution: "/capital/performance/strategies",
  signalCohorts: "/capital/performance/signals",
} as const;

export const NAV_LABEL_SIGNAL_COHORTS = "Signal Cohorts";
