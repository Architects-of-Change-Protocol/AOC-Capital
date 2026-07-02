// AOC Capital Advisor — allowed/blocked capabilities.
// ALWAYS_BLOCKED_CAPABILITIES can never appear in the "allowed" list, no matter
// what the user answers (including autonomyLevel: "full_auto" or
// wantsGatedRealExecution: true) — this PR is paper-only, with no real exchange
// execution, no broker integrations, and no API keys.

import type { AdvisorCapabilities, AdvisorIntake } from "./types";

export const ALWAYS_BLOCKED_CAPABILITIES = [
  "real_exchange_execution",
  "broker_api_integration",
  "live_order_routing",
  "real_money_withdrawal",
  "exchange_api_key_management",
  "gated_real_execution",
] as const;

const BASE_ALLOWED_CAPABILITIES = [
  "manual_trade_intent_submission",
  "signal_informed_trade_intents",
  "paper_position_simulation",
  "risk_policy_evaluation",
  "audit_ledger_visibility",
] as const;

export function deriveCapabilities(intake: AdvisorIntake): AdvisorCapabilities {
  const allowed: string[] = [...BASE_ALLOWED_CAPABILITIES];
  const blocked: string[] = [...ALWAYS_BLOCKED_CAPABILITIES];

  if (intake.tradingMode === "recommendations_only") {
    allowed.push("strategy_recommendations");
    blocked.push("automated_trade_submission");
  } else {
    // paper_trading_automation was requested, but no automation engine exists yet in
    // this PR — record the preference without unlocking anything beyond paper
    // simulation. A future level would need to explicitly build and gate this.
    allowed.push("paper_trading_automation_preference_recorded");
    blocked.push("automated_trade_submission");
  }

  if (intake.wantsGatedRealExecution) {
    // Recorded so a future, explicitly-gated milestone can revisit it — the advisor
    // itself never unlocks real execution.
    blocked.push("gated_real_execution_pending_future_approval");
  }

  return { allowed, blocked };
}
