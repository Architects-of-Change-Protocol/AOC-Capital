// AOC Capital — Allocation & Exposure Views v1 (PR #15).
//
// Read-only aggregation service only. Reads existing governed paper-capital
// state — portfolios and paper_positions, joined against trade_intents purely
// to surface the source draft/signal for a position — through the existing
// read-only helpers in trade-service.ts and normalizes it into a single
// AllocationExposureOverview payload.
//
// Portfolio Overview tells the user what is happening. This module tells the
// user where the simulated capital and risk are concentrated. It never
// generates signals, never creates/submits/cancels a draft trade intent,
// never runs Risk Constitution review, never opens/closes a paper position,
// and never marks a position to market itself — it deliberately calls
// listPaperPositions() (not listPaperPositionsMarked() / markAllOpenPositions()
// / loadPortfolioOverview()), so simply viewing this page never triggers a
// fresh mark-to-market write. Real execution remains locked.

import { getOrCreateDefaultPortfolio, listPaperPositions, listTradeIntents } from "@/lib/trading/trade-service";
import { MAX_SIMULATED_EXPOSURE_RATIO } from "@/lib/trading/risk-policy-engine";
import type { PaperPositionRow } from "@/lib/trading/database-contract";

const RECENT_POSITIONS_LIMIT = 25;
const TOP_CONTRIBUTORS_LIMIT = 3;
const TOP_CONCENTRATION_SYMBOL_COUNT = 3;

export type ConcentrationStatus = "no_data" | "diversified" | "moderate_concentration" | "high_concentration" | "single_symbol";

export type ExposurePosture = "not_ready" | "idle" | "balanced" | "watch_concentration" | "high_concentration" | "near_exposure_limit" | "over_exposure_limit";

export type AllocationExposureOverview = {
  portfolio: {
    id: string;
    name: string | null;
    baseCapitalUsd: number;
    simulatedPortfolioValueUsd: number;
    availableSimulatedCashUsd: number;
    openExposureUsd: number;
    exposureRatio: number | null;
    realizedPnlUsd: number;
    unrealizedPnlUsd: number;
    totalPnlUsd: number;
    openPositionsCount: number;
    openSymbolsCount: number;
    lastMarkedToMarketAt: string | null;
  };

  allocation: {
    largestSymbol: string | null;
    largestSymbolExposureUsd: number;
    largestSymbolWeight: number | null;
    topThreeConcentration: number | null;
    concentrationStatus: ConcentrationStatus;
    exposurePosture: ExposurePosture;
  };

  symbols: Array<{
    symbol: string;
    openPositionsCount: number;
    totalQuantity: number;
    entryNotionalUsd: number;
    currentNotionalUsd: number;
    unrealizedPnlUsd: number;
    unrealizedPnlPct: number | null;
    exposureWeight: number | null;
    portfolioWeight: number | null;
    averageEntryPriceUsd: number | null;
    currentPriceUsd: number | null;
    lastMarkedToMarketAt: string | null;
  }>;

  positions: Array<{
    id: string;
    symbol: string;
    quantity: number;
    entryPriceUsd: number;
    currentPriceUsd: number | null;
    entryNotionalUsd: number;
    currentNotionalUsd: number | null;
    unrealizedPnlUsd: number | null;
    unrealizedPnlPct: number | null;
    exposureWeight: number | null;
    openedAt: string;
    tradeIntentId: string | null;
    sourceSignalId: string | null;
  }>;

  pnlContribution: {
    topGainers: Array<{ symbol: string; unrealizedPnlUsd: number; exposureUsd: number; exposureWeight: number | null }>;
    topLosers: Array<{ symbol: string; unrealizedPnlUsd: number; exposureUsd: number; exposureWeight: number | null }>;
  };

  governance: {
    paperOnly: true;
    realExecutionLocked: true;
    brokerConnected: false;
    liveOrderRoutingEnabled: false;
    riskLimitProximityAvailable: boolean;
    maxExposureRatio: number | null;
    exposureLimitUsage: number | null;
  };

  notes: ExposureNote[];
};

export type ExposureNoteKind = "empty" | "concentration" | "exposure" | "pnl" | "risk_limit" | "cash";
export type ExposureNoteSeverity = "info" | "watch" | "caution";

export type ExposureNote = {
  kind: ExposureNoteKind;
  severity: ExposureNoteSeverity;
  message: string;
};

/** Input to groupPositionsBySymbol — deliberately decoupled from PaperPositionRow's non-null DB columns so the aggregation stays correct even if a future schema makes current price/notional genuinely nullable. */
export type AllocationPositionInput = {
  symbol: string;
  quantity: number;
  entryPriceUsd: number;
  currentPriceUsd: number | null;
  entryNotionalUsd: number;
  currentNotionalUsd: number | null;
  lastMarkedToMarketAt?: string | null;
};

export type SymbolAllocation = {
  symbol: string;
  openPositionsCount: number;
  totalQuantity: number;
  entryNotionalUsd: number;
  currentNotionalUsd: number;
  unrealizedPnlUsd: number;
  unrealizedPnlPct: number | null;
  averageEntryPriceUsd: number | null;
  currentPriceUsd: number | null;
  lastMarkedToMarketAt: string | null;
};

/**
 * Groups open paper positions by symbol. Falls back to entry notional/price
 * only when a position's current notional is genuinely unavailable (never
 * happens today — paper_positions.current_notional_usd is NOT NULL — but this
 * stays correct if that ever changes). Pure, deterministic, no I/O.
 */
export function groupPositionsBySymbol(positions: AllocationPositionInput[]): SymbolAllocation[] {
  type Accumulator = {
    symbol: string;
    openPositionsCount: number;
    totalQuantity: number;
    entryNotionalUsd: number;
    currentNotionalUsd: number;
    unrealizedPnlUsd: number;
    lastMarkedToMarketAt: string | null;
  };

  const bySymbol = new Map<string, Accumulator>();

  for (const position of positions) {
    const effectiveCurrentNotionalUsd = position.currentNotionalUsd ?? position.entryNotionalUsd;
    const unrealizedPnlContribution = position.currentNotionalUsd !== null ? position.currentNotionalUsd - position.entryNotionalUsd : 0;

    const existing = bySymbol.get(position.symbol);
    if (existing) {
      existing.openPositionsCount += 1;
      existing.totalQuantity += position.quantity;
      existing.entryNotionalUsd += position.entryNotionalUsd;
      existing.currentNotionalUsd += effectiveCurrentNotionalUsd;
      existing.unrealizedPnlUsd += unrealizedPnlContribution;
      if (position.lastMarkedToMarketAt && (!existing.lastMarkedToMarketAt || position.lastMarkedToMarketAt > existing.lastMarkedToMarketAt)) {
        existing.lastMarkedToMarketAt = position.lastMarkedToMarketAt;
      }
    } else {
      bySymbol.set(position.symbol, {
        symbol: position.symbol,
        openPositionsCount: 1,
        totalQuantity: position.quantity,
        entryNotionalUsd: position.entryNotionalUsd,
        currentNotionalUsd: effectiveCurrentNotionalUsd,
        unrealizedPnlUsd: unrealizedPnlContribution,
        lastMarkedToMarketAt: position.lastMarkedToMarketAt ?? null,
      });
    }
  }

  return Array.from(bySymbol.values())
    .map((acc) => ({
      symbol: acc.symbol,
      openPositionsCount: acc.openPositionsCount,
      totalQuantity: acc.totalQuantity,
      entryNotionalUsd: acc.entryNotionalUsd,
      currentNotionalUsd: acc.currentNotionalUsd,
      unrealizedPnlUsd: acc.unrealizedPnlUsd,
      unrealizedPnlPct: acc.entryNotionalUsd > 0 ? acc.unrealizedPnlUsd / acc.entryNotionalUsd : null,
      averageEntryPriceUsd: acc.totalQuantity > 0 ? acc.entryNotionalUsd / acc.totalQuantity : null,
      currentPriceUsd: acc.totalQuantity > 0 ? acc.currentNotionalUsd / acc.totalQuantity : null,
      lastMarkedToMarketAt: acc.lastMarkedToMarketAt,
    }))
    .sort((a, b) => b.currentNotionalUsd - a.currentNotionalUsd);
}

/** largestSymbolWeight is a 0-1 fraction, or null when there is no open exposure to weigh against. */
export function deriveConcentrationStatus(largestSymbolWeight: number | null): ConcentrationStatus {
  if (largestSymbolWeight === null) return "no_data";
  if (largestSymbolWeight >= 0.95) return "single_symbol";
  if (largestSymbolWeight > 0.6) return "high_concentration";
  if (largestSymbolWeight > 0.35) return "moderate_concentration";
  return "diversified";
}

export type ExposurePostureInput = {
  hasBaseCapital: boolean;
  openExposureUsd: number;
  exposureRatio: number | null;
  largestSymbolWeight: number | null;
  /** exposureRatio / maxExposureRatio — how much of the known Risk Constitution exposure ceiling is used, or null if no ceiling is known. */
  exposureLimitUsage: number | null;
};

/**
 * Deterministic dashboard-level exposure posture only — never a compliance
 * certification. Risk-limit usage is checked before concentration so a
 * portfolio that is both near its exposure ceiling and concentrated reports
 * the more urgent (capital-limit) condition first.
 */
export function deriveExposurePosture(input: ExposurePostureInput): ExposurePosture {
  if (!input.hasBaseCapital && input.openExposureUsd === 0) return "not_ready";
  if (input.openExposureUsd === 0) return "idle";
  if (input.exposureLimitUsage !== null && input.exposureLimitUsage > 1) return "over_exposure_limit";
  if (input.exposureLimitUsage !== null && input.exposureLimitUsage >= 0.8) return "near_exposure_limit";
  if (input.largestSymbolWeight !== null && input.largestSymbolWeight > 0.6) return "high_concentration";
  if (input.largestSymbolWeight !== null && input.largestSymbolWeight > 0.35) return "watch_concentration";
  return "balanced";
}

export type AllocationSummaryInput = {
  baseCapitalUsd: number;
  openExposureUsd: number;
  unrealizedPnlUsd: number;
  realizedPnlUsd: number;
  largestSymbolExposureUsd: number;
  /** The existing Level 1 max_simulated_exposure ratio (risk-policy-engine.ts) — reused, never re-derived. Null only if no such limit is configured. */
  maxExposureRatio: number | null;
};

export type AllocationSummary = {
  simulatedPortfolioValueUsd: number;
  availableSimulatedCashUsd: number;
  exposureRatio: number | null;
  totalPnlUsd: number;
  largestSymbolWeight: number | null;
  concentrationStatus: ConcentrationStatus;
  exposurePosture: ExposurePosture;
  exposureLimitUsage: number | null;
};

/**
 * Combines base capital, open exposure, and realized/unrealized P&L into the
 * Allocation Summary metrics (Section 1) plus the derived concentration
 * status and exposure posture. Pure, deterministic, no I/O.
 *
 * Note: exposureRatio here is marked-to-market exposure (current notional)
 * over base capital — a display metric for "how much of my simulated capital
 * is committed right now." It is distinct from the Level 1 risk engine's own
 * max_simulated_exposure check, which is enforced against *entry* notional
 * (cost basis) at trade-intent time (see risk-policy-engine.ts). Comparing
 * this ratio to maxExposureRatio is a dashboard-level proximity signal, never
 * a compliance claim.
 */
export function deriveAllocationSummary(input: AllocationSummaryInput): AllocationSummary {
  const totalPnlUsd = input.realizedPnlUsd + input.unrealizedPnlUsd;
  const simulatedPortfolioValueUsd = input.baseCapitalUsd + totalPnlUsd;
  const availableSimulatedCashUsd = input.baseCapitalUsd - input.openExposureUsd + input.realizedPnlUsd;
  const exposureRatio = input.baseCapitalUsd > 0 ? input.openExposureUsd / input.baseCapitalUsd : null;
  const largestSymbolWeight = input.openExposureUsd > 0 ? input.largestSymbolExposureUsd / input.openExposureUsd : null;
  const concentrationStatus = deriveConcentrationStatus(largestSymbolWeight);
  const exposureLimitUsage =
    input.maxExposureRatio !== null && input.maxExposureRatio > 0 && exposureRatio !== null ? exposureRatio / input.maxExposureRatio : null;

  const exposurePosture = deriveExposurePosture({
    hasBaseCapital: input.baseCapitalUsd > 0,
    openExposureUsd: input.openExposureUsd,
    exposureRatio,
    largestSymbolWeight,
    exposureLimitUsage,
  });

  return { simulatedPortfolioValueUsd, availableSimulatedCashUsd, exposureRatio, totalPnlUsd, largestSymbolWeight, concentrationStatus, exposurePosture, exposureLimitUsage };
}

export type DeriveExposureNotesInput = {
  hasOpenPositions: boolean;
  concentrationStatus: ConcentrationStatus;
  largestSymbol: string | null;
  /** 0-1 fraction */
  largestSymbolWeight: number | null;
  /** 0-1 fraction, null when base capital isn't available */
  exposureRatio: number | null;
  topGainer: { symbol: string; unrealizedPnlUsd: number } | null;
  topLoser: { symbol: string; unrealizedPnlUsd: number } | null;
  riskLimitProximityAvailable: boolean;
};

/**
 * Deterministic, descriptive-only notes — never prescriptive ("you should
 * buy/sell"), never predictive, no LLM/agent involved. Pure, no I/O.
 */
export function deriveExposureNotes(input: DeriveExposureNotesInput): ExposureNote[] {
  const notes: ExposureNote[] = [];

  if (!input.hasOpenPositions) {
    notes.push({
      kind: "empty",
      severity: "info",
      message: "No open paper positions yet. Allocation will appear after governed paper positions are opened.",
    });
    return notes;
  }

  if (input.concentrationStatus === "single_symbol" && input.largestSymbol) {
    notes.push({
      kind: "concentration",
      severity: "caution",
      message: `Open simulated exposure is currently concentrated in one symbol: ${input.largestSymbol}.`,
    });
  } else if (input.concentrationStatus === "high_concentration" && input.largestSymbol && input.largestSymbolWeight !== null) {
    notes.push({
      kind: "concentration",
      severity: "watch",
      message: `${input.largestSymbol} represents ${Math.round(input.largestSymbolWeight * 100)}% of open simulated exposure.`,
    });
  }

  if (input.exposureRatio !== null) {
    notes.push({
      kind: "exposure",
      severity: "info",
      message: `Open simulated exposure is ${Math.round(input.exposureRatio * 100)}% of base simulated capital.`,
    });
  } else {
    notes.push({
      kind: "cash",
      severity: "info",
      message: "Cash vs invested split is not available because base capital is not modeled for this portfolio.",
    });
  }

  if (input.topLoser) {
    notes.push({ kind: "pnl", severity: "watch", message: `${input.topLoser.symbol} is the largest unrealized loss contributor.` });
  }
  if (input.topGainer) {
    notes.push({ kind: "pnl", severity: "info", message: `${input.topGainer.symbol} is the largest unrealized gain contributor.` });
  }

  if (!input.riskLimitProximityAvailable) {
    notes.push({ kind: "risk_limit", severity: "info", message: "Risk limit proximity is not available yet." });
  }

  return notes;
}

/**
 * Builds the read-only Allocation & Exposure payload for the caller's
 * tenant. Every read is scoped to companyId via the existing tenant-scoped
 * helpers in trade-service.ts. Reads paper_positions and trade_intents only
 * to resolve each position's source draft/signal — never generates signals,
 * never creates/mutates a trade intent, never runs risk review, and never
 * opens/closes/marks a paper position.
 */
export async function getAllocationExposureOverview(companyId: string): Promise<AllocationExposureOverview> {
  const portfolio = await getOrCreateDefaultPortfolio(companyId);

  const [positions, tradeIntents] = await Promise.all([listPaperPositions(companyId), listTradeIntents(companyId)]);

  const openPositions = positions.filter((p) => p.status === "open");
  const closedPositions = positions.filter((p) => p.status === "closed");
  const tradeIntentById = new Map(tradeIntents.map((intent) => [intent.id, intent]));

  const aggregationInputs: AllocationPositionInput[] = openPositions.map((p) => ({
    symbol: p.symbol,
    quantity: p.quantity,
    entryPriceUsd: p.entry_price_usd,
    currentPriceUsd: p.current_price_usd,
    entryNotionalUsd: p.entry_notional_usd,
    currentNotionalUsd: p.current_notional_usd,
    lastMarkedToMarketAt: p.last_marked_at,
  }));

  const symbolGroups = groupPositionsBySymbol(aggregationInputs);
  const openExposureUsd = symbolGroups.reduce((sum, s) => sum + s.currentNotionalUsd, 0);
  const unrealizedPnlUsd = symbolGroups.reduce((sum, s) => sum + s.unrealizedPnlUsd, 0);
  const realizedPnlUsd = closedPositions.reduce((sum, p) => sum + p.realized_pnl_usd, 0);

  const largestSymbolGroup = symbolGroups[0] ?? null;

  const allocationSummary = deriveAllocationSummary({
    baseCapitalUsd: portfolio.base_capital_usd,
    openExposureUsd,
    unrealizedPnlUsd,
    realizedPnlUsd,
    largestSymbolExposureUsd: largestSymbolGroup?.currentNotionalUsd ?? 0,
    maxExposureRatio: MAX_SIMULATED_EXPOSURE_RATIO,
  });

  const topThreeConcentration =
    openExposureUsd > 0
      ? symbolGroups.slice(0, TOP_CONCENTRATION_SYMBOL_COUNT).reduce((sum, s) => sum + s.currentNotionalUsd, 0) / openExposureUsd
      : null;

  const symbolsPayload = symbolGroups.map((s) => ({
    ...s,
    exposureWeight: openExposureUsd > 0 ? s.currentNotionalUsd / openExposureUsd : null,
    portfolioWeight: allocationSummary.simulatedPortfolioValueUsd > 0 ? s.currentNotionalUsd / allocationSummary.simulatedPortfolioValueUsd : null,
  }));

  const positionsPayload = openPositions
    .map((p: PaperPositionRow) => {
      const unrealizedPnl = p.current_notional_usd - p.entry_notional_usd;
      const tradeIntent = tradeIntentById.get(p.trade_intent_id) ?? null;
      return {
        id: p.id,
        symbol: p.symbol,
        quantity: p.quantity,
        entryPriceUsd: p.entry_price_usd,
        currentPriceUsd: p.current_price_usd,
        entryNotionalUsd: p.entry_notional_usd,
        currentNotionalUsd: p.current_notional_usd,
        unrealizedPnlUsd: unrealizedPnl,
        unrealizedPnlPct: p.entry_notional_usd > 0 ? unrealizedPnl / p.entry_notional_usd : null,
        exposureWeight: openExposureUsd > 0 ? p.current_notional_usd / openExposureUsd : null,
        openedAt: p.opened_at,
        tradeIntentId: p.trade_intent_id,
        sourceSignalId: tradeIntent?.paper_signal_recommendation_id ?? null,
      };
    })
    .sort((a, b) => b.currentNotionalUsd - a.currentNotionalUsd || b.entryNotionalUsd - a.entryNotionalUsd)
    .slice(0, RECENT_POSITIONS_LIMIT);

  function toContribution(s: SymbolAllocation) {
    return {
      symbol: s.symbol,
      unrealizedPnlUsd: s.unrealizedPnlUsd,
      exposureUsd: s.currentNotionalUsd,
      exposureWeight: openExposureUsd > 0 ? s.currentNotionalUsd / openExposureUsd : null,
    };
  }

  const topGainers = symbolGroups
    .filter((s) => s.unrealizedPnlUsd > 0)
    .sort((a, b) => b.unrealizedPnlUsd - a.unrealizedPnlUsd)
    .slice(0, TOP_CONTRIBUTORS_LIMIT);
  const topLosers = symbolGroups
    .filter((s) => s.unrealizedPnlUsd < 0)
    .sort((a, b) => a.unrealizedPnlUsd - b.unrealizedPnlUsd)
    .slice(0, TOP_CONTRIBUTORS_LIMIT);

  const notes = deriveExposureNotes({
    hasOpenPositions: openPositions.length > 0,
    concentrationStatus: allocationSummary.concentrationStatus,
    largestSymbol: largestSymbolGroup?.symbol ?? null,
    largestSymbolWeight: allocationSummary.largestSymbolWeight,
    exposureRatio: allocationSummary.exposureRatio,
    topGainer: topGainers[0] ? { symbol: topGainers[0].symbol, unrealizedPnlUsd: topGainers[0].unrealizedPnlUsd } : null,
    topLoser: topLosers[0] ? { symbol: topLosers[0].symbol, unrealizedPnlUsd: topLosers[0].unrealizedPnlUsd } : null,
    riskLimitProximityAvailable: true,
  });

  const lastMarkedToMarketAt = symbolGroups.reduce<string | null>((latest, s) => {
    if (s.lastMarkedToMarketAt && (!latest || s.lastMarkedToMarketAt > latest)) return s.lastMarkedToMarketAt;
    return latest;
  }, null);

  return {
    portfolio: {
      id: portfolio.id,
      name: portfolio.name,
      baseCapitalUsd: portfolio.base_capital_usd,
      simulatedPortfolioValueUsd: allocationSummary.simulatedPortfolioValueUsd,
      availableSimulatedCashUsd: allocationSummary.availableSimulatedCashUsd,
      openExposureUsd,
      exposureRatio: allocationSummary.exposureRatio,
      realizedPnlUsd,
      unrealizedPnlUsd,
      totalPnlUsd: allocationSummary.totalPnlUsd,
      openPositionsCount: openPositions.length,
      openSymbolsCount: symbolGroups.length,
      lastMarkedToMarketAt,
    },

    allocation: {
      largestSymbol: largestSymbolGroup?.symbol ?? null,
      largestSymbolExposureUsd: largestSymbolGroup?.currentNotionalUsd ?? 0,
      largestSymbolWeight: allocationSummary.largestSymbolWeight,
      topThreeConcentration,
      concentrationStatus: allocationSummary.concentrationStatus,
      exposurePosture: allocationSummary.exposurePosture,
    },

    symbols: symbolsPayload,
    positions: positionsPayload,

    pnlContribution: {
      topGainers: topGainers.map(toContribution),
      topLosers: topLosers.map(toContribution),
    },

    governance: {
      paperOnly: true,
      realExecutionLocked: true,
      brokerConnected: false,
      liveOrderRoutingEnabled: false,
      riskLimitProximityAvailable: true,
      maxExposureRatio: MAX_SIMULATED_EXPOSURE_RATIO,
      exposureLimitUsage: allocationSummary.exposureLimitUsage,
    },

    notes,
  };
}
