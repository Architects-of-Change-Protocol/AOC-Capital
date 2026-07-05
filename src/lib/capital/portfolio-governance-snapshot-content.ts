// Static copy for /capital/governance/snapshot — Portfolio Governance
// Snapshot v1 (PR #21). Kept as plain data, mirroring
// signal-cohort-outcome-content.ts / strategy-performance-attribution-content.ts,
// so product copy stays easy to review independent of the page component's
// JSX and is testable without rendering React server components.

export const PAGE_TITLE = "Portfolio Governance Snapshot";

export const PAGE_SUBTITLE = "Read-only governance health, evidence completeness, and paper-only safety posture for this simulated portfolio.";

export const GOVERNANCE_BADGES = [
  "Paper-only",
  "Read-only",
  "Governance snapshot",
  "Real execution locked",
  "No broker connected",
  "No live order routing",
  "No advice",
  "MVP review aid",
] as const;

export const HEADER_NOTE =
  "This snapshot summarizes governance evidence and readiness gaps across the paper-capital lifecycle. It does not generate signals, change positions, refresh valuation, place orders, or provide investment advice.";

export const PAPER_ONLY_BOUNDARY_NOTE = "The snapshot itself performs no mutation and does not connect to any execution venue.";

export const EMPTY_NOT_AVAILABLE = "Not available";

export const EMPTY_NO_GAPS = "No unlinked, incomplete, or historical records to report yet.";

export const SOURCE_CHAIN_COMPLETENESS_NOTE = "Source-chain completeness measures whether records can be traced across the paper lifecycle without guessing.";

export const MVP_READINESS_NOTE = "This readiness view is for internal MVP integration review only. It does not indicate readiness for real trading or external execution.";

export const SIMULATED_PNL_NOTE = "This is simulated paper P&L only — a descriptive read of governed paper outcomes, not a real-world trading result.";

export const METHODOLOGY_NOTES = [
  "Snapshot uses only stored paper-capital records.",
  "Snapshot does not mutate data.",
  "Snapshot does not fetch live market data.",
  "Snapshot does not generate signals.",
  "Snapshot does not create or submit drafts.",
  "Snapshot does not run Risk Constitution review.",
  "Snapshot does not close positions.",
  "Snapshot does not create audit events.",
  "Snapshot does not call the LLM.",
  "Snapshot does not provide investment advice.",
  "Realized P&L uses recorded paper close values.",
  "Unrealized P&L uses latest stored valuation only.",
  "Source-chain completeness is based on stored relationships only.",
  "No source attribution is inferred from symbol alone.",
  "Real execution remains locked.",
] as const;

export const READ_ONLY_NOTE = "This page is read-only and reports simulated paper governance only. It does not provide investment advice.";

export const SECTION_TITLES = {
  header: "Governance Snapshot Header",
  executiveSummary: "Executive Governance Summary",
  paperOnlyBoundary: "Paper-Only Boundary Evidence",
  lifecycleCompleteness: "Lifecycle Completeness",
  sourceChainCompleteness: "Source-Chain Completeness",
  auditEvidence: "Audit Evidence Summary",
  openExposure: "Open Exposure & Risk Posture",
  simulatedPnl: "Realized / Unrealized Simulated P&L Summary",
  strategyAttributionHealth: "Strategy Attribution Health",
  signalCohortHealth: "Signal Cohort Health",
  governanceGaps: "Unlinked / Incomplete / Historical Records",
  mvpReadiness: "MVP Integration Review Readiness",
  methodologySafety: "Methodology & Safety Notes",
  relatedLinks: "Related Links",
} as const;

export const LINK_COPY = {
  viewOverview: "View Portfolio Overview",
  viewAllocation: "View Allocation",
  viewClosedPerformance: "View Closed Performance",
  viewStrategyAttribution: "View Strategy Attribution",
  viewSignalCohorts: "View Signal Cohorts",
  viewPositions: "View Positions",
  viewSignals: "View Signals",
  viewTradeIntents: "View Trade Intents",
  viewStrategyLibrary: "View Strategy Library",
  viewInvestorConstitution: "View Investor Constitution",
  viewDetail: "View Detail",
  openPositionDetail: "Open Position Detail",
  viewLifecycle: "View Lifecycle",
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
  investorConstitution: "/capital/constitution/new",
} as const;

export const NAV_LABEL_GOVERNANCE_SNAPSHOT = "Governance Snapshot";
