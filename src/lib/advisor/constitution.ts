// AOC Capital Advisor — initial risk constitution generation.
// Tailors the Level 1 numeric limits tighter for more conservative risk
// profiles, but every generated limit is clamped to never exceed (i.e. never be
// looser than) the Level 1 ceiling enforced by risk-policy-engine.ts and the
// evaluate_and_record_trade_intent() SQL function. The two fixed, non-numeric
// rules (no_leverage, no_real_shorts) are never relaxed by risk profile.

import {
  MAX_DAILY_SIMULATED_LOSS_USD,
  MAX_OPEN_POSITIONS,
  MAX_SIMULATED_EXPOSURE_RATIO,
  MAX_WEEKLY_SIMULATED_LOSS_USD,
} from "@/lib/trading/risk-policy-engine";
import type { AdvisorConstitutionRule, RiskProfile } from "./types";

/** Fraction of the Level 1 ceiling each risk profile is allowed to use. Always <= 1. */
export const RISK_PROFILE_TIGHTENING_FACTOR: Record<RiskProfile, number> = {
  conservative: 0.5,
  balanced: 0.75,
  growth: 0.9,
  aggressive: 1,
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function generateInitialRiskConstitution(riskProfile: RiskProfile): AdvisorConstitutionRule[] {
  const factor = RISK_PROFILE_TIGHTENING_FACTOR[riskProfile];

  const maxSimulatedExposureRatio = Math.min(MAX_SIMULATED_EXPOSURE_RATIO, round2(MAX_SIMULATED_EXPOSURE_RATIO * factor));
  const maxDailySimulatedLossUsd = Math.min(MAX_DAILY_SIMULATED_LOSS_USD, round2(MAX_DAILY_SIMULATED_LOSS_USD * factor));
  const maxWeeklySimulatedLossUsd = Math.min(MAX_WEEKLY_SIMULATED_LOSS_USD, round2(MAX_WEEKLY_SIMULATED_LOSS_USD * factor));
  const maxOpenPositions = Math.min(MAX_OPEN_POSITIONS, Math.max(1, Math.round(MAX_OPEN_POSITIONS * factor)));

  return [
    {
      rule_key: "no_leverage",
      label: "No leverage",
      limit_value: 1,
      level: 1,
      description: "Every paper trade must use 1x exposure. Leveraged trade intents are rejected.",
    },
    {
      rule_key: "no_real_shorts",
      label: "No real shorts",
      limit_value: null,
      level: 1,
      description: "Short-side trade intents are rejected outright at Level 1.",
    },
    {
      rule_key: "max_simulated_exposure",
      label: `Max ${(maxSimulatedExposureRatio * 100).toFixed(0)}% simulated exposure`,
      limit_value: maxSimulatedExposureRatio,
      level: 1,
      description: `Total open notional may not exceed ${(maxSimulatedExposureRatio * 100).toFixed(0)}% of the portfolio's base simulated capital, tailored for a ${riskProfile} risk profile (Level 1 ceiling: ${MAX_SIMULATED_EXPOSURE_RATIO * 100}%).`,
    },
    {
      rule_key: "max_daily_simulated_loss",
      label: `Max daily simulated loss $${maxDailySimulatedLossUsd.toFixed(2)}`,
      limit_value: maxDailySimulatedLossUsd,
      level: 1,
      description: `New trade intents are rejected once the portfolio's simulated loss for the day reaches $${maxDailySimulatedLossUsd.toFixed(2)}, tailored for a ${riskProfile} risk profile (Level 1 ceiling: $${MAX_DAILY_SIMULATED_LOSS_USD.toFixed(2)}).`,
    },
    {
      rule_key: "max_weekly_simulated_loss",
      label: `Max weekly simulated loss $${maxWeeklySimulatedLossUsd.toFixed(2)}`,
      limit_value: maxWeeklySimulatedLossUsd,
      level: 1,
      description: `New trade intents are rejected once the portfolio's simulated loss for the trailing 7 days reaches $${maxWeeklySimulatedLossUsd.toFixed(2)}, tailored for a ${riskProfile} risk profile (Level 1 ceiling: $${MAX_WEEKLY_SIMULATED_LOSS_USD.toFixed(2)}).`,
    },
    {
      rule_key: "max_open_positions",
      label: `Max ${maxOpenPositions} open paper position${maxOpenPositions === 1 ? "" : "s"}`,
      limit_value: maxOpenPositions,
      level: 1,
      description: `No more than ${maxOpenPositions} paper position(s) may be open at once, tailored for a ${riskProfile} risk profile (Level 1 ceiling: ${MAX_OPEN_POSITIONS}).`,
    },
    {
      rule_key: "mandatory_policy_evaluation",
      label: "Mandatory policy evaluation",
      limit_value: null,
      level: 1,
      description: "Every trade intent must be evaluated by the risk policy engine before it can become a paper position.",
    },
    {
      rule_key: "mandatory_audit_ledger",
      label: "Mandatory audit ledger",
      limit_value: null,
      level: 1,
      description: "Every approval or rejection is written to the audit ledger.",
    },
  ];
}
