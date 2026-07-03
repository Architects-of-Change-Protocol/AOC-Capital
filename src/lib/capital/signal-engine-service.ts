// AOC Capital Signal Engine v1 — governed orchestration layer.
//
// The only place a signal generation touches the database. Resolves the
// selected strategy strictly server-side (never trusts a client-supplied
// strategy key, symbol list, notional, or action), builds SignalEngineInput
// from live market data / portfolio state / the Risk Constitution / the
// Strategy Performance Review, hands it to the pure generatePaperSignals()
// engine, and calls insert_paper_signal_recommendations_and_audit()
// (20260908000000_aoc_capital_atomic_audit_writes.sql) through the existing
// privileged, service-role write path (src/lib/trading/trade-service.ts).
// That RPC inserts every resulting row and writes the signals_generated
// audit event in one database transaction.
//
// This never creates a trade intent, never opens a paper position, and never
// touches trade_intents/paper_positions in any way. Governed state and its
// audit evidence share the same transaction boundary: if the audit insert
// inside the RPC fails, every inserted signal row rolls back too, and if any
// signal row insert fails, the audit event is never written. There is no
// partial-write window and no separate application-level audit-ledger write
// for this flow.

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ensureRiskConstitution,
  getMarketDataSnapshot,
  getOrCreateDefaultPortfolio,
  getPortfolioSummary,
  getStrategyPerformance,
  privileged,
  type MarketDataSnapshotEntry,
} from "@/lib/trading/trade-service";
import { getMarketDataMode, type MarketDataMode } from "@/lib/trading/live-price-provider";
import { MAX_DAILY_SIMULATED_LOSS_USD, MAX_OPEN_POSITIONS, MAX_SIMULATED_EXPOSURE_RATIO, MAX_WEEKLY_SIMULATED_LOSS_USD } from "@/lib/trading/risk-policy-engine";
import type { PaperMarketPriceSource, PaperSignalRecommendationRow, RiskConstitutionRuleRow } from "@/lib/trading/database-contract";
import type { StrategyHealth } from "@/lib/trading/portfolio-summary";
import type { AdvisorRecommendationAction, StrategyPerformance } from "@/lib/trading/strategy-performance";
import { getSelectedStrategyProfile, resolveSelectedStrategy } from "./strategy-selection-service";
import type { StrategyLibraryItem } from "./strategy-library";
import { generatePaperSignals } from "./signal-engine";
import type { PaperSignalRecommendation, SignalEngineInput, SignalMarketDataSource } from "./signal-engine-types";

export class NoStrategySelectedError extends Error {
  constructor() {
    super("Select a paper-only strategy before generating signals.");
    this.name = "NoStrategySelectedError";
  }
}

export class StaleSelectedStrategyError extends Error {
  constructor() {
    super("Previously selected strategy unavailable. Choose a current paper-only strategy before generating signals.");
    this.name = "StaleSelectedStrategyError";
  }
}

export const PAPER_SIGNAL_RECOMMENDATION_COLUMNS =
  "id,company_id,portfolio_id,strategy_key,strategy_name,symbol,action,strength,confidence_score,suggested_notional_usd,market_price_usd,market_data_source,rationale,risk_notes,blocked_reasons,required_user_action,paper_only,real_execution_locked,status,converted_trade_intent_id,converted_at,converted_by,generated_at,created_at";

const RISK_HEALTH_TO_SIGNAL_RISK_HEALTH: Record<StrategyHealth, "healthy" | "caution" | "breach"> = {
  healthy: "healthy",
  caution: "caution",
  breached: "breach",
};

const ADVISOR_RECOMMENDATION_TO_SIGNAL_RECOMMENDATION: Record<AdvisorRecommendationAction, "continue_paper_monitoring" | "review_required" | "pause"> = {
  continue: "continue_paper_monitoring",
  reduce_risk: "review_required",
  review_required: "review_required",
  not_ready_for_real_execution: "review_required",
  pause: "pause",
};

function mapPerformanceContext(performance: StrategyPerformance): SignalEngineInput["performanceContext"] {
  return {
    totalReturnPct: performance.totalReturnPct,
    profitFactor: performance.profitFactor,
    maxDrawdownPct: performance.maxDrawdownPct,
    currentDrawdownPct: performance.currentDrawdownPct,
    riskHealth: RISK_HEALTH_TO_SIGNAL_RISK_HEALTH[performance.strategyHealth],
    recommendation: ADVISOR_RECOMMENDATION_TO_SIGNAL_RECOMMENDATION[performance.advisorRecommendation],
  };
}

/** Reads limit_value from the persisted Risk Constitution (falling back to the Level 1 defaults for any rule not yet seeded), so an advisor-tightened limit is respected here too. */
function deriveRiskLimits(rules: RiskConstitutionRuleRow[]): SignalEngineInput["riskLimits"] {
  const byKey = new Map(rules.map((rule) => [rule.rule_key, rule]));
  return {
    maxExposurePct: byKey.get("max_simulated_exposure")?.limit_value ?? MAX_SIMULATED_EXPOSURE_RATIO,
    maxOpenPositions: byKey.get("max_open_positions")?.limit_value ?? MAX_OPEN_POSITIONS,
    maxDailyLossUsd: byKey.get("max_daily_simulated_loss")?.limit_value ?? MAX_DAILY_SIMULATED_LOSS_USD,
    maxWeeklyLossUsd: byKey.get("max_weekly_simulated_loss")?.limit_value ?? MAX_WEEKLY_SIMULATED_LOSS_USD,
    leverageAllowed: false,
    shortsAllowed: false,
    realExecutionAllowed: false,
  };
}

/** 'manual' paper_market_prices rows have no live/mock provenance of their own from the signal engine's point of view — reported as 'fallback'. Explicit 'disabled' mode always overrides the underlying price source label, even though recordMarketPrice() still returns a usable simulated number, so the user sees that live data was turned off rather than chosen. */
function mapMarketDataSource(entrySource: PaperMarketPriceSource, marketDataMode: MarketDataMode): SignalMarketDataSource {
  if (marketDataMode === "disabled") return "disabled";
  if (entrySource === "manual") return "fallback";
  return entrySource;
}

/** Builds the signal engine's marketPrices array scoped to exactly the selected strategy's supported symbols — never any other tracked symbol, and never a client-supplied symbol. */
function buildMarketPrices(symbols: string[], snapshot: MarketDataSnapshotEntry[], marketDataMode: MarketDataMode): SignalEngineInput["marketPrices"] {
  return symbols.map((symbol) => {
    const entry = snapshot.find((candidate) => candidate.symbol === symbol);
    if (!entry) {
      return { symbol, priceUsd: null, asOf: null, source: "unavailable" as const, provider: "none", paperOnly: true as const };
    }
    return {
      symbol,
      priceUsd: entry.priceUsd,
      asOf: entry.asOf,
      source: mapMarketDataSource(entry.source, marketDataMode),
      provider: entry.provider ?? "internal_simulated",
      paperOnly: true as const,
    };
  });
}

export type GenerateSignalsInput = {
  companyId: string;
  actorUserId: string;
  actor: string;
};

export type GenerateSignalsResult = {
  signals: PaperSignalRecommendationRow[];
  selectedStrategy: StrategyLibraryItem;
};

/**
 * Generates a fresh batch of paper-only signal recommendations for the
 * caller's tenant. Resolves the selected strategy strictly server-side (a
 * missing or stale selection fails safely with a dedicated error, never a
 * generic 500), builds SignalEngineInput from live data, runs the pure
 * generatePaperSignals() engine, and atomically persists every resulting row
 * together with the signals_generated audit event via
 * insert_paper_signal_recommendations_and_audit(). Never creates a trade
 * intent, never opens a paper position, never enables real execution.
 */
export async function generateSignals(input: GenerateSignalsInput): Promise<GenerateSignalsResult> {
  const portfolio = await getOrCreateDefaultPortfolio(input.companyId);
  const profile = await getSelectedStrategyProfile(input.companyId);
  if (!profile) throw new NoStrategySelectedError();

  const resolved = resolveSelectedStrategy(profile);
  if (resolved.staleSelectedStrategy || !resolved.selectedStrategy) throw new StaleSelectedStrategyError();
  const strategy = resolved.selectedStrategy;

  const [marketDataSnapshot, portfolioSummary, riskConstitutionRules] = await Promise.all([
    getMarketDataSnapshot(input.companyId),
    getPortfolioSummary(input.companyId, portfolio),
    ensureRiskConstitution(input.companyId),
  ]);

  let performanceContext: SignalEngineInput["performanceContext"] = null;
  try {
    performanceContext = mapPerformanceContext(await getStrategyPerformance(input.companyId, portfolio));
  } catch {
    // Strategy Performance Review is optional context — never fails signal
    // generation. See buildRiskNotes() in signal-engine.ts, which surfaces
    // "Performance context unavailable" to the user in this case.
    performanceContext = null;
  }

  const engineInput: SignalEngineInput = {
    generatedAt: new Date().toISOString(),
    selectedStrategy: {
      key: strategy.key,
      name: strategy.name,
      riskProfile: strategy.riskProfile,
      supportedSymbols: strategy.supportedSymbols,
      allowedCapabilities: strategy.allowedCapabilities,
      blockedCapabilities: strategy.blockedCapabilities,
      paperOnly: true,
      realExecutionLocked: true,
    },
    marketPrices: buildMarketPrices(strategy.supportedSymbols, marketDataSnapshot, getMarketDataMode()),
    portfolioSummary: {
      baseCapitalUsd: portfolioSummary.baseCapitalUsd,
      simulatedEquityUsd: portfolioSummary.simulatedEquityUsd,
      exposureUsd: portfolioSummary.openExposureUsd,
      exposurePct: portfolioSummary.openExposurePct,
      openPositionsCount: portfolioSummary.openPositionsCount,
      dailyRealizedLossUsedUsd: Math.max(0, -portfolioSummary.dailyRealizedPnlUsd),
      weeklyRealizedLossUsedUsd: Math.max(0, -portfolioSummary.weeklyRealizedPnlUsd),
    },
    riskLimits: deriveRiskLimits(riskConstitutionRules),
    performanceContext,
  };

  const signals: PaperSignalRecommendation[] = generatePaperSignals(engineInput);

  const actionCounts: Record<string, number> = {};
  for (const signal of signals) {
    actionCounts[signal.action] = (actionCounts[signal.action] ?? 0) + 1;
  }

  const supabase = privileged("capital/signal-engine", "generate_signals", input.companyId, input.actorUserId);
  const { data, error } = await supabase.rpc("insert_paper_signal_recommendations_and_audit", {
    p_company_id: input.companyId,
    p_portfolio_id: portfolio.id,
    p_actor: input.actor,
    p_signals: signals.map((signal) => ({
      id: signal.id,
      strategy_key: signal.strategyKey,
      strategy_name: signal.strategyName,
      symbol: signal.symbol,
      action: signal.action,
      strength: signal.strength,
      confidence_score: signal.confidenceScore,
      suggested_notional_usd: signal.suggestedNotionalUsd,
      market_price_usd: signal.marketPriceUsd,
      market_data_source: signal.marketDataSource,
      rationale: signal.rationale,
      risk_notes: signal.riskNotes,
      blocked_reasons: signal.blockedReasons,
      required_user_action: signal.requiredUserAction,
      status: signal.status,
      generated_at: signal.generatedAt,
    })),
    p_audit_payload: {
      paper_only: true,
      real_execution_locked: true,
      portfolio_id: portfolio.id,
      strategy_key: strategy.key,
      strategy_name: strategy.name,
      signals_count: signals.length,
      actions: actionCounts,
      symbols: strategy.supportedSymbols,
      risk_gated: signals.some((signal) => signal.status === "blocked_by_risk"),
    },
  });

  if (error || !data) throw new Error(`Unable to persist generated signals: ${error?.message ?? "unknown error"}`);
  const persisted = data as PaperSignalRecommendationRow[];

  return { signals: persisted, selectedStrategy: strategy };
}

/** Latest generated signal recommendations for this tenant's portfolio. Read-only — never generates, persists, or audits anything. */
export async function listSignalRecommendations(companyId: string, portfolioId: string): Promise<PaperSignalRecommendationRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("paper_signal_recommendations")
    .select(PAPER_SIGNAL_RECOMMENDATION_COLUMNS)
    .eq("company_id", companyId)
    .eq("portfolio_id", portfolioId)
    .order("generated_at", { ascending: false })
    .limit(50);
  return (data ?? []) as PaperSignalRecommendationRow[];
}
