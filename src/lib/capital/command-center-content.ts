// Static copy and navigation data for the /capital Capital Command Center.
// Kept as plain data (not JSX) so it can be unit-tested without rendering
// React server components, and so the page component stays a thin view
// over content that's easy to review and keep in sync with product copy.

export const PAPER_ONLY_BANNER = "Paper only · Simulation mode · No real money is being traded";

export const WHAT_IS_AOC_CAPITAL =
  "AOC Capital is a governed paper-trading workspace. An advisor turns your intake into a strategy brief and a Level 1 Risk Constitution, every trade intent is evaluated by the risk policy engine before it can become a position, and a Strategy Performance Review scores the results — all inside a simulated portfolio.";

export const WHAT_PAPER_TRADING_MEANS =
  "Paper trading means every position, fill, and profit-or-loss figure in this product is simulated. Trade intents are evaluated by real governance logic and positions are marked to a live public market price when a read-only price feed is available, or a deterministic simulated price otherwise, but no order is ever sent to a real exchange or broker, and no real money moves.";

export const WHY_REAL_EXECUTION_IS_LOCKED =
  "Real execution stays locked until a strategy has been proven safe under governance: enough closed paper trades, a healthy risk profile, and an explicit readiness review. There are no broker integrations, no API keys, and no live order routing anywhere in this product today — real execution is a future, separately gated capability, not a setting you can turn on. An optional, read-only live public market data feed may inform paper-trading prices, but it never grants order routing, account access, or broker connectivity.";

export const NOT_FINANCIAL_ADVICE_DISCLOSURE =
  "This is simulation and governance tooling, not financial advice. No real money is traded, no broker or exchange is connected, and no API keys are required to use any part of this product.";

export const LIVE_MARKET_DATA_DISCLOSURE =
  "AOC Capital may use a live public, read-only market data feed to price paper positions more realistically and give strategy context. Observed prices are used for paper-trading simulation only, no broker or exchange account is connected, no orders can be placed, and real execution remains locked. This never enables real trading: no broker or exchange is connected, no trading credentials are stored or requested, and no order is ever placed, prepared, signed, or routed.";

export interface CommandCenterAction {
  href: string;
  label: string;
  description: string;
}

export const PRIMARY_ACTIONS: CommandCenterAction[] = [
  {
    href: "/capital/advisor",
    label: "Start Advisor",
    description: "Answer a few questions and get a strategy brief, risk profile, and Level 1 Risk Constitution.",
  },
  {
    href: "/capital/strategies",
    label: "Choose Strategy",
    description: "Select a paper-only strategy profile for AOC Capital to simulate, govern, and evaluate.",
  },
  {
    href: "/capital/demo",
    label: "Load Demo Strategy",
    description: "See the whole product story in one click — advisor, risk decisions, positions, P&L, and the audit ledger.",
  },
  {
    href: "/capital/performance",
    label: "Review Performance",
    description: "Win rate, profit factor, drawdown, and an advisor recommendation on continuing, adjusting, or pausing.",
  },
  {
    href: "/capital/signals",
    label: "Generate Signals",
    description: "Deterministic, paper-only strategy signal recommendations — signals recommend, governance decides, humans confirm.",
  },
];

export interface GuidedJourneyStep {
  step: number;
  title: string;
  description: string;
  href: string | null;
  locked?: boolean;
}

export const GUIDED_JOURNEY: GuidedJourneyStep[] = [
  {
    step: 1,
    title: "Advisor Intake",
    description: "Answer guided questions about goals, risk tolerance, and constraints.",
    href: "/capital/advisor",
  },
  {
    step: 2,
    title: "Strategy Brief",
    description: "The advisor turns your intake into a headline, summary, and recommended capital level.",
    href: "/capital/advisor",
  },
  {
    step: 3,
    title: "Strategy Library",
    description: "Choose a paper-only strategy profile — objective, risk profile, symbols, and allowed/blocked capabilities.",
    href: "/capital/strategies",
  },
  {
    step: 4,
    title: "Signal Engine",
    description: "Deterministic, paper-only signal recommendations from your selected strategy, market data, portfolio state, and the Risk Constitution.",
    href: "/capital/signals",
  },
  {
    step: 5,
    title: "Risk Constitution",
    description: "A Level 1 policy — exposure, position, and loss limits — enforced on every trade intent.",
    href: "/capital/risk-constitution",
  },
  {
    step: 6,
    title: "Demo Sandbox",
    description: "Load one coherent, governed paper scenario to see every stage below already populated.",
    href: "/capital/demo",
  },
  {
    step: 7,
    title: "Trade Intents",
    description: "Submit trade intents; each is evaluated live by the risk policy engine, approved or rejected.",
    href: "/capital/trade-intents",
  },
  {
    step: 8,
    title: "Paper Positions",
    description: "Approved intents open paper positions, marked to a live public market price when available, or a deterministic simulated price otherwise.",
    href: "/capital/positions",
  },
  {
    step: 9,
    title: "Strategy Performance",
    description: "Win rate, profit factor, and drawdown computed from your paper trade history.",
    href: "/capital/performance",
  },
  {
    step: 10,
    title: "Audit Ledger",
    description: "Every intent, decision, and position event recorded in order, in one place.",
    href: "/capital/audit-ledger",
  },
  {
    step: 11,
    title: "Real Execution Readiness — Locked",
    description: "No broker integration, API keys, or live order routing exist yet. Real execution stays locked and gated for a future review.",
    href: null,
    locked: true,
  },
];

export type TrustLadderStatus = "active" | "available" | "locked";

export interface TrustLadderLevel {
  level: number;
  title: string;
  description: string;
  status: TrustLadderStatus;
}

export const TRUST_LADDER: TrustLadderLevel[] = [
  {
    level: 1,
    title: "Paper Simulation",
    description: "Every trade intent runs through the Level 1 risk policy engine and settles as a paper position only.",
    status: "active",
  },
  {
    level: 2,
    title: "Expanded Paper Strategy",
    description: "Advisor-guided intake, manual trade intents, and the Demo Strategy Sandbox exercise richer paper strategies under the same governance.",
    status: "available",
  },
  {
    level: 3,
    title: "Performance Readiness Review",
    description: "Strategy Performance Review scores win rate, profit factor, and drawdown into an explicit advisor recommendation.",
    status: "available",
  },
  {
    level: 4,
    title: "Gated Real Execution",
    description: "Locked and reserved for the future. No broker integration, API keys, withdrawals, or live order routing exist in this product.",
    status: "locked",
  },
];

export interface CommandCenterLink {
  href: string;
  label: string;
  description: string;
}

export const DISCOVERABILITY_LINKS: CommandCenterLink[] = [
  { href: "/capital/advisor", label: "Advisor", description: "Guided intake, strategy brief, and risk profile." },
  { href: "/capital/strategies", label: "Strategy Library", description: "Paper-only strategy profiles to simulate, govern, and review." },
  { href: "/capital/signals", label: "Signal Engine", description: "Deterministic, paper-only strategy signal recommendations — never an order, never a trade." },
  { href: "/capital/demo", label: "Demo Sandbox", description: "One-click governed paper scenario." },
  { href: "/capital/performance", label: "Strategy Performance", description: "Win rate, profit factor, drawdown, advisor recommendation." },
  { href: "/capital/risk-constitution", label: "Risk Constitution", description: "Level 1 rules enforced on every trade intent." },
  { href: "/capital/positions", label: "Paper Positions", description: "Open and closed simulated positions, mark-to-market." },
  { href: "/capital/market-data", label: "Market Data", description: "Live public-or-simulated price feed used to mark paper positions — read-only, no trading." },
  { href: "/capital/audit-ledger", label: "Audit Ledger", description: "Full event history for this workspace." },
];
