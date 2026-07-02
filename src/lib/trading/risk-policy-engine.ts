import type { TradeDecisionReason, TradeDecisionVerdict, TradeIntentSide } from "./database-contract";

export const RISK_POLICY_VERSION = "level-1";

export const MAX_SIMULATED_EXPOSURE_RATIO = 0.6;
export const MAX_DAILY_SIMULATED_LOSS_USD = 20;
export const MAX_WEEKLY_SIMULATED_LOSS_USD = 40;
export const MAX_OPEN_POSITIONS = 3;

export type CandidateTradeIntent = {
  symbol: string;
  side: TradeIntentSide;
  quantity: number;
  notionalUsd: number;
  leverage: number;
};

/** Everything the policy engine needs to know about a portfolio to evaluate a new trade intent. */
export type PortfolioRiskState = {
  baseCapitalUsd: number;
  /** Sum of notional value across all currently open paper positions. */
  currentExposureUsd: number;
  /** Count of currently open paper positions. */
  openPositionCount: number;
  /** Realized + unrealized paper P&L for the current UTC day (negative = loss). */
  dailyPnlUsd: number;
  /** Realized + unrealized paper P&L for the trailing 7 days (negative = loss). */
  weeklyPnlUsd: number;
};

export type RiskPolicyEvaluation = {
  verdict: TradeDecisionVerdict;
  reasons: TradeDecisionReason[];
  policyVersion: string;
};

type RuleCheck = (intent: CandidateTradeIntent, state: PortfolioRiskState) => TradeDecisionReason;

const noLeverage: RuleCheck = (intent) => ({
  ruleKey: "no_leverage",
  label: "No leverage",
  passed: intent.leverage === 1,
  detail: intent.leverage === 1 ? "Trade uses 1x (unleveraged) exposure." : `Trade requests ${intent.leverage}x leverage; Level 1 requires exactly 1x.`,
});

const noRealShorts: RuleCheck = (intent) => ({
  ruleKey: "no_real_shorts",
  label: "No real shorts",
  passed: intent.side !== "sell",
  detail: intent.side !== "sell" ? "Trade is a long (buy) intent." : "Short-side trade intents are not permitted at Level 1.",
});

const maxSimulatedExposure: RuleCheck = (intent, state) => {
  const projectedExposure = state.currentExposureUsd + intent.notionalUsd;
  const ratio = state.baseCapitalUsd > 0 ? projectedExposure / state.baseCapitalUsd : Infinity;
  return {
    ruleKey: "max_simulated_exposure",
    label: "Max 60% simulated exposure",
    passed: ratio <= MAX_SIMULATED_EXPOSURE_RATIO,
    detail: `Projected exposure would be ${(ratio * 100).toFixed(1)}% of base capital (limit ${MAX_SIMULATED_EXPOSURE_RATIO * 100}%).`,
  };
};

const maxDailySimulatedLoss: RuleCheck = (_intent, state) => ({
  ruleKey: "max_daily_simulated_loss",
  label: "Max daily simulated loss $20",
  passed: state.dailyPnlUsd > -MAX_DAILY_SIMULATED_LOSS_USD,
  detail: `Daily simulated P&L is $${state.dailyPnlUsd.toFixed(2)} (limit -$${MAX_DAILY_SIMULATED_LOSS_USD.toFixed(2)}).`,
});

const maxWeeklySimulatedLoss: RuleCheck = (_intent, state) => ({
  ruleKey: "max_weekly_simulated_loss",
  label: "Max weekly simulated loss $40",
  passed: state.weeklyPnlUsd > -MAX_WEEKLY_SIMULATED_LOSS_USD,
  detail: `Weekly simulated P&L is $${state.weeklyPnlUsd.toFixed(2)} (limit -$${MAX_WEEKLY_SIMULATED_LOSS_USD.toFixed(2)}).`,
});

const maxOpenPositions: RuleCheck = (_intent, state) => ({
  ruleKey: "max_open_positions",
  label: "Max 3 open paper positions",
  passed: state.openPositionCount < MAX_OPEN_POSITIONS,
  detail: `Portfolio currently holds ${state.openPositionCount} open paper position(s) (limit ${MAX_OPEN_POSITIONS}).`,
});

const LEVEL_1_RULES: RuleCheck[] = [noLeverage, noRealShorts, maxSimulatedExposure, maxDailySimulatedLoss, maxWeeklySimulatedLoss, maxOpenPositions];

/**
 * Evaluates a candidate trade intent against the Level 1 risk constitution.
 * Every rule is checked and reported (not short-circuited) so the audit ledger
 * always records the full rationale, not just the first failing rule.
 */
export function evaluateTradeIntent(intent: CandidateTradeIntent, state: PortfolioRiskState): RiskPolicyEvaluation {
  const reasons = LEVEL_1_RULES.map((rule) => rule(intent, state));
  const verdict: TradeDecisionVerdict = reasons.every((reason) => reason.passed) ? "approved" : "rejected";
  return { verdict, reasons, policyVersion: RISK_POLICY_VERSION };
}
