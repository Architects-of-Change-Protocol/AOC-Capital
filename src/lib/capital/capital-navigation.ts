// Single source of truth for AOC Capital MVP navigation (PR #23 — MVP Polish
// & Navigation Consolidation). Pure data, no mutation functions, so it can be
// unit-tested without rendering React server components and reused by the
// capital layout sidebar, the command center, and static navigation tests.
//
// This module is metadata only. It does not call any service, RPC, or
// mutation helper, and it does not decide what a page renders — pages still
// own their own content/copy. It exists to keep nav labels, grouping, and
// route metadata consistent and reviewable in one place.

export type CapitalRouteType = "setup" | "lifecycle" | "portfolio" | "performance" | "governance" | "detail";

export type CapitalRouteMode = "read_only" | "governed_action" | "mutation_flow" | "diagnostic" | "intake";

export interface CapitalRouteMetadata {
  key: string;
  label: string;
  href: string;
  group: string;
  description: string;
  type: CapitalRouteType;
  mode: CapitalRouteMode;
  paperOnly: true;
  realExecutionLocked: true;
  showInSidebar: boolean;
}

// ─── Route metadata ─────────────────────────────────────────────────────────
// Every user-facing AOC Capital route that should be discoverable somewhere
// in navigation. Dynamic detail routes (e.g. Position Detail) are included
// for documentation/testing purposes but are never shown in the sidebar —
// they are reached through tables and related links instead.

export const CAPITAL_ROUTE_METADATA: readonly CapitalRouteMetadata[] = [
  {
    key: "commandCenter",
    label: "Command Center",
    href: "/capital",
    group: "commandCenter",
    description: "Guided entry point into the governed paper-capital lifecycle.",
    type: "portfolio",
    mode: "read_only",
    paperOnly: true,
    realExecutionLocked: true,
    showInSidebar: true,
  },
  {
    key: "investorConstitution",
    label: "Investor Constitution",
    href: "/capital/constitution/new",
    group: "setup",
    description: "Educational intake that produces a non-binding, paper-only Investor Constitution.",
    type: "setup",
    mode: "intake",
    paperOnly: true,
    realExecutionLocked: true,
    showInSidebar: true,
  },
  {
    key: "strategyLibrary",
    label: "Strategy Library",
    href: "/capital/strategies",
    group: "setup",
    description: "Paper-only strategy profiles to select, govern, and review.",
    type: "setup",
    mode: "governed_action",
    paperOnly: true,
    realExecutionLocked: true,
    showInSidebar: true,
  },
  {
    key: "signals",
    label: "Signals",
    href: "/capital/signals",
    group: "lifecycle",
    description: "Deterministic, paper-only signal recommendations — signals recommend, governance decides.",
    type: "lifecycle",
    mode: "governed_action",
    paperOnly: true,
    realExecutionLocked: true,
    showInSidebar: true,
  },
  {
    key: "tradeIntents",
    label: "Trade Intents",
    href: "/capital/trade-intents",
    group: "lifecycle",
    description: "Draft trade intents awaiting cancellation or submission for Risk Constitution review.",
    type: "lifecycle",
    mode: "governed_action",
    paperOnly: true,
    realExecutionLocked: true,
    showInSidebar: true,
  },
  {
    key: "paperPositions",
    label: "Paper Positions",
    href: "/capital/positions",
    group: "lifecycle",
    description: "Open and closed simulated positions, with mark-to-market and governed close review.",
    type: "lifecycle",
    mode: "governed_action",
    paperOnly: true,
    realExecutionLocked: true,
    showInSidebar: true,
  },
  {
    key: "positionDetail",
    label: "Position Detail",
    href: "/capital/positions/[id]",
    group: "lifecycle",
    description: "Single-position lifecycle timeline, source chain, and governed close review. Reached from tables, not the sidebar.",
    type: "detail",
    mode: "governed_action",
    paperOnly: true,
    realExecutionLocked: true,
    showInSidebar: false,
  },
  {
    key: "portfolioOverview",
    label: "Portfolio Overview",
    href: "/capital/overview",
    group: "portfolio",
    description: "Read-only dashboard: strategy, signals, drafts, decisions, positions, and recent activity in one place.",
    type: "portfolio",
    mode: "read_only",
    paperOnly: true,
    realExecutionLocked: true,
    showInSidebar: true,
  },
  {
    key: "allocationExposure",
    label: "Allocation & Exposure",
    href: "/capital/allocation",
    group: "portfolio",
    description: "Read-only view of simulated paper exposure, concentration, and position contribution.",
    type: "portfolio",
    mode: "read_only",
    paperOnly: true,
    realExecutionLocked: true,
    showInSidebar: true,
  },
  {
    key: "closedPerformance",
    label: "Closed Performance",
    href: "/capital/performance/closed",
    group: "performance",
    description: "Realized simulated P&L and governance evidence for closed paper positions.",
    type: "performance",
    mode: "read_only",
    paperOnly: true,
    realExecutionLocked: true,
    showInSidebar: true,
  },
  {
    key: "strategyAttribution",
    label: "Strategy Attribution",
    href: "/capital/performance/strategies",
    group: "performance",
    description: "Strategy-level lifecycle funnel, realized/unrealized simulated P&L, and governance completeness.",
    type: "performance",
    mode: "read_only",
    paperOnly: true,
    realExecutionLocked: true,
    showInSidebar: true,
  },
  {
    key: "signalCohorts",
    label: "Signal Cohorts",
    href: "/capital/performance/signals",
    group: "performance",
    description: "Signal cohort conversion, review outcomes, and simulated P&L by generated signal.",
    type: "performance",
    mode: "read_only",
    paperOnly: true,
    realExecutionLocked: true,
    showInSidebar: true,
  },
  {
    key: "governanceSnapshot",
    label: "Governance Snapshot",
    href: "/capital/governance/snapshot",
    group: "governance",
    description: "Read-only governance health, evidence completeness, and paper-only safety posture — an internal MVP review aid.",
    type: "governance",
    mode: "diagnostic",
    paperOnly: true,
    realExecutionLocked: true,
    showInSidebar: true,
  },
  // ─── Additional tools: real, live-linked routes that sit outside the six
  // primary lifecycle/reporting zones above. Kept discoverable in a separate
  // sidebar group rather than removed, since removing a still-linked page is
  // a product decision out of scope for a polish PR.
  {
    key: "advisor",
    label: "Advisor",
    href: "/capital/advisor",
    group: "more",
    description: "Guided intake that produces a paper-only strategy brief and Level 1 Risk Constitution.",
    type: "setup",
    mode: "intake",
    paperOnly: true,
    realExecutionLocked: true,
    showInSidebar: true,
  },
  {
    key: "demoSandbox",
    label: "Demo Sandbox",
    href: "/capital/demo",
    group: "more",
    description: "One-click, deterministic governed paper scenario for demos.",
    type: "setup",
    mode: "governed_action",
    paperOnly: true,
    realExecutionLocked: true,
    showInSidebar: true,
  },
  {
    key: "strategyPerformanceLegacy",
    label: "Strategy Performance (legacy)",
    href: "/capital/performance",
    group: "more",
    description: "Win rate, profit factor, and drawdown review. Superseded by Strategy Attribution; kept live and read-only.",
    type: "performance",
    mode: "read_only",
    paperOnly: true,
    realExecutionLocked: true,
    showInSidebar: true,
  },
  {
    key: "marketSignals",
    label: "Market Signals",
    href: "/capital/market-signals",
    group: "more",
    description: "Read-only deterministic mock signal feed used ahead of the Signal Engine.",
    type: "lifecycle",
    mode: "diagnostic",
    paperOnly: true,
    realExecutionLocked: true,
    showInSidebar: true,
  },
  {
    key: "marketData",
    label: "Market Data",
    href: "/capital/market-data",
    group: "more",
    description: "Read-only live-public-or-simulated price feed used to mark paper positions.",
    type: "lifecycle",
    mode: "diagnostic",
    paperOnly: true,
    realExecutionLocked: true,
    showInSidebar: true,
  },
  {
    key: "riskConstitution",
    label: "Risk Constitution",
    href: "/capital/risk-constitution",
    group: "more",
    description: "Level 1 exposure, position, and loss limits enforced on every trade intent. Read-only in this MVP.",
    type: "governance",
    mode: "read_only",
    paperOnly: true,
    realExecutionLocked: true,
    showInSidebar: true,
  },
  {
    key: "capitalLevels",
    label: "Capital Levels",
    href: "/capital/capital-levels",
    group: "more",
    description: "Static simulated capital tiers for this portfolio.",
    type: "governance",
    mode: "read_only",
    paperOnly: true,
    realExecutionLocked: true,
    showInSidebar: true,
  },
  {
    key: "auditLedger",
    label: "Audit Ledger",
    href: "/capital/audit-ledger",
    group: "more",
    description: "Full, read-only event history for this workspace.",
    type: "governance",
    mode: "read_only",
    paperOnly: true,
    realExecutionLocked: true,
    showInSidebar: true,
  },
] as const;

// ─── Nav groups ──────────────────────────────────────────────────────────────
// The six product zones from the AOC Capital MVP navigation plan, plus a
// "more" group for additional tools that exist but aren't part of the
// primary Constitution → Strategy → Signals → Drafts → Positions →
// Performance → Governance journey.

export interface CapitalNavGroup {
  key: string;
  label: string;
  items: CapitalRouteMetadata[];
}

const GROUP_LABELS: Record<string, string> = {
  commandCenter: "Command Center",
  setup: "Setup",
  lifecycle: "Lifecycle",
  portfolio: "Portfolio",
  performance: "Performance",
  governance: "Governance",
  more: "More Tools",
};

const GROUP_ORDER = ["commandCenter", "setup", "lifecycle", "portfolio", "performance", "governance", "more"] as const;

export function getCapitalNavGroups(): CapitalNavGroup[] {
  return GROUP_ORDER.map((groupKey) => ({
    key: groupKey,
    label: GROUP_LABELS[groupKey],
    items: CAPITAL_ROUTE_METADATA.filter((route) => route.group === groupKey && route.showInSidebar),
  })).filter((group) => group.items.length > 0);
}

export function getCapitalRouteMetadata(routeKey: string): CapitalRouteMetadata | undefined {
  return CAPITAL_ROUTE_METADATA.find((route) => route.key === routeKey);
}

// ─── Related links ──────────────────────────────────────────────────────────
// Documents the intended safe-navigation related links for each canonical
// page, per the AOC Capital MVP navigation plan. This is a reference map for
// consistency tests; individual pages continue to own their own related-link
// JSX (see each `*-content.ts` NAV_LINKS export) so this does not force a
// large, risk-bearing refactor of already-shipped, tested pages.

export const CAPITAL_RELATED_LINKS: Record<string, readonly string[]> = {
  commandCenter: ["investorConstitution", "strategyLibrary", "signals", "portfolioOverview", "governanceSnapshot"],
  investorConstitution: ["strategyLibrary", "commandCenter", "governanceSnapshot"],
  strategyLibrary: ["investorConstitution", "signals", "strategyAttribution", "governanceSnapshot"],
  signals: ["tradeIntents", "signalCohorts", "strategyAttribution", "governanceSnapshot"],
  tradeIntents: ["signals", "paperPositions", "governanceSnapshot"],
  paperPositions: ["portfolioOverview", "allocationExposure", "closedPerformance", "governanceSnapshot"],
  positionDetail: ["paperPositions", "allocationExposure", "closedPerformance", "strategyAttribution", "signalCohorts", "governanceSnapshot"],
  portfolioOverview: ["allocationExposure", "paperPositions", "closedPerformance", "governanceSnapshot"],
  allocationExposure: ["portfolioOverview", "paperPositions", "governanceSnapshot"],
  closedPerformance: ["strategyAttribution", "signalCohorts", "governanceSnapshot"],
  strategyAttribution: ["closedPerformance", "signalCohorts", "governanceSnapshot"],
  signalCohorts: ["strategyAttribution", "closedPerformance", "governanceSnapshot"],
  governanceSnapshot: ["portfolioOverview", "allocationExposure", "closedPerformance", "strategyAttribution", "signalCohorts", "paperPositions"],
} as const;

export function getCapitalRelatedLinks(pageKey: string): CapitalRouteMetadata[] {
  const relatedKeys = CAPITAL_RELATED_LINKS[pageKey] ?? [];
  return relatedKeys
    .map((key) => getCapitalRouteMetadata(key))
    .filter((route): route is CapitalRouteMetadata => route !== undefined);
}

// ─── Safe navigation link labels ────────────────────────────────────────────
// Approved, navigation-only link copy. Never an action verb (Execute, Buy,
// Sell, Close, Convert, Submit) — those stay confined to the one governed
// action component each lifecycle page already owns.

export const SAFE_LINK_LABELS = {
  viewPortfolioOverview: "View Portfolio Overview",
  viewAllocation: "View Allocation",
  viewPositions: "View Positions",
  viewClosedPerformance: "View Closed Performance",
  viewStrategyAttribution: "View Strategy Attribution",
  viewSignalCohorts: "View Signal Cohorts",
  viewGovernanceSnapshot: "View Governance Snapshot",
  viewDetail: "View Detail",
  openPositionDetail: "Open Position Detail",
  viewLifecycle: "View Lifecycle",
} as const;
