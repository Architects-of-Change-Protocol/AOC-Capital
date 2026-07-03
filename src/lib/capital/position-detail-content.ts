// Static copy for /capital/positions/[id] — Position Detail & Lifecycle
// Timeline v1 (PR #16). Kept as plain data, mirroring
// allocation-exposure-content.ts / portfolio-overview-content.ts, so product
// copy stays easy to review independent of the page component's JSX and is
// testable without rendering React server components.

export const PAGE_TITLE = "Position Detail";

export const PAGE_SUBTITLE = "Read-only lifecycle view for a governed paper position. Real execution remains locked.";

export const GOVERNANCE_BADGES = ["Paper-only", "Real execution locked", "No broker connected", "No live order routing", "Read-only"] as const;

export const GOVERNANCE_NOTE = "This page is read-only. It does not refresh market data, open or close positions, submit drafts, or place orders.";

export const POSITION_HEADER_NOTE = "This is a simulated paper position. No real order was placed.";

export const DECISION_APPROVED_NOTE = "Risk Constitution approved this paper intent before the simulated position was opened.";

export const DECISION_MISSING_NOTE =
  "No linked Risk Constitution decision was found for this position. The position remains paper-only, but the approval record could not be resolved from available data.";

export const MTM_EMPTY_NOTE = "Detailed mark-to-market history is not available yet. Current valuation reflects the latest stored paper position state.";

export const EMPTY_NOT_AVAILABLE = "Not available yet.";
export const EMPTY_NO_AUDIT_EVENTS = "No related audit events found for this position.";
export const EMPTY_NO_TIMELINE = "No lifecycle events found for this position.";
export const MISSING_UPSTREAM_RECORD = "Missing upstream record.";

export const SECTION_TITLES = {
  positionHeader: "Position Header",
  currentSnapshot: "Current Position Snapshot",
  sourceChain: "Source Chain",
  riskConstitutionDecision: "Risk Constitution Decision",
  lifecycleTimeline: "Lifecycle Timeline",
  markToMarket: "Mark-to-Market / Valuation History",
  pnlBreakdown: "P&L Breakdown",
  auditTrail: "Audit Trail",
  governanceSafety: "Governance & Safety",
  relatedLinks: "Related Links",
} as const;

export const NAV_LINKS = {
  positions: "/capital/positions",
  allocation: "/capital/allocation",
  overview: "/capital/overview",
  tradeIntents: "/capital/trade-intents",
  signals: "/capital/signals",
  performance: "/capital/performance",
} as const;
