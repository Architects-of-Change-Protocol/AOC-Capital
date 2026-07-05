// AOC Capital — Strategy-Level Performance Attribution v1 (PR #19).
//
// Read-only, reporting-only aggregation layer. Reads signals, draft trade
// intents, Risk Constitution decisions, paper positions, governed close
// reviews, and their governed close audit events, then groups every one of
// those records by its traceable strategy source chain (a signal's own
// strategy_key/strategy_name — trade intents, decisions, and paper positions
// only inherit a strategy attribution by resolving back through
// trade_intents.paper_signal_recommendation_id to that same signal).
//
// This never generates a signal, never creates/submits/cancels a draft trade
// intent, never runs Risk Constitution review, never creates/closes/marks a
// paper position, never requests a close review, never refreshes valuation,
// never mutates an audit record, and never mutates a strategy or portfolio
// record. Every read is a plain `.select()` scoped by company_id (and, for
// portfolio-level tables, portfolio_id). Real execution remains locked.
//
// Attribution is only ever assigned when the source chain actually resolves
// to a signal's strategy_key — never guessed from a symbol, and never
// inferred for a manual (non-signal) draft. Anything that doesn't resolve is
// grouped into a single "unlinked" bucket instead, so it stays readable for
// historical reporting without being misattributed.

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateDefaultPortfolio } from "@/lib/trading/trade-service";
import { PAPER_SIGNAL_RECOMMENDATION_COLUMNS } from "./signal-engine-service";
import type { AuditLedgerRow, PaperPositionCloseReviewRow, PaperPositionRow, PaperSignalRecommendationRow, TradeDecisionRow, TradeIntentRow } from "@/lib/trading/database-contract";

const TRADE_INTENT_COLUMNS =
  "id,company_id,portfolio_id,symbol,side,quantity,notional_usd,leverage,source,signal_id,paper_signal_recommendation_id,status,created_by,created_at,cancelled_at,cancelled_by";
const TRADE_DECISION_COLUMNS = "id,company_id,trade_intent_id,verdict,reasons,policy_version,decided_at";
const PAPER_POSITION_COLUMNS =
  "id,company_id,portfolio_id,trade_intent_id,symbol,side,quantity,entry_price_usd,entry_notional_usd,current_price_usd,current_notional_usd,unrealized_pnl_usd,unrealized_pnl_pct,realized_pnl_usd,realized_pnl_pct,status,opened_at,closed_at,closed_by,close_price_usd,close_notional_usd,close_reason,close_review_id,last_marked_at,created_at,updated_at";
const CLOSE_REVIEW_COLUMNS =
  "id,company_id,portfolio_id,paper_position_id,trade_intent_id,requested_by,requested_at,decision,status,close_price_usd,close_notional_usd,entry_notional_usd,realized_pnl_usd,realized_pnl_pct,valuation_source,created_at,updated_at";
const AUDIT_LEDGER_COLUMNS = "id,company_id,event_type,subject_type,subject_id,actor,payload,occurred_at";

// A paper-only MVP portfolio's full lifecycle history is expected to stay
// well under this — generous enough that reporting never silently truncates
// in practice, without an unbounded query against a tenant-scoped table.
const ROWS_LIMIT = 1000;

export const UNLINKED_STRATEGY_KEY = "__unlinked__";

// ─── Read-only data access (all scoped by company_id, and by portfolio_id
// for every portfolio-level table) ───────────────────────────────────────────

async function listSignalsForPortfolio(companyId: string, portfolioId: string): Promise<PaperSignalRecommendationRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("paper_signal_recommendations")
    .select(PAPER_SIGNAL_RECOMMENDATION_COLUMNS)
    .eq("company_id", companyId)
    .eq("portfolio_id", portfolioId)
    .order("generated_at", { ascending: false })
    .limit(ROWS_LIMIT);
  return (data ?? []) as PaperSignalRecommendationRow[];
}

async function listTradeIntentsForPortfolio(companyId: string, portfolioId: string): Promise<TradeIntentRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("trade_intents")
    .select(TRADE_INTENT_COLUMNS)
    .eq("company_id", companyId)
    .eq("portfolio_id", portfolioId)
    .order("created_at", { ascending: false })
    .limit(ROWS_LIMIT);
  return (data ?? []) as TradeIntentRow[];
}

async function listTradeDecisionsByIntentIds(companyId: string, intentIds: string[]): Promise<TradeDecisionRow[]> {
  const uniqueIds = Array.from(new Set(intentIds.filter((id): id is string => Boolean(id))));
  if (uniqueIds.length === 0) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("trade_decisions").select(TRADE_DECISION_COLUMNS).eq("company_id", companyId).in("trade_intent_id", uniqueIds);
  return (data ?? []) as TradeDecisionRow[];
}

async function listPositionsForPortfolio(companyId: string, portfolioId: string): Promise<PaperPositionRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("paper_positions")
    .select(PAPER_POSITION_COLUMNS)
    .eq("company_id", companyId)
    .eq("portfolio_id", portfolioId)
    .order("opened_at", { ascending: false })
    .limit(ROWS_LIMIT);
  return (data ?? []) as PaperPositionRow[];
}

/** Only ever reads *approved* close reviews — the only kind the governed close RPC ever writes. */
async function listApprovedCloseReviewPositionIds(companyId: string, portfolioId: string, positionIds: string[]): Promise<Set<string>> {
  if (positionIds.length === 0) return new Set();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("paper_position_close_reviews")
    .select(CLOSE_REVIEW_COLUMNS)
    .eq("company_id", companyId)
    .eq("portfolio_id", portfolioId)
    .eq("decision", "approved")
    .in("paper_position_id", positionIds);
  const rows = (data ?? []) as PaperPositionCloseReviewRow[];
  return new Set(rows.map((row) => row.paper_position_id));
}

export type CloseAuditFlags = { hasApprovedAudit: boolean; hasClosedAudit: boolean };

/** Scoped by company_id + subject_type + subject_id — never reads any other subject's audit events. */
async function listCloseAuditFlagsForPositions(companyId: string, positionIds: string[]): Promise<Map<string, CloseAuditFlags>> {
  const flags = new Map<string, CloseAuditFlags>();
  if (positionIds.length === 0) return flags;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("audit_ledger")
    .select(AUDIT_LEDGER_COLUMNS)
    .eq("company_id", companyId)
    .eq("subject_type", "paper_position")
    .in("subject_id", positionIds)
    .in("event_type", ["paper_position_close_review_approved", "paper_position_closed"]);
  const rows = (data ?? []) as AuditLedgerRow[];
  for (const row of rows) {
    const existing = flags.get(row.subject_id) ?? { hasApprovedAudit: false, hasClosedAudit: false };
    if (row.event_type === "paper_position_close_review_approved") existing.hasApprovedAudit = true;
    if (row.event_type === "paper_position_closed") existing.hasClosedAudit = true;
    flags.set(row.subject_id, existing);
  }
  return flags;
}

// ─── deriveStrategySourceKey ──────────────────────────────────────────────────

export type StrategySourceRecordInput = {
  /** A directly-selected strategy profile key, when a record carries one. */
  strategyProfileKey?: string | null;
  /** A resolved signal's own strategy_key — the primary attribution key for this PR. */
  signalStrategyKey?: string | null;
};

/**
 * Resolves the stable grouping key used everywhere in this report. Prefers a
 * direct strategy/profile key when present, falls back to a resolved
 * signal's strategy_key, and otherwise returns the shared "unlinked" sentinel
 * — never a guess derived from a symbol or any other unrelated field.
 */
export function deriveStrategySourceKey(input: StrategySourceRecordInput): string {
  if (input.strategyProfileKey) return input.strategyProfileKey;
  if (input.signalStrategyKey) return input.signalStrategyKey;
  return UNLINKED_STRATEGY_KEY;
}

// ─── deriveRealizedPnl / deriveRealizedReturn ────────────────────────────────

export type RealizedPnlInput = { realizedPnlUsd: number | null; closeNotionalUsd: number | null; entryNotionalUsd: number | null };

/** Prefers the stored realized_pnl_usd figure. Falls back to close_notional_usd - entry_notional_usd only when both are present. Never null-guesses. */
export function deriveRealizedPnl(input: RealizedPnlInput): number | null {
  if (input.realizedPnlUsd !== null && input.realizedPnlUsd !== undefined) return input.realizedPnlUsd;
  if (input.closeNotionalUsd !== null && input.entryNotionalUsd !== null) return input.closeNotionalUsd - input.entryNotionalUsd;
  return null;
}

export type RealizedReturnInput = { realizedPnlPct: number | null; realizedPnlUsd: number | null; entryNotionalUsd: number | null };

/** Prefers the stored realized_pnl_pct figure. Falls back to realizedPnlUsd / entryNotionalUsd only when entryNotionalUsd > 0 (divide-by-zero safe). */
export function deriveRealizedReturn(input: RealizedReturnInput): number | null {
  if (input.realizedPnlPct !== null && input.realizedPnlPct !== undefined) return input.realizedPnlPct;
  if (input.realizedPnlUsd !== null && input.entryNotionalUsd !== null && input.entryNotionalUsd > 0) return input.realizedPnlUsd / input.entryNotionalUsd;
  return null;
}

// ─── deriveUnrealizedPnl / deriveUnrealizedReturn ────────────────────────────

export type UnrealizedPnlInput = { currentNotionalUsd: number | null; entryNotionalUsd: number | null };

/** For open positions only. Uses latest stored current_notional_usd — never fetches or refreshes valuation. Null when either value is missing. */
export function deriveUnrealizedPnl(input: UnrealizedPnlInput): number | null {
  if (input.currentNotionalUsd === null || input.currentNotionalUsd === undefined) return null;
  if (input.entryNotionalUsd === null || input.entryNotionalUsd === undefined) return null;
  return input.currentNotionalUsd - input.entryNotionalUsd;
}

export type UnrealizedReturnInput = { unrealizedPnlUsd: number | null; entryNotionalUsd: number | null };

/** unrealizedPnlUsd / entryNotionalUsd only when entryNotionalUsd > 0. Null otherwise. */
export function deriveUnrealizedReturn(input: UnrealizedReturnInput): number | null {
  if (input.unrealizedPnlUsd === null || input.unrealizedPnlUsd === undefined) return null;
  if (input.entryNotionalUsd === null || input.entryNotionalUsd === undefined || input.entryNotionalUsd <= 0) return null;
  return input.unrealizedPnlUsd / input.entryNotionalUsd;
}

// ─── classifyPositionOutcome ──────────────────────────────────────────────────

export type PositionOutcome = "winner" | "loser" | "flat" | "unknown";

export function classifyPositionOutcome(realizedPnlUsd: number | null): PositionOutcome {
  if (realizedPnlUsd === null || realizedPnlUsd === undefined) return "unknown";
  if (realizedPnlUsd > 0) return "winner";
  if (realizedPnlUsd < 0) return "loser";
  return "flat";
}

// ─── summarizeStrategyLifecycleFunnel ────────────────────────────────────────

export type LifecycleFunnelCounts = {
  signalCount: number;
  eligibleSignalCount: number;
  convertedSignalCount: number;
  draftCount: number;
  cancelledDraftCount: number;
  submittedDraftCount: number;
  approvedReviewCount: number;
  rejectedReviewCount: number;
  openedPositionCount: number;
  openPositionCount: number;
  closedPositionCount: number;
  closeReviewCount: number;
};

export type LifecycleFunnelRates = {
  signalToDraftRate: number | null;
  draftSubmissionRate: number | null;
  reviewApprovalRate: number | null;
  approvedToPositionRate: number | null;
  positionCloseRate: number | null;
};

export type LifecycleFunnel = LifecycleFunnelCounts & LifecycleFunnelRates;

function safeRate(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

/**
 * Derives lifecycle conversion rates from raw counts only — never treats a
 * zero or missing denominator as a zero rate (returns null, "not available",
 * instead), and never infers a lifecycle stage happened just because an
 * earlier one did.
 */
export function summarizeStrategyLifecycleFunnel(counts: LifecycleFunnelCounts): LifecycleFunnel {
  const submittedReviewCount = counts.approvedReviewCount + counts.rejectedReviewCount;
  return {
    ...counts,
    signalToDraftRate: safeRate(counts.convertedSignalCount, counts.eligibleSignalCount),
    draftSubmissionRate: safeRate(counts.submittedDraftCount, counts.draftCount),
    reviewApprovalRate: safeRate(counts.approvedReviewCount, submittedReviewCount),
    approvedToPositionRate: safeRate(counts.openedPositionCount, counts.approvedReviewCount),
    positionCloseRate: safeRate(counts.closedPositionCount, counts.openedPositionCount),
  };
}

// ─── summarizeStrategyWinLoss ────────────────────────────────────────────────

export type WinLossRowInput = { realizedPnlUsd: number | null; outcome: PositionOutcome };

export type WinLossStats = {
  winners: number;
  losers: number;
  flat: number;
  unknown: number;
  winRate: number | null;
  lossRate: number | null;
  averageWinnerPnlUsd: number | null;
  averageLoserPnlUsd: number | null;
  payoffRatio: number | null;
};

/** Win/loss rate excludes "unknown" rows from the denominator. Payoff ratio is null unless there is at least one winner and one loser with a strictly negative average loss. */
export function summarizeStrategyWinLoss(rows: WinLossRowInput[]): WinLossStats {
  const winners = rows.filter((r) => r.outcome === "winner");
  const losers = rows.filter((r) => r.outcome === "loser");
  const flat = rows.filter((r) => r.outcome === "flat");
  const unknown = rows.filter((r) => r.outcome === "unknown");

  const knownDenominator = winners.length + losers.length + flat.length;
  const winRate = knownDenominator > 0 ? winners.length / knownDenominator : null;
  const lossRate = knownDenominator > 0 ? losers.length / knownDenominator : null;

  const averageWinnerPnlUsd = winners.length > 0 ? winners.reduce((sum, r) => sum + (r.realizedPnlUsd as number), 0) / winners.length : null;
  const averageLoserPnlUsd = losers.length > 0 ? losers.reduce((sum, r) => sum + (r.realizedPnlUsd as number), 0) / losers.length : null;

  const payoffRatio =
    averageWinnerPnlUsd !== null && averageLoserPnlUsd !== null && averageLoserPnlUsd < 0 ? averageWinnerPnlUsd / Math.abs(averageLoserPnlUsd) : null;

  return {
    winners: winners.length,
    losers: losers.length,
    flat: flat.length,
    unknown: unknown.length,
    winRate,
    lossRate,
    averageWinnerPnlUsd,
    averageLoserPnlUsd,
    payoffRatio,
  };
}

// ─── summarizeStrategyRealizedPerformance ────────────────────────────────────

export type ClosedPositionForSummary = {
  id: string;
  symbol: string;
  closedAt: string;
  entryNotionalUsd: number;
  closeNotionalUsd: number | null;
  realizedPnlUsd: number | null;
  realizedPnlPct: number | null;
};

export type BestWorstPosition = { id: string; symbol: string; realizedPnlUsd: number };
export type LatestClosedPosition = { id: string; symbol: string; closedAt: string };

export type StrategyRealizedPerformance = {
  closedPositionsCount: number;
  positionsWithRealizedPnl: number;
  totalEntryNotionalClosedUsd: number;
  totalCloseNotionalUsd: number;
  totalRealizedPnlUsd: number;
  /** Weighted: sum(realizedPnlUsd) / sum(entryNotionalUsd) over rows with both available — never an average of percentages. */
  weightedRealizedReturnPct: number | null;
  averageRealizedPnlUsd: number | null;
  averageRealizedReturnPct: number | null;
  bestClosedPosition: BestWorstPosition | null;
  worstClosedPosition: BestWorstPosition | null;
  latestClosedPosition: LatestClosedPosition | null;
};

/** Sums, weights, and highlights realized performance for a strategy's closed positions. Never guesses missing figures. */
export function summarizeStrategyRealizedPerformance(rows: ClosedPositionForSummary[]): StrategyRealizedPerformance {
  const known = rows.filter((r) => r.realizedPnlUsd !== null && r.realizedPnlUsd !== undefined);
  const totalRealizedPnlUsd = known.reduce((sum, r) => sum + (r.realizedPnlUsd as number), 0);

  const weightedRows = rows.filter((r) => r.realizedPnlUsd !== null && r.realizedPnlUsd !== undefined && r.entryNotionalUsd > 0);
  const weightedDenominator = weightedRows.reduce((sum, r) => sum + r.entryNotionalUsd, 0);
  const weightedRealizedReturnPct = weightedDenominator > 0 ? weightedRows.reduce((sum, r) => sum + (r.realizedPnlUsd as number), 0) / weightedDenominator : null;

  const knownReturns = rows.filter((r) => r.realizedPnlPct !== null && r.realizedPnlPct !== undefined);
  const averageRealizedReturnPct = knownReturns.length > 0 ? knownReturns.reduce((sum, r) => sum + (r.realizedPnlPct as number), 0) / knownReturns.length : null;
  const averageRealizedPnlUsd = known.length > 0 ? totalRealizedPnlUsd / known.length : null;

  const bestRow = known.length > 0 ? known.reduce((best, r) => ((r.realizedPnlUsd as number) > (best.realizedPnlUsd as number) ? r : best)) : null;
  const worstRow = known.length > 0 ? known.reduce((worst, r) => ((r.realizedPnlUsd as number) < (worst.realizedPnlUsd as number) ? r : worst)) : null;
  const latestRow = rows.length > 0 ? rows.reduce((latest, r) => (r.closedAt > latest.closedAt ? r : latest)) : null;

  return {
    closedPositionsCount: rows.length,
    positionsWithRealizedPnl: known.length,
    totalEntryNotionalClosedUsd: rows.reduce((sum, r) => sum + r.entryNotionalUsd, 0),
    totalCloseNotionalUsd: rows.reduce((sum, r) => sum + (r.closeNotionalUsd ?? 0), 0),
    totalRealizedPnlUsd,
    weightedRealizedReturnPct,
    averageRealizedPnlUsd,
    averageRealizedReturnPct,
    bestClosedPosition: bestRow ? { id: bestRow.id, symbol: bestRow.symbol, realizedPnlUsd: bestRow.realizedPnlUsd as number } : null,
    worstClosedPosition: worstRow ? { id: worstRow.id, symbol: worstRow.symbol, realizedPnlUsd: worstRow.realizedPnlUsd as number } : null,
    latestClosedPosition: latestRow ? { id: latestRow.id, symbol: latestRow.symbol, closedAt: latestRow.closedAt } : null,
  };
}

// ─── summarizeStrategyUnrealizedPerformance ──────────────────────────────────

export type OpenPositionForSummary = {
  symbol: string;
  entryNotionalUsd: number;
  currentNotionalUsd: number | null;
};

export type UnrealizedValuationAvailability = "complete" | "partial" | "not_available";

export type StrategyUnrealizedPerformance = {
  openPositionCount: number;
  totalEntryNotionalOpenUsd: number;
  totalCurrentNotionalOpenUsd: number;
  unrealizedPnlUsd: number;
  unrealizedReturnPct: number | null;
  /** Only computed when a positive portfolio-wide open notional total is supplied. */
  exposureShareOfPortfolio: number | null;
  symbols: string[];
  valuationAvailabilityStatus: UnrealizedValuationAvailability;
};

/** Sums only stored current valuations for open positions — never refreshes or fetches market data. */
export function summarizeStrategyUnrealizedPerformance(rows: OpenPositionForSummary[], totalPortfolioOpenNotionalUsd: number | null = null): StrategyUnrealizedPerformance {
  const known = rows.filter((r) => r.currentNotionalUsd !== null && r.currentNotionalUsd !== undefined);
  const totalEntryNotionalOpenUsd = rows.reduce((sum, r) => sum + r.entryNotionalUsd, 0);
  const totalCurrentNotionalOpenUsd = known.reduce((sum, r) => sum + (r.currentNotionalUsd as number), 0);
  const unrealizedPnlUsd = known.reduce((sum, r) => sum + ((r.currentNotionalUsd as number) - r.entryNotionalUsd), 0);
  const unrealizedReturnPct = totalEntryNotionalOpenUsd > 0 && known.length === rows.length ? unrealizedPnlUsd / totalEntryNotionalOpenUsd : null;

  let valuationAvailabilityStatus: UnrealizedValuationAvailability;
  if (rows.length === 0) valuationAvailabilityStatus = "not_available";
  else if (known.length === rows.length) valuationAvailabilityStatus = "complete";
  else if (known.length > 0) valuationAvailabilityStatus = "partial";
  else valuationAvailabilityStatus = "not_available";

  const exposureShareOfPortfolio =
    totalPortfolioOpenNotionalUsd !== null && totalPortfolioOpenNotionalUsd > 0 && known.length === rows.length ? totalCurrentNotionalOpenUsd / totalPortfolioOpenNotionalUsd : null;

  return {
    openPositionCount: rows.length,
    totalEntryNotionalOpenUsd,
    totalCurrentNotionalOpenUsd,
    unrealizedPnlUsd,
    unrealizedReturnPct,
    exposureShareOfPortfolio,
    symbols: Array.from(new Set(rows.map((r) => r.symbol))),
    valuationAvailabilityStatus,
  };
}

// ─── deriveStrategyGovernanceCompleteness ────────────────────────────────────

export type CloseGovernanceCompletenessStatus = "complete" | "partial" | "missing" | "not_applicable";
export type SourceChainCompletenessStatus = "complete" | "unlinked";

export type ClosedPositionGovernanceInput = { hasCloseReviewId: boolean; hasApprovedAudit: boolean; hasClosedAudit: boolean };

export type StrategyGovernanceCompleteness = {
  sourceChainStatus: SourceChainCompletenessStatus;
  closeGovernanceCompletenessStatus: CloseGovernanceCompletenessStatus;
  historicalRecordCount: number;
};

/**
 * Aggregates close-governance evidence across a strategy's closed positions:
 * complete only when every closed position has all three governed-close
 * markers (a resolved close review record, the approval audit event, and the
 * closed audit event); missing only when none do; partial otherwise;
 * not_applicable when there are no closed positions yet. sourceChainStatus is
 * "unlinked" only for the shared unattributed bucket — never backfilled,
 * never inferred, and never mutates any underlying record.
 */
export function deriveStrategyGovernanceCompleteness(input: { isUnlinkedGroup: boolean; closedPositions: ClosedPositionGovernanceInput[] }): StrategyGovernanceCompleteness {
  const historicalRecordCount = input.closedPositions.filter((p) => !p.hasCloseReviewId).length;

  let closeGovernanceCompletenessStatus: CloseGovernanceCompletenessStatus;
  if (input.closedPositions.length === 0) {
    closeGovernanceCompletenessStatus = "not_applicable";
  } else {
    const completeCount = input.closedPositions.filter((p) => p.hasCloseReviewId && p.hasApprovedAudit && p.hasClosedAudit).length;
    const missingCount = input.closedPositions.filter((p) => !p.hasCloseReviewId && !p.hasApprovedAudit && !p.hasClosedAudit).length;
    if (completeCount === input.closedPositions.length) closeGovernanceCompletenessStatus = "complete";
    else if (missingCount === input.closedPositions.length) closeGovernanceCompletenessStatus = "missing";
    else closeGovernanceCompletenessStatus = "partial";
  }

  return {
    sourceChainStatus: input.isUnlinkedGroup ? "unlinked" : "complete",
    closeGovernanceCompletenessStatus,
    historicalRecordCount,
  };
}

// ─── groupAttributionByStrategy ──────────────────────────────────────────────

export type AttributionSignal = { id: string; strategyKey: string; strategyName: string; action: string; status: string; convertedTradeIntentId: string | null; generatedAt: string };
export type AttributionTradeIntent = {
  id: string;
  strategyKey: string | null;
  strategyName: string | null;
  status: string;
  symbol: string;
  createdAt: string;
};
export type AttributionDecision = { id: string; tradeIntentId: string; strategyKey: string | null; strategyName: string | null; verdict: "approved" | "rejected"; decidedAt: string };
export type AttributionPosition = {
  id: string;
  strategyKey: string | null;
  strategyName: string | null;
  symbol: string;
  status: "open" | "closed";
  openedAt: string;
  closedAt: string | null;
  entryNotionalUsd: number;
  currentNotionalUsd: number | null;
  closeNotionalUsd: number | null;
  realizedPnlUsd: number | null;
  realizedPnlPct: number | null;
  closeReviewId: string | null;
  hasApprovedCloseReview: boolean;
  hasApprovedCloseReviewAudit: boolean;
  hasClosedAudit: boolean;
};

export type GroupAttributionInput = {
  signals: AttributionSignal[];
  tradeIntents: AttributionTradeIntent[];
  decisions: AttributionDecision[];
  positions: AttributionPosition[];
};

export type StrategyGroup = {
  strategyKey: string;
  strategyName: string | null;
  isUnlinkedGroup: boolean;
  signals: AttributionSignal[];
  tradeIntents: AttributionTradeIntent[];
  decisions: AttributionDecision[];
  positions: AttributionPosition[];
};

/** Groups every record type by its already-resolved strategy key. Records with no resolvable strategy key are placed in a single shared "unlinked" group — never guessed from a symbol or any other unrelated field. */
export function groupAttributionByStrategy(input: GroupAttributionInput): Map<string, StrategyGroup> {
  const groups = new Map<string, StrategyGroup>();

  function ensureGroup(strategyKey: string | null, strategyName: string | null): StrategyGroup {
    const key = deriveStrategySourceKey({ signalStrategyKey: strategyKey });
    let group = groups.get(key);
    if (!group) {
      group = { strategyKey: key, strategyName: key === UNLINKED_STRATEGY_KEY ? null : strategyName, isUnlinkedGroup: key === UNLINKED_STRATEGY_KEY, signals: [], tradeIntents: [], decisions: [], positions: [] };
      groups.set(key, group);
    } else if (!group.strategyName && strategyName) {
      group.strategyName = strategyName;
    }
    return group;
  }

  for (const signal of input.signals) ensureGroup(signal.strategyKey, signal.strategyName).signals.push(signal);
  for (const intent of input.tradeIntents) ensureGroup(intent.strategyKey, intent.strategyName).tradeIntents.push(intent);
  for (const decision of input.decisions) ensureGroup(decision.strategyKey, decision.strategyName).decisions.push(decision);
  for (const position of input.positions) ensureGroup(position.strategyKey, position.strategyName).positions.push(position);

  return groups;
}

// ─── buildStrategyAttributionRows ────────────────────────────────────────────

export type StrategyAttributionRow = {
  strategyKey: string;
  strategyName: string;
  sourceType: "signal_strategy" | "unlinked";
  sourceChainStatus: SourceChainCompletenessStatus;
  latestActivityAt: string | null;
  lifecycleFunnel: LifecycleFunnel;
  realizedPerformance: StrategyRealizedPerformance;
  unrealizedPerformance: StrategyUnrealizedPerformance;
  winLoss: WinLossStats;
  governance: StrategyGovernanceCompleteness;
  detailHrefs: {
    strategyLibrary: string | null;
    signals: string;
    tradeIntents: string;
    positions: string;
    closedPerformance: string;
  };
};

export type BuildStrategyAttributionRowsInput = {
  groups: Map<string, StrategyGroup>;
  totalPortfolioOpenNotionalUsd: number | null;
};

function latestTimestamp(...timestamps: Array<string | null | undefined>): string | null {
  const known = timestamps.filter((t): t is string => Boolean(t));
  if (known.length === 0) return null;
  return known.reduce((latest, t) => (t > latest ? t : latest));
}

/** Normalizes each strategy group into a single report-ready row: lifecycle funnel, realized/unrealized performance, win/loss, and governance completeness. Never adds a mutation action. */
export function buildStrategyAttributionRows(input: BuildStrategyAttributionRowsInput): StrategyAttributionRow[] {
  const rows: StrategyAttributionRow[] = [];

  for (const group of input.groups.values()) {
    const eligibleSignals = group.signals.filter((s) => s.action === "paper_buy_candidate");
    const convertedSignals = group.signals.filter((s) => Boolean(s.convertedTradeIntentId));
    const cancelledDrafts = group.tradeIntents.filter((t) => t.status === "cancelled");
    const closedPositions = group.positions.filter((p) => p.status === "closed" && p.closedAt);
    const openPositions = group.positions.filter((p) => p.status === "open");
    const approvedReviews = group.decisions.filter((d) => d.verdict === "approved");
    const rejectedReviews = group.decisions.filter((d) => d.verdict === "rejected");

    const lifecycleFunnel = summarizeStrategyLifecycleFunnel({
      signalCount: group.signals.length,
      eligibleSignalCount: eligibleSignals.length,
      convertedSignalCount: convertedSignals.length,
      draftCount: group.tradeIntents.length,
      cancelledDraftCount: cancelledDrafts.length,
      submittedDraftCount: group.decisions.length,
      approvedReviewCount: approvedReviews.length,
      rejectedReviewCount: rejectedReviews.length,
      openedPositionCount: group.positions.length,
      openPositionCount: openPositions.length,
      closedPositionCount: closedPositions.length,
      closeReviewCount: closedPositions.filter((p) => p.hasApprovedCloseReview).length,
    });

    const closedForSummary: ClosedPositionForSummary[] = closedPositions.map((p) => {
      const realizedPnlUsd = deriveRealizedPnl({ realizedPnlUsd: p.realizedPnlUsd, closeNotionalUsd: p.closeNotionalUsd, entryNotionalUsd: p.entryNotionalUsd });
      const realizedPnlPct = deriveRealizedReturn({ realizedPnlPct: p.realizedPnlPct, realizedPnlUsd, entryNotionalUsd: p.entryNotionalUsd });
      return { id: p.id, symbol: p.symbol, closedAt: p.closedAt as string, entryNotionalUsd: p.entryNotionalUsd, closeNotionalUsd: p.closeNotionalUsd, realizedPnlUsd, realizedPnlPct };
    });
    const realizedPerformance = summarizeStrategyRealizedPerformance(closedForSummary);

    const unrealizedPerformance = summarizeStrategyUnrealizedPerformance(
      openPositions.map((p) => ({ symbol: p.symbol, entryNotionalUsd: p.entryNotionalUsd, currentNotionalUsd: p.currentNotionalUsd })),
      input.totalPortfolioOpenNotionalUsd,
    );

    const winLoss = summarizeStrategyWinLoss(
      closedForSummary.map((r) => ({ realizedPnlUsd: r.realizedPnlUsd, outcome: classifyPositionOutcome(r.realizedPnlUsd) })),
    );

    const governance = deriveStrategyGovernanceCompleteness({
      isUnlinkedGroup: group.isUnlinkedGroup,
      closedPositions: closedPositions.map((p) => ({ hasCloseReviewId: p.hasApprovedCloseReview, hasApprovedAudit: p.hasApprovedCloseReviewAudit, hasClosedAudit: p.hasClosedAudit })),
    });

    const latestActivityAt = latestTimestamp(
      ...group.signals.map((s) => s.generatedAt),
      ...group.tradeIntents.map((t) => t.createdAt),
      ...group.decisions.map((d) => d.decidedAt),
      ...group.positions.map((p) => p.closedAt ?? p.openedAt),
    );

    rows.push({
      strategyKey: group.strategyKey,
      strategyName: group.isUnlinkedGroup ? "Unlinked / historical / source unavailable" : (group.strategyName ?? group.strategyKey),
      sourceType: group.isUnlinkedGroup ? "unlinked" : "signal_strategy",
      sourceChainStatus: governance.sourceChainStatus,
      latestActivityAt,
      lifecycleFunnel,
      realizedPerformance,
      unrealizedPerformance,
      winLoss,
      governance,
      detailHrefs: {
        strategyLibrary: group.isUnlinkedGroup ? null : "/capital/strategies",
        signals: "/capital/signals",
        tradeIntents: "/capital/trade-intents",
        positions: "/capital/positions",
        closedPerformance: "/capital/performance/closed",
      },
    });
  }

  return rows.sort((a, b) => {
    const pnlDiff = b.realizedPerformance.totalRealizedPnlUsd - a.realizedPerformance.totalRealizedPnlUsd;
    if (pnlDiff !== 0) return pnlDiff;
    return (b.latestActivityAt ?? "").localeCompare(a.latestActivityAt ?? "");
  });
}

// ─── buildUnlinkedAttributionRows ────────────────────────────────────────────

export type UnlinkedAttributionRow = {
  recordType: "signals" | "drafts" | "reviews" | "positions" | "closed_positions_missing_governance";
  count: number;
  reason: string;
  readable: true;
  href: string | null;
};

export type BuildUnlinkedAttributionRowsInput = {
  unlinkedGroup: StrategyGroup | undefined;
  allClosedPositions: AttributionPosition[];
};

/** Summarizes records that could not be confidently attributed to a strategy. Diagnostic only — never mutates, never backfills, never invents a source link. */
export function buildUnlinkedAttributionRows(input: BuildUnlinkedAttributionRowsInput): UnlinkedAttributionRow[] {
  const group = input.unlinkedGroup;
  const missingGovernance = input.allClosedPositions.filter((p) => !(p.hasApprovedCloseReview && p.hasApprovedCloseReviewAudit && p.hasClosedAudit));

  const rows: UnlinkedAttributionRow[] = [
    {
      recordType: "signals",
      count: group?.signals.length ?? 0,
      reason: "Signal recommendations always carry a strategy_key, so this count is expected to be zero.",
      readable: true,
      href: "/capital/signals",
    },
    {
      recordType: "drafts",
      count: group?.tradeIntents.length ?? 0,
      reason: "Manual draft trade intents, or drafts whose source signal could not be resolved, cannot be attributed to a strategy.",
      readable: true,
      href: "/capital/trade-intents",
    },
    {
      recordType: "reviews",
      count: group?.decisions.length ?? 0,
      reason: "Risk Constitution decisions inherit attribution from their draft trade intent; an unlinked draft produces an unlinked review.",
      readable: true,
      href: "/capital/trade-intents",
    },
    {
      recordType: "positions",
      count: group?.positions.length ?? 0,
      reason: "Paper positions opened from a manual draft, or from a draft whose source signal could not be resolved, cannot be attributed to a strategy.",
      readable: true,
      href: "/capital/positions",
    },
    {
      recordType: "closed_positions_missing_governance",
      count: missingGovernance.length,
      reason: "These closed paper positions remain readable for historical reporting, but complete governed close evidence could not be resolved.",
      readable: true,
      href: "/capital/performance/closed",
    },
  ];

  return rows;
}

// ─── StrategyPerformanceAttributionReport ────────────────────────────────────

export type StrategyAttributionSummary = {
  attributableStrategyCount: number;
  totalSignals: number;
  totalDrafts: number;
  totalSubmittedReviews: number;
  totalApprovedReviews: number;
  totalRejectedReviews: number;
  totalOpenPositions: number;
  totalClosedPositions: number;
  totalRealizedPnlUsd: number;
  totalUnrealizedPnlUsd: number;
  totalSimulatedPnlUsd: number;
  unlinkedRecordCount: number;
  historicalRecordCount: number;
  overallGovernanceCompletenessPct: number | null;
};

export type StrategyPerformanceAttributionReport = {
  portfolio: { id: string; name: string };
  generatedAt: string;
  summary: StrategyAttributionSummary;
  lifecycleFunnelByStrategy: Array<{ strategyKey: string; strategyName: string; funnel: LifecycleFunnel }>;
  strategyRows: StrategyAttributionRow[];
  unlinkedRecords: UnlinkedAttributionRow[];
  governance: {
    paperOnly: true;
    readOnly: true;
    realExecutionLocked: true;
    brokerConnected: false;
    liveOrderRoutingEnabled: false;
    marketDataFetched: false;
    mutationsPerformed: false;
    investmentAdviceProvided: false;
  };
  relatedLinks: {
    overview: string;
    allocation: string;
    positions: string;
    signals: string;
    tradeIntents: string;
    strategies: string;
    performance: string;
    closedPerformance: string;
  };
};

/**
 * Builds the read-only Strategy Performance Attribution report for the
 * caller's tenant and default portfolio. Every query is scoped by company_id
 * (and, for portfolio-level tables, portfolio_id). Never calls a governed
 * mutation RPC, never fetches live market data, and never marks a position to
 * market.
 */
export async function getStrategyPerformanceAttribution(companyId: string): Promise<StrategyPerformanceAttributionReport> {
  const portfolio = await getOrCreateDefaultPortfolio(companyId);

  const [signals, tradeIntents, positions] = await Promise.all([
    listSignalsForPortfolio(companyId, portfolio.id),
    listTradeIntentsForPortfolio(companyId, portfolio.id),
    listPositionsForPortfolio(companyId, portfolio.id),
  ]);

  const signalsById = new Map(signals.map((s) => [s.id, s]));
  const closedPositionIds = positions.filter((p) => p.status === "closed").map((p) => p.id);

  const [decisions, closeReviewPositionIds, auditFlagsByPositionId] = await Promise.all([
    listTradeDecisionsByIntentIds(companyId, tradeIntents.map((t) => t.id)),
    listApprovedCloseReviewPositionIds(companyId, portfolio.id, closedPositionIds),
    listCloseAuditFlagsForPositions(companyId, closedPositionIds),
  ]);

  const tradeIntentsById = new Map(tradeIntents.map((t) => [t.id, t]));

  function resolveStrategyForTradeIntent(intent: TradeIntentRow): { strategyKey: string | null; strategyName: string | null } {
    if (intent.source !== "signal_recommendation" || !intent.paper_signal_recommendation_id) return { strategyKey: null, strategyName: null };
    const signal = signalsById.get(intent.paper_signal_recommendation_id);
    if (!signal) return { strategyKey: null, strategyName: null };
    return { strategyKey: signal.strategy_key, strategyName: signal.strategy_name };
  }

  const attributionSignals: AttributionSignal[] = signals.map((s) => ({
    id: s.id,
    strategyKey: s.strategy_key,
    strategyName: s.strategy_name,
    action: s.action,
    status: s.status,
    convertedTradeIntentId: s.converted_trade_intent_id,
    generatedAt: s.generated_at,
  }));

  const attributionTradeIntents: AttributionTradeIntent[] = tradeIntents.map((t) => {
    const resolved = resolveStrategyForTradeIntent(t);
    return { id: t.id, strategyKey: resolved.strategyKey, strategyName: resolved.strategyName, status: t.status, symbol: t.symbol, createdAt: t.created_at };
  });

  const attributionDecisions: AttributionDecision[] = decisions.map((d) => {
    const intent = tradeIntentsById.get(d.trade_intent_id);
    const resolved = intent ? resolveStrategyForTradeIntent(intent) : { strategyKey: null, strategyName: null };
    return { id: d.id, tradeIntentId: d.trade_intent_id, strategyKey: resolved.strategyKey, strategyName: resolved.strategyName, verdict: d.verdict, decidedAt: d.decided_at };
  });

  const attributionPositions: AttributionPosition[] = positions.map((p) => {
    const intent = p.trade_intent_id ? tradeIntentsById.get(p.trade_intent_id) : undefined;
    const resolved = intent ? resolveStrategyForTradeIntent(intent) : { strategyKey: null, strategyName: null };
    const auditFlags = auditFlagsByPositionId.get(p.id) ?? { hasApprovedAudit: false, hasClosedAudit: false };
    return {
      id: p.id,
      strategyKey: resolved.strategyKey,
      strategyName: resolved.strategyName,
      symbol: p.symbol,
      status: p.status,
      openedAt: p.opened_at,
      closedAt: p.closed_at,
      entryNotionalUsd: p.entry_notional_usd,
      currentNotionalUsd: p.current_notional_usd,
      closeNotionalUsd: p.close_notional_usd,
      realizedPnlUsd: p.realized_pnl_usd,
      realizedPnlPct: p.realized_pnl_pct,
      closeReviewId: p.close_review_id,
      hasApprovedCloseReview: closeReviewPositionIds.has(p.id),
      hasApprovedCloseReviewAudit: auditFlags.hasApprovedAudit,
      hasClosedAudit: auditFlags.hasClosedAudit,
    };
  });

  const groups = groupAttributionByStrategy({ signals: attributionSignals, tradeIntents: attributionTradeIntents, decisions: attributionDecisions, positions: attributionPositions });

  const openPositions = attributionPositions.filter((p) => p.status === "open");
  const totalPortfolioOpenNotionalUsd = openPositions.length > 0 && openPositions.every((p) => p.currentNotionalUsd !== null) ? openPositions.reduce((sum, p) => sum + (p.currentNotionalUsd as number), 0) : null;

  const strategyRows = buildStrategyAttributionRows({ groups, totalPortfolioOpenNotionalUsd });
  const unlinkedRows = buildUnlinkedAttributionRows({ unlinkedGroup: groups.get(UNLINKED_STRATEGY_KEY), allClosedPositions: attributionPositions.filter((p) => p.status === "closed") });

  const attributedRows = strategyRows.filter((r) => r.sourceType === "signal_strategy");
  const unlinkedRow = strategyRows.find((r) => r.sourceType === "unlinked");

  const totalRealizedPnlUsd = attributedRows.reduce((sum, r) => sum + r.realizedPerformance.totalRealizedPnlUsd, 0);
  const totalUnrealizedPnlUsd = attributedRows.reduce((sum, r) => sum + r.unrealizedPerformance.unrealizedPnlUsd, 0);

  const closedPositionsWithGovernance = attributedRows.flatMap((r) => new Array(r.lifecycleFunnel.closedPositionCount).fill(r.governance.closeGovernanceCompletenessStatus));
  const completeGovernanceCount = closedPositionsWithGovernance.filter((s) => s === "complete").length;
  const overallGovernanceCompletenessPct = closedPositionsWithGovernance.length > 0 ? completeGovernanceCount / closedPositionsWithGovernance.length : null;

  const summary: StrategyAttributionSummary = {
    attributableStrategyCount: attributedRows.length,
    totalSignals: attributionSignals.length,
    totalDrafts: attributionTradeIntents.length,
    totalSubmittedReviews: attributionDecisions.length,
    totalApprovedReviews: attributionDecisions.filter((d) => d.verdict === "approved").length,
    totalRejectedReviews: attributionDecisions.filter((d) => d.verdict === "rejected").length,
    totalOpenPositions: openPositions.length,
    totalClosedPositions: attributionPositions.filter((p) => p.status === "closed").length,
    totalRealizedPnlUsd,
    totalUnrealizedPnlUsd,
    totalSimulatedPnlUsd: totalRealizedPnlUsd + totalUnrealizedPnlUsd,
    unlinkedRecordCount: unlinkedRow ? unlinkedRow.lifecycleFunnel.signalCount + unlinkedRow.lifecycleFunnel.draftCount + unlinkedRow.lifecycleFunnel.openedPositionCount : 0,
    historicalRecordCount: strategyRows.reduce((sum, r) => sum + r.governance.historicalRecordCount, 0),
    overallGovernanceCompletenessPct,
  };

  const lifecycleFunnelByStrategy = strategyRows.map((r) => ({ strategyKey: r.strategyKey, strategyName: r.strategyName, funnel: r.lifecycleFunnel }));

  return {
    portfolio: { id: portfolio.id, name: portfolio.name },
    generatedAt: new Date().toISOString(),
    summary,
    lifecycleFunnelByStrategy,
    strategyRows,
    unlinkedRecords: unlinkedRows,
    governance: {
      paperOnly: true,
      readOnly: true,
      realExecutionLocked: true,
      brokerConnected: false,
      liveOrderRoutingEnabled: false,
      marketDataFetched: false,
      mutationsPerformed: false,
      investmentAdviceProvided: false,
    },
    relatedLinks: {
      overview: "/capital/overview",
      allocation: "/capital/allocation",
      positions: "/capital/positions",
      signals: "/capital/signals",
      tradeIntents: "/capital/trade-intents",
      strategies: "/capital/strategies",
      performance: "/capital/performance",
      closedPerformance: "/capital/performance/closed",
    },
  };
}
