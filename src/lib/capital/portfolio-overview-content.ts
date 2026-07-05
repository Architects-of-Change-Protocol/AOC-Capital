// Static copy for /capital/overview — the Portfolio Overview Dashboard.
// Kept as plain data, mirroring command-center-content.ts and
// signal-engine-content.ts, so product copy stays easy to review
// independent of the page component's JSX and is testable without
// rendering React server components.

export const PAGE_TITLE = "Portfolio Overview";

export const PAGE_SUBTITLE = "Governed paper-capital dashboard. Signals recommend, Risk Constitution decides, and real execution remains locked.";

export const GOVERNANCE_BADGES = ["Paper-only", "Real execution locked", "No broker connected", "No live order routing"] as const;

export const FRESHNESS_NOTE = "Data reflects the latest stored paper-capital state.";

export const REJECTED_DECISIONS_NOTE = "Rejected decisions are part of the governance loop. They show where Risk Constitution protected the paper portfolio.";

export const EMPTY_NO_OPEN_POSITIONS = "No open paper positions yet.";
export const EMPTY_NO_DRAFT_INTENTS = "No draft trade intents are waiting for action.";
export const EMPTY_NO_DECISIONS = "No recent Risk Constitution decisions yet.";
export const EMPTY_NO_SIGNALS = "No active signal recommendations yet.";
export const EMPTY_NO_ACTIVITY = "No recent activity yet.";
export const EMPTY_NO_STRATEGY_SELECTED = "Select a strategy to begin generating governed paper recommendations.";
export const EMPTY_NO_CANCELLED_DRAFTS = "No cancelled drafts yet.";

export const SECTION_TITLES = {
  portfolioSummary: "Portfolio Summary",
  strategySummary: "Selected Strategy",
  riskConstitutionStatus: "Risk Constitution Status",
  signalPipeline: "Signal Pipeline",
  draftIntentPipeline: "Draft Intent Pipeline",
  decisionSummary: "Decision Summary",
  openPaperPositions: "Open Paper Positions",
  performanceSnapshot: "Performance Snapshot",
  recentActivity: "Recent Activity",
  nextAction: "Recommended Next Action",
} as const;

export const NAV_LINKS = {
  signals: "/capital/signals",
  tradeIntents: "/capital/trade-intents",
  positions: "/capital/positions",
  strategyLibrary: "/capital/strategies",
  performance: "/capital/performance",
  allocation: "/capital/allocation",
  closedPerformance: "/capital/performance/closed",
  strategyAttribution: "/capital/performance/strategies",
} as const;
