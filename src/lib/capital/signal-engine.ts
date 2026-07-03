// AOC Capital Signal Engine v1 — deterministic, transparent, paper-only
// rules engine.
//
// generatePaperSignals() and every helper below are pure functions: no I/O,
// no database, no network, no ML/LLM/black-box scoring, no execution logic,
// no broker/exchange abstraction. Every recommendation is fully explainable
// from this file alone. See src/lib/capital/signal-engine-service.ts for the
// governed orchestration layer that builds SignalEngineInput from live data,
// persists the result, and writes the signals_generated audit event.
//
// Signals recommend. Governance decides. Humans confirm. Real execution
// remains locked:
//   - a signal never creates a trade intent or opens a paper position
//   - a signal never suggests leverage or a short
//   - a "paper_buy_candidate" is downgraded to "avoid"/status
//     "blocked_by_risk" whenever it would violate the Risk Constitution,
//     never silently suppressed — a blocked signal is governance evidence
//   - every signal carries paperOnly: true and realExecutionLocked: true

import { randomUUID } from "node:crypto";
import type { PaperSignalRecommendation, SignalAction, SignalEngineInput, SignalStatus, SignalStrength } from "./signal-engine-types";
import { SIGNAL_ACTIONS, SIGNAL_STATUSES, SIGNAL_STRENGTHS } from "./signal-engine-types";

/** Below this, a paper buy candidate is not worth surfacing as an actionable size — see the minimum-threshold rule in the PR spec. */
const MIN_MEANINGFUL_NOTIONAL_USD = 25;

/**
 * Shown (as both rationale and a risk note) whenever a would-be
 * paper_buy_candidate is downgraded because the Strategy Performance Review
 * recommends "review_required" — e.g. a fresh portfolio with too few closed
 * paper trades to judge, or a strategy the advisor flagged for review. This
 * is a softer, evidentiary downgrade (status stays "active", action becomes
 * "watch") — distinct from the hard Risk Constitution gate below, which uses
 * status "blocked_by_risk" for actual limit violations (breach/pause).
 */
const REVIEW_REQUIRED_DOWNGRADE_NOTE = "Performance review requires more paper evidence before new paper buy candidates are recommended.";

const REQUIRED_USER_ACTION_BY_ACTION: Record<SignalAction, string> = {
  paper_buy_candidate: "Review only. Convert to a draft trade intent if you choose to act on this signal — this creates a draft only; it does not submit for Risk Constitution review and does not open a paper position.",
  watch: "Continue observing.",
  reduce_exposure: "Reduce simulated exposure manually if appropriate.",
  avoid: "No action recommended.",
  no_action: "No action recommended.",
};

/**
 * Normalizes a risk-limit ratio that may be stored as a whole percent (60)
 * or as a 0-1 ratio (0.6) into a 0-1 ratio. Values <= 1 are assumed to
 * already be a ratio; values > 1 are assumed to be a percent and divided by
 * 100. Non-finite or non-positive input normalizes to 0 (no exposure room),
 * never negative or NaN.
 */
export function normalizeExposureLimit(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value > 1 ? value / 100 : value;
}

/** How much simulated capital, in dollars, remains before base capital's max-exposure ceiling would be reached. Never negative. */
export function calculateAvailableExposureUsd(input: SignalEngineInput): number {
  const maxExposureRatio = normalizeExposureLimit(input.riskLimits.maxExposurePct);
  const maxExposureUsd = input.portfolioSummary.baseCapitalUsd * maxExposureRatio;
  return Math.max(0, maxExposureUsd - input.portfolioSummary.exposureUsd);
}

type SizingRule = (availableExposureUsd: number, baseCapitalUsd: number) => number | null;

/** One entry per strategy in src/lib/capital/strategy-library.ts. An unknown key (or a strategy this engine has no sizing rule for yet) always sizes to null — never a guess. */
const STRATEGY_SIZING_RULES: Record<string, SizingRule> = {
  conservative_crypto_trend: (availableExposureUsd, baseCapitalUsd) => Math.min(availableExposureUsd, baseCapitalUsd * 0.05, 150),
  btc_eth_momentum: (availableExposureUsd, baseCapitalUsd) => Math.min(availableExposureUsd, baseCapitalUsd * 0.08, 250),
  crypto_majors_rotation: (availableExposureUsd, baseCapitalUsd) => Math.min(availableExposureUsd, baseCapitalUsd * 0.07, 220),
  risk_off_cash_mode: () => null,
  bear_market_research_mode: () => null,
};

/**
 * Strategy-specific paper-only sizing, capped by available exposure room and
 * a strategy-specific ceiling. Applies the $25 minimum-meaningful-size floor:
 * anything smaller rounds down to null rather than surfacing a
 * not-actually-actionable dollar figure. Never negative.
 */
export function calculateSuggestedNotionalUsd(strategyKey: string, input: SignalEngineInput): number | null {
  const rule = STRATEGY_SIZING_RULES[strategyKey];
  if (!rule) return null;
  const availableExposureUsd = calculateAvailableExposureUsd(input);
  const raw = rule(availableExposureUsd, input.portfolioSummary.baseCapitalUsd);
  if (raw === null) return null;
  const rounded = Math.max(0, Math.round(raw * 100) / 100);
  if (rounded < MIN_MEANINGFUL_NOTIONAL_USD) return null;
  return rounded;
}

type RiskSnapshot = {
  maxExposureRatio: number;
  currentExposureRatio: number;
  exposureHeadroomRatio: number;
  positionsHeadroom: number;
  dailyLossUsedRatio: number;
  weeklyLossUsedRatio: number;
  performanceHealthy: boolean;
  performanceCautionOrWorse: boolean;
  performanceBreachOrPause: boolean;
};

/** Read-only snapshot of how much headroom the portfolio has against the Risk Constitution and the Strategy Performance Review, in ratio terms. Used by both the strategy-specific "is it even worth considering a buy" pre-checks and the hard risk gate below. */
function computeRiskSnapshot(input: SignalEngineInput): RiskSnapshot {
  const maxExposureRatio = normalizeExposureLimit(input.riskLimits.maxExposurePct);
  const currentExposureRatio = input.portfolioSummary.exposurePct / 100;
  const exposureHeadroomRatio = maxExposureRatio - currentExposureRatio;
  const positionsHeadroom = input.riskLimits.maxOpenPositions - input.portfolioSummary.openPositionsCount;
  const dailyLossUsedRatio = input.riskLimits.maxDailyLossUsd > 0 ? input.portfolioSummary.dailyRealizedLossUsedUsd / input.riskLimits.maxDailyLossUsd : 0;
  const weeklyLossUsedRatio = input.riskLimits.maxWeeklyLossUsd > 0 ? input.portfolioSummary.weeklyRealizedLossUsedUsd / input.riskLimits.maxWeeklyLossUsd : 0;

  const riskHealth = input.performanceContext?.riskHealth ?? null;
  const recommendation = input.performanceContext?.recommendation ?? null;

  return {
    maxExposureRatio,
    currentExposureRatio,
    exposureHeadroomRatio,
    positionsHeadroom,
    dailyLossUsedRatio,
    weeklyLossUsedRatio,
    performanceHealthy: riskHealth === "healthy" || riskHealth === null,
    performanceCautionOrWorse: riskHealth === "caution" || riskHealth === "breach",
    performanceBreachOrPause: riskHealth === "breach" || recommendation === "pause",
  };
}

/**
 * The hard Risk Constitution gate every paper_buy_candidate must clear.
 * Checks every rule (doesn't short-circuit) so a blocked signal always
 * carries the full rationale, mirroring evaluateTradeIntent() in
 * risk-policy-engine.ts. A non-empty return means the candidate must be
 * downgraded to avoid/blocked_by_risk — never silently dropped.
 */
function checkRiskGateForBuyCandidate(input: SignalEngineInput, suggestedNotionalUsd: number | null, snapshot: RiskSnapshot): string[] {
  const reasons: string[] = [];
  const { riskLimits, portfolioSummary, performanceContext } = input;

  if (riskLimits.realExecutionAllowed !== false) reasons.push("Real execution is not permitted at Level 1 (realExecutionAllowed must be false).");
  if (riskLimits.leverageAllowed !== false) reasons.push("Leverage is not permitted at Level 1 (leverageAllowed must be false).");
  if (riskLimits.shortsAllowed !== false) reasons.push("Shorts are not permitted at Level 1 (shortsAllowed must be false).");

  if (portfolioSummary.openPositionsCount >= riskLimits.maxOpenPositions) {
    reasons.push(`Open paper positions (${portfolioSummary.openPositionsCount}) are at or above the max open positions limit (${riskLimits.maxOpenPositions}).`);
  }

  if (snapshot.currentExposureRatio >= snapshot.maxExposureRatio) {
    reasons.push(
      `Current exposure (${(snapshot.currentExposureRatio * 100).toFixed(1)}%) is at or above the max exposure limit (${(snapshot.maxExposureRatio * 100).toFixed(1)}%).`
    );
  }

  if (suggestedNotionalUsd !== null && portfolioSummary.baseCapitalUsd > 0) {
    const projectedRatio = (portfolioSummary.exposureUsd + suggestedNotionalUsd) / portfolioSummary.baseCapitalUsd;
    if (projectedRatio > snapshot.maxExposureRatio) {
      reasons.push(
        `Adding a suggested $${suggestedNotionalUsd.toFixed(2)} paper position would push exposure to ${(projectedRatio * 100).toFixed(1)}%, above the max exposure limit (${(
          snapshot.maxExposureRatio * 100
        ).toFixed(1)}%).`
      );
    }
  }

  if (portfolioSummary.dailyRealizedLossUsedUsd >= riskLimits.maxDailyLossUsd) {
    reasons.push(
      `Daily realized loss usage ($${portfolioSummary.dailyRealizedLossUsedUsd.toFixed(2)}) is at or beyond the daily loss limit ($${riskLimits.maxDailyLossUsd.toFixed(2)}).`
    );
  }

  if (portfolioSummary.weeklyRealizedLossUsedUsd >= riskLimits.maxWeeklyLossUsd) {
    reasons.push(
      `Weekly realized loss usage ($${portfolioSummary.weeklyRealizedLossUsedUsd.toFixed(2)}) is at or beyond the weekly loss limit ($${riskLimits.maxWeeklyLossUsd.toFixed(
        2
      )}).`
    );
  }

  if (performanceContext) {
    if (performanceContext.riskHealth === "breach") {
      reasons.push("Strategy Performance Review reports a risk breach; new paper buy candidates are blocked until it clears.");
    }
    if (performanceContext.recommendation === "pause") {
      reasons.push("Strategy Performance Review recommends pausing; new paper buy candidates are blocked until it clears.");
    }
  }

  return reasons;
}

/** Signal strength reflects paper-strategy alignment only — headroom against the Risk Constitution and performance health, never a market prediction. Conservative Crypto Trend is capped at "moderate" — it never claims "strong" for a candidate. */
export function classifySignalStrength(args: {
  action: SignalAction;
  strategyKey: string;
  exposureHeadroomRatio: number;
  performanceHealthy: boolean;
}): SignalStrength {
  const { action, strategyKey, exposureHeadroomRatio, performanceHealthy } = args;

  if (action === "paper_buy_candidate") {
    if (strategyKey !== "conservative_crypto_trend" && exposureHeadroomRatio >= 0.3 && performanceHealthy) return "strong";
    if (exposureHeadroomRatio >= 0.1) return "moderate";
    return "weak";
  }

  if (action === "reduce_exposure" || action === "avoid") {
    return exposureHeadroomRatio < 0 || !performanceHealthy ? "strong" : "moderate";
  }

  return "weak";
}

function confidenceScoreFor(action: SignalAction, strength: SignalStrength): number {
  const base: Record<SignalStrength, number> = { weak: 40, moderate: 60, strong: 80 };
  const adjustment: Partial<Record<SignalAction, number>> = { paper_buy_candidate: 10, watch: -10, no_action: -5 };
  return Math.max(0, Math.min(100, base[strength] + (adjustment[action] ?? 0)));
}

/** Assembles the explanation shown to the user. Always returns at least one line — never an empty rationale. */
export function buildSignalRationale(args: { symbol: string; lines: string[] }): string[] {
  const rationale = args.lines.map((line) => line.trim()).filter((line) => line.length > 0);
  if (rationale.length === 0) {
    rationale.push(`No specific rationale generated for ${args.symbol}; defaulting to a conservative recommendation.`);
  }
  return rationale;
}

/** Risk-context notes shown alongside a signal. Always names when the Strategy Performance Review wasn't available, so the recommendation is never mistaken for one that already accounted for it. */
export function buildRiskNotes(args: { performanceContext?: SignalEngineInput["performanceContext"]; notes?: string[] }): string[] {
  const notes = [...(args.notes ?? [])];
  if (!args.performanceContext) {
    notes.push("Performance context unavailable; signals are based on strategy and portfolio constraints only.");
  }
  return notes;
}

const FORBIDDEN_ACTION_LANGUAGE = /buy_now|sell_now|execute|place_order|create_order|trade_now|send_to_broker/i;

/**
 * Defense-in-depth guardrail, mirroring assertStrategyIsPaperOnly() in
 * strategy-library.ts: throws if a signal is missing any paper-only /
 * real-execution-locked guarantee, uses an unknown enum value, has an
 * out-of-range confidence score, or a negative suggested notional. Called on
 * every signal generatePaperSignals() produces, on top of the type system's
 * paperOnly: true / realExecutionLocked: true literals.
 */
export function assertSignalIsPaperOnly(signal: PaperSignalRecommendation): void {
  if (signal.paperOnly !== true) throw new Error(`Signal for ${signal.symbol} is not paperOnly: true.`);
  if (signal.realExecutionLocked !== true) throw new Error(`Signal for ${signal.symbol} does not have realExecutionLocked: true.`);
  if (!SIGNAL_ACTIONS.includes(signal.action)) throw new Error(`Signal for ${signal.symbol} has an unknown action "${signal.action}".`);
  if (!SIGNAL_STATUSES.includes(signal.status)) throw new Error(`Signal for ${signal.symbol} has an unknown status "${signal.status}".`);
  if (!SIGNAL_STRENGTHS.includes(signal.strength)) throw new Error(`Signal for ${signal.symbol} has an unknown strength "${signal.strength}".`);
  if (!Number.isFinite(signal.confidenceScore) || signal.confidenceScore < 0 || signal.confidenceScore > 100) {
    throw new Error(`Signal for ${signal.symbol} has an out-of-range confidenceScore (${signal.confidenceScore}).`);
  }
  if (signal.suggestedNotionalUsd !== null && signal.suggestedNotionalUsd < 0) {
    throw new Error(`Signal for ${signal.symbol} has a negative suggestedNotionalUsd.`);
  }
  if (FORBIDDEN_ACTION_LANGUAGE.test(signal.action) || FORBIDDEN_ACTION_LANGUAGE.test(signal.requiredUserAction)) {
    throw new Error(`Signal for ${signal.symbol} uses forbidden execution-style language.`);
  }
}

type SymbolEvaluation = {
  symbol: string;
  /** True if this strategy would like to propose a paper_buy_candidate here, pending sizing and the risk gate below. */
  wantsBuyCandidate: boolean;
  action: SignalAction;
  /** Only set to force a non-"active" status independent of the buy-candidate risk gate (e.g. the Bear Market Research Mode governance demonstration). */
  forcedStatus?: SignalStatus;
  rationale: string[];
  blockedReasons: string[];
  extraRiskNotes: string[];
};

function priceFor(input: SignalEngineInput, symbol: string) {
  return input.marketPrices.find((price) => price.symbol === symbol) ?? null;
}

/** Conservative Crypto Trend (BTC-USD, ETH-USD): prefers watch; allows at most one small paper_buy_candidate when exposure/position/performance headroom is comfortable. Never leverage, never shorts. */
function evaluateConservativeCryptoTrend(input: SignalEngineInput, snapshot: RiskSnapshot): SymbolEvaluation[] {
  const eligibleForCandidate = snapshot.exposureHeadroomRatio > 0.1 && snapshot.positionsHeadroom >= 2 && !snapshot.performanceCautionOrWorse;
  let assigned = false;

  return input.selectedStrategy.supportedSymbols.map((symbol) => {
    const price = priceFor(input, symbol);
    if (!assigned && eligibleForCandidate && price?.priceUsd != null) {
      assigned = true;
      return {
        symbol,
        wantsBuyCandidate: true,
        action: "paper_buy_candidate" as const,
        rationale: [
          "Conservative Crypto Trend prefers a small paper buy candidate when exposure and risk headroom are comfortable.",
          `${symbol} was selected as the sole paper buy candidate for this generation; sizing stays small and cautious.`,
        ],
        blockedReasons: [],
        extraRiskNotes: [],
      };
    }
    const reason = !eligibleForCandidate
      ? "Exposure headroom, open-position headroom, or performance context does not clear this strategy's conservative bar for a new paper buy candidate right now."
      : assigned
        ? "A paper buy candidate has already been proposed for this strategy in this generation; this symbol remains a watch."
        : `Market price is unavailable for ${symbol}; recommending watch only.`;
    return {
      symbol,
      wantsBuyCandidate: false,
      action: "watch" as const,
      rationale: [`Conservative Crypto Trend is watching ${symbol}. ${reason}`],
      blockedReasons: [],
      extraRiskNotes: [],
    };
  });
}

/** BTC/ETH Momentum: this engine never fabricates historical momentum, so every symbol not chosen as the single candidate watches with an explicit "insufficient price history" rationale. */
function evaluateBtcEthMomentum(input: SignalEngineInput, snapshot: RiskSnapshot): SymbolEvaluation[] {
  const eligibleForCandidate = snapshot.exposureHeadroomRatio > 0 && snapshot.positionsHeadroom >= 1 && !snapshot.performanceBreachOrPause;
  let assigned = false;

  return input.selectedStrategy.supportedSymbols.map((symbol) => {
    const price = priceFor(input, symbol);
    if (!assigned && eligibleForCandidate && price?.priceUsd != null) {
      assigned = true;
      return {
        symbol,
        wantsBuyCandidate: true,
        action: "paper_buy_candidate" as const,
        rationale: [
          `BTC/ETH Momentum found exposure headroom and a valid observed price for ${symbol}; proposing one moderate paper buy candidate.`,
          "This reflects strategy/risk alignment only, not confirmed price momentum — no historical price series is available to this engine.",
        ],
        blockedReasons: [],
        extraRiskNotes: [],
      };
    }
    return {
      symbol,
      wantsBuyCandidate: false,
      action: "watch" as const,
      rationale: [
        "Insufficient price history for momentum confirmation.",
        price?.priceUsd == null
          ? `Market price is unavailable for ${symbol}.`
          : `A paper buy candidate has already been proposed this generation, or risk headroom is limited for ${symbol}.`,
      ],
      blockedReasons: [],
      extraRiskNotes: [],
    };
  });
}

/** Crypto Majors Rotation (BTC/ETH/SOL/AVAX): only latest prices are observed, so relative strength is never claimed. At most one exploratory paper_buy_candidate when exposure/position headroom allows, respecting the max-3-open-positions limit via positionsHeadroom. */
function evaluateCryptoMajorsRotation(input: SignalEngineInput, snapshot: RiskSnapshot): SymbolEvaluation[] {
  const eligibleForCandidate = snapshot.exposureHeadroomRatio > 0.05 && snapshot.positionsHeadroom >= 1 && !snapshot.performanceCautionOrWorse;
  let assigned = false;

  return input.selectedStrategy.supportedSymbols.map((symbol) => {
    const price = priceFor(input, symbol);
    if (!assigned && eligibleForCandidate && price?.priceUsd != null) {
      assigned = true;
      return {
        symbol,
        wantsBuyCandidate: true,
        action: "paper_buy_candidate" as const,
        rationale: [
          `Crypto Majors Rotation has exposure headroom and healthy risk context; proposing one exploratory paper buy candidate for ${symbol}.`,
          "Only the latest observed price is available, so this is not a claim of superior relative strength among crypto majors.",
        ],
        blockedReasons: [],
        extraRiskNotes: [],
      };
    }
    return {
      symbol,
      wantsBuyCandidate: false,
      action: (price?.priceUsd == null ? "no_action" : "watch") as SignalAction,
      rationale: [
        `Only the latest price is observed for ${symbol}; insufficient historical context to determine relative strength among crypto majors.`,
        "Respecting the max open paper positions limit and current exposure headroom; rotation stays exploratory and paper-only.",
      ],
      blockedReasons: [],
      extraRiskNotes: [],
    };
  });
}

/** Risk-Off Cash Mode: never proposes a paper_buy_candidate (sizing is always null). Defaults to no_action/watch when calm, reduce_exposure/avoid when exposure, drawdown, loss usage, or performance context is elevated. */
function evaluateRiskOffCashMode(input: SignalEngineInput, snapshot: RiskSnapshot): SymbolEvaluation[] {
  const { portfolioSummary } = input;
  const elevated =
    snapshot.exposureHeadroomRatio < 0.2 || snapshot.dailyLossUsedRatio >= 0.5 || snapshot.weeklyLossUsedRatio >= 0.5 || snapshot.performanceCautionOrWorse;

  return input.selectedStrategy.supportedSymbols.map((symbol) => {
    if (elevated) {
      const action: SignalAction = portfolioSummary.openPositionsCount > 0 ? "reduce_exposure" : "avoid";
      return {
        symbol,
        wantsBuyCandidate: false,
        action,
        rationale: [
          `Risk-Off Cash Mode favors a defensive, cash-first posture for ${symbol} — exposure, drawdown, loss usage, or performance context is elevated.`,
          action === "reduce_exposure"
            ? "Consider reducing simulated exposure manually; this signal never closes or reduces a position automatically."
            : "No new paper buy candidate is generated while conditions remain elevated.",
        ],
        blockedReasons: [],
        extraRiskNotes: [],
      };
    }
    const action: SignalAction = snapshot.currentExposureRatio < 0.05 ? "watch" : "no_action";
    return {
      symbol,
      wantsBuyCandidate: false,
      action,
      rationale: [
        `Risk-Off Cash Mode prefers a cash / no-trade posture for ${symbol}. Conditions are currently calm, but this strategy never proposes a paper buy candidate.`,
      ],
      blockedReasons: [],
      extraRiskNotes: [],
    };
  });
}

/**
 * Bear Market Research Mode: research-only. Never proposes a
 * paper_buy_candidate and never emits a short. The first supported symbol
 * demonstrates governance explicitly — a bearish/short-like posture is
 * "considered" and then shown as blocked_by_risk with blockedReasons citing
 * the Risk Constitution, rather than silently omitted.
 */
function evaluateBearMarketResearchMode(input: SignalEngineInput): SymbolEvaluation[] {
  const { portfolioSummary } = input;

  return input.selectedStrategy.supportedSymbols.map((symbol, index) => {
    if (index === 0) {
      return {
        symbol,
        wantsBuyCandidate: false,
        action: "avoid" as const,
        forcedStatus: "blocked_by_risk" as const,
        rationale: [
          `Bear Market Research Mode considered a bearish observation for ${symbol} to demonstrate governance.`,
          "This mode is research-only in Level 1 — it never opens a real or paper short position, regardless of market view.",
        ],
        blockedReasons: [
          "Short-side and bearish leveraged exposure is blocked by the Risk Constitution at Level 1 (shortsAllowed=false, no_real_shorts).",
          "Real execution remains locked; only a rejected-short-intent demonstration is ever surfaced here, never a live or paper short.",
        ],
        extraRiskNotes: [],
      };
    }
    if (index === 1 && portfolioSummary.openPositionsCount > 0) {
      return {
        symbol,
        wantsBuyCandidate: false,
        action: "reduce_exposure" as const,
        rationale: [
          `Bear Market Research Mode observes ${symbol} under bearish research conditions and suggests a defensive posture given existing open paper exposure.`,
          "This is a research recommendation only — it never closes or reduces a position automatically.",
        ],
        blockedReasons: [],
        extraRiskNotes: [],
      };
    }
    return {
      symbol,
      wantsBuyCandidate: false,
      action: "watch" as const,
      rationale: [`Research-only observation of ${symbol}. This mode never emits a paper buy candidate or a short-side recommendation in Level 1.`],
      blockedReasons: [],
      extraRiskNotes: [],
    };
  });
}

function evaluateGenericWatch(input: SignalEngineInput): SymbolEvaluation[] {
  return input.selectedStrategy.supportedSymbols.map((symbol) => ({
    symbol,
    wantsBuyCandidate: false,
    action: "watch" as const,
    rationale: [`No signal rules are defined yet for strategy "${input.selectedStrategy.key}"; defaulting to watch for ${symbol}.`],
    blockedReasons: [],
    extraRiskNotes: [],
  }));
}

function evaluateSymbolsForStrategy(input: SignalEngineInput, snapshot: RiskSnapshot): SymbolEvaluation[] {
  switch (input.selectedStrategy.key) {
    case "conservative_crypto_trend":
      return evaluateConservativeCryptoTrend(input, snapshot);
    case "btc_eth_momentum":
      return evaluateBtcEthMomentum(input, snapshot);
    case "crypto_majors_rotation":
      return evaluateCryptoMajorsRotation(input, snapshot);
    case "risk_off_cash_mode":
      return evaluateRiskOffCashMode(input, snapshot);
    case "bear_market_research_mode":
      return evaluateBearMarketResearchMode(input);
    default:
      return evaluateGenericWatch(input);
  }
}

/**
 * Generates deterministic, transparent, paper-only signal recommendations —
 * one per selected-strategy supported symbol. Never creates a trade intent,
 * never opens a paper position, never suggests leverage or a short. Every
 * paper_buy_candidate a strategy evaluator proposes must first clear the
 * Strategy Performance Review's "review_required" check (downgraded to
 * watch, status stays "active" — see REVIEW_REQUIRED_DOWNGRADE_NOTE), then
 * is sized by calculateSuggestedNotionalUsd() and must clear
 * checkRiskGateForBuyCandidate(); a candidate that fails the hard gate is
 * downgraded to avoid/status blocked_by_risk with the full list of blocking
 * reasons — never silently dropped.
 */
export function generatePaperSignals(input: SignalEngineInput): PaperSignalRecommendation[] {
  const strategy = input.selectedStrategy;
  const snapshot = computeRiskSnapshot(input);
  const evaluations = evaluateSymbolsForStrategy(input, snapshot);

  return evaluations.map((evaluation) => {
    const price = priceFor(input, evaluation.symbol);
    let action: SignalAction = evaluation.action;
    let status: SignalStatus = evaluation.forcedStatus ?? "active";
    let suggestedNotionalUsd: number | null = null;
    const blockedReasons = [...evaluation.blockedReasons];
    const riskNotesExtra = [...evaluation.extraRiskNotes];
    const rationale = [...evaluation.rationale];

    if (evaluation.wantsBuyCandidate) {
      if (input.performanceContext?.recommendation === "review_required") {
        // A hard risk breach isn't in play here — this is an evidentiary
        // "not enough of a track record yet" downgrade, so it stays status
        // "active" with action "watch" rather than
        // "blocked_by_risk" (reserved for actual Risk Constitution
        // violations below). Covers advisorRecommendation values
        // reduce_risk/review_required/not_ready_for_real_execution, all
        // mapped to "review_required" by signal-engine-service.ts — in
        // particular a fresh portfolio with 0 closed positions, which must
        // not jump straight to a full-strength paper_buy_candidate just
        // because no hard limit is breached yet.
        action = "watch";
        rationale.push(REVIEW_REQUIRED_DOWNGRADE_NOTE);
        riskNotesExtra.push(REVIEW_REQUIRED_DOWNGRADE_NOTE);
      } else {
        const candidateNotional = calculateSuggestedNotionalUsd(strategy.key, input);
        if (candidateNotional === null) {
          action = "watch";
          rationale.push("Available exposure is too small for a meaningful paper recommendation.");
          riskNotesExtra.push("Available exposure is too small for a meaningful paper recommendation.");
        } else {
          const gateReasons = checkRiskGateForBuyCandidate(input, candidateNotional, snapshot);
          if (gateReasons.length > 0) {
            action = "avoid";
            status = "blocked_by_risk";
            blockedReasons.push(...gateReasons);
          } else {
            action = "paper_buy_candidate";
            suggestedNotionalUsd = candidateNotional;
          }
        }
      }
    }

    const strength = classifySignalStrength({
      action,
      strategyKey: strategy.key,
      exposureHeadroomRatio: snapshot.exposureHeadroomRatio,
      performanceHealthy: snapshot.performanceHealthy,
    });
    const confidenceScore = confidenceScoreFor(action, strength);

    const signal: PaperSignalRecommendation = {
      id: randomUUID(),
      generatedAt: input.generatedAt,
      strategyKey: strategy.key,
      strategyName: strategy.name,
      symbol: evaluation.symbol,
      action,
      status,
      strength,
      confidenceScore,
      suggestedNotionalUsd,
      marketPriceUsd: price?.priceUsd ?? null,
      marketDataSource: price?.source ?? "unavailable",
      rationale: buildSignalRationale({ symbol: evaluation.symbol, lines: rationale }),
      riskNotes: buildRiskNotes({ performanceContext: input.performanceContext, notes: riskNotesExtra }),
      blockedReasons,
      requiredUserAction: REQUIRED_USER_ACTION_BY_ACTION[action],
      paperOnly: true,
      realExecutionLocked: true,
    };

    assertSignalIsPaperOnly(signal);
    return signal;
  });
}
