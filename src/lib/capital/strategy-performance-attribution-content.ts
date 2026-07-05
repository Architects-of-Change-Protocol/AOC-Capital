// Static copy for /capital/performance/strategies — Strategy-Level
// Performance Attribution v1 (PR #19). Kept as plain data, mirroring
// closed-position-performance-content.ts, so product copy stays easy to
// review independent of the page component's JSX and is testable without
// rendering React server components.

export const PAGE_TITLE = "Strategy Performance Attribution";

export const PAGE_SUBTITLE = "Read-only attribution of simulated paper outcomes by traceable strategy source chain. Real execution remains locked.";

export const GOVERNANCE_BADGES = [
  "Paper-only",
  "Strategy attribution",
  "Read-only",
  "Real execution locked",
  "No broker connected",
  "No live order routing",
  "No advice",
] as const;

export const HEADER_NOTE =
  "This page attributes simulated paper outcomes to strategies only where the source chain is available. It does not generate signals, change allocations, place orders, or provide investment advice.";

export const EMPTY_NOT_AVAILABLE = "Not available";

export const EMPTY_NO_ATTRIBUTED_STRATEGIES = "No attributable strategy activity yet. Attribution will appear once signals, drafts, and positions resolve back to a strategy source chain.";

export const LIFECYCLE_FUNNEL_NOTE = "This is a lifecycle attribution funnel, not strategy advice.";

export const SIMULATED_OUTCOME_NOTE = "This is a simulated paper outcome distribution — a descriptive read of governed paper outcomes, not a real-world trading result.";

export const GOVERNANCE_COMPLETENESS_NOTE = "Attribution completeness measures how much of the simulated paper lifecycle can be traced back to a strategy source chain.";

export const UNLINKED_RECORDS_NOTE = "These records remain visible for historical reporting, but AOC Capital could not resolve a complete strategy source chain for attribution.";

export const METHODOLOGY_NOTES = [
  "Attribution uses only stored paper-capital records.",
  "Realized P&L uses recorded paper close values.",
  "Unrealized P&L uses latest stored valuation only.",
  "Strategy attribution is only assigned when the source chain is traceable.",
  "No source attribution is inferred from symbol alone.",
  "No live market data is fetched on this page.",
  "No mark-to-market update is triggered.",
  "No signal is generated from this page.",
  "No trade intent is created from this page.",
  "No position can be closed from this page.",
  "No real order was placed.",
  "No broker is connected.",
  "Real execution remains locked.",
] as const;

export const READ_ONLY_NOTE = "This page is read-only and reports simulated paper performance only. It does not provide investment advice.";

export const SECTION_TITLES = {
  attributionHeader: "Attribution Header",
  attributionSummary: "Strategy Attribution Summary",
  lifecycleFunnel: "Lifecycle Funnel by Strategy",
  realizedPnl: "Realized P&L by Strategy",
  unrealizedPnl: "Unrealized P&L / Open Exposure by Strategy",
  winLossFlat: "Strategy Win / Loss / Flat Summary",
  governanceCompleteness: "Governance & Source-Chain Completeness",
  attributionTable: "Strategy Attribution Table",
  unlinkedHistorical: "Unlinked / Historical Records",
  methodologySafety: "Methodology & Safety Notes",
  relatedLinks: "Related Links",
} as const;

export const LINK_COPY = {
  viewStrategy: "View Strategy",
  viewSourceChain: "View Source Chain",
  viewPositions: "View Positions",
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

export const NAV_LABEL_STRATEGY_ATTRIBUTION = "Strategy Attribution";
