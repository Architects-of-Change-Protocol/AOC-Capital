// AOC Capital — Signal Cohort Outcome Tracking v1 (PR #20).
//
// Read-only, reporting-only aggregation layer. Reads paper signal
// recommendations, draft trade intents, Risk Constitution decisions, paper
// positions, governed close reviews, and their governed close audit events,
// then groups every signal recommendation into a cohort (by default,
// recommendation type) and reports how far each signal's own source chain
// advanced through the governed paper-capital lifecycle.
//
// This never generates a signal, never creates/submits/cancels a draft trade
// intent, never runs Risk Constitution review, never creates/closes/marks a
// paper position, never requests a close review, never refreshes valuation,
// never mutates an audit record, and never mutates a strategy or portfolio
// record. Every read is a plain `.select()` scoped by company_id (and, for
// portfolio-level tables, portfolio_id). Real execution remains locked.
//
// A signal's outcome is only ever resolved by following the same reverse
// link Strategy Attribution uses (trade_intents.paper_signal_recommendation_id
// pointing back at a signal's own id) — never guessed from a symbol, never
// inferred from a stored marker alone when the linked record itself can't be
// found. Anything that doesn't resolve stays visible in the diagnostic
// "incomplete outcome" rows instead of being silently dropped or backfilled.

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

export const UNSPECIFIED_COHORT_KEY = "__unspecified__";
export const UNLINKED_COHORT_KEY = "__unlinked__";

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

// ─── deriveSignalCohortKey ────────────────────────────────────────────────────

export type SignalCohortDimension = "recommendation_type" | "strategy_key" | "generated_date_bucket";

export type SignalCohortDimensionInput = { action?: string | null; strategyKey?: string | null; generatedAt?: string | null };

const RECOMMENDATION_TYPE_LABELS: Record<string, string> = {
  paper_buy_candidate: "Paper Buy Candidate",
  watch: "Watch",
  reduce_exposure: "Reduce Exposure",
  avoid: "Avoid",
  no_action: "No Action",
};

/**
 * Resolves the stable cohort key for a given dimension: the recommendation
 * type/label, a resolved strategy_key, or a generated_at month bucket.
 * Returns the shared "unspecified"/"unlinked" sentinel when the requested
 * dimension can't be resolved from stored fields — never guessed from a
 * symbol or any other unrelated field.
 */
export function deriveSignalCohortKey(signal: SignalCohortDimensionInput, dimension: SignalCohortDimension): string {
  if (dimension === "recommendation_type") {
    return signal.action ? `type:${signal.action}` : UNSPECIFIED_COHORT_KEY;
  }
  if (dimension === "strategy_key") {
    return signal.strategyKey ? `strategy:${signal.strategyKey}` : UNLINKED_COHORT_KEY;
  }
  if (dimension === "generated_date_bucket") {
    if (!signal.generatedAt || signal.generatedAt.length < 7) return UNSPECIFIED_COHORT_KEY;
    return `month:${signal.generatedAt.slice(0, 7)}`;
  }
  return UNSPECIFIED_COHORT_KEY;
}

function cohortLabelFor(key: string, dimension: SignalCohortDimension, signal: SignalCohortDimensionInput): string {
  if (key === UNSPECIFIED_COHORT_KEY) return "Unspecified Recommendation Type";
  if (key === UNLINKED_COHORT_KEY) return "Unlinked Strategy";
  if (dimension === "recommendation_type") {
    const action = signal.action ?? "";
    return RECOMMENDATION_TYPE_LABELS[action] ?? action.replace(/_/g, " ");
  }
  if (dimension === "strategy_key") return signal.strategyKey ?? "Unlinked Strategy";
  if (dimension === "generated_date_bucket") return key.replace("month:", "");
  return key;
}

// ─── deriveSignalEligibility ──────────────────────────────────────────────────

export type SignalEligibility = "eligible" | "ineligible" | "unknown";

/**
 * Mirrors the eligibility Signal Engine itself already encoded on the stored
 * row — never re-runs Signal Engine. A signal is only ever eligible to
 * become a draft when its stored action is "paper_buy_candidate" and its
 * stored status is "active" (not blocked, expired, or superseded).
 */
export function deriveSignalEligibility(signal: { action?: string | null; status?: string | null }): SignalEligibility {
  if (signal.action === null || signal.action === undefined || signal.status === null || signal.status === undefined) return "unknown";
  if (signal.action === "paper_buy_candidate" && signal.status === "active") return "eligible";
  return "ineligible";
}

// ─── deriveSignalConversionStatus ────────────────────────────────────────────

export type SignalConversionStatus = "converted" | "not_converted" | "unknown";

/**
 * converted when either a resolved draft trade intent was found (the
 * authoritative reverse link) or the signal's own stored converted marker is
 * present — never creates a link, and unknown only when neither field is
 * even present on the input (insufficient data).
 */
export function deriveSignalConversionStatus(input: { convertedTradeIntentId?: string | null; linkedDraftFound?: boolean }): SignalConversionStatus {
  if (input.convertedTradeIntentId === undefined && input.linkedDraftFound === undefined) return "unknown";
  if (input.linkedDraftFound || input.convertedTradeIntentId) return "converted";
  return "not_converted";
}

// ─── deriveSignalLifecycleStatus ─────────────────────────────────────────────

export type SignalLifecycleStage =
  | "generated"
  | "eligible"
  | "converted_to_draft"
  | "draft_cancelled"
  | "submitted_for_review"
  | "review_approved"
  | "review_rejected"
  | "position_opened"
  | "position_open"
  | "position_closed"
  | "realized_outcome_available"
  | "incomplete";

export type SignalLifecycleStatusInput = {
  eligibility: SignalEligibility;
  draftResolved: boolean;
  draftCancelled: boolean;
  reviewResolved: boolean;
  reviewVerdict: "approved" | "rejected" | null;
  positionResolved: boolean;
  positionStatus: "open" | "closed" | null;
  realizedOutcomeAvailable: boolean;
};

/**
 * Returns the highest lifecycle stage that is actually resolved from stored
 * records — never infers a stage that isn't directly evidenced. Returns
 * "incomplete" only when the resolved facts are internally contradictory
 * (e.g. a resolved position despite a rejected review), which flags a broken
 * source chain instead of silently reporting a plausible-looking stage.
 */
export function deriveSignalLifecycleStatus(input: SignalLifecycleStatusInput): SignalLifecycleStage {
  if (input.reviewVerdict === "rejected" && input.positionResolved) return "incomplete";
  if (input.positionResolved && input.reviewVerdict !== "approved") return "incomplete";
  if (input.realizedOutcomeAvailable && input.positionStatus !== "closed") return "incomplete";

  if (input.realizedOutcomeAvailable) return "realized_outcome_available";
  if (input.positionStatus === "closed") return "position_closed";
  if (input.positionStatus === "open") return "position_open";
  if (input.positionResolved) return "position_opened";
  if (input.reviewVerdict === "rejected") return "review_rejected";
  if (input.reviewVerdict === "approved") return "review_approved";
  if (input.reviewResolved) return "submitted_for_review";
  if (input.draftCancelled) return "draft_cancelled";
  if (input.draftResolved) return "converted_to_draft";
  if (input.eligibility === "eligible") return "eligible";
  return "generated";
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

function safeRate(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

// ─── summarizeSignalLifecycleFunnel ──────────────────────────────────────────

export type LifecycleFunnelCounts = {
  signalCount: number;
  eligibleSignalCount: number;
  convertedSignalCount: number;
  notConvertedSignalCount: number;
  cancelledDraftCount: number;
  submittedReviewCount: number;
  approvedReviewCount: number;
  rejectedReviewCount: number;
  openedPositionCount: number;
  openPositionCount: number;
  closedPositionCount: number;
  realizedOutcomeAvailableCount: number;
  unrealizedOutcomeAvailableCount: number;
  completeSourceChainCount: number;
};

export type LifecycleFunnelRates = {
  eligibilityRate: number | null;
  signalToDraftRate: number | null;
  draftSubmissionRate: number | null;
  reviewApprovalRate: number | null;
  approvalToPositionRate: number | null;
  positionCloseRate: number | null;
  realizedOutcomeAvailabilityRate: number | null;
  sourceChainCompletenessRate: number | null;
};

export type LifecycleFunnel = LifecycleFunnelCounts & LifecycleFunnelRates;

/**
 * Derives lifecycle conversion rates from raw counts only — never treats a
 * zero or missing denominator as a zero rate (returns null / "Not
 * available" instead), and never treats a missing relationship as a
 * successful conversion.
 */
export function summarizeSignalLifecycleFunnel(counts: LifecycleFunnelCounts): LifecycleFunnel {
  return {
    ...counts,
    eligibilityRate: safeRate(counts.eligibleSignalCount, counts.signalCount),
    signalToDraftRate: safeRate(counts.convertedSignalCount, counts.eligibleSignalCount),
    draftSubmissionRate: safeRate(counts.submittedReviewCount, counts.convertedSignalCount),
    reviewApprovalRate: safeRate(counts.approvedReviewCount, counts.submittedReviewCount),
    approvalToPositionRate: safeRate(counts.openedPositionCount, counts.approvedReviewCount),
    positionCloseRate: safeRate(counts.closedPositionCount, counts.openedPositionCount),
    realizedOutcomeAvailabilityRate: safeRate(counts.realizedOutcomeAvailableCount, counts.closedPositionCount),
    sourceChainCompletenessRate: safeRate(counts.completeSourceChainCount, counts.signalCount),
  };
}

// ─── summarizeCohortConversionRates ───────────────────────────────────────────

export type CohortConversionSummary = {
  eligibleCount: number;
  ineligibleCount: number;
  unknownEligibilityCount: number;
  convertedCount: number;
  notConvertedCount: number;
  conversionRate: number | null;
};

export function summarizeCohortConversionRates(bundles: Array<{ eligibility: SignalEligibility; conversionStatus: SignalConversionStatus }>): CohortConversionSummary {
  const eligibleCount = bundles.filter((b) => b.eligibility === "eligible").length;
  const ineligibleCount = bundles.filter((b) => b.eligibility === "ineligible").length;
  const unknownEligibilityCount = bundles.filter((b) => b.eligibility === "unknown").length;
  const convertedCount = bundles.filter((b) => b.conversionStatus === "converted").length;
  const notConvertedCount = bundles.filter((b) => b.conversionStatus === "not_converted").length;
  return { eligibleCount, ineligibleCount, unknownEligibilityCount, convertedCount, notConvertedCount, conversionRate: safeRate(convertedCount, eligibleCount) };
}

// ─── summarizeCohortRiskReviewOutcomes ────────────────────────────────────────

export type CohortRiskReviewSummary = {
  submittedCount: number;
  approvedCount: number;
  rejectedCount: number;
  approvalRate: number | null;
  rejectionRate: number | null;
  mostCommonRejectionReason: string | null;
  latestReviewDate: string | null;
};

/** Reads existing Risk Constitution decision records only — never re-runs review logic or mutates a decision. */
export function summarizeCohortRiskReviewOutcomes(decisions: Array<{ verdict: "approved" | "rejected"; decidedAt: string; reasonLabels: string[] }>): CohortRiskReviewSummary {
  const approved = decisions.filter((d) => d.verdict === "approved");
  const rejected = decisions.filter((d) => d.verdict === "rejected");
  const submittedCount = decisions.length;

  const reasonCounts = new Map<string, number>();
  for (const decision of rejected) {
    for (const reason of decision.reasonLabels) reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
  }
  let mostCommonRejectionReason: string | null = null;
  let highestCount = 0;
  for (const [reason, count] of reasonCounts) {
    if (count > highestCount) {
      highestCount = count;
      mostCommonRejectionReason = reason;
    }
  }

  const latestReviewDate = decisions.length > 0 ? decisions.reduce((latest, d) => (d.decidedAt > latest ? d.decidedAt : latest), decisions[0].decidedAt) : null;

  return {
    submittedCount,
    approvedCount: approved.length,
    rejectedCount: rejected.length,
    approvalRate: safeRate(approved.length, submittedCount),
    rejectionRate: safeRate(rejected.length, submittedCount),
    mostCommonRejectionReason,
    latestReviewDate,
  };
}

// ─── summarizeCohortPositionOutcomes ──────────────────────────────────────────

export type CohortPositionOutcomeSummary = {
  openedCount: number;
  openCount: number;
  closedCount: number;
  closeRate: number | null;
  averageHoldingPeriodDays: number | null;
  symbols: string[];
};

/** Attributes position outcomes only through the already-resolved signal → draft → position chain — never matches by symbol alone. */
export function summarizeCohortPositionOutcomes(positions: Array<{ status: "open" | "closed"; openedAt: string; closedAt: string | null; symbol: string }>): CohortPositionOutcomeSummary {
  const openedCount = positions.length;
  const open = positions.filter((p) => p.status === "open");
  const closed = positions.filter((p) => p.status === "closed");

  const holdingPeriodsDays = closed.filter((p) => p.closedAt).map((p) => (new Date(p.closedAt as string).getTime() - new Date(p.openedAt).getTime()) / 86_400_000);
  const averageHoldingPeriodDays = holdingPeriodsDays.length > 0 ? holdingPeriodsDays.reduce((sum, d) => sum + d, 0) / holdingPeriodsDays.length : null;

  return {
    openedCount,
    openCount: open.length,
    closedCount: closed.length,
    closeRate: safeRate(closed.length, openedCount),
    averageHoldingPeriodDays,
    symbols: Array.from(new Set(positions.map((p) => p.symbol))),
  };
}

// ─── summarizeCohortRealizedPerformance ──────────────────────────────────────

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

export type CohortRealizedPerformance = {
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

/** Sums, weights, and highlights realized performance for a cohort's closed positions. Never guesses missing figures. */
export function summarizeCohortRealizedPerformance(rows: ClosedPositionForSummary[]): CohortRealizedPerformance {
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

// ─── summarizeCohortUnrealizedPerformance ────────────────────────────────────

export type OpenPositionForSummary = {
  symbol: string;
  entryNotionalUsd: number;
  currentNotionalUsd: number | null;
};

export type UnrealizedValuationAvailability = "complete" | "partial" | "not_available";

export type CohortUnrealizedPerformance = {
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

/** Sums only stored current valuations for open positions — never refreshes, fetches, or fills missing valuation with current price. */
export function summarizeCohortUnrealizedPerformance(rows: OpenPositionForSummary[], totalPortfolioOpenNotionalUsd: number | null = null): CohortUnrealizedPerformance {
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

// ─── deriveCohortGovernanceCompleteness ──────────────────────────────────────

export type SourceChainCompletenessStatus = "complete" | "partial" | "unlinked" | "historical";
export type CloseGovernanceCompletenessStatus = "complete" | "partial" | "missing" | "not_applicable";

export type CohortGovernanceCompleteness = {
  sourceChainStatus: SourceChainCompletenessStatus;
  closeGovernanceCompletenessStatus: CloseGovernanceCompletenessStatus;
  unlinkedSignalsCount: number;
  historicalRecordCount: number;
  incompleteChainsCount: number;
};

export type ClosedPositionGovernanceInput = { hasCloseReviewId: boolean; hasApprovedAudit: boolean; hasClosedAudit: boolean };

/**
 * complete only when every bundle's lifecycle status is coherent (never
 * "incomplete") and no signal carries a converted marker whose draft
 * couldn't be resolved; historical when readable closed positions predate
 * the governed close-review schema (missing close_review_id) but nothing
 * else is broken; partial when some, but not all, bundles are broken;
 * unlinked for the shared unspecified-cohort bucket, or when every bundle is
 * broken. Never mutates historical records, never backfills audit, never
 * invents a source link.
 */
export function deriveCohortGovernanceCompleteness(input: {
  isUnspecifiedCohort: boolean;
  bundles: Array<{ lifecycleStatus: SignalLifecycleStage; convertedTradeIntentId: string | null; draftResolved: boolean }>;
  closedPositions: ClosedPositionGovernanceInput[];
}): CohortGovernanceCompleteness {
  const unlinkedSignalsCount = input.bundles.filter((b) => Boolean(b.convertedTradeIntentId) && !b.draftResolved).length;
  const incompleteChainsCount = input.bundles.filter((b) => b.lifecycleStatus === "incomplete").length;
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

  const brokenCount = incompleteChainsCount + unlinkedSignalsCount;
  let sourceChainStatus: SourceChainCompletenessStatus;
  if (input.isUnspecifiedCohort) sourceChainStatus = "unlinked";
  else if (brokenCount === 0 && historicalRecordCount > 0) sourceChainStatus = "historical";
  else if (brokenCount === 0) sourceChainStatus = "complete";
  else if (brokenCount < input.bundles.length) sourceChainStatus = "partial";
  else sourceChainStatus = "unlinked";

  return { sourceChainStatus, closeGovernanceCompletenessStatus, unlinkedSignalsCount, historicalRecordCount, incompleteChainsCount };
}

// ─── groupSignalsByCohort ─────────────────────────────────────────────────────

export type SignalOutcomeBundle = {
  signal: { id: string; action: string; strategyKey: string | null; status: string; convertedTradeIntentId: string | null; generatedAt: string };
  eligibility: SignalEligibility;
  conversionStatus: SignalConversionStatus;
  tradeIntent: { id: string; status: string; symbol: string; createdAt: string } | null;
  decision: { id: string; verdict: "approved" | "rejected"; reasonLabels: string[]; decidedAt: string } | null;
  position: {
    id: string;
    symbol: string;
    status: "open" | "closed";
    openedAt: string;
    closedAt: string | null;
    entryNotionalUsd: number;
    currentNotionalUsd: number | null;
    closeNotionalUsd: number | null;
    realizedPnlUsd: number | null;
    realizedPnlPct: number | null;
    hasApprovedCloseReview: boolean;
    hasApprovedCloseReviewAudit: boolean;
    hasClosedAudit: boolean;
  } | null;
  lifecycleStatus: SignalLifecycleStage;
  derivedRealizedPnlUsd: number | null;
  derivedRealizedPnlPct: number | null;
  derivedUnrealizedPnlUsd: number | null;
  derivedUnrealizedPnlPct: number | null;
  outcome: PositionOutcome;
};

export type SignalCohortGroup = {
  cohortKey: string;
  cohortType: SignalCohortDimension;
  cohortLabel: string;
  strategyKey: string | null;
  isUnspecifiedCohort: boolean;
  bundles: SignalOutcomeBundle[];
};

/**
 * Groups signal outcome bundles by a single stored cohort dimension
 * (recommendation type by default). Bundles whose dimension can't be
 * resolved fall into a single shared "unspecified"/"unlinked" group — never
 * inferred from a symbol or any other unrelated field.
 */
export function groupSignalsByCohort(bundles: SignalOutcomeBundle[], dimension: SignalCohortDimension = "recommendation_type"): Map<string, SignalCohortGroup> {
  const groups = new Map<string, SignalCohortGroup>();

  for (const bundle of bundles) {
    const dimensionInput: SignalCohortDimensionInput = { action: bundle.signal.action, strategyKey: bundle.signal.strategyKey, generatedAt: bundle.signal.generatedAt };
    const key = deriveSignalCohortKey(dimensionInput, dimension);
    const isUnspecified = key === UNSPECIFIED_COHORT_KEY || key === UNLINKED_COHORT_KEY;

    let group = groups.get(key);
    if (!group) {
      group = {
        cohortKey: key,
        cohortType: dimension,
        cohortLabel: cohortLabelFor(key, dimension, dimensionInput),
        strategyKey: isUnspecified ? null : bundle.signal.strategyKey,
        isUnspecifiedCohort: isUnspecified,
        bundles: [],
      };
      groups.set(key, group);
    } else if (!isUnspecified && group.strategyKey !== bundle.signal.strategyKey) {
      group.strategyKey = null;
    }
    group.bundles.push(bundle);
  }

  return groups;
}

// ─── buildSignalCohortRows ────────────────────────────────────────────────────

export type SignalCohortRow = {
  cohortKey: string;
  cohortLabel: string;
  cohortType: SignalCohortDimension;
  strategyKey: string | null;
  latestActivityAt: string | null;
  totalSignals: number;
  eligibleSignals: number;
  convertedSignals: number;
  notConvertedSignals: number;
  cancelledDrafts: number;
  submittedReviews: number;
  approvedReviews: number;
  rejectedReviews: number;
  reviewApprovalRate: number | null;
  reviewRejectionRate: number | null;
  mostCommonRejectionReason: string | null;
  openedPositionCount: number;
  openPositionCount: number;
  closedPositionCount: number;
  closeRate: number | null;
  averageHoldingPeriodDays: number | null;
  totalEntryNotionalOpenUsd: number;
  totalCurrentNotionalOpenUsd: number;
  unrealizedPnlUsd: number;
  unrealizedReturnPct: number | null;
  exposureShareOfPortfolio: number | null;
  totalEntryNotionalClosedUsd: number;
  totalCloseNotionalUsd: number;
  realizedPnlUsd: number;
  weightedRealizedReturnPct: number | null;
  averageRealizedReturnPct: number | null;
  bestClosedPosition: BestWorstPosition | null;
  worstClosedPosition: BestWorstPosition | null;
  latestClosedPosition: LatestClosedPosition | null;
  winners: number;
  losers: number;
  flat: number;
  unknown: number;
  winRate: number | null;
  lossRate: number | null;
  conversionRate: number | null;
  submissionRate: number | null;
  approvalRate: number | null;
  symbols: string[];
  governanceCompletenessStatus: CloseGovernanceCompletenessStatus;
  sourceChainCompletenessStatus: SourceChainCompletenessStatus;
  governance: CohortGovernanceCompleteness;
  detailHrefs: {
    signals: string;
    tradeIntents: string;
    positions: string;
    strategyAttribution: string;
    closedPerformance: string;
  };
};

function latestTimestamp(...timestamps: Array<string | null | undefined>): string | null {
  const known = timestamps.filter((t): t is string => Boolean(t));
  if (known.length === 0) return null;
  return known.reduce((latest, t) => (t > latest ? t : latest));
}

/** Normalizes each cohort group into a single report-ready row. Never adds a mutation action or safe-link that isn't a plain navigation href. */
export function buildSignalCohortRows(input: { groups: Map<string, SignalCohortGroup>; totalPortfolioOpenNotionalUsd: number | null }): SignalCohortRow[] {
  const rows: SignalCohortRow[] = [];

  for (const group of input.groups.values()) {
    const conversion = summarizeCohortConversionRates(group.bundles);
    const cancelledDrafts = group.bundles.filter((b) => b.tradeIntent?.status === "cancelled").length;

    const decisions = group.bundles.filter((b) => b.decision).map((b) => ({ verdict: b.decision!.verdict, decidedAt: b.decision!.decidedAt, reasonLabels: b.decision!.reasonLabels }));
    const riskReview = summarizeCohortRiskReviewOutcomes(decisions);

    const positions = group.bundles.filter((b) => b.position).map((b) => ({ status: b.position!.status, openedAt: b.position!.openedAt, closedAt: b.position!.closedAt, symbol: b.position!.symbol }));
    const positionOutcomes = summarizeCohortPositionOutcomes(positions);

    const closedForSummary: ClosedPositionForSummary[] = group.bundles
      .filter((b) => b.position?.status === "closed")
      .map((b) => ({
        id: b.position!.id,
        symbol: b.position!.symbol,
        closedAt: b.position!.closedAt as string,
        entryNotionalUsd: b.position!.entryNotionalUsd,
        closeNotionalUsd: b.position!.closeNotionalUsd,
        realizedPnlUsd: b.derivedRealizedPnlUsd,
        realizedPnlPct: b.derivedRealizedPnlPct,
      }));
    const realizedPerformance = summarizeCohortRealizedPerformance(closedForSummary);

    const openForSummary: OpenPositionForSummary[] = group.bundles
      .filter((b) => b.position?.status === "open")
      .map((b) => ({ symbol: b.position!.symbol, entryNotionalUsd: b.position!.entryNotionalUsd, currentNotionalUsd: b.position!.currentNotionalUsd }));
    const unrealizedPerformance = summarizeCohortUnrealizedPerformance(openForSummary, input.totalPortfolioOpenNotionalUsd);

    const winners = group.bundles.filter((b) => b.outcome === "winner").length;
    const losers = group.bundles.filter((b) => b.outcome === "loser").length;
    const flat = group.bundles.filter((b) => b.outcome === "flat").length;
    const unknown = group.bundles.filter((b) => b.position?.status === "closed" && b.outcome === "unknown").length;
    const knownOutcomeDenominator = winners + losers + flat;

    const governance = deriveCohortGovernanceCompleteness({
      isUnspecifiedCohort: group.isUnspecifiedCohort,
      bundles: group.bundles.map((b) => ({ lifecycleStatus: b.lifecycleStatus, convertedTradeIntentId: b.signal.convertedTradeIntentId, draftResolved: Boolean(b.tradeIntent) })),
      closedPositions: group.bundles
        .filter((b) => b.position?.status === "closed")
        .map((b) => ({ hasCloseReviewId: b.position!.hasApprovedCloseReview, hasApprovedAudit: b.position!.hasApprovedCloseReviewAudit, hasClosedAudit: b.position!.hasClosedAudit })),
    });

    const latestActivityAt = latestTimestamp(
      ...group.bundles.map((b) => b.signal.generatedAt),
      ...group.bundles.map((b) => b.tradeIntent?.createdAt),
      ...group.bundles.map((b) => b.decision?.decidedAt),
      ...group.bundles.map((b) => b.position?.closedAt ?? b.position?.openedAt),
    );

    rows.push({
      cohortKey: group.cohortKey,
      cohortLabel: group.cohortLabel,
      cohortType: group.cohortType,
      strategyKey: group.strategyKey,
      latestActivityAt,
      totalSignals: group.bundles.length,
      eligibleSignals: conversion.eligibleCount,
      convertedSignals: conversion.convertedCount,
      notConvertedSignals: conversion.notConvertedCount,
      cancelledDrafts,
      submittedReviews: riskReview.submittedCount,
      approvedReviews: riskReview.approvedCount,
      rejectedReviews: riskReview.rejectedCount,
      reviewApprovalRate: riskReview.approvalRate,
      reviewRejectionRate: riskReview.rejectionRate,
      mostCommonRejectionReason: riskReview.mostCommonRejectionReason,
      openedPositionCount: positionOutcomes.openedCount,
      openPositionCount: positionOutcomes.openCount,
      closedPositionCount: positionOutcomes.closedCount,
      closeRate: positionOutcomes.closeRate,
      averageHoldingPeriodDays: positionOutcomes.averageHoldingPeriodDays,
      totalEntryNotionalOpenUsd: unrealizedPerformance.totalEntryNotionalOpenUsd,
      totalCurrentNotionalOpenUsd: unrealizedPerformance.totalCurrentNotionalOpenUsd,
      unrealizedPnlUsd: unrealizedPerformance.unrealizedPnlUsd,
      unrealizedReturnPct: unrealizedPerformance.unrealizedReturnPct,
      exposureShareOfPortfolio: unrealizedPerformance.exposureShareOfPortfolio,
      totalEntryNotionalClosedUsd: realizedPerformance.totalEntryNotionalClosedUsd,
      totalCloseNotionalUsd: realizedPerformance.totalCloseNotionalUsd,
      realizedPnlUsd: realizedPerformance.totalRealizedPnlUsd,
      weightedRealizedReturnPct: realizedPerformance.weightedRealizedReturnPct,
      averageRealizedReturnPct: realizedPerformance.averageRealizedReturnPct,
      bestClosedPosition: realizedPerformance.bestClosedPosition,
      worstClosedPosition: realizedPerformance.worstClosedPosition,
      latestClosedPosition: realizedPerformance.latestClosedPosition,
      winners,
      losers,
      flat,
      unknown,
      winRate: safeRate(winners, knownOutcomeDenominator),
      lossRate: safeRate(losers, knownOutcomeDenominator),
      conversionRate: conversion.conversionRate,
      submissionRate: safeRate(riskReview.submittedCount, conversion.convertedCount),
      approvalRate: riskReview.approvalRate,
      symbols: positionOutcomes.symbols,
      governanceCompletenessStatus: governance.closeGovernanceCompletenessStatus,
      sourceChainCompletenessStatus: governance.sourceChainStatus,
      governance,
      detailHrefs: {
        signals: "/capital/signals",
        tradeIntents: "/capital/trade-intents",
        positions: "/capital/positions",
        strategyAttribution: "/capital/performance/strategies",
        closedPerformance: "/capital/performance/closed",
      },
    });
  }

  return rows.sort((a, b) => {
    const totalDiff = b.totalSignals - a.totalSignals;
    if (totalDiff !== 0) return totalDiff;
    const convertedDiff = b.convertedSignals - a.convertedSignals;
    if (convertedDiff !== 0) return convertedDiff;
    return b.realizedPnlUsd - a.realizedPnlUsd;
  });
}

// ─── buildIncompleteSignalOutcomeRows ────────────────────────────────────────

export type IncompleteOutcomeRecordType =
  | "eligible_not_converted"
  | "ineligible_signals"
  | "converted_missing_draft_link"
  | "drafts_without_review"
  | "approved_without_position"
  | "positions_without_close_governance"
  | "historical_positions_missing_signal_source";

export type IncompleteOutcomeRow = {
  recordType: IncompleteOutcomeRecordType;
  count: number;
  reason: string;
  readable: true;
  href: string | null;
};

/** Summarizes signal outcome gaps for historical/diagnostic reporting. Never mutates, never backfills, never invents a source link. */
export function buildIncompleteSignalOutcomeRows(input: { bundles: SignalOutcomeBundle[]; unattributedClosedPositionCount: number }): IncompleteOutcomeRow[] {
  const eligibleNotConverted = input.bundles.filter((b) => b.eligibility === "eligible" && b.conversionStatus === "not_converted");
  const ineligible = input.bundles.filter((b) => b.eligibility === "ineligible");
  const convertedMissingDraft = input.bundles.filter((b) => Boolean(b.signal.convertedTradeIntentId) && !b.tradeIntent);
  const draftsWithoutReview = input.bundles.filter((b) => b.tradeIntent && b.tradeIntent.status !== "cancelled" && !b.decision);
  const approvedWithoutPosition = input.bundles.filter((b) => b.decision?.verdict === "approved" && !b.position);
  const positionsWithoutCloseGovernance = input.bundles.filter(
    (b) => b.position?.status === "closed" && !(b.position.hasApprovedCloseReview && b.position.hasApprovedCloseReviewAudit && b.position.hasClosedAudit),
  );

  return [
    {
      recordType: "eligible_not_converted",
      count: eligibleNotConverted.length,
      reason: "These signals were eligible to become a draft trade intent, but no draft was created.",
      readable: true,
      href: "/capital/signals",
    },
    {
      recordType: "ineligible_signals",
      count: ineligible.length,
      reason: "These signals were not eligible to become a draft trade intent based on stored recommendation type and status.",
      readable: true,
      href: "/capital/signals",
    },
    {
      recordType: "converted_missing_draft_link",
      count: convertedMissingDraft.length,
      reason: "These signals carry a converted marker, but the linked draft trade intent record could not be resolved.",
      readable: true,
      href: "/capital/trade-intents",
    },
    {
      recordType: "drafts_without_review",
      count: draftsWithoutReview.length,
      reason: "These signal-linked drafts have no linked Risk Constitution decision record.",
      readable: true,
      href: "/capital/trade-intents",
    },
    {
      recordType: "approved_without_position",
      count: approvedWithoutPosition.length,
      reason: "These signal-linked drafts were approved, but no paper position record could be resolved.",
      readable: true,
      href: "/capital/positions",
    },
    {
      recordType: "positions_without_close_governance",
      count: positionsWithoutCloseGovernance.length,
      reason: "These signal-linked closed positions remain readable for historical reporting, but complete governed close evidence could not be resolved.",
      readable: true,
      href: "/capital/performance/closed",
    },
    {
      recordType: "historical_positions_missing_signal_source",
      count: input.unattributedClosedPositionCount,
      reason: "These closed paper positions did not originate from a signal recommendation, so no signal outcome chain applies.",
      readable: true,
      href: "/capital/performance/closed",
    },
  ];
}

// ─── SignalCohortOutcomeReport ────────────────────────────────────────────────

export type SignalCohortOutcomeSummary = {
  totalSignals: number;
  eligibleSignals: number;
  convertedSignals: number;
  notConvertedSignals: number;
  cancelledDrafts: number;
  submittedReviews: number;
  approvedReviews: number;
  rejectedReviews: number;
  openedPositions: number;
  openPositions: number;
  closedPositions: number;
  totalRealizedPnlUsd: number;
  totalUnrealizedPnlUsd: number;
  totalSimulatedPnlUsd: number;
  incompleteOutcomeCount: number;
  historicalRecordCount: number;
  overallSourceChainCompletenessPct: number | null;
};

export type SignalCohortOutcomeReport = {
  portfolio: { id: string; name: string };
  generatedAt: string;
  summary: SignalCohortOutcomeSummary;
  lifecycleFunnel: LifecycleFunnel;
  cohortRows: SignalCohortRow[];
  incompleteOutcomeRows: IncompleteOutcomeRow[];
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
    strategyAttribution: string;
  };
};

/**
 * Builds the read-only Signal Cohort Outcomes report for the caller's tenant
 * and default portfolio. Every query is scoped by company_id (and, for
 * portfolio-level tables, portfolio_id). Never calls a governed mutation
 * RPC, never fetches live market data, and never marks a position to market.
 */
export async function getSignalCohortOutcomes(companyId: string): Promise<SignalCohortOutcomeReport> {
  const portfolio = await getOrCreateDefaultPortfolio(companyId);

  const [signals, tradeIntents, positions] = await Promise.all([
    listSignalsForPortfolio(companyId, portfolio.id),
    listTradeIntentsForPortfolio(companyId, portfolio.id),
    listPositionsForPortfolio(companyId, portfolio.id),
  ]);

  const closedPositionIds = positions.filter((p) => p.status === "closed").map((p) => p.id);

  const [decisions, closeReviewPositionIds, auditFlagsByPositionId] = await Promise.all([
    listTradeDecisionsByIntentIds(companyId, tradeIntents.map((t) => t.id)),
    listApprovedCloseReviewPositionIds(companyId, portfolio.id, closedPositionIds),
    listCloseAuditFlagsForPositions(companyId, closedPositionIds),
  ]);

  // Latest decision per trade intent — the risk policy engine evaluates each intent once.
  const decisionByIntentId = new Map<string, TradeDecisionRow>();
  for (const decision of decisions) {
    const existing = decisionByIntentId.get(decision.trade_intent_id);
    if (!existing || decision.decided_at > existing.decided_at) decisionByIntentId.set(decision.trade_intent_id, decision);
  }

  const positionByIntentId = new Map(positions.map((p) => [p.trade_intent_id, p]));

  // Authoritative reverse link: only trade intents that actually resolved from this signal — never trusts a signal's own marker in isolation.
  const tradeIntentBySignalId = new Map<string, TradeIntentRow>();
  for (const intent of tradeIntents) {
    if (intent.source === "signal_recommendation" && intent.paper_signal_recommendation_id) {
      tradeIntentBySignalId.set(intent.paper_signal_recommendation_id, intent);
    }
  }

  const signalSourcedTradeIntentIds = new Set(Array.from(tradeIntentBySignalId.values()).map((t) => t.id));

  const bundles: SignalOutcomeBundle[] = signals.map((signal) => {
    const tradeIntent = tradeIntentBySignalId.get(signal.id) ?? null;
    const eligibility = deriveSignalEligibility({ action: signal.action, status: signal.status });
    const conversionStatus = deriveSignalConversionStatus({ convertedTradeIntentId: signal.converted_trade_intent_id, linkedDraftFound: Boolean(tradeIntent) });

    const decision = tradeIntent ? (decisionByIntentId.get(tradeIntent.id) ?? null) : null;
    const positionRow = tradeIntent ? (positionByIntentId.get(tradeIntent.id) ?? null) : null;

    const derivedRealizedPnlUsd = positionRow
      ? deriveRealizedPnl({ realizedPnlUsd: positionRow.realized_pnl_usd, closeNotionalUsd: positionRow.close_notional_usd, entryNotionalUsd: positionRow.entry_notional_usd })
      : null;
    const derivedRealizedPnlPct = positionRow
      ? deriveRealizedReturn({ realizedPnlPct: positionRow.realized_pnl_pct, realizedPnlUsd: derivedRealizedPnlUsd, entryNotionalUsd: positionRow.entry_notional_usd })
      : null;
    const derivedUnrealizedPnlUsd =
      positionRow && positionRow.status === "open" ? deriveUnrealizedPnl({ currentNotionalUsd: positionRow.current_notional_usd, entryNotionalUsd: positionRow.entry_notional_usd }) : null;
    const derivedUnrealizedPnlPct =
      positionRow && positionRow.status === "open" ? deriveUnrealizedReturn({ unrealizedPnlUsd: derivedUnrealizedPnlUsd, entryNotionalUsd: positionRow.entry_notional_usd }) : null;

    const realizedOutcomeAvailable = positionRow?.status === "closed" && derivedRealizedPnlUsd !== null;

    const lifecycleStatus = deriveSignalLifecycleStatus({
      eligibility,
      draftResolved: Boolean(tradeIntent),
      draftCancelled: tradeIntent?.status === "cancelled",
      reviewResolved: Boolean(decision),
      reviewVerdict: decision?.verdict ?? null,
      positionResolved: Boolean(positionRow),
      positionStatus: positionRow?.status ?? null,
      realizedOutcomeAvailable,
    });

    const auditFlags = positionRow ? (auditFlagsByPositionId.get(positionRow.id) ?? { hasApprovedAudit: false, hasClosedAudit: false }) : { hasApprovedAudit: false, hasClosedAudit: false };

    return {
      signal: {
        id: signal.id,
        action: signal.action,
        strategyKey: signal.strategy_key,
        status: signal.status,
        convertedTradeIntentId: signal.converted_trade_intent_id,
        generatedAt: signal.generated_at,
      },
      eligibility,
      conversionStatus,
      tradeIntent: tradeIntent ? { id: tradeIntent.id, status: tradeIntent.status, symbol: tradeIntent.symbol, createdAt: tradeIntent.created_at } : null,
      decision: decision ? { id: decision.id, verdict: decision.verdict, reasonLabels: decision.reasons.filter((r) => !r.passed).map((r) => r.label), decidedAt: decision.decided_at } : null,
      position: positionRow
        ? {
            id: positionRow.id,
            symbol: positionRow.symbol,
            status: positionRow.status,
            openedAt: positionRow.opened_at,
            closedAt: positionRow.closed_at,
            entryNotionalUsd: positionRow.entry_notional_usd,
            currentNotionalUsd: positionRow.current_notional_usd,
            closeNotionalUsd: positionRow.close_notional_usd,
            realizedPnlUsd: positionRow.realized_pnl_usd,
            realizedPnlPct: positionRow.realized_pnl_pct,
            hasApprovedCloseReview: closeReviewPositionIds.has(positionRow.id),
            hasApprovedCloseReviewAudit: auditFlags.hasApprovedAudit,
            hasClosedAudit: auditFlags.hasClosedAudit,
          }
        : null,
      lifecycleStatus,
      derivedRealizedPnlUsd,
      derivedRealizedPnlPct,
      derivedUnrealizedPnlUsd,
      derivedUnrealizedPnlPct,
      outcome: positionRow?.status === "closed" ? classifyPositionOutcome(derivedRealizedPnlUsd) : "unknown",
    };
  });

  const groups = groupSignalsByCohort(bundles, "recommendation_type");

  const allOpenPositions = positions.filter((p) => p.status === "open");
  const totalPortfolioOpenNotionalUsd =
    allOpenPositions.length > 0 && allOpenPositions.every((p) => p.current_notional_usd !== null) ? allOpenPositions.reduce((sum, p) => sum + (p.current_notional_usd as number), 0) : null;

  const cohortRows = buildSignalCohortRows({ groups, totalPortfolioOpenNotionalUsd });

  const unattributedClosedPositionCount = positions.filter((p) => p.status === "closed" && !signalSourcedTradeIntentIds.has(p.trade_intent_id)).length;
  const incompleteOutcomeRows = buildIncompleteSignalOutcomeRows({ bundles, unattributedClosedPositionCount });

  const conversion = summarizeCohortConversionRates(bundles);
  const cancelledDrafts = bundles.filter((b) => b.tradeIntent?.status === "cancelled").length;
  const decisionsAcrossBundles = bundles.filter((b) => b.decision).map((b) => b.decision as NonNullable<SignalOutcomeBundle["decision"]>);
  const approvedReviews = decisionsAcrossBundles.filter((d) => d.verdict === "approved").length;
  const rejectedReviews = decisionsAcrossBundles.filter((d) => d.verdict === "rejected").length;
  const openedPositions = bundles.filter((b) => b.position).length;
  const openPositions = bundles.filter((b) => b.position?.status === "open").length;
  const closedPositions = bundles.filter((b) => b.position?.status === "closed").length;
  const realizedOutcomeAvailableCount = bundles.filter((b) => b.position?.status === "closed" && b.derivedRealizedPnlUsd !== null).length;
  const unrealizedOutcomeAvailableCount = bundles.filter((b) => b.position?.status === "open" && b.derivedUnrealizedPnlUsd !== null).length;
  const completeSourceChainCount = bundles.filter((b) => b.lifecycleStatus !== "incomplete" && !(b.signal.convertedTradeIntentId && !b.tradeIntent)).length;

  const lifecycleFunnel = summarizeSignalLifecycleFunnel({
    signalCount: bundles.length,
    eligibleSignalCount: conversion.eligibleCount,
    convertedSignalCount: conversion.convertedCount,
    notConvertedSignalCount: conversion.notConvertedCount,
    cancelledDraftCount: cancelledDrafts,
    submittedReviewCount: decisionsAcrossBundles.length,
    approvedReviewCount: approvedReviews,
    rejectedReviewCount: rejectedReviews,
    openedPositionCount: openedPositions,
    openPositionCount: openPositions,
    closedPositionCount: closedPositions,
    realizedOutcomeAvailableCount,
    unrealizedOutcomeAvailableCount,
    completeSourceChainCount,
  });

  const totalRealizedPnlUsd = bundles.filter((b) => b.position?.status === "closed").reduce((sum, b) => sum + (b.derivedRealizedPnlUsd ?? 0), 0);
  const totalUnrealizedPnlUsd = bundles.filter((b) => b.position?.status === "open").reduce((sum, b) => sum + (b.derivedUnrealizedPnlUsd ?? 0), 0);

  const incompleteOutcomeCount = incompleteOutcomeRows.filter((r) => r.recordType !== "historical_positions_missing_signal_source").reduce((sum, r) => sum + r.count, 0);
  const historicalRecordCount = cohortRows.reduce((sum, r) => sum + r.governance.historicalRecordCount, 0) + unattributedClosedPositionCount;

  const summary: SignalCohortOutcomeSummary = {
    totalSignals: bundles.length,
    eligibleSignals: conversion.eligibleCount,
    convertedSignals: conversion.convertedCount,
    notConvertedSignals: conversion.notConvertedCount,
    cancelledDrafts,
    submittedReviews: decisionsAcrossBundles.length,
    approvedReviews,
    rejectedReviews,
    openedPositions,
    openPositions,
    closedPositions,
    totalRealizedPnlUsd,
    totalUnrealizedPnlUsd,
    totalSimulatedPnlUsd: totalRealizedPnlUsd + totalUnrealizedPnlUsd,
    incompleteOutcomeCount,
    historicalRecordCount,
    overallSourceChainCompletenessPct: lifecycleFunnel.sourceChainCompletenessRate,
  };

  return {
    portfolio: { id: portfolio.id, name: portfolio.name },
    generatedAt: new Date().toISOString(),
    summary,
    lifecycleFunnel,
    cohortRows,
    incompleteOutcomeRows,
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
      strategyAttribution: "/capital/performance/strategies",
    },
  };
}
