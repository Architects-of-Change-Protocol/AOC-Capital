// AOC Capital Strategy Library — static, paper-only strategy catalog (PR #8).
//
// Pure data + pure functions, no I/O. Every StrategyLibraryItem is a fixed
// literal: paperOnly: true and realExecutionLocked: true are TypeScript
// literal types, so no strategy can ever be constructed with real execution
// unlocked. A selected strategy is display/governance context only — nothing
// in this module places, prepares, signs, or routes an order, and nothing
// here creates a trade intent or paper position. See
// src/lib/capital/strategy-selection-service.ts for the governed write path
// that persists a user's selection and writes the strategy_selected audit
// event; that service re-derives everything from getStrategyByKey() here and
// never trusts client-supplied strategy details.

export type StrategyRiskProfile = "defensive" | "conservative" | "balanced" | "growth" | "research";

export type StrategyStatus = "available" | "locked" | "research_only";

export type StrategyLibraryItem = {
  key: string;
  name: string;
  description: string;
  objective: string;
  riskProfile: StrategyRiskProfile;
  status: StrategyStatus;
  suggestedCapitalLevel: string;
  supportedSymbols: string[];
  timeHorizon: string;
  bestFor: string[];
  allowedCapabilities: string[];
  blockedCapabilities: string[];
  paperOnly: true;
  realExecutionLocked: true;
};

/** The only symbols any strategy in this library may reference — the same crypto majors the Demo Sandbox and live public market data feed cover. */
export const APPROVED_STRATEGY_SYMBOLS = ["BTC-USD", "ETH-USD", "SOL-USD", "AVAX-USD"] as const;

/**
 * Every strategy must block every one of these, with no exceptions — enforced
 * by assertStrategyIsPaperOnly() below and by
 * tests/aoc-capital-strategy-library.test.mjs. Selecting a strategy can never
 * grant real execution, a broker connection, trading credentials,
 * withdrawals, or live order routing.
 */
export const ALWAYS_BLOCKED_STRATEGY_CAPABILITIES = [
  "real_execution",
  "broker_integration",
  "trading_api_keys",
  "withdrawals",
  "live_order_routing",
  "real_money_trading",
] as const;

const GOVERNANCE_BLOCKED_CAPABILITIES = [
  ...ALWAYS_BLOCKED_STRATEGY_CAPABILITIES,
  "leverage",
  "shorts",
] as const;

const STRATEGY_LIBRARY: readonly StrategyLibraryItem[] = [
  {
    key: "conservative_crypto_trend",
    name: "Conservative Crypto Trend",
    description:
      "A cautious paper-only trend-following strategy focused on crypto majors. It prefers long/cash exposure, avoids leverage, avoids shorts, and prioritizes capital preservation.",
    objective: "Progressive growth with strict downside control.",
    riskProfile: "conservative",
    status: "available",
    suggestedCapitalLevel: "Level 1: Governed Paper Sandbox",
    supportedSymbols: ["BTC-USD", "ETH-USD"],
    timeHorizon: "Multi-day to multi-week trend following",
    bestFor: ["New users", "Low-risk users", "Users validating AOC Capital governance"],
    allowedCapabilities: [
      "paper_trading_only",
      "long_cash_simulation",
      "btc_eth_exposure",
      "mark_to_market_using_observed_or_mock_prices",
      "risk_constitution_evaluation_before_any_paper_position",
    ],
    blockedCapabilities: [...GOVERNANCE_BLOCKED_CAPABILITIES],
    paperOnly: true,
    realExecutionLocked: true,
  },
  {
    key: "btc_eth_momentum",
    name: "BTC/ETH Momentum",
    description: "A paper-only momentum strategy that tracks BTC and ETH strength and simulates exposure when momentum is constructive.",
    objective: "Capture simulated upside in major crypto assets while staying within Level 1 limits.",
    riskProfile: "balanced",
    status: "available",
    suggestedCapitalLevel: "Level 1: Governed Paper Sandbox",
    supportedSymbols: ["BTC-USD", "ETH-USD"],
    timeHorizon: "Multi-day momentum swing",
    bestFor: ["Users comfortable with crypto volatility", "Users who still require strict governance"],
    allowedCapabilities: [
      "paper_trading_only",
      "long_cash_simulation",
      "momentum_based_paper_recommendations",
      "max_exposure_constrained_by_risk_constitution",
      "performance_review_before_any_future_unlock",
    ],
    blockedCapabilities: [...GOVERNANCE_BLOCKED_CAPABILITIES],
    paperOnly: true,
    realExecutionLocked: true,
  },
  {
    key: "crypto_majors_rotation",
    name: "Crypto Majors Rotation",
    description:
      "A broader paper-only rotation strategy across supported crypto majors. It compares relative strength among BTC, ETH, SOL, and AVAX while respecting exposure and position-count limits.",
    objective: "Explore simulated rotation among leading crypto assets.",
    riskProfile: "growth",
    status: "available",
    suggestedCapitalLevel: "Level 1 / Level 2 paper expansion",
    supportedSymbols: ["BTC-USD", "ETH-USD", "SOL-USD", "AVAX-USD"],
    timeHorizon: "Multi-week rotation",
    bestFor: ["Users who want broader paper exposure", "Users who want to keep real execution locked"],
    allowedCapabilities: [
      "paper_trading_only",
      "long_cash_simulation",
      "relative_strength_paper_recommendations",
      "max_3_open_paper_positions_in_level_1",
      "max_exposure_controlled_by_risk_constitution",
    ],
    blockedCapabilities: [...GOVERNANCE_BLOCKED_CAPABILITIES],
    paperOnly: true,
    realExecutionLocked: true,
  },
  {
    key: "risk_off_cash_mode",
    name: "Risk-Off Cash Mode",
    description:
      "A defensive paper-only strategy that prioritizes simulated cash when market conditions are weak, risk limits are pressured, or the portfolio performance review deteriorates.",
    objective: "Preserve simulated capital and reduce exposure during unfavorable conditions.",
    riskProfile: "defensive",
    status: "available",
    suggestedCapitalLevel: "Level 1: Governed Paper Sandbox",
    supportedSymbols: ["BTC-USD", "ETH-USD", "SOL-USD", "AVAX-USD"],
    timeHorizon: "Reactive — defensive posture, no fixed horizon",
    bestFor: ["Users who want a conservative fallback strategy", "Users concerned about drawdown or elevated loss usage"],
    allowedCapabilities: [
      "paper_trading_only",
      "reduce_simulated_exposure",
      "avoid_new_paper_positions_when_risk_elevated",
      "recommend_cash_no_trade_posture",
      "respect_performance_review_warnings",
    ],
    blockedCapabilities: [...GOVERNANCE_BLOCKED_CAPABILITIES],
    paperOnly: true,
    realExecutionLocked: true,
  },
  {
    key: "bear_market_research_mode",
    name: "Bear Market Research Mode",
    description:
      "A research-only paper strategy for studying bearish market conditions. In Level 1, it does not enable shorts. It can surface bearish observations and rejected short intents to demonstrate governance, but actual short exposure remains blocked.",
    objective: "Study downside conditions without enabling short execution in Level 1.",
    riskProfile: "research",
    status: "research_only",
    suggestedCapitalLevel: "Research mode only",
    supportedSymbols: ["BTC-USD", "ETH-USD", "SOL-USD", "AVAX-USD"],
    timeHorizon: "N/A — research and observation only",
    bestFor: ["Users who want to understand how AOC Capital blocks risky behavior under Level 1 governance"],
    allowedCapabilities: [
      "paper_only_market_observation",
      "bearish_market_commentary",
      "rejected_short_intent_demonstrations",
      "cash_no_trade_recommendations",
      "risk_constitution_education",
    ],
    blockedCapabilities: [
      "real_execution",
      "real_shorts",
      "paper_shorts_in_level_1",
      "leverage",
      "broker_integration",
      "trading_api_keys",
      "withdrawals",
      "live_order_routing",
      "real_money_trading",
    ],
    paperOnly: true,
    realExecutionLocked: true,
  },
];

/** Returns a fresh copy of the full strategy catalog — never a live reference callers could mutate. */
export function getStrategyLibrary(): StrategyLibraryItem[] {
  return STRATEGY_LIBRARY.map((strategy) => ({ ...strategy, supportedSymbols: [...strategy.supportedSymbols], bestFor: [...strategy.bestFor], allowedCapabilities: [...strategy.allowedCapabilities], blockedCapabilities: [...strategy.blockedCapabilities] }));
}

/** Strategies a user can select today — excludes any strategy explicitly marked "locked" for a future release. Research-only strategies remain selectable so users can see governance demonstrated. */
export function getAvailableStrategies(): StrategyLibraryItem[] {
  return getStrategyLibrary().filter((strategy) => strategy.status !== "locked");
}

/** Looks up a strategy by its stable key, or null if unknown. Never throws. */
export function getStrategyByKey(key: string): StrategyLibraryItem | null {
  const strategy = STRATEGY_LIBRARY.find((item) => item.key === key);
  return strategy ? { ...strategy, supportedSymbols: [...strategy.supportedSymbols], bestFor: [...strategy.bestFor], allowedCapabilities: [...strategy.allowedCapabilities], blockedCapabilities: [...strategy.blockedCapabilities] } : null;
}

export type StrategySelectionValidation = { ok: true; strategy: StrategyLibraryItem } | { ok: false; error: string };

/**
 * Validates a (possibly client-supplied) strategy key against the static
 * library. This is the only gate a selection has to pass — callers must
 * always re-derive the full strategy config from the returned `strategy`,
 * never from anything the client sent alongside the key.
 */
export function validateStrategySelection(key: unknown): StrategySelectionValidation {
  if (typeof key !== "string" || key.trim().length === 0) {
    return { ok: false, error: "strategyKey is required." };
  }
  const strategy = getStrategyByKey(key);
  if (!strategy) {
    return { ok: false, error: `Unknown strategy key: ${key}` };
  }
  if (strategy.status === "locked") {
    return { ok: false, error: `Strategy "${key}" is locked and cannot be selected yet.` };
  }
  return { ok: true, strategy };
}

/**
 * Machine-checkable guardrail: throws if a strategy is missing any
 * paper-only/real-execution-locked guarantee. Used by tests and by the
 * selection service as a defense-in-depth check before persisting a
 * selection, on top of the type system's paperOnly: true / realExecutionLocked: true literals.
 */
export function assertStrategyIsPaperOnly(strategy: StrategyLibraryItem): void {
  if (strategy.paperOnly !== true) {
    throw new Error(`Strategy ${strategy.key} does not have paperOnly: true.`);
  }
  if (strategy.realExecutionLocked !== true) {
    throw new Error(`Strategy ${strategy.key} does not have realExecutionLocked: true.`);
  }
  for (const capability of ALWAYS_BLOCKED_STRATEGY_CAPABILITIES) {
    if (!strategy.blockedCapabilities.includes(capability)) {
      throw new Error(`Strategy ${strategy.key} must block capability "${capability}".`);
    }
  }
  for (const symbol of strategy.supportedSymbols) {
    if (!(APPROVED_STRATEGY_SYMBOLS as readonly string[]).includes(symbol)) {
      throw new Error(`Strategy ${strategy.key} references unsupported symbol "${symbol}".`);
    }
  }
}
