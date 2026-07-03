// AOC Capital Signal Engine v1 — shared types for the pure rules engine
// (signal-engine.ts) and its governed service layer (signal-engine-service.ts).
//
// A "signal" here is a paper-only recommendation, never an order and never a
// trade. Signals recommend. Governance decides. Humans confirm. Real
// execution remains locked — paperOnly and realExecutionLocked are fixed
// TypeScript literal types on every PaperSignalRecommendation, so a signal
// can never be constructed with real execution unlocked. Generating a signal
// never creates a trade intent and never opens a paper position; see
// signal-engine-service.ts for the one governed write path that persists
// generated signals and audits every generation.

/** Controlled, paper-only signal vocabulary. Never buy_now/sell_now/execute/place_order/create_order/trade_now/send_to_broker. */
export type SignalAction = "paper_buy_candidate" | "watch" | "reduce_exposure" | "avoid" | "no_action";

export const SIGNAL_ACTIONS: SignalAction[] = ["paper_buy_candidate", "watch", "reduce_exposure", "avoid", "no_action"];

/** Reflects paper-strategy alignment only. Not financial advice; does not authorize real execution. */
export type SignalStrength = "weak" | "moderate" | "strong";

export const SIGNAL_STRENGTHS: SignalStrength[] = ["weak", "moderate", "strong"];

export type SignalStatus = "active" | "expired" | "blocked_by_risk" | "superseded";

export const SIGNAL_STATUSES: SignalStatus[] = ["active", "expired", "blocked_by_risk", "superseded"];

/** The full set of source labels a signal's market price may be tagged with — always observation-only, paper-only. */
export type SignalMarketDataSource = "mock" | "live_public" | "disabled" | "fallback" | "cached" | "stale" | "unavailable";

export type PaperSignalRecommendation = {
  id: string;
  generatedAt: string;
  companyId?: string;
  portfolioId?: string;
  strategyKey: string;
  strategyName: string;
  symbol: string;
  action: SignalAction;
  status: SignalStatus;
  strength: SignalStrength;
  /** 0-100. */
  confidenceScore: number;
  suggestedNotionalUsd: number | null;
  marketPriceUsd: number | null;
  marketDataSource: SignalMarketDataSource;
  rationale: string[];
  riskNotes: string[];
  blockedReasons: string[];
  requiredUserAction: string;
  paperOnly: true;
  realExecutionLocked: true;
};

export type SignalEngineStrategyRiskProfile = "defensive" | "conservative" | "balanced" | "growth" | "research";

export type SignalEngineInput = {
  generatedAt: string;

  selectedStrategy: {
    key: string;
    name: string;
    riskProfile: SignalEngineStrategyRiskProfile;
    supportedSymbols: string[];
    allowedCapabilities: string[];
    blockedCapabilities: string[];
    paperOnly: true;
    realExecutionLocked: true;
  };

  marketPrices: Array<{
    symbol: string;
    priceUsd: number | null;
    asOf: string | null;
    source: SignalMarketDataSource;
    provider: string;
    paperOnly: true;
  }>;

  portfolioSummary: {
    baseCapitalUsd: number;
    simulatedEquityUsd: number;
    exposureUsd: number;
    /** Percent of base capital, 0-100 (not a 0-1 ratio) — matches the existing portfolio-summary.ts convention. */
    exposurePct: number;
    openPositionsCount: number;
    dailyRealizedLossUsedUsd: number;
    weeklyRealizedLossUsedUsd: number;
  };

  riskLimits: {
    /** May be stored as a 0-1 ratio (0.6) or a whole percent (60) — always normalize with normalizeExposureLimit() before comparing. */
    maxExposurePct: number;
    maxOpenPositions: number;
    maxDailyLossUsd: number;
    maxWeeklyLossUsd: number;
    leverageAllowed: false;
    shortsAllowed: false;
    realExecutionAllowed: false;
  };

  performanceContext?: {
    totalReturnPct: number;
    profitFactor: number | null;
    maxDrawdownPct: number;
    currentDrawdownPct: number;
    riskHealth: "healthy" | "caution" | "breach" | "unknown";
    recommendation: "continue_paper_monitoring" | "review_required" | "pause" | "unknown";
  } | null;
};
