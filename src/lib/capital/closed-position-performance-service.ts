// AOC Capital — Closed Position Performance & Realized P&L Reporting v1 (PR #18).
//
// Read-only reporting layer only. Reads already-governed closed paper
// positions (status = 'closed'), their recorded close values, their related
// close-review records, related governed close audit events, and — where
// traceable — their upstream trade intent / signal recommendation, then
// normalizes all of it into a single ClosedPositionPerformanceReport.
//
// This never closes a position, never requests a close review, never marks a
// position to market, never refreshes valuation, never generates a signal,
// never creates/submits/cancels a draft trade intent, never runs Risk
// Constitution review, never creates a paper position, and never mutates an
// audit record. This module never calls a mutation RPC and never writes any
// table — every read is a plain `.select()` scoped by company_id (and, for
// portfolio-level tables, portfolio_id). Real execution remains locked.

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateDefaultPortfolio } from "@/lib/trading/trade-service";
import { PAPER_SIGNAL_RECOMMENDATION_COLUMNS } from "./signal-engine-service";
import type { AuditLedgerRow, PaperPositionCloseReviewRow, PaperPositionRow, PaperSignalRecommendationRow, TradeIntentRow } from "@/lib/trading/database-contract";

const PAPER_POSITION_COLUMNS =
  "id,company_id,portfolio_id,trade_intent_id,symbol,side,quantity,entry_price_usd,entry_notional_usd,current_price_usd,current_notional_usd,unrealized_pnl_usd,unrealized_pnl_pct,realized_pnl_usd,realized_pnl_pct,status,opened_at,closed_at,closed_by,close_price_usd,close_notional_usd,close_reason,close_review_id,last_marked_at,created_at,updated_at";
const TRADE_INTENT_COLUMNS =
  "id,company_id,portfolio_id,symbol,side,quantity,notional_usd,leverage,source,signal_id,paper_signal_recommendation_id,status,created_by,created_at,cancelled_at,cancelled_by";
const CLOSE_REVIEW_COLUMNS =
  "id,company_id,portfolio_id,paper_position_id,trade_intent_id,requested_by,requested_at,decision,status,close_price_usd,close_notional_usd,entry_notional_usd,realized_pnl_usd,realized_pnl_pct,valuation_source,created_at,updated_at";
const AUDIT_LEDGER_COLUMNS = "id,company_id,event_type,subject_type,subject_id,actor,payload,occurred_at";

// A paper-only MVP portfolio's full closed history is expected to stay well
// under this — generous enough that reporting never silently truncates in
// practice, without an unbounded query against a tenant-scoped table.
const POSITION_ROWS_LIMIT = 1000;

// ─── Read-only data access (all scoped by company_id, and by portfolio_id
// for every portfolio-level table) ───────────────────────────────────────────

async function listPositionsForPortfolio(companyId: string, portfolioId: string): Promise<PaperPositionRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("paper_positions")
    .select(PAPER_POSITION_COLUMNS)
    .eq("company_id", companyId)
    .eq("portfolio_id", portfolioId)
    .order("opened_at", { ascending: false })
    .limit(POSITION_ROWS_LIMIT);
  return (data ?? []) as PaperPositionRow[];
}

async function listTradeIntentsByIds(companyId: string, portfolioId: string, ids: string[]): Promise<Map<string, TradeIntentRow>> {
  const uniqueIds = Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
  if (uniqueIds.length === 0) return new Map();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("trade_intents")
    .select(TRADE_INTENT_COLUMNS)
    .eq("company_id", companyId)
    .eq("portfolio_id", portfolioId)
    .in("id", uniqueIds);
  const rows = (data ?? []) as TradeIntentRow[];
  return new Map(rows.map((row) => [row.id, row]));
}

async function listSignalsByIds(companyId: string, portfolioId: string, ids: string[]): Promise<Map<string, PaperSignalRecommendationRow>> {
  const uniqueIds = Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
  if (uniqueIds.length === 0) return new Map();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("paper_signal_recommendations")
    .select(PAPER_SIGNAL_RECOMMENDATION_COLUMNS)
    .eq("company_id", companyId)
    .eq("portfolio_id", portfolioId)
    .in("id", uniqueIds);
  const rows = (data ?? []) as PaperSignalRecommendationRow[];
  return new Map(rows.map((row) => [row.id, row]));
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

// ─── deriveRealizedPnl ──────────────────────────────────────────────────────

export type RealizedPnlInput = {
  realizedPnlUsd: number | null;
  closeNotionalUsd: number | null;
  entryNotionalUsd: number | null;
};

/**
 * Prefers the stored realized_pnl_usd figure. Falls back to
 * close_notional_usd - entry_notional_usd only when both are present. Never
 * substitutes current_notional_usd for a closed position's realized figure —
 * a closed position's "current" valuation is frozen at close, not a fresh
 * market read. Returns null — never a guess — when neither source is
 * available. Deliberately decoupled from PaperPositionRow's non-null DB
 * columns (see AllocationPositionInput in allocation-exposure-service.ts for
 * the same rationale) so this stays correct and testable even though the
 * schema currently guarantees realized_pnl_usd is never null.
 */
export function deriveRealizedPnl(input: RealizedPnlInput): number | null {
  if (input.realizedPnlUsd !== null && input.realizedPnlUsd !== undefined) return input.realizedPnlUsd;
  if (input.closeNotionalUsd !== null && input.entryNotionalUsd !== null) return input.closeNotionalUsd - input.entryNotionalUsd;
  return null;
}

// ─── deriveRealizedReturn ───────────────────────────────────────────────────

export type RealizedReturnInput = {
  realizedPnlPct: number | null;
  realizedPnlUsd: number | null;
  entryNotionalUsd: number | null;
};

/**
 * Prefers the stored realized_pnl_pct figure. Falls back to
 * realizedPnlUsd / entryNotionalUsd only when entryNotionalUsd > 0
 * (divide-by-zero safe). Returns null when neither source is available.
 */
export function deriveRealizedReturn(input: RealizedReturnInput): number | null {
  if (input.realizedPnlPct !== null && input.realizedPnlPct !== undefined) return input.realizedPnlPct;
  if (input.realizedPnlUsd !== null && input.entryNotionalUsd !== null && input.entryNotionalUsd > 0) return input.realizedPnlUsd / input.entryNotionalUsd;
  return null;
}

// ─── classifyClosedPositionOutcome ──────────────────────────────────────────

export type ClosedPositionOutcome = "winner" | "loser" | "flat" | "unknown";

export function classifyClosedPositionOutcome(realizedPnlUsd: number | null): ClosedPositionOutcome {
  if (realizedPnlUsd === null || realizedPnlUsd === undefined) return "unknown";
  if (realizedPnlUsd > 0) return "winner";
  if (realizedPnlUsd < 0) return "loser";
  return "flat";
}

// ─── summarizeWinLossStats ───────────────────────────────────────────────────

export type WinLossRowInput = { realizedPnlUsd: number | null; outcome: ClosedPositionOutcome };

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

/**
 * Win/loss rate excludes "unknown" (realized P&L unavailable) rows from the
 * denominator entirely — an unresolved position is neither a win nor a loss,
 * and folding it into the denominator would understate both rates. Payoff
 * ratio is only computed when there is at least one winner and one loser
 * with a strictly negative average loss (never a divide-by-zero guess, and
 * null whenever there are no winners or no losers).
 */
export function summarizeWinLossStats(rows: WinLossRowInput[]): WinLossStats {
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

// ─── summarizeRealizedVsUnrealized ──────────────────────────────────────────

export type OpenPositionValuationInput = { entryNotionalUsd: number; currentNotionalUsd: number | null };
export type ClosedRealizedInput = { realizedPnlUsd: number | null };
export type RealizedVsUnrealizedAvailability = "complete" | "partial" | "not_available";

export type RealizedVsUnrealizedSplit = {
  realizedPnlUsd: number;
  unrealizedPnlUsd: number;
  totalPnlUsd: number | null;
  openPositionsCount: number;
  closedPositionsCount: number;
  availability: RealizedVsUnrealizedAvailability;
  note: string;
};

/**
 * Sums only the stored values each side already carries — never refreshes
 * valuation, never calls market data. Unrealized P&L uses
 * current_notional_usd - entry_notional_usd from open positions only.
 * totalPnlUsd is only ever populated when every open position has a stored
 * current valuation and every closed position has a resolvable realized
 * P&L; otherwise the two partial sums are still returned (each summing only
 * what is known), but they are never added together into a total that would
 * silently omit missing positions.
 */
export function summarizeRealizedVsUnrealized(openPositions: OpenPositionValuationInput[], closedRows: ClosedRealizedInput[]): RealizedVsUnrealizedSplit {
  const closedKnown = closedRows.filter((r) => r.realizedPnlUsd !== null && r.realizedPnlUsd !== undefined);
  const realizedPnlUsd = closedKnown.reduce((sum, r) => sum + (r.realizedPnlUsd as number), 0);
  const realizedComplete = closedKnown.length === closedRows.length;

  const openKnown = openPositions.filter((p) => p.currentNotionalUsd !== null && p.currentNotionalUsd !== undefined);
  const unrealizedPnlUsd = openKnown.reduce((sum, p) => sum + ((p.currentNotionalUsd as number) - p.entryNotionalUsd), 0);
  const unrealizedComplete = openKnown.length === openPositions.length;

  let availability: RealizedVsUnrealizedAvailability;
  let totalPnlUsd: number | null = null;
  if (realizedComplete && unrealizedComplete) {
    availability = "complete";
    totalPnlUsd = realizedPnlUsd + unrealizedPnlUsd;
  } else if (closedKnown.length > 0 || openKnown.length > 0) {
    availability = "partial";
  } else {
    availability = "not_available";
  }

  const note =
    availability === "complete"
      ? "Realized and unrealized simulated P&L are both fully available for this portfolio."
      : availability === "partial"
        ? "Some open or closed positions are missing stored valuation, so the totals below reflect only the available data."
        : "Realized and unrealized simulated P&L are not available yet.";

  return {
    realizedPnlUsd,
    unrealizedPnlUsd,
    totalPnlUsd,
    openPositionsCount: openPositions.length,
    closedPositionsCount: closedRows.length,
    availability,
    note,
  };
}

// ─── deriveGovernanceEvidenceStatus ──────────────────────────────────────────

export type GovernanceEvidenceStatus = "complete" | "partial" | "missing";

export type GovernanceEvidenceInput = {
  hasCloseReviewId: boolean;
  hasApprovedAudit: boolean;
  hasClosedAudit: boolean;
};

/**
 * complete only when all three governed-close markers are present (a
 * resolved close review record, the approval audit event, and the closed
 * audit event); missing only when none are present; partial otherwise.
 * Never mutates, never backfills, never invents evidence that isn't
 * actually present — a "missing" closed position simply remains readable
 * for historical reporting.
 */
export function deriveGovernanceEvidenceStatus(input: GovernanceEvidenceInput): GovernanceEvidenceStatus {
  const markers = [input.hasCloseReviewId, input.hasApprovedAudit, input.hasClosedAudit];
  const presentCount = markers.filter(Boolean).length;
  if (presentCount === markers.length) return "complete";
  if (presentCount === 0) return "missing";
  return "partial";
}

// ─── buildClosedPositionRows ──────────────────────────────────────────────────

export type SourceChainStatus = "complete" | "partial" | "unlinked";

export type ClosedPositionRow = {
  id: string;
  symbol: string;
  quantity: number;
  status: "closed";
  openedAt: string;
  closedAt: string;
  entryPriceUsd: number;
  closePriceUsd: number | null;
  entryNotionalUsd: number;
  closeNotionalUsd: number | null;
  realizedPnlUsd: number | null;
  realizedPnlPct: number | null;
  holdingPeriodDays: number | null;
  outcome: ClosedPositionOutcome;
  closeReviewId: string | null;
  hasCloseReviewRecord: boolean;
  hasApprovedCloseReviewAudit: boolean;
  hasClosedAudit: boolean;
  governanceEvidenceStatus: GovernanceEvidenceStatus;
  sourceChainStatus: SourceChainStatus;
  sourceStrategyName: string | null;
  sourceStrategyId: string | null;
  tradeIntentId: string | null;
  signalId: string | null;
  detailHref: string;
};

export type ClosedPositionRawInput = {
  id: string;
  symbol: string;
  quantity: number;
  status: "open" | "closed";
  openedAt: string;
  closedAt: string | null;
  entryPriceUsd: number;
  closePriceUsd: number | null;
  entryNotionalUsd: number;
  closeNotionalUsd: number | null;
  realizedPnlUsd: number | null;
  realizedPnlPct: number | null;
  closeReviewId: string | null;
  tradeIntentId: string | null;
};

export type TradeIntentSourceRef = { id: string; source: string; paperSignalRecommendationId: string | null };
export type SignalSourceRef = { id: string; strategyKey: string | null; strategyName: string | null };

export type BuildClosedPositionRowsInput = {
  positions: ClosedPositionRawInput[];
  tradeIntentsById: Map<string, TradeIntentSourceRef>;
  signalsById: Map<string, SignalSourceRef>;
  /** Position ids with a resolved *approved* paper_position_close_reviews record. */
  closeReviewPositionIds: Set<string>;
  auditFlagsByPositionId: Map<string, CloseAuditFlags>;
};

/**
 * Normalizes closed paper positions into report-ready rows. Only ever
 * processes rows whose status is 'closed' (an 'open' row passed in here is
 * silently skipped, and a 'closed' row without a closedAt — which should
 * never happen — is skipped too, since holding period and history sorting
 * both require it). Holding period is computed in fractional days from
 * openedAt/closedAt. Source-chain attribution is only ever set from a fully
 * resolved trade intent + signal recommendation (source ===
 * 'signal_recommendation' and the signal record itself resolved) — a
 * missing link anywhere in that chain leaves sourceStrategyId/
 * sourceStrategyName null rather than guessing from the symbol. Governance
 * evidence is derived from the close review record actually found (not just
 * the denormalized close_review_id column) plus the two governed close
 * audit events, so historical/legacy-shaped closed records (closed before
 * PR #17's governed close review) remain readable but are never mistaken
 * for newly governed.
 */
export function buildClosedPositionRows(input: BuildClosedPositionRowsInput): ClosedPositionRow[] {
  const rows: ClosedPositionRow[] = [];

  for (const position of input.positions) {
    if (position.status !== "closed" || !position.closedAt) continue;

    const realizedPnlUsd = deriveRealizedPnl({
      realizedPnlUsd: position.realizedPnlUsd,
      closeNotionalUsd: position.closeNotionalUsd,
      entryNotionalUsd: position.entryNotionalUsd,
    });
    const realizedPnlPct = deriveRealizedReturn({
      realizedPnlPct: position.realizedPnlPct,
      realizedPnlUsd,
      entryNotionalUsd: position.entryNotionalUsd,
    });
    const outcome = classifyClosedPositionOutcome(realizedPnlUsd);

    const holdingPeriodDays =
      position.openedAt && position.closedAt ? (new Date(position.closedAt).getTime() - new Date(position.openedAt).getTime()) / (1000 * 60 * 60 * 24) : null;

    const tradeIntent = position.tradeIntentId ? (input.tradeIntentsById.get(position.tradeIntentId) ?? null) : null;
    const signal = tradeIntent?.paperSignalRecommendationId ? (input.signalsById.get(tradeIntent.paperSignalRecommendationId) ?? null) : null;

    let sourceChainStatus: SourceChainStatus;
    if (!tradeIntent || tradeIntent.source !== "signal_recommendation") sourceChainStatus = "unlinked";
    else if (!signal) sourceChainStatus = "partial";
    else sourceChainStatus = "complete";

    const auditFlags = input.auditFlagsByPositionId.get(position.id) ?? { hasApprovedAudit: false, hasClosedAudit: false };
    const hasCloseReviewRecord = input.closeReviewPositionIds.has(position.id);
    const governanceEvidenceStatus = deriveGovernanceEvidenceStatus({
      hasCloseReviewId: hasCloseReviewRecord,
      hasApprovedAudit: auditFlags.hasApprovedAudit,
      hasClosedAudit: auditFlags.hasClosedAudit,
    });

    rows.push({
      id: position.id,
      symbol: position.symbol,
      quantity: position.quantity,
      status: "closed",
      openedAt: position.openedAt,
      closedAt: position.closedAt,
      entryPriceUsd: position.entryPriceUsd,
      closePriceUsd: position.closePriceUsd,
      entryNotionalUsd: position.entryNotionalUsd,
      closeNotionalUsd: position.closeNotionalUsd,
      realizedPnlUsd,
      realizedPnlPct,
      holdingPeriodDays,
      outcome,
      closeReviewId: position.closeReviewId,
      hasCloseReviewRecord,
      hasApprovedCloseReviewAudit: auditFlags.hasApprovedAudit,
      hasClosedAudit: auditFlags.hasClosedAudit,
      governanceEvidenceStatus,
      sourceChainStatus,
      sourceStrategyName: signal?.strategyName ?? null,
      sourceStrategyId: signal?.strategyKey ?? null,
      tradeIntentId: position.tradeIntentId,
      signalId: tradeIntent?.paperSignalRecommendationId ?? null,
      detailHref: `/capital/positions/${position.id}`,
    });
  }

  return rows;
}

// ─── groupClosedPerformanceBySymbol ──────────────────────────────────────────

export type SymbolGovernanceCompleteness = "complete" | "partial" | "missing" | "not_applicable";

export type SymbolPerformanceGroup = {
  symbol: string;
  closedPositionsCount: number;
  winners: number;
  losers: number;
  flat: number;
  unknown: number;
  winRate: number | null;
  totalRealizedPnlUsd: number;
  averageRealizedPnlUsd: number | null;
  averageRealizedReturnPct: number | null;
  totalEntryNotionalUsd: number;
  totalCloseNotionalUsd: number;
  latestClosedAt: string;
  governanceCompleteness: SymbolGovernanceCompleteness;
};

/** Groups closed rows by symbol. Sorted by total realized P&L descending, as the product spec requires. Pure, deterministic, no I/O. */
export function groupClosedPerformanceBySymbol(rows: ClosedPositionRow[]): SymbolPerformanceGroup[] {
  const bySymbol = new Map<string, ClosedPositionRow[]>();
  for (const row of rows) {
    const list = bySymbol.get(row.symbol) ?? [];
    list.push(row);
    bySymbol.set(row.symbol, list);
  }

  const groups: SymbolPerformanceGroup[] = Array.from(bySymbol.entries()).map(([symbol, symbolRows]) => {
    const winLoss = summarizeWinLossStats(symbolRows.map((r) => ({ realizedPnlUsd: r.realizedPnlUsd, outcome: r.outcome })));
    const known = symbolRows.filter((r) => r.realizedPnlUsd !== null);
    const totalRealizedPnlUsd = known.reduce((sum, r) => sum + (r.realizedPnlUsd as number), 0);
    const knownReturns = symbolRows.filter((r) => r.realizedPnlPct !== null);

    const completeCount = symbolRows.filter((r) => r.governanceEvidenceStatus === "complete").length;
    const missingCount = symbolRows.filter((r) => r.governanceEvidenceStatus === "missing").length;
    let governanceCompleteness: SymbolGovernanceCompleteness;
    if (symbolRows.length === 0) governanceCompleteness = "not_applicable";
    else if (completeCount === symbolRows.length) governanceCompleteness = "complete";
    else if (missingCount === symbolRows.length) governanceCompleteness = "missing";
    else governanceCompleteness = "partial";

    return {
      symbol,
      closedPositionsCount: symbolRows.length,
      winners: winLoss.winners,
      losers: winLoss.losers,
      flat: winLoss.flat,
      unknown: winLoss.unknown,
      winRate: winLoss.winRate,
      totalRealizedPnlUsd,
      averageRealizedPnlUsd: known.length > 0 ? totalRealizedPnlUsd / known.length : null,
      averageRealizedReturnPct: knownReturns.length > 0 ? knownReturns.reduce((sum, r) => sum + (r.realizedPnlPct as number), 0) / knownReturns.length : null,
      totalEntryNotionalUsd: symbolRows.reduce((sum, r) => sum + r.entryNotionalUsd, 0),
      totalCloseNotionalUsd: symbolRows.reduce((sum, r) => sum + (r.closeNotionalUsd ?? 0), 0),
      latestClosedAt: symbolRows.reduce((latest, r) => (r.closedAt > latest ? r.closedAt : latest), symbolRows[0].closedAt),
      governanceCompleteness,
    };
  });

  return groups.sort((a, b) => b.totalRealizedPnlUsd - a.totalRealizedPnlUsd);
}

// ─── groupClosedPerformanceBySource ──────────────────────────────────────────

export type SourceTraceabilityStatus = "complete" | "unlinked";

export type SourcePerformanceGroup = {
  sourceStrategyId: string | null;
  sourceStrategyName: string | null;
  closedPositionsCount: number;
  totalRealizedPnlUsd: number;
  averageRealizedReturnPct: number | null;
  winRate: number | null;
  symbols: string[];
  latestClosedAt: string;
  traceabilityStatus: SourceTraceabilityStatus;
};

const UNLINKED_SOURCE_KEY = "__unlinked__";

/**
 * Attributes realized P&L to a strategy only for rows whose source chain
 * fully resolved to a signal recommendation carrying a strategy_key
 * (sourceChainStatus === "complete"). Every other row — no trade intent, a
 * manual (non-signal) draft, or a signal reference that didn't resolve — is
 * grouped into a single "unlinked" bucket rather than guessed at from its
 * symbol. This is descriptive attribution only, never a ranking or a
 * recommendation. Pure, deterministic, no I/O.
 */
export function groupClosedPerformanceBySource(rows: ClosedPositionRow[]): SourcePerformanceGroup[] {
  const groups = new Map<string, ClosedPositionRow[]>();
  for (const row of rows) {
    const key = row.sourceChainStatus === "complete" && row.sourceStrategyId ? row.sourceStrategyId : UNLINKED_SOURCE_KEY;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const result: SourcePerformanceGroup[] = Array.from(groups.entries()).map(([key, groupRows]) => {
    const winLoss = summarizeWinLossStats(groupRows.map((r) => ({ realizedPnlUsd: r.realizedPnlUsd, outcome: r.outcome })));
    const known = groupRows.filter((r) => r.realizedPnlUsd !== null);
    const totalRealizedPnlUsd = known.reduce((sum, r) => sum + (r.realizedPnlUsd as number), 0);
    const knownReturns = groupRows.filter((r) => r.realizedPnlPct !== null);
    const isUnlinked = key === UNLINKED_SOURCE_KEY;

    return {
      sourceStrategyId: isUnlinked ? null : key,
      sourceStrategyName: isUnlinked ? null : (groupRows.find((r) => r.sourceStrategyName)?.sourceStrategyName ?? null),
      closedPositionsCount: groupRows.length,
      totalRealizedPnlUsd,
      averageRealizedReturnPct: knownReturns.length > 0 ? knownReturns.reduce((sum, r) => sum + (r.realizedPnlPct as number), 0) / knownReturns.length : null,
      winRate: winLoss.winRate,
      symbols: Array.from(new Set(groupRows.map((r) => r.symbol))),
      latestClosedAt: groupRows.reduce((latest, r) => (r.closedAt > latest ? r.closedAt : latest), groupRows[0].closedAt),
      traceabilityStatus: isUnlinked ? "unlinked" : "complete",
    } satisfies SourcePerformanceGroup;
  });

  return result.sort((a, b) => b.totalRealizedPnlUsd - a.totalRealizedPnlUsd);
}

// ─── Realized P&L summary + governance evidence summary (internal helpers) ──

export type BestWorstPosition = { id: string; symbol: string; realizedPnlUsd: number };
export type LatestClosedPosition = { id: string; symbol: string; closedAt: string };

export type RealizedPnlSummary = {
  totalRealizedPnlUsd: number;
  /** Weighted: sum(realizedPnlUsd) / sum(entryNotionalUsd) over rows with both available — never an average of percentages. */
  totalRealizedPnlPct: number | null;
  totalClosedPositions: number;
  totalEntryNotionalClosedUsd: number;
  totalCloseNotionalUsd: number;
  averageRealizedPnlUsd: number | null;
  averageRealizedReturnPct: number | null;
  bestPosition: BestWorstPosition | null;
  worstPosition: BestWorstPosition | null;
  latestClosedPosition: LatestClosedPosition | null;
};

function buildRealizedPnlSummary(rows: ClosedPositionRow[]): RealizedPnlSummary {
  const known = rows.filter((r) => r.realizedPnlUsd !== null);
  const totalRealizedPnlUsd = known.reduce((sum, r) => sum + (r.realizedPnlUsd as number), 0);

  const weightedRows = rows.filter((r) => r.realizedPnlUsd !== null && r.entryNotionalUsd > 0);
  const weightedDenominator = weightedRows.reduce((sum, r) => sum + r.entryNotionalUsd, 0);
  const totalRealizedPnlPct = weightedDenominator > 0 ? weightedRows.reduce((sum, r) => sum + (r.realizedPnlUsd as number), 0) / weightedDenominator : null;

  const knownReturns = rows.filter((r) => r.realizedPnlPct !== null);
  const averageRealizedReturnPct = knownReturns.length > 0 ? knownReturns.reduce((sum, r) => sum + (r.realizedPnlPct as number), 0) / knownReturns.length : null;
  const averageRealizedPnlUsd = known.length > 0 ? totalRealizedPnlUsd / known.length : null;

  const bestRow = known.length > 0 ? known.reduce((best, r) => ((r.realizedPnlUsd as number) > (best.realizedPnlUsd as number) ? r : best)) : null;
  const worstRow = known.length > 0 ? known.reduce((worst, r) => ((r.realizedPnlUsd as number) < (worst.realizedPnlUsd as number) ? r : worst)) : null;
  const latestRow = rows.length > 0 ? rows.reduce((latest, r) => (r.closedAt > latest.closedAt ? r : latest)) : null;

  return {
    totalRealizedPnlUsd,
    totalRealizedPnlPct,
    totalClosedPositions: rows.length,
    totalEntryNotionalClosedUsd: rows.reduce((sum, r) => sum + r.entryNotionalUsd, 0),
    totalCloseNotionalUsd: rows.reduce((sum, r) => sum + (r.closeNotionalUsd ?? 0), 0),
    averageRealizedPnlUsd,
    averageRealizedReturnPct,
    bestPosition: bestRow ? { id: bestRow.id, symbol: bestRow.symbol, realizedPnlUsd: bestRow.realizedPnlUsd as number } : null,
    worstPosition: worstRow ? { id: worstRow.id, symbol: worstRow.symbol, realizedPnlUsd: worstRow.realizedPnlUsd as number } : null,
    latestClosedPosition: latestRow ? { id: latestRow.id, symbol: latestRow.symbol, closedAt: latestRow.closedAt } : null,
  };
}

export type GovernanceEvidenceSummary = {
  totalClosedPositions: number;
  governedCloseReviewCount: number;
  positionsWithCloseReviewId: number;
  positionsWithApprovedCloseReviewAudit: number;
  positionsWithClosedAudit: number;
  positionsWithCompleteEvidence: number;
  positionsMissingGovernedEvidence: number;
  historicalLegacyShapedCount: number;
};

function buildGovernanceEvidenceSummary(rows: ClosedPositionRow[]): GovernanceEvidenceSummary {
  return {
    totalClosedPositions: rows.length,
    governedCloseReviewCount: rows.filter((r) => r.hasCloseReviewRecord).length,
    positionsWithCloseReviewId: rows.filter((r) => Boolean(r.closeReviewId)).length,
    positionsWithApprovedCloseReviewAudit: rows.filter((r) => r.hasApprovedCloseReviewAudit).length,
    positionsWithClosedAudit: rows.filter((r) => r.hasClosedAudit).length,
    positionsWithCompleteEvidence: rows.filter((r) => r.governanceEvidenceStatus === "complete").length,
    positionsMissingGovernedEvidence: rows.filter((r) => r.governanceEvidenceStatus === "missing").length,
    historicalLegacyShapedCount: rows.filter((r) => !r.closeReviewId).length,
  };
}

// ─── ClosedPositionPerformanceReport ─────────────────────────────────────────

export type ClosedPositionPerformanceReport = {
  portfolio: { id: string; name: string };
  generatedAt: string;
  summary: RealizedPnlSummary;
  realizedVsUnrealized: RealizedVsUnrealizedSplit;
  winLoss: WinLossStats;
  bySymbol: SymbolPerformanceGroup[];
  bySource: SourcePerformanceGroup[];
  rows: ClosedPositionRow[];
  governanceEvidence: GovernanceEvidenceSummary;
  governance: {
    paperOnly: true;
    readOnly: true;
    realExecutionLocked: true;
    brokerConnected: false;
    liveOrderRoutingEnabled: false;
    marketDataFetched: false;
    mutationsPerformed: false;
  };
  relatedLinks: {
    overview: string;
    allocation: string;
    positions: string;
    signals: string;
    tradeIntents: string;
    strategies: string;
    performance: string;
  };
};

/**
 * Builds the read-only Closed Position Performance report for the caller's
 * tenant and default portfolio. Every query is scoped by company_id (and, for
 * portfolio-level tables, portfolio_id). Never calls a governed mutation RPC,
 * never fetches live market data, and never marks a position to market —
 * open positions are read only to compute the unrealized side of the
 * realized-vs-unrealized split, using their already-stored valuation.
 */
export async function getClosedPositionPerformance(companyId: string): Promise<ClosedPositionPerformanceReport> {
  const portfolio = await getOrCreateDefaultPortfolio(companyId);
  const positions = await listPositionsForPortfolio(companyId, portfolio.id);

  const openPositions = positions.filter((p) => p.status === "open");
  const closedPositions = positions.filter((p) => p.status === "closed");
  const closedPositionIds = closedPositions.map((p) => p.id);
  const tradeIntentIds = closedPositions.map((p) => p.trade_intent_id).filter((id): id is string => Boolean(id));

  const [tradeIntentsById, closeReviewPositionIds, auditFlagsByPositionId] = await Promise.all([
    listTradeIntentsByIds(companyId, portfolio.id, tradeIntentIds),
    listApprovedCloseReviewPositionIds(companyId, portfolio.id, closedPositionIds),
    listCloseAuditFlagsForPositions(companyId, closedPositionIds),
  ]);

  const signalIds = Array.from(tradeIntentsById.values())
    .map((intent) => intent.paper_signal_recommendation_id)
    .filter((id): id is string => Boolean(id));
  const signalsById = await listSignalsByIds(companyId, portfolio.id, signalIds);

  const tradeIntentRefs = new Map<string, TradeIntentSourceRef>(
    Array.from(tradeIntentsById.entries()).map(([id, intent]) => [
      id,
      { id: intent.id, source: intent.source, paperSignalRecommendationId: intent.paper_signal_recommendation_id },
    ]),
  );
  const signalRefs = new Map<string, SignalSourceRef>(
    Array.from(signalsById.entries()).map(([id, signal]) => [id, { id: signal.id, strategyKey: signal.strategy_key, strategyName: signal.strategy_name }]),
  );

  const rows = buildClosedPositionRows({
    positions: closedPositions.map((p) => ({
      id: p.id,
      symbol: p.symbol,
      quantity: p.quantity,
      status: p.status,
      openedAt: p.opened_at,
      closedAt: p.closed_at,
      entryPriceUsd: p.entry_price_usd,
      closePriceUsd: p.close_price_usd,
      entryNotionalUsd: p.entry_notional_usd,
      closeNotionalUsd: p.close_notional_usd,
      realizedPnlUsd: p.realized_pnl_usd,
      realizedPnlPct: p.realized_pnl_pct,
      closeReviewId: p.close_review_id,
      tradeIntentId: p.trade_intent_id,
    })),
    tradeIntentsById: tradeIntentRefs,
    signalsById: signalRefs,
    closeReviewPositionIds,
    auditFlagsByPositionId,
  }).sort((a, b) => (a.closedAt < b.closedAt ? 1 : a.closedAt > b.closedAt ? -1 : 0));

  const summary = buildRealizedPnlSummary(rows);
  const winLoss = summarizeWinLossStats(rows.map((r) => ({ realizedPnlUsd: r.realizedPnlUsd, outcome: r.outcome })));
  const realizedVsUnrealized = summarizeRealizedVsUnrealized(
    openPositions.map((p) => ({ entryNotionalUsd: p.entry_notional_usd, currentNotionalUsd: p.current_notional_usd })),
    rows.map((r) => ({ realizedPnlUsd: r.realizedPnlUsd })),
  );
  const bySymbol = groupClosedPerformanceBySymbol(rows);
  const bySource = groupClosedPerformanceBySource(rows);
  const governanceEvidence = buildGovernanceEvidenceSummary(rows);

  return {
    portfolio: { id: portfolio.id, name: portfolio.name },
    generatedAt: new Date().toISOString(),
    summary,
    realizedVsUnrealized,
    winLoss,
    bySymbol,
    bySource,
    rows,
    governanceEvidence,
    governance: {
      paperOnly: true,
      readOnly: true,
      realExecutionLocked: true,
      brokerConnected: false,
      liveOrderRoutingEnabled: false,
      marketDataFetched: false,
      mutationsPerformed: false,
    },
    relatedLinks: {
      overview: "/capital/overview",
      allocation: "/capital/allocation",
      positions: "/capital/positions",
      signals: "/capital/signals",
      tradeIntents: "/capital/trade-intents",
      strategies: "/capital/strategies",
      performance: "/capital/performance",
    },
  };
}
