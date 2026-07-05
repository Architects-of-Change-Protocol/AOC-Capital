// Static copy for /capital/performance/closed — Closed Position Performance &
// Realized P&L Reporting v1 (PR #18). Kept as plain data, mirroring
// allocation-exposure-content.ts and position-detail-content.ts, so product
// copy stays easy to review independent of the page component's JSX and is
// testable without rendering React server components.

export const PAGE_TITLE = "Closed Position Performance";

export const PAGE_SUBTITLE = "Read-only realized P&L reporting for governed paper positions. Real execution remains locked.";

export const GOVERNANCE_BADGES = [
  "Paper-only",
  "Realized simulation",
  "Read-only",
  "Real execution locked",
  "No broker connected",
  "No live order routing",
] as const;

export const HEADER_NOTE =
  "This page reports simulated realized P&L from closed paper positions. It does not close positions, refresh valuation, place orders, or connect to brokers.";

export const EMPTY_NO_CLOSED_POSITIONS =
  "No closed paper positions yet. Realized P&L reporting will appear after a governed paper close review closes a position.";

export const EMPTY_NOT_AVAILABLE = "Not available";

export const SIMULATED_PERFORMANCE_NOTE = "This is simulated paper performance only — a descriptive read of governed paper outcomes, not a real-world trading result.";

export const SOURCE_ATTRIBUTION_NOTE = "This section attributes simulated realized P&L only where the paper-governance source chain is available.";

export const GOVERNANCE_EVIDENCE_COMPLETE_NOTE =
  "Governed close evidence confirms that the simulated close followed AOC Capital's paper-only close review workflow.";

export const GOVERNANCE_EVIDENCE_MISSING_NOTE =
  "This closed paper position remains readable for historical reporting, but the governed close review evidence could not be resolved.";

export const METHODOLOGY_NOTES = [
  "Realized P&L uses recorded paper close values.",
  "Unrealized P&L uses latest stored paper valuation only.",
  "No live market data is fetched on this page.",
  "No mark-to-market update is triggered.",
  "No position can be closed from this page.",
  "No real order was placed.",
  "No broker is connected.",
  "Real execution remains locked.",
] as const;

export const READ_ONLY_NOTE = "This page is read-only and reports simulated paper performance only. It does not provide investment advice.";

export const SECTION_TITLES = {
  performanceHeader: "Performance Header",
  realizedPnlSummary: "Realized P&L Summary",
  realizedVsUnrealized: "Realized vs Unrealized Split",
  winLossFlat: "Win / Loss / Flat Summary",
  bySymbol: "Closed Performance by Symbol",
  bySource: "Closed Performance by Strategy / Source Chain",
  closedPositionHistory: "Closed Position History",
  governanceEvidence: "Governance Evidence",
  methodologySafety: "Methodology & Safety Notes",
  relatedLinks: "Related Links",
} as const;

export const LINK_COPY = {
  viewDetail: "View Detail",
  viewLifecycle: "View Lifecycle",
  openPositionDetail: "Open Position Detail",
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
  governanceSnapshot: "/capital/governance/snapshot",
} as const;

export const NAV_LABEL_CLOSED_PERFORMANCE = "Closed Performance";
