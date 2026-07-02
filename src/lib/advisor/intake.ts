// AOC Capital Advisor — intake classification.
// Turns loosely-typed answers (e.g. an HTTP request body) into a validated,
// normalized AdvisorIntake. This is the only place raw advisor input is trusted
// from — every downstream module assumes an already-classified AdvisorIntake.

import type { AdvisorIntake, AutonomyLevel, PreferredMarket, PrimaryObjective, RiskAppetite, TimeHorizon, TradingMode } from "./types";

export const PRIMARY_OBJECTIVES: PrimaryObjective[] = ["capital_preservation", "income", "balanced_growth", "aggressive_growth", "speculation"];
export const TIME_HORIZONS: TimeHorizon[] = ["short_term", "medium_term", "long_term"];
export const RISK_APPETITES: RiskAppetite[] = ["conservative", "moderate", "aggressive"];
export const PREFERRED_MARKETS: PreferredMarket[] = ["crypto", "equities", "diversified"];
export const AUTONOMY_LEVELS: AutonomyLevel[] = ["manual_approval", "assisted", "full_auto"];
export const TRADING_MODES: TradingMode[] = ["recommendations_only", "paper_trading_automation"];

export type ClassifyIntakeResult = { ok: true; intake: AdvisorIntake } | { ok: false; error: string };

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === "string" && (options as readonly string[]).includes(value);
}

/** Validates and normalizes raw advisor answers. Never throws — always returns a Result. */
export function classifyIntake(raw: unknown): ClassifyIntakeResult {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Advisor intake must be an object." };
  }
  const r = raw as Record<string, unknown>;

  const startingCapitalUsd = Number(r.startingCapitalUsd);
  if (!Number.isFinite(startingCapitalUsd) || startingCapitalUsd <= 0) {
    return { ok: false, error: "startingCapitalUsd must be a positive number." };
  }

  if (!isOneOf(r.primaryObjective, PRIMARY_OBJECTIVES)) {
    return { ok: false, error: `primaryObjective must be one of: ${PRIMARY_OBJECTIVES.join(", ")}.` };
  }
  if (!isOneOf(r.timeHorizon, TIME_HORIZONS)) {
    return { ok: false, error: `timeHorizon must be one of: ${TIME_HORIZONS.join(", ")}.` };
  }
  if (!isOneOf(r.riskAppetite, RISK_APPETITES)) {
    return { ok: false, error: `riskAppetite must be one of: ${RISK_APPETITES.join(", ")}.` };
  }

  const drawdownRaw = Number(r.maxTolerableDrawdownPct);
  if (!Number.isFinite(drawdownRaw)) {
    return { ok: false, error: "maxTolerableDrawdownPct must be a number." };
  }
  const maxTolerableDrawdownPct = Math.min(100, Math.max(0, drawdownRaw));

  const rawMarkets = Array.isArray(r.preferredMarkets) ? r.preferredMarkets : [];
  const preferredMarkets = Array.from(new Set(rawMarkets.filter((m): m is PreferredMarket => isOneOf(m, PREFERRED_MARKETS))));
  if (preferredMarkets.length === 0) {
    return { ok: false, error: `preferredMarkets must include at least one of: ${PREFERRED_MARKETS.join(", ")}.` };
  }

  if (!isOneOf(r.autonomyLevel, AUTONOMY_LEVELS)) {
    return { ok: false, error: `autonomyLevel must be one of: ${AUTONOMY_LEVELS.join(", ")}.` };
  }
  if (!isOneOf(r.tradingMode, TRADING_MODES)) {
    return { ok: false, error: `tradingMode must be one of: ${TRADING_MODES.join(", ")}.` };
  }

  const wantsGatedRealExecution = r.wantsGatedRealExecution === true;

  return {
    ok: true,
    intake: {
      startingCapitalUsd,
      primaryObjective: r.primaryObjective as PrimaryObjective,
      timeHorizon: r.timeHorizon as TimeHorizon,
      riskAppetite: r.riskAppetite as RiskAppetite,
      maxTolerableDrawdownPct,
      preferredMarkets,
      autonomyLevel: r.autonomyLevel as AutonomyLevel,
      tradingMode: r.tradingMode as TradingMode,
      wantsGatedRealExecution,
    },
  };
}
