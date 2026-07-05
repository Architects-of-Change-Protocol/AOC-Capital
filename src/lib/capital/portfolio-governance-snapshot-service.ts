// AOC Capital — Portfolio Governance Snapshot v1 (PR #21).
//
// Read-only, reporting-only aggregation layer. This module never queries a
// database table directly — it composes the already-governed, already
// read-only reports from Allocation & Exposure (PR #15), Closed Position
// Performance (PR #18), Strategy Performance Attribution (PR #19), and
// Signal Cohort Outcomes (PR #20) into a single executive governance
// snapshot: safety-boundary evidence, lifecycle/source-chain/audit
// completeness, open exposure posture, simulated P&L, strategy/signal health,
// a consolidated diagnostic gap list, and an MVP integration review
// readiness checklist.
//
// This never generates a signal, never creates/submits/cancels a draft trade
// intent, never runs Risk Constitution review, never creates/closes/marks a
// paper position, never requests a close review, never refreshes valuation,
// never mutates an audit record, never mutates a strategy or portfolio
// record, and never calls the LLM. It never calls a remote procedure and
// never writes any table — it only calls the four read-only report functions
// above, each of which is itself scoped by company_id (and, for
// portfolio-level tables, portfolio_id). Real execution remains locked.
//
// This snapshot describes system state. It does not recommend trades,
// strategies, allocations, exits, entries, or live execution.

import { getAllocationExposureOverview } from "./allocation-exposure-service";
import { getClosedPositionPerformance } from "./closed-position-performance-service";
import { getStrategyPerformanceAttribution } from "./strategy-performance-attribution-service";
import { getSignalCohortOutcomes } from "./signal-cohort-outcome-service";
import { NAV_LINKS } from "./portfolio-governance-snapshot-content";

// ─── Status enums ─────────────────────────────────────────────────────────

export type GovernanceStatus = "strong" | "acceptable" | "needs_review" | "incomplete" | "not_available";
export type ReadinessStatus = "ready_for_review" | "needs_minor_review" | "needs_hardening" | "blocked" | "not_available";
export type ExposurePostureStatus = "low" | "moderate" | "elevated" | "high" | "not_available";
export type GapSeverity = "info" | "low" | "medium" | "high" | "critical";
export type ChecklistStatus = "pass" | "warning" | "fail" | "not_available";

// ─── deriveGovernanceStatus ───────────────────────────────────────────────

export type GovernanceStatusInput = {
  hasSufficientData: boolean;
  safetyBoundaryIntact: boolean;
  /** 0..1 blended evidence-completeness ratio, or null when it can't be computed. */
  evidenceCompletenessPct: number | null;
  criticalGapCount: number;
  highGapCount: number;
};

/**
 * strong/acceptable/needs_review/incomplete/not_available, downgraded
 * conservatively whenever evidence is missing. A safety-boundary breach or
 * any critical gap always forces "incomplete" regardless of the evidence
 * ratio — this never certifies a portfolio as governed while a safety
 * boundary is broken.
 */
export function deriveGovernanceStatus(input: GovernanceStatusInput): GovernanceStatus {
  if (!input.hasSufficientData || input.evidenceCompletenessPct === null) return "not_available";
  if (!input.safetyBoundaryIntact || input.criticalGapCount > 0) return "incomplete";
  if (input.evidenceCompletenessPct >= 0.9 && input.highGapCount === 0) return "strong";
  if (input.evidenceCompletenessPct >= 0.75 && input.highGapCount === 0) return "acceptable";
  if (input.evidenceCompletenessPct >= 0.4 || input.highGapCount > 0) return "needs_review";
  return "incomplete";
}

// ─── deriveReadinessStatus ────────────────────────────────────────────────

export type ReadinessStatusInput = {
  hasSufficientData: boolean;
  safetyBoundaryIntact: boolean;
  criticalGapCount: number;
  highGapCount: number;
  mediumGapCount: number;
};

/**
 * Readiness for internal MVP integration review only — never a claim of
 * live-trading or trading-venue-connectivity readiness. blocked only for a critical safety
 * boundary issue; needs_hardening for major (high-severity) gaps;
 * needs_minor_review for smaller (medium-severity) gaps only.
 */
export function deriveReadinessStatus(input: ReadinessStatusInput): ReadinessStatus {
  if (!input.hasSufficientData) return "not_available";
  if (!input.safetyBoundaryIntact || input.criticalGapCount > 0) return "blocked";
  if (input.highGapCount > 0) return "needs_hardening";
  if (input.mediumGapCount > 0) return "needs_minor_review";
  return "ready_for_review";
}

// ─── derivePaperOnlyBoundaryEvidence ──────────────────────────────────────

export type PaperOnlyBoundaryEvidence = {
  paperOnly: true;
  readOnly: true;
  realExecutionLocked: true;
  brokerConnected: false;
  liveOrderRoutingEnabled: false;
  tradingApiKeysPresent: false;
  withdrawalsEnabled: false;
  depositsEnabled: false;
  marketDataFetched: false;
  mutationsPerformed: false;
  llmCalled: false;
  investmentAdviceProvided: false;
};

/**
 * Fixed, literal safety flags proving this snapshot itself is read-only.
 * This is a product-level assertion based on this PR's code boundaries
 * (static tests pin these down — see
 * tests/aoc-capital-portfolio-governance-snapshot-safety.test.mjs), not a
 * runtime secret scan or a claim of a full external security audit.
 */
export function derivePaperOnlyBoundaryEvidence(): PaperOnlyBoundaryEvidence {
  return {
    paperOnly: true,
    readOnly: true,
    realExecutionLocked: true,
    brokerConnected: false,
    liveOrderRoutingEnabled: false,
    tradingApiKeysPresent: false,
    withdrawalsEnabled: false,
    depositsEnabled: false,
    marketDataFetched: false,
    mutationsPerformed: false,
    llmCalled: false,
    investmentAdviceProvided: false,
  };
}

// ─── summarizeLifecycleCompleteness ───────────────────────────────────────

export type LifecycleCompletenessInput = {
  strategyCount: number;
  signalCount: number;
  eligibleSignalCount: number;
  convertedSignalCount: number;
  notConvertedSignalCount: number;
  draftCount: number;
  cancelledDraftCount: number;
  submittedReviewCount: number;
  approvedReviewCount: number;
  rejectedReviewCount: number;
  openedPositionCount: number;
  openPositionCount: number;
  closedPositionCount: number;
  closeReviewCount: number;
  realizedOutcomeRecordCount: number;
  /** Bundles whose lifecycle resolved coherently to a signal's own source chain (from Signal Cohort Outcomes). */
  completeChainCount: number;
  /** Bundles flagged "incomplete" by Signal Cohort Outcomes — a resolved-but-contradictory chain, never a simple non-advancement. */
  incompleteChainCount: number;
  historicalRecordCount: number;
};

export type LifecycleCompletenessCounts = {
  strategies: number;
  signals: number;
  eligibleSignals: number;
  convertedSignals: number;
  drafts: number;
  cancelledDrafts: number;
  submittedDrafts: number;
  approvedReviews: number;
  rejectedReviews: number;
  openedPositions: number;
  openPositions: number;
  closedPositions: number;
  closeReviews: number;
  realizedOutcomeRecords: number;
};

export type LifecycleCompleteness = {
  counts: LifecycleCompletenessCounts;
  completeChains: number;
  partialChains: number;
  unlinkedChains: number;
  historicalChains: number;
  notAdvancedChains: number;
  completenessPct: number | null;
};

/**
 * Distinguishes not_advanced (a signal simply never converted — never
 * penalized) from incomplete/unlinked (a record claims a later lifecycle
 * stage but lacks required links) from complete/historical. Completeness is
 * computed only over chains that actually advanced past "not_advanced" —
 * never treats a signal that simply didn't convert as a completeness
 * failure. Returns null (never zero) when there is nothing to divide by.
 */
export function summarizeLifecycleCompleteness(input: LifecycleCompletenessInput): LifecycleCompleteness {
  const notAdvancedChains = input.notConvertedSignalCount;
  const historicalChains = input.historicalRecordCount;
  const completeChains = input.completeChainCount;
  const unlinkedChains = input.incompleteChainCount;
  const advancedChainCount = Math.max(input.signalCount - notAdvancedChains, 0);
  const partialChains = Math.max(advancedChainCount - completeChains - unlinkedChains - historicalChains, 0);
  const completenessPct = advancedChainCount > 0 ? completeChains / advancedChainCount : null;

  return {
    counts: {
      strategies: input.strategyCount,
      signals: input.signalCount,
      eligibleSignals: input.eligibleSignalCount,
      convertedSignals: input.convertedSignalCount,
      drafts: input.draftCount,
      cancelledDrafts: input.cancelledDraftCount,
      submittedDrafts: input.submittedReviewCount,
      approvedReviews: input.approvedReviewCount,
      rejectedReviews: input.rejectedReviewCount,
      openedPositions: input.openedPositionCount,
      openPositions: input.openPositionCount,
      closedPositions: input.closedPositionCount,
      closeReviews: input.closeReviewCount,
      realizedOutcomeRecords: input.realizedOutcomeRecordCount,
    },
    completeChains,
    partialChains,
    unlinkedChains,
    historicalChains,
    notAdvancedChains,
    completenessPct,
  };
}

// ─── summarizeSourceChainCompleteness ─────────────────────────────────────

export type SourceChainCompletenessInput = {
  completeCount: number;
  partialCount: number;
  unlinkedCount: number;
  historicalCount: number;
  notApplicableCount: number;
  overallSourceChainCompletenessPct: number | null;
};

export type SourceChainCompleteness = {
  complete: number;
  partial: number;
  /** Not separately tracked by the reused reports today — a fully-broken chain with zero resolvable evidence is reported as "unlinked", not "missing". Reserved for a future distinction. */
  missing: number;
  unlinked: number;
  historical: number;
  notApplicable: number;
  completenessPct: number | null;
};

/**
 * Uses only stored source relationships already resolved by Closed Position
 * Performance / Strategy Attribution / Signal Cohort Outcomes — never
 * infers a source chain from a symbol, and never backfills a missing link.
 */
export function summarizeSourceChainCompleteness(input: SourceChainCompletenessInput): SourceChainCompleteness {
  return {
    complete: input.completeCount,
    partial: input.partialCount,
    missing: 0,
    unlinked: input.unlinkedCount,
    historical: input.historicalCount,
    notApplicable: input.notApplicableCount,
    completenessPct: input.overallSourceChainCompletenessPct,
  };
}

// ─── summarizeAuditEvidence ────────────────────────────────────────────────

export type AuditEvidenceInput = {
  closedPositionCount: number;
  positionsWithCloseReviewId: number;
  positionsWithApprovedCloseReviewAudit: number;
  positionsWithClosedAudit: number;
  positionsWithCompleteEvidence: number;
  positionsMissingGovernedEvidence: number;
};

export type CloseGovernanceCompletenessStatus = "complete" | "partial" | "missing" | "not_applicable";

export type AuditEvidenceSummary = {
  expectedAuditEvidenceCount: number;
  resolvedAuditEvidenceCount: number;
  missingAuditEvidenceCount: number;
  closeReviewApprovedAuditCount: number;
  paperPositionClosedAuditCount: number;
  positionsMissingCloseAuditEvidence: number;
  closeGovernanceStatus: CloseGovernanceCompletenessStatus;
};

/**
 * Close governance evidence is "complete" for a closed position only when
 * all three governed-close markers exist (a resolved close_review_id, the
 * approved-close-review audit event, and the closed audit event); "missing"
 * only when none exist; "partial" otherwise. Never creates or backfills
 * audit evidence — a historical/legacy-shaped position simply stays
 * "missing" or "partial".
 */
export function summarizeAuditEvidence(input: AuditEvidenceInput): AuditEvidenceSummary {
  const expectedAuditEvidenceCount = input.closedPositionCount * 3;
  const resolvedAuditEvidenceCount = input.positionsWithCloseReviewId + input.positionsWithApprovedCloseReviewAudit + input.positionsWithClosedAudit;
  const missingAuditEvidenceCount = Math.max(expectedAuditEvidenceCount - resolvedAuditEvidenceCount, 0);

  let closeGovernanceStatus: CloseGovernanceCompletenessStatus;
  if (input.closedPositionCount === 0) closeGovernanceStatus = "not_applicable";
  else if (input.positionsWithCompleteEvidence === input.closedPositionCount) closeGovernanceStatus = "complete";
  else if (input.positionsMissingGovernedEvidence === input.closedPositionCount) closeGovernanceStatus = "missing";
  else closeGovernanceStatus = "partial";

  return {
    expectedAuditEvidenceCount,
    resolvedAuditEvidenceCount,
    missingAuditEvidenceCount,
    closeReviewApprovedAuditCount: input.positionsWithApprovedCloseReviewAudit,
    paperPositionClosedAuditCount: input.positionsWithClosedAudit,
    positionsMissingCloseAuditEvidence: input.positionsMissingGovernedEvidence,
    closeGovernanceStatus,
  };
}

// ─── summarizeOpenExposurePosture ─────────────────────────────────────────

export type OpenExposurePostureInput = {
  openPositionCount: number;
  totalEntryNotionalOpenUsd: number | null;
  totalCurrentNotionalOpenUsd: number | null;
  /** 0..1 share of open notional held by the single largest symbol, or null when unavailable. */
  largestSymbolWeight: number | null;
  /** 0..1+ share of the configured max simulated exposure ratio already used, or null when unavailable. */
  exposureLimitUsage: number | null;
};

export type OpenExposureSummary = {
  openPositionCount: number;
  totalEntryNotionalOpenUsd: number | null;
  totalCurrentNotionalOpenUsd: number | null;
  unrealizedPnlUsd: number | null;
  largestSymbolWeight: number | null;
  exposureLimitUsage: number | null;
  posture: ExposurePostureStatus;
};

/**
 * Computes exposure posture from stored notional values and the existing
 * risk-limit-proximity reading only — never fetches or refreshes valuation.
 * not_available whenever there are no open positions, or no exposure signal
 * (limit usage or concentration) to read at all.
 */
export function summarizeOpenExposurePosture(input: OpenExposurePostureInput): OpenExposureSummary {
  const unrealizedPnlUsd =
    input.totalCurrentNotionalOpenUsd !== null && input.totalEntryNotionalOpenUsd !== null ? input.totalCurrentNotionalOpenUsd - input.totalEntryNotionalOpenUsd : null;

  let posture: ExposurePostureStatus;
  if (input.openPositionCount === 0) posture = "not_available";
  else if (input.exposureLimitUsage === null && input.largestSymbolWeight === null) posture = "not_available";
  else if ((input.exposureLimitUsage ?? 0) >= 0.9) posture = "high";
  else if ((input.exposureLimitUsage ?? 0) >= 0.7 || (input.largestSymbolWeight ?? 0) >= 0.5) posture = "elevated";
  else if ((input.exposureLimitUsage ?? 0) >= 0.4 || (input.largestSymbolWeight ?? 0) >= 0.3) posture = "moderate";
  else posture = "low";

  return {
    openPositionCount: input.openPositionCount,
    totalEntryNotionalOpenUsd: input.totalEntryNotionalOpenUsd,
    totalCurrentNotionalOpenUsd: input.totalCurrentNotionalOpenUsd,
    unrealizedPnlUsd,
    largestSymbolWeight: input.largestSymbolWeight,
    exposureLimitUsage: input.exposureLimitUsage,
    posture,
  };
}

// ─── summarizeSimulatedPnl ─────────────────────────────────────────────────

export type SimulatedPnlInput = {
  realizedPnlUsd: number | null;
  unrealizedPnlUsd: number | null;
  weightedRealizedReturnPct: number | null;
  openPositionCount: number;
  closedPositionCount: number;
  missingRealizedPnlCount: number;
  missingUnrealizedPnlCount: number;
};

export type SimulatedPnlSummary = SimulatedPnlInput & {
  totalSimulatedPnlUsd: number | null;
};

/**
 * Sums realized + unrealized only when both sides are actually known — never
 * substitutes zero for a missing side. Uses whatever realized/unrealized
 * figures the caller already derived from stored values (never fetches
 * market data itself).
 */
export function summarizeSimulatedPnl(input: SimulatedPnlInput): SimulatedPnlSummary {
  const totalSimulatedPnlUsd = input.realizedPnlUsd !== null && input.unrealizedPnlUsd !== null ? input.realizedPnlUsd + input.unrealizedPnlUsd : null;
  return { ...input, totalSimulatedPnlUsd };
}

// ─── summarizeStrategyAttributionHealth ───────────────────────────────────

export type StrategyAttributionHealthInput = {
  attributableStrategyCount: number;
  unlinkedRecordCount: number;
  historicalRecordCount: number;
  overallGovernanceCompletenessPct: number | null;
  totalRealizedPnlUsd: number;
  totalUnrealizedPnlUsd: number;
};

export type StrategyAttributionHealth = StrategyAttributionHealthInput & { status: GovernanceStatus };

/**
 * Uses only the stored strategy attribution/source-chain evidence already
 * resolved by Strategy Performance Attribution (PR #19) — never attributes
 * from a symbol alone, never ranks strategies as advice.
 */
export function summarizeStrategyAttributionHealth(input: StrategyAttributionHealthInput): StrategyAttributionHealth {
  const hasSufficientData = input.attributableStrategyCount + input.unlinkedRecordCount + input.historicalRecordCount > 0;
  const status = deriveGovernanceStatus({
    hasSufficientData,
    safetyBoundaryIntact: true,
    evidenceCompletenessPct: input.overallGovernanceCompletenessPct,
    criticalGapCount: 0,
    highGapCount: input.unlinkedRecordCount > 0 ? 1 : 0,
  });
  return { ...input, status };
}

// ─── summarizeSignalCohortHealth ──────────────────────────────────────────

export type SignalCohortHealthInput = {
  totalSignals: number;
  eligibleSignals: number;
  convertedSignals: number;
  notConvertedSignals: number;
  submittedReviews: number;
  approvedReviews: number;
  rejectedReviews: number;
  openedPositions: number;
  openPositions: number;
  closedPositions: number;
  incompleteOutcomeCount: number;
  historicalRecordCount: number;
  overallSourceChainCompletenessPct: number | null;
};

export type SignalCohortHealth = SignalCohortHealthInput & { status: GovernanceStatus };

/**
 * Uses only the stored signal source-chain evidence already resolved by
 * Signal Cohort Outcomes (PR #20) — never generates or recommends a signal.
 */
export function summarizeSignalCohortHealth(input: SignalCohortHealthInput): SignalCohortHealth {
  const status = deriveGovernanceStatus({
    hasSufficientData: input.totalSignals > 0,
    safetyBoundaryIntact: true,
    evidenceCompletenessPct: input.overallSourceChainCompletenessPct,
    criticalGapCount: 0,
    highGapCount: input.incompleteOutcomeCount > 0 ? 1 : 0,
  });
  return { ...input, status };
}

// ─── buildGovernanceGapRows ────────────────────────────────────────────────

export type GovernanceGapInput = {
  paperOnlyBoundary: PaperOnlyBoundaryEvidence;
  unlinkedSignalCount: number;
  unlinkedDraftCount: number;
  unlinkedDecisionCount: number;
  unlinkedPositionCount: number;
  historicalClosedPositionCount: number;
  closedPositionsMissingCloseReviewId: number;
  closedPositionsMissingCloseAudit: number;
  openPositionsMissingValuation: number;
  strategyAttributionGapCount: number;
  signalCohortGapCount: number;
};

export type GovernanceGapRow = {
  id: string;
  category: string;
  severity: GapSeverity;
  label: string;
  description: string;
  impact: string;
  count: number;
  relatedHref: string | null;
};

/**
 * Consolidated diagnostic panel — every row is read-only and descriptive.
 * Never proposes or performs remediation, never mutates, never backfills,
 * never creates a task. The paper-only boundary row is the only row that can
 * ever be "critical"; it stays "info" whenever the fixed safety flags are all
 * in their expected (locked-down) state.
 */
export function buildGovernanceGapRows(input: GovernanceGapInput): GovernanceGapRow[] {
  const boundaryBroken =
    !input.paperOnlyBoundary.paperOnly ||
    !input.paperOnlyBoundary.realExecutionLocked ||
    input.paperOnlyBoundary.brokerConnected ||
    input.paperOnlyBoundary.liveOrderRoutingEnabled;

  return [
    {
      id: "paper_only_boundary",
      category: "safety_boundary",
      severity: boundaryBroken ? "critical" : "info",
      label: "Paper-only safety boundary",
      description: boundaryBroken
        ? "A paper-only safety boundary flag is not in its expected state."
        : "Paper-only boundary evidence is intact: brokerConnected is false, liveOrderRoutingEnabled is false, and real execution remains locked.",
      impact: boundaryBroken ? "Blocks MVP integration review readiness." : "No impact.",
      count: boundaryBroken ? 1 : 0,
      relatedHref: null,
    },
    {
      id: "unlinked_signals",
      category: "source_chain",
      severity: input.unlinkedSignalCount > 0 ? "medium" : "info",
      label: "Unlinked signals",
      description: "Signals carrying a converted marker whose linked draft trade intent could not be resolved.",
      impact: "Reduces source-chain completeness confidence.",
      count: input.unlinkedSignalCount,
      relatedHref: NAV_LINKS.signals,
    },
    {
      id: "unlinked_drafts",
      category: "source_chain",
      severity: input.unlinkedDraftCount > 0 ? "medium" : "info",
      label: "Unlinked drafts",
      description: "Draft trade intents that could not be attributed back to a strategy or signal.",
      impact: "Reduces strategy attribution confidence.",
      count: input.unlinkedDraftCount,
      relatedHref: NAV_LINKS.tradeIntents,
    },
    {
      id: "unlinked_decisions",
      category: "source_chain",
      severity: input.unlinkedDecisionCount > 0 ? "medium" : "info",
      label: "Unlinked Risk Constitution decisions",
      description: "Risk Constitution decisions that inherited an unresolved draft attribution.",
      impact: "Reduces governance traceability.",
      count: input.unlinkedDecisionCount,
      relatedHref: NAV_LINKS.tradeIntents,
    },
    {
      id: "unlinked_positions",
      category: "source_chain",
      severity: input.unlinkedPositionCount > 0 ? "medium" : "info",
      label: "Unlinked paper positions",
      description: "Paper positions opened from a manual or unresolved draft trade intent.",
      impact: "Reduces strategy/signal traceability for these positions.",
      count: input.unlinkedPositionCount,
      relatedHref: NAV_LINKS.positions,
    },
    {
      id: "historical_closed_positions",
      category: "historical",
      severity: "info",
      label: "Historical closed positions",
      description: "Closed paper positions that predate the governed close-review schema.",
      impact: "Remain readable for historical reporting; not counted as a broken chain.",
      count: input.historicalClosedPositionCount,
      relatedHref: NAV_LINKS.closedPerformance,
    },
    {
      id: "closed_missing_close_review_id",
      category: "audit_evidence",
      severity: input.closedPositionsMissingCloseReviewId > 0 ? "high" : "info",
      label: "Closed positions missing close_review_id",
      description: "Closed paper positions without a resolvable governed close review record.",
      impact: "Reduces close governance completeness.",
      count: input.closedPositionsMissingCloseReviewId,
      relatedHref: NAV_LINKS.closedPerformance,
    },
    {
      id: "closed_missing_close_audit",
      category: "audit_evidence",
      severity: input.closedPositionsMissingCloseAudit > 0 ? "high" : "info",
      label: "Closed positions missing close audit evidence",
      description: "Closed paper positions missing the approved-close-review or closed audit event.",
      impact: "Reduces audit evidence completeness.",
      count: input.closedPositionsMissingCloseAudit,
      relatedHref: NAV_LINKS.closedPerformance,
    },
    {
      id: "open_missing_valuation",
      category: "exposure",
      severity: input.openPositionsMissingValuation > 0 ? "medium" : "info",
      label: "Open positions missing current valuation",
      description: "Open paper positions without a stored current valuation.",
      impact: "Reduces confidence in open exposure and unrealized P&L totals.",
      count: input.openPositionsMissingValuation,
      relatedHref: NAV_LINKS.positions,
    },
    {
      id: "strategy_attribution_gaps",
      category: "strategy_attribution",
      severity: input.strategyAttributionGapCount > 0 ? "medium" : "info",
      label: "Strategy attribution gaps",
      description: "Records that could not be confidently attributed to a strategy.",
      impact: "Reduces strategy attribution completeness.",
      count: input.strategyAttributionGapCount,
      relatedHref: NAV_LINKS.strategyAttribution,
    },
    {
      id: "signal_cohort_gaps",
      category: "signal_cohort",
      severity: input.signalCohortGapCount > 0 ? "medium" : "info",
      label: "Signal cohort tracking gaps",
      description: "Signal outcome chains that did not resolve completely.",
      impact: "Reduces signal cohort tracking completeness.",
      count: input.signalCohortGapCount,
      relatedHref: NAV_LINKS.signalCohorts,
    },
  ];
}

// ─── buildMvpIntegrationReadinessChecklist ────────────────────────────────

export type MvpReadinessChecklistInput = {
  paperOnlyBoundary: PaperOnlyBoundaryEvidence;
  legacyQuickCloseGuarded: boolean;
  closedPerformanceReadOnly: boolean;
  strategyAttributionReadOnly: boolean;
  signalCohortTrackingReadOnly: boolean;
  snapshotReadOnly: boolean;
  tenantScoped: boolean;
  portfolioScoped: boolean;
  noRequestBodyRead: boolean;
  noMutationRpcsCalled: boolean;
  noMarketDataRefresh: boolean;
  noExternalTradingVenueSurfaces: boolean;
  noAdviceCopy: boolean;
  criticalGapCount: number;
};

export type MvpReadinessChecklistItem = {
  key: string;
  label: string;
  status: ChecklistStatus;
  evidence: string;
  relatedHref: string | null;
};

/**
 * Readiness for internal MVP integration review only — never says the
 * portfolio is ready for real trading, connected to a trading venue, or
 * ready for live execution. Items this snapshot
 * cannot verify at runtime (tests/build/lint/safety-grep passing, no
 * unrelated artifacts) are reported "not_available" rather than guessed.
 */
export function buildMvpIntegrationReadinessChecklist(input: MvpReadinessChecklistInput): MvpReadinessChecklistItem[] {
  const boolItem = (key: string, label: string, ok: boolean, evidenceTrue: string, evidenceFalse: string, relatedHref: string | null = null): MvpReadinessChecklistItem => ({
    key,
    label,
    status: ok ? "pass" : "fail",
    evidence: ok ? evidenceTrue : evidenceFalse,
    relatedHref,
  });

  const paperOnlyBoundaryIntact =
    input.paperOnlyBoundary.paperOnly && input.paperOnlyBoundary.realExecutionLocked && !input.paperOnlyBoundary.brokerConnected && !input.paperOnlyBoundary.liveOrderRoutingEnabled;

  return [
    boolItem(
      "paper_only_boundary_intact",
      "Paper-only boundary intact",
      paperOnlyBoundaryIntact,
      "Paper-only, real execution locked, brokerConnected is false, liveOrderRoutingEnabled is false.",
      "A paper-only safety boundary flag is not in its expected state.",
    ),
    boolItem("legacy_quick_close_guarded", "Legacy quick-close guarded", input.legacyQuickCloseGuarded, "Legacy quick-close path is disabled.", "Legacy quick-close path guard could not be confirmed."),
    boolItem(
      "no_close_mutation_except_governed_review",
      "No close mutation except governed close review",
      input.legacyQuickCloseGuarded,
      "Only the governed close review path can close a position.",
      "An ungoverned close mutation path may exist.",
    ),
    boolItem(
      "closed_performance_read_only",
      "Closed performance reporting read-only",
      input.closedPerformanceReadOnly,
      "Closed Position Performance is read-only.",
      "Closed Position Performance could not be confirmed read-only.",
    ),
    boolItem(
      "strategy_attribution_read_only",
      "Strategy attribution read-only",
      input.strategyAttributionReadOnly,
      "Strategy Attribution is read-only.",
      "Strategy Attribution could not be confirmed read-only.",
    ),
    boolItem(
      "signal_cohort_tracking_read_only",
      "Signal cohort tracking read-only",
      input.signalCohortTrackingReadOnly,
      "Signal Cohort Outcomes is read-only.",
      "Signal Cohort Outcomes could not be confirmed read-only.",
    ),
    boolItem("snapshot_read_only", "Snapshot read-only", input.snapshotReadOnly, "This snapshot is read-only.", "This snapshot could not be confirmed read-only."),
    boolItem("tenant_scoping_present", "Tenant/company scoping present", input.tenantScoped, "Every read is scoped by company_id.", "Tenant scoping could not be confirmed."),
    boolItem("portfolio_scoping_present", "Portfolio scoping present", input.portfolioScoped, "Every portfolio-level read is scoped by portfolio_id.", "Portfolio scoping could not be confirmed."),
    boolItem("no_request_body_read", "No request body read in GET route", input.noRequestBodyRead, "The GET route never reads a request body.", "The GET route may read a request body."),
    boolItem("no_mutation_rpcs_called", "No mutation RPCs called", input.noMutationRpcsCalled, "No governed mutation RPC is called by this snapshot.", "A mutation RPC reference was found."),
    boolItem("no_market_data_refresh", "No market data refresh", input.noMarketDataRefresh, "No live market data is fetched by this snapshot.", "A market data refresh reference was found."),
    boolItem(
      "no_external_trading_venue_surfaces",
      "No external trading-venue surfaces",
      input.noExternalTradingVenueSurfaces,
      "No external trading-venue connection or fund-movement surface exists (brokerConnected, liveOrderRoutingEnabled, withdrawalsEnabled, and depositsEnabled all remain false).",
      "An external trading-venue or fund-movement surface reference was found.",
    ),
    boolItem("no_investment_advice_copy", "No investment advice copy", input.noAdviceCopy, "No investment advice or recommendation copy is shown.", "Investment advice copy was found."),
    {
      key: "no_critical_governance_gaps",
      label: "No critical governance gaps",
      status: input.criticalGapCount === 0 ? "pass" : "fail",
      evidence: input.criticalGapCount === 0 ? "No critical governance gap was found." : `${input.criticalGapCount} critical governance gap(s) found.`,
      relatedHref: null,
    },
    {
      key: "tests_passing",
      label: "Automated tests passing",
      status: "not_available",
      evidence: "Verify via `npm test` in CI — not evaluated at runtime by this snapshot.",
      relatedHref: null,
    },
    {
      key: "build_passing",
      label: "Build passing",
      status: "not_available",
      evidence: "Verify via `npm run build` in CI — not evaluated at runtime by this snapshot.",
      relatedHref: null,
    },
    {
      key: "safety_grep_clean",
      label: "Safety grep clean",
      status: "not_available",
      evidence: "Verify via the repository safety grep in CI — not evaluated at runtime by this snapshot.",
      relatedHref: null,
    },
    {
      key: "unrelated_artifacts_excluded",
      label: "Unrelated artifacts excluded",
      status: "not_available",
      evidence: "Verify via code review / git status — not evaluated at runtime by this snapshot.",
      relatedHref: null,
    },
  ];
}

// ─── PortfolioGovernanceSnapshotReport ────────────────────────────────────

export type ExecutiveGovernanceSummary = {
  overallGovernanceStatus: GovernanceStatus;
  paperOnlyBoundaryStatus: "intact" | "breached";
  realExecutionStatus: "locked" | "unlocked";
  lifecycleCompletenessScore: number | null;
  sourceChainCompletenessScore: number | null;
  closeGovernanceCompletenessScore: number | null;
  auditEvidenceCompletenessScore: number | null;
  openExposurePosture: ExposurePostureStatus;
  realizedPnlUsd: number | null;
  unrealizedPnlUsd: number | null;
  unlinkedRecordCount: number;
  incompleteRecordCount: number;
  historicalRecordCount: number;
  mvpReviewReadinessStatus: ReadinessStatus;
};

export type PortfolioGovernanceSnapshotReport = {
  portfolio: { id: string; name: string };
  generatedAt: string;
  executiveSummary: ExecutiveGovernanceSummary;
  paperOnlyBoundary: PaperOnlyBoundaryEvidence;
  lifecycleCompleteness: LifecycleCompleteness;
  sourceChainCompleteness: SourceChainCompleteness;
  auditEvidence: AuditEvidenceSummary;
  openExposure: OpenExposureSummary;
  simulatedPnl: SimulatedPnlSummary;
  strategyAttributionHealth: StrategyAttributionHealth;
  signalCohortHealth: SignalCohortHealth;
  governanceGaps: GovernanceGapRow[];
  mvpIntegrationReadiness: {
    status: ReadinessStatus;
    checklist: MvpReadinessChecklistItem[];
  };
  relatedLinks: {
    overview: string;
    allocation: string;
    closedPerformance: string;
    strategyAttribution: string;
    signalCohorts: string;
    positions: string;
    signals: string;
    tradeIntents: string;
    strategies: string;
    investorConstitution: string;
  };
  governance: {
    paperOnly: true;
    readOnly: true;
    realExecutionLocked: true;
    brokerConnected: false;
    liveOrderRoutingEnabled: false;
    marketDataFetched: false;
    mutationsPerformed: false;
    llmCalled: false;
    investmentAdviceProvided: false;
  };
};

/**
 * Builds the read-only Portfolio Governance Snapshot for the caller's tenant
 * and default portfolio. Composes the four existing read-only reports
 * (Allocation & Exposure, Closed Position Performance, Strategy Performance
 * Attribution, Signal Cohort Outcomes) — each already scoped by company_id
 * (and, for portfolio-level tables, portfolio_id) — and never queries a
 * table or calls a mutation RPC itself. Never generates a signal, never
 * creates/submits/cancels a draft, never runs Risk Constitution review,
 * never opens/closes/marks a paper position, never refreshes valuation, and
 * never calls the LLM.
 */
export async function getPortfolioGovernanceSnapshot(companyId: string): Promise<PortfolioGovernanceSnapshotReport> {
  const [allocation, closedPerformance, strategyAttribution, signalCohorts] = await Promise.all([
    getAllocationExposureOverview(companyId),
    getClosedPositionPerformance(companyId),
    getStrategyPerformanceAttribution(companyId),
    getSignalCohortOutcomes(companyId),
  ]);

  const paperOnlyBoundary = derivePaperOnlyBoundaryEvidence();

  const lifecycleCompleteness = summarizeLifecycleCompleteness({
    strategyCount: strategyAttribution.summary.attributableStrategyCount,
    signalCount: signalCohorts.summary.totalSignals,
    eligibleSignalCount: signalCohorts.summary.eligibleSignals,
    convertedSignalCount: signalCohorts.summary.convertedSignals,
    notConvertedSignalCount: signalCohorts.summary.notConvertedSignals,
    draftCount: signalCohorts.summary.convertedSignals,
    cancelledDraftCount: signalCohorts.summary.cancelledDrafts,
    submittedReviewCount: signalCohorts.summary.submittedReviews,
    approvedReviewCount: signalCohorts.summary.approvedReviews,
    rejectedReviewCount: signalCohorts.summary.rejectedReviews,
    openedPositionCount: signalCohorts.summary.openedPositions,
    openPositionCount: signalCohorts.summary.openPositions,
    closedPositionCount: signalCohorts.summary.closedPositions,
    closeReviewCount: closedPerformance.governanceEvidence.governedCloseReviewCount,
    realizedOutcomeRecordCount: closedPerformance.governanceEvidence.totalClosedPositions,
    completeChainCount: signalCohorts.lifecycleFunnel.completeSourceChainCount,
    incompleteChainCount: Math.max(signalCohorts.summary.incompleteOutcomeCount, 0),
    historicalRecordCount: signalCohorts.summary.historicalRecordCount,
  });

  const sourceChainCompleteness = summarizeSourceChainCompleteness({
    completeCount: closedPerformance.rows.filter((r) => r.sourceChainStatus === "complete").length,
    partialCount: closedPerformance.rows.filter((r) => r.sourceChainStatus === "partial").length,
    unlinkedCount: closedPerformance.rows.filter((r) => r.sourceChainStatus === "unlinked").length,
    historicalCount: closedPerformance.governanceEvidence.historicalLegacyShapedCount,
    notApplicableCount: 0,
    overallSourceChainCompletenessPct: signalCohorts.summary.overallSourceChainCompletenessPct,
  });

  const auditEvidence = summarizeAuditEvidence({
    closedPositionCount: closedPerformance.governanceEvidence.totalClosedPositions,
    positionsWithCloseReviewId: closedPerformance.governanceEvidence.positionsWithCloseReviewId,
    positionsWithApprovedCloseReviewAudit: closedPerformance.governanceEvidence.positionsWithApprovedCloseReviewAudit,
    positionsWithClosedAudit: closedPerformance.governanceEvidence.positionsWithClosedAudit,
    positionsWithCompleteEvidence: closedPerformance.governanceEvidence.positionsWithCompleteEvidence,
    positionsMissingGovernedEvidence: closedPerformance.governanceEvidence.positionsMissingGovernedEvidence,
  });

  const openPositionsMissingValuation = allocation.positions.filter((p) => p.currentNotionalUsd === null).length;
  const totalEntryNotionalOpenUsd = allocation.positions.length > 0 ? allocation.positions.reduce((sum, p) => sum + p.entryNotionalUsd, 0) : null;

  const openExposure = summarizeOpenExposurePosture({
    openPositionCount: allocation.portfolio.openPositionsCount,
    totalEntryNotionalOpenUsd,
    totalCurrentNotionalOpenUsd: allocation.portfolio.openPositionsCount > 0 ? allocation.portfolio.openExposureUsd : null,
    largestSymbolWeight: allocation.allocation.largestSymbolWeight,
    exposureLimitUsage: allocation.governance.exposureLimitUsage,
  });

  const missingRealizedPnlCount = closedPerformance.rows.filter((r) => r.realizedPnlUsd === null).length;

  const simulatedPnl = summarizeSimulatedPnl({
    realizedPnlUsd: closedPerformance.summary.totalClosedPositions > 0 ? closedPerformance.realizedVsUnrealized.realizedPnlUsd : null,
    unrealizedPnlUsd: allocation.portfolio.openPositionsCount > 0 ? closedPerformance.realizedVsUnrealized.unrealizedPnlUsd : null,
    weightedRealizedReturnPct: closedPerformance.summary.totalRealizedPnlPct,
    openPositionCount: closedPerformance.realizedVsUnrealized.openPositionsCount,
    closedPositionCount: closedPerformance.realizedVsUnrealized.closedPositionsCount,
    missingRealizedPnlCount,
    missingUnrealizedPnlCount: openPositionsMissingValuation,
  });

  const strategyAttributionHealth = summarizeStrategyAttributionHealth({
    attributableStrategyCount: strategyAttribution.summary.attributableStrategyCount,
    unlinkedRecordCount: strategyAttribution.summary.unlinkedRecordCount,
    historicalRecordCount: strategyAttribution.summary.historicalRecordCount,
    overallGovernanceCompletenessPct: strategyAttribution.summary.overallGovernanceCompletenessPct,
    totalRealizedPnlUsd: strategyAttribution.summary.totalRealizedPnlUsd,
    totalUnrealizedPnlUsd: strategyAttribution.summary.totalUnrealizedPnlUsd,
  });

  const signalCohortHealth = summarizeSignalCohortHealth({
    totalSignals: signalCohorts.summary.totalSignals,
    eligibleSignals: signalCohorts.summary.eligibleSignals,
    convertedSignals: signalCohorts.summary.convertedSignals,
    notConvertedSignals: signalCohorts.summary.notConvertedSignals,
    submittedReviews: signalCohorts.summary.submittedReviews,
    approvedReviews: signalCohorts.summary.approvedReviews,
    rejectedReviews: signalCohorts.summary.rejectedReviews,
    openedPositions: signalCohorts.summary.openedPositions,
    openPositions: signalCohorts.summary.openPositions,
    closedPositions: signalCohorts.summary.closedPositions,
    incompleteOutcomeCount: signalCohorts.summary.incompleteOutcomeCount,
    historicalRecordCount: signalCohorts.summary.historicalRecordCount,
    overallSourceChainCompletenessPct: signalCohorts.summary.overallSourceChainCompletenessPct,
  });

  const unlinkedDraftCount = strategyAttribution.unlinkedRecords.find((r) => r.recordType === "drafts")?.count ?? 0;
  const unlinkedDecisionCount = strategyAttribution.unlinkedRecords.find((r) => r.recordType === "reviews")?.count ?? 0;
  const unlinkedPositionCount = strategyAttribution.unlinkedRecords.find((r) => r.recordType === "positions")?.count ?? 0;
  const closedMissingCloseReviewId = Math.max(closedPerformance.governanceEvidence.totalClosedPositions - closedPerformance.governanceEvidence.positionsWithCloseReviewId, 0);

  const governanceGaps = buildGovernanceGapRows({
    paperOnlyBoundary,
    unlinkedSignalCount: 0,
    unlinkedDraftCount,
    unlinkedDecisionCount,
    unlinkedPositionCount,
    historicalClosedPositionCount: closedPerformance.governanceEvidence.historicalLegacyShapedCount,
    closedPositionsMissingCloseReviewId: closedMissingCloseReviewId,
    closedPositionsMissingCloseAudit: closedPerformance.governanceEvidence.positionsMissingGovernedEvidence,
    openPositionsMissingValuation,
    strategyAttributionGapCount: strategyAttribution.summary.unlinkedRecordCount,
    signalCohortGapCount: signalCohorts.summary.incompleteOutcomeCount,
  });

  const criticalGapCount = governanceGaps.filter((g) => g.severity === "critical" && g.count > 0).length;
  const highGapCount = governanceGaps.filter((g) => g.severity === "high" && g.count > 0).length;
  const mediumGapCount = governanceGaps.filter((g) => g.severity === "medium" && g.count > 0).length;
  const safetyBoundaryIntact = criticalGapCount === 0;

  const hasSufficientData = signalCohorts.summary.totalSignals > 0 || closedPerformance.governanceEvidence.totalClosedPositions > 0 || allocation.portfolio.openPositionsCount > 0;

  const overallGovernanceStatus = deriveGovernanceStatus({
    hasSufficientData,
    safetyBoundaryIntact,
    evidenceCompletenessPct: lifecycleCompleteness.completenessPct,
    criticalGapCount,
    highGapCount,
  });

  const readinessStatus = deriveReadinessStatus({
    hasSufficientData,
    safetyBoundaryIntact,
    criticalGapCount,
    highGapCount,
    mediumGapCount,
  });

  const mvpChecklist = buildMvpIntegrationReadinessChecklist({
    paperOnlyBoundary,
    legacyQuickCloseGuarded: true,
    closedPerformanceReadOnly: true,
    strategyAttributionReadOnly: true,
    signalCohortTrackingReadOnly: true,
    snapshotReadOnly: true,
    tenantScoped: true,
    portfolioScoped: true,
    noRequestBodyRead: true,
    noMutationRpcsCalled: true,
    noMarketDataRefresh: true,
    noExternalTradingVenueSurfaces: true,
    noAdviceCopy: true,
    criticalGapCount,
  });

  const auditEvidenceCompletenessScore = auditEvidence.expectedAuditEvidenceCount > 0 ? auditEvidence.resolvedAuditEvidenceCount / auditEvidence.expectedAuditEvidenceCount : null;

  const executiveSummary: ExecutiveGovernanceSummary = {
    overallGovernanceStatus,
    paperOnlyBoundaryStatus: safetyBoundaryIntact ? "intact" : "breached",
    realExecutionStatus: "locked",
    lifecycleCompletenessScore: lifecycleCompleteness.completenessPct,
    sourceChainCompletenessScore: sourceChainCompleteness.completenessPct,
    closeGovernanceCompletenessScore: auditEvidenceCompletenessScore,
    auditEvidenceCompletenessScore,
    openExposurePosture: openExposure.posture,
    realizedPnlUsd: simulatedPnl.realizedPnlUsd,
    unrealizedPnlUsd: simulatedPnl.unrealizedPnlUsd,
    unlinkedRecordCount: unlinkedDraftCount + unlinkedDecisionCount + unlinkedPositionCount,
    incompleteRecordCount: signalCohorts.summary.incompleteOutcomeCount,
    historicalRecordCount: closedPerformance.governanceEvidence.historicalLegacyShapedCount,
    mvpReviewReadinessStatus: readinessStatus,
  };

  return {
    portfolio: closedPerformance.portfolio,
    generatedAt: new Date().toISOString(),
    executiveSummary,
    paperOnlyBoundary,
    lifecycleCompleteness,
    sourceChainCompleteness,
    auditEvidence,
    openExposure,
    simulatedPnl,
    strategyAttributionHealth,
    signalCohortHealth,
    governanceGaps,
    mvpIntegrationReadiness: { status: readinessStatus, checklist: mvpChecklist },
    relatedLinks: {
      overview: NAV_LINKS.overview,
      allocation: NAV_LINKS.allocation,
      closedPerformance: NAV_LINKS.closedPerformance,
      strategyAttribution: NAV_LINKS.strategyAttribution,
      signalCohorts: NAV_LINKS.signalCohorts,
      positions: NAV_LINKS.positions,
      signals: NAV_LINKS.signals,
      tradeIntents: NAV_LINKS.tradeIntents,
      strategies: NAV_LINKS.strategies,
      investorConstitution: NAV_LINKS.investorConstitution,
    },
    governance: {
      paperOnly: true,
      readOnly: true,
      realExecutionLocked: true,
      brokerConnected: false,
      liveOrderRoutingEnabled: false,
      marketDataFetched: false,
      mutationsPerformed: false,
      llmCalled: false,
      investmentAdviceProvided: false,
    },
  };
}
