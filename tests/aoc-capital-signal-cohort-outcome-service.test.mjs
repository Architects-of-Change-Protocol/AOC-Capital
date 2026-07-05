// ─── AOC Capital Signal Cohort Outcome Tracking v1 (PR #20) — Pure Function
// Tests ────────────────────────────────────────────────────────────────────
// getSignalCohortOutcomes() is I/O-heavy (talks to Supabase) and this
// codebase has no live-Supabase test harness for that kind of module (same
// rationale as tests/aoc-capital-strategy-performance-attribution-service.
// test.mjs). Every other export in signal-cohort-outcome-service.ts is a
// pure, deterministic, I/O-free function — fully unit-testable here.

import { test } from "node:test";
import assert from "node:assert/strict";

const {
  UNSPECIFIED_COHORT_KEY,
  UNLINKED_COHORT_KEY,
  deriveSignalCohortKey,
  deriveSignalEligibility,
  deriveSignalConversionStatus,
  deriveSignalLifecycleStatus,
  deriveRealizedPnl,
  deriveRealizedReturn,
  deriveUnrealizedPnl,
  deriveUnrealizedReturn,
  classifyPositionOutcome,
  summarizeSignalLifecycleFunnel,
  summarizeCohortConversionRates,
  summarizeCohortRiskReviewOutcomes,
  summarizeCohortPositionOutcomes,
  summarizeCohortRealizedPerformance,
  summarizeCohortUnrealizedPerformance,
  deriveCohortGovernanceCompleteness,
  groupSignalsByCohort,
  buildSignalCohortRows,
  buildIncompleteSignalOutcomeRows,
} = await import("../src/lib/capital/signal-cohort-outcome-service.ts");

// ─── deriveSignalCohortKey ────────────────────────────────────────────────────

test("deriveSignalCohortKey: returns recommendation-type cohort key", () => {
  assert.equal(deriveSignalCohortKey({ action: "paper_buy_candidate" }, "recommendation_type"), "type:paper_buy_candidate");
});

test("deriveSignalCohortKey: returns strategy cohort key when strategy_key exists", () => {
  assert.equal(deriveSignalCohortKey({ strategyKey: "momentum-v1" }, "strategy_key"), "strategy:momentum-v1");
});

test("deriveSignalCohortKey: returns generated date bucket when generated_at exists", () => {
  assert.equal(deriveSignalCohortKey({ generatedAt: "2026-06-15T00:00:00.000Z" }, "generated_date_bucket"), "month:2026-06");
});

test("deriveSignalCohortKey: returns unspecified/unlinked when no cohort dimension exists", () => {
  assert.equal(deriveSignalCohortKey({}, "recommendation_type"), UNSPECIFIED_COHORT_KEY);
  assert.equal(deriveSignalCohortKey({}, "strategy_key"), UNLINKED_COHORT_KEY);
  assert.equal(deriveSignalCohortKey({}, "generated_date_bucket"), UNSPECIFIED_COHORT_KEY);
});

test("deriveSignalCohortKey: never infers a cohort from symbol", () => {
  const withSymbol = { action: null, symbol: "BTC-USD" };
  assert.equal(deriveSignalCohortKey(withSymbol, "recommendation_type"), UNSPECIFIED_COHORT_KEY);
});

// ─── deriveSignalEligibility ──────────────────────────────────────────────────

test("deriveSignalEligibility: eligible candidate", () => {
  assert.equal(deriveSignalEligibility({ action: "paper_buy_candidate", status: "active" }), "eligible");
});

test("deriveSignalEligibility: ineligible when action isn't paper_buy_candidate", () => {
  assert.equal(deriveSignalEligibility({ action: "watch", status: "active" }), "ineligible");
});

test("deriveSignalEligibility: ineligible when blocked by risk", () => {
  assert.equal(deriveSignalEligibility({ action: "paper_buy_candidate", status: "blocked_by_risk" }), "ineligible");
});

test("deriveSignalEligibility: unknown when data is insufficient", () => {
  assert.equal(deriveSignalEligibility({ action: null, status: null }), "unknown");
  assert.equal(deriveSignalEligibility({}), "unknown");
});

// ─── deriveSignalConversionStatus ────────────────────────────────────────────

test("deriveSignalConversionStatus: converted via linked draft", () => {
  assert.equal(deriveSignalConversionStatus({ convertedTradeIntentId: null, linkedDraftFound: true }), "converted");
});

test("deriveSignalConversionStatus: converted via stored marker", () => {
  assert.equal(deriveSignalConversionStatus({ convertedTradeIntentId: "intent-1", linkedDraftFound: false }), "converted");
});

test("deriveSignalConversionStatus: not converted", () => {
  assert.equal(deriveSignalConversionStatus({ convertedTradeIntentId: null, linkedDraftFound: false }), "not_converted");
});

test("deriveSignalConversionStatus: unknown on insufficient data", () => {
  assert.equal(deriveSignalConversionStatus({}), "unknown");
});

// ─── deriveSignalLifecycleStatus ─────────────────────────────────────────────

const baseLifecycleInput = {
  eligibility: "eligible",
  draftResolved: false,
  draftCancelled: false,
  reviewResolved: false,
  reviewVerdict: null,
  positionResolved: false,
  positionStatus: null,
  realizedOutcomeAvailable: false,
};

test("deriveSignalLifecycleStatus: generated", () => {
  assert.equal(deriveSignalLifecycleStatus({ ...baseLifecycleInput, eligibility: "ineligible" }), "generated");
});

test("deriveSignalLifecycleStatus: eligible", () => {
  assert.equal(deriveSignalLifecycleStatus({ ...baseLifecycleInput }), "eligible");
});

test("deriveSignalLifecycleStatus: converted_to_draft", () => {
  assert.equal(deriveSignalLifecycleStatus({ ...baseLifecycleInput, draftResolved: true }), "converted_to_draft");
});

test("deriveSignalLifecycleStatus: draft_cancelled", () => {
  assert.equal(deriveSignalLifecycleStatus({ ...baseLifecycleInput, draftResolved: true, draftCancelled: true }), "draft_cancelled");
});

test("deriveSignalLifecycleStatus: submitted_for_review", () => {
  assert.equal(deriveSignalLifecycleStatus({ ...baseLifecycleInput, draftResolved: true, reviewResolved: true }), "submitted_for_review");
});

test("deriveSignalLifecycleStatus: review_approved", () => {
  assert.equal(deriveSignalLifecycleStatus({ ...baseLifecycleInput, draftResolved: true, reviewResolved: true, reviewVerdict: "approved" }), "review_approved");
});

test("deriveSignalLifecycleStatus: review_rejected", () => {
  assert.equal(deriveSignalLifecycleStatus({ ...baseLifecycleInput, draftResolved: true, reviewResolved: true, reviewVerdict: "rejected" }), "review_rejected");
});

test("deriveSignalLifecycleStatus: position_opened", () => {
  assert.equal(
    deriveSignalLifecycleStatus({ ...baseLifecycleInput, draftResolved: true, reviewResolved: true, reviewVerdict: "approved", positionResolved: true }),
    "position_opened",
  );
});

test("deriveSignalLifecycleStatus: position_open", () => {
  assert.equal(
    deriveSignalLifecycleStatus({ ...baseLifecycleInput, draftResolved: true, reviewResolved: true, reviewVerdict: "approved", positionResolved: true, positionStatus: "open" }),
    "position_open",
  );
});

test("deriveSignalLifecycleStatus: position_closed", () => {
  assert.equal(
    deriveSignalLifecycleStatus({ ...baseLifecycleInput, draftResolved: true, reviewResolved: true, reviewVerdict: "approved", positionResolved: true, positionStatus: "closed" }),
    "position_closed",
  );
});

test("deriveSignalLifecycleStatus: realized_outcome_available", () => {
  assert.equal(
    deriveSignalLifecycleStatus({
      ...baseLifecycleInput,
      draftResolved: true,
      reviewResolved: true,
      reviewVerdict: "approved",
      positionResolved: true,
      positionStatus: "closed",
      realizedOutcomeAvailable: true,
    }),
    "realized_outcome_available",
  );
});

test("deriveSignalLifecycleStatus: incomplete on internal contradiction", () => {
  assert.equal(deriveSignalLifecycleStatus({ ...baseLifecycleInput, reviewResolved: true, reviewVerdict: "rejected", positionResolved: true }), "incomplete");
  assert.equal(deriveSignalLifecycleStatus({ ...baseLifecycleInput, positionResolved: true, reviewVerdict: null }), "incomplete");
  assert.equal(
    deriveSignalLifecycleStatus({ ...baseLifecycleInput, draftResolved: true, reviewResolved: true, reviewVerdict: "approved", positionResolved: true, positionStatus: "open", realizedOutcomeAvailable: true }),
    "incomplete",
  );
});

// ─── deriveRealizedPnl ────────────────────────────────────────────────────────

test("deriveRealizedPnl: uses stored realized_pnl_usd when available", () => {
  assert.equal(deriveRealizedPnl({ realizedPnlUsd: 42, closeNotionalUsd: 1000, entryNotionalUsd: 900 }), 42);
});

test("deriveRealizedPnl: safe fallback to close_notional_usd - entry_notional_usd", () => {
  assert.equal(deriveRealizedPnl({ realizedPnlUsd: null, closeNotionalUsd: 1100, entryNotionalUsd: 1000 }), 100);
});

test("deriveRealizedPnl: null on missing data", () => {
  assert.equal(deriveRealizedPnl({ realizedPnlUsd: null, closeNotionalUsd: null, entryNotionalUsd: 1000 }), null);
  assert.equal(deriveRealizedPnl({ realizedPnlUsd: null, closeNotionalUsd: 1100, entryNotionalUsd: null }), null);
});

// ─── deriveRealizedReturn ─────────────────────────────────────────────────────

test("deriveRealizedReturn: uses stored realized_pnl_pct when available", () => {
  assert.equal(deriveRealizedReturn({ realizedPnlPct: 0.05, realizedPnlUsd: 100, entryNotionalUsd: 1000 }), 0.05);
});

test("deriveRealizedReturn: safe fallback", () => {
  assert.equal(deriveRealizedReturn({ realizedPnlPct: null, realizedPnlUsd: 50, entryNotionalUsd: 500 }), 0.1);
});

test("deriveRealizedReturn: null on zero/negative denominator", () => {
  assert.equal(deriveRealizedReturn({ realizedPnlPct: null, realizedPnlUsd: 50, entryNotionalUsd: 0 }), null);
  assert.equal(deriveRealizedReturn({ realizedPnlPct: null, realizedPnlUsd: 50, entryNotionalUsd: -10 }), null);
});

// ─── deriveUnrealizedPnl ──────────────────────────────────────────────────────

test("deriveUnrealizedPnl: uses current_notional_usd - entry_notional_usd", () => {
  assert.equal(deriveUnrealizedPnl({ currentNotionalUsd: 1100, entryNotionalUsd: 1000 }), 100);
});

test("deriveUnrealizedPnl: null on missing current_notional", () => {
  assert.equal(deriveUnrealizedPnl({ currentNotionalUsd: null, entryNotionalUsd: 1000 }), null);
});

test("deriveUnrealizedPnl: null on missing entry_notional", () => {
  assert.equal(deriveUnrealizedPnl({ currentNotionalUsd: 1100, entryNotionalUsd: null }), null);
});

// ─── deriveUnrealizedReturn ───────────────────────────────────────────────────

test("deriveUnrealizedReturn: divides by entry notional when positive", () => {
  assert.equal(deriveUnrealizedReturn({ unrealizedPnlUsd: 100, entryNotionalUsd: 1000 }), 0.1);
});

test("deriveUnrealizedReturn: null when entry notional isn't positive", () => {
  assert.equal(deriveUnrealizedReturn({ unrealizedPnlUsd: 100, entryNotionalUsd: 0 }), null);
});

// ─── classifyPositionOutcome ──────────────────────────────────────────────────

test("classifyPositionOutcome: winner/loser/flat/unknown", () => {
  assert.equal(classifyPositionOutcome(50), "winner");
  assert.equal(classifyPositionOutcome(-50), "loser");
  assert.equal(classifyPositionOutcome(0), "flat");
  assert.equal(classifyPositionOutcome(null), "unknown");
});

// ─── summarizeSignalLifecycleFunnel ──────────────────────────────────────────

test("summarizeSignalLifecycleFunnel: computes rates safely and never treats missing links as conversions", () => {
  const funnel = summarizeSignalLifecycleFunnel({
    signalCount: 10,
    eligibleSignalCount: 6,
    convertedSignalCount: 3,
    notConvertedSignalCount: 3,
    cancelledDraftCount: 1,
    submittedReviewCount: 2,
    approvedReviewCount: 1,
    rejectedReviewCount: 1,
    openedPositionCount: 1,
    openPositionCount: 1,
    closedPositionCount: 0,
    realizedOutcomeAvailableCount: 0,
    unrealizedOutcomeAvailableCount: 1,
    completeSourceChainCount: 8,
  });
  assert.equal(funnel.eligibilityRate, 0.6);
  assert.equal(funnel.signalToDraftRate, 0.5);
  assert.equal(funnel.reviewApprovalRate, 0.5);
  assert.equal(funnel.positionCloseRate, 0);
  assert.equal(funnel.realizedOutcomeAvailabilityRate, null, "zero closed positions must not yield a fabricated rate");
  assert.equal(funnel.sourceChainCompletenessRate, 0.8);
});

test("summarizeSignalLifecycleFunnel: returns null rates when denominators are zero", () => {
  const funnel = summarizeSignalLifecycleFunnel({
    signalCount: 0,
    eligibleSignalCount: 0,
    convertedSignalCount: 0,
    notConvertedSignalCount: 0,
    cancelledDraftCount: 0,
    submittedReviewCount: 0,
    approvedReviewCount: 0,
    rejectedReviewCount: 0,
    openedPositionCount: 0,
    openPositionCount: 0,
    closedPositionCount: 0,
    realizedOutcomeAvailableCount: 0,
    unrealizedOutcomeAvailableCount: 0,
    completeSourceChainCount: 0,
  });
  for (const rate of [
    funnel.eligibilityRate,
    funnel.signalToDraftRate,
    funnel.draftSubmissionRate,
    funnel.reviewApprovalRate,
    funnel.approvalToPositionRate,
    funnel.positionCloseRate,
    funnel.realizedOutcomeAvailabilityRate,
    funnel.sourceChainCompletenessRate,
  ]) {
    assert.equal(rate, null);
  }
});

// ─── summarizeCohortConversionRates ───────────────────────────────────────────

test("summarizeCohortConversionRates: counts eligible/converted/not-converted safely", () => {
  const result = summarizeCohortConversionRates([
    { eligibility: "eligible", conversionStatus: "converted" },
    { eligibility: "eligible", conversionStatus: "not_converted" },
    { eligibility: "ineligible", conversionStatus: "not_converted" },
    { eligibility: "unknown", conversionStatus: "unknown" },
  ]);
  assert.equal(result.eligibleCount, 2);
  assert.equal(result.convertedCount, 1);
  assert.equal(result.notConvertedCount, 2);
  assert.equal(result.conversionRate, 0.5);
});

test("summarizeCohortConversionRates: null conversion rate when no eligible signals", () => {
  const result = summarizeCohortConversionRates([{ eligibility: "ineligible", conversionStatus: "not_converted" }]);
  assert.equal(result.conversionRate, null);
});

// ─── summarizeCohortRiskReviewOutcomes ────────────────────────────────────────

test("summarizeCohortRiskReviewOutcomes: submitted/approved/rejected with safe rates and most common rejection reason", () => {
  const result = summarizeCohortRiskReviewOutcomes([
    { verdict: "approved", decidedAt: "2026-01-01T00:00:00Z", reasonLabels: [] },
    { verdict: "rejected", decidedAt: "2026-01-02T00:00:00Z", reasonLabels: ["Exposure limit"] },
    { verdict: "rejected", decidedAt: "2026-01-03T00:00:00Z", reasonLabels: ["Exposure limit"] },
  ]);
  assert.equal(result.submittedCount, 3);
  assert.equal(result.approvedCount, 1);
  assert.equal(result.rejectedCount, 2);
  assert.ok(Math.abs(result.approvalRate - 1 / 3) < 1e-9);
  assert.equal(result.mostCommonRejectionReason, "Exposure limit");
  assert.equal(result.latestReviewDate, "2026-01-03T00:00:00Z");
});

test("summarizeCohortRiskReviewOutcomes: null rates and reason when no decisions", () => {
  const result = summarizeCohortRiskReviewOutcomes([]);
  assert.equal(result.approvalRate, null);
  assert.equal(result.rejectionRate, null);
  assert.equal(result.mostCommonRejectionReason, null);
  assert.equal(result.latestReviewDate, null);
});

// ─── summarizeCohortPositionOutcomes ──────────────────────────────────────────

test("summarizeCohortPositionOutcomes: opened/open/closed with safe close rate and holding period", () => {
  const result = summarizeCohortPositionOutcomes([
    { status: "open", openedAt: "2026-01-01T00:00:00Z", closedAt: null, symbol: "BTC-USD" },
    { status: "closed", openedAt: "2026-01-01T00:00:00Z", closedAt: "2026-01-03T00:00:00Z", symbol: "ETH-USD" },
  ]);
  assert.equal(result.openedCount, 2);
  assert.equal(result.openCount, 1);
  assert.equal(result.closedCount, 1);
  assert.equal(result.closeRate, 0.5);
  assert.equal(result.averageHoldingPeriodDays, 2);
  assert.deepEqual(result.symbols.sort(), ["BTC-USD", "ETH-USD"]);
});

test("summarizeCohortPositionOutcomes: null close rate when no positions opened", () => {
  const result = summarizeCohortPositionOutcomes([]);
  assert.equal(result.closeRate, null);
  assert.equal(result.averageHoldingPeriodDays, null);
});

// ─── summarizeCohortRealizedPerformance ──────────────────────────────────────

test("summarizeCohortRealizedPerformance: sums, weights, and highlights best/worst/latest", () => {
  const result = summarizeCohortRealizedPerformance([
    { id: "p1", symbol: "BTC-USD", closedAt: "2026-01-01T00:00:00Z", entryNotionalUsd: 1000, closeNotionalUsd: 1100, realizedPnlUsd: 100, realizedPnlPct: 0.1 },
    { id: "p2", symbol: "ETH-USD", closedAt: "2026-01-05T00:00:00Z", entryNotionalUsd: 500, closeNotionalUsd: 400, realizedPnlUsd: -100, realizedPnlPct: -0.2 },
  ]);
  assert.equal(result.totalRealizedPnlUsd, 0);
  assert.ok(Math.abs(result.weightedRealizedReturnPct - 0 / 1500) < 1e-9);
  assert.equal(result.bestClosedPosition.symbol, "BTC-USD");
  assert.equal(result.worstClosedPosition.symbol, "ETH-USD");
  assert.equal(result.latestClosedPosition.symbol, "ETH-USD");
});

test("summarizeCohortRealizedPerformance: null weighted/average when no rows", () => {
  const result = summarizeCohortRealizedPerformance([]);
  assert.equal(result.weightedRealizedReturnPct, null);
  assert.equal(result.averageRealizedReturnPct, null);
  assert.equal(result.bestClosedPosition, null);
});

// ─── summarizeCohortUnrealizedPerformance ────────────────────────────────────

test("summarizeCohortUnrealizedPerformance: sums open exposure and computes unrealized P&L", () => {
  const result = summarizeCohortUnrealizedPerformance([{ symbol: "BTC-USD", entryNotionalUsd: 1000, currentNotionalUsd: 1100 }], 2200);
  assert.equal(result.unrealizedPnlUsd, 100);
  assert.equal(result.valuationAvailabilityStatus, "complete");
  assert.ok(Math.abs(result.exposureShareOfPortfolio - 0.5) < 1e-9);
});

test("summarizeCohortUnrealizedPerformance: partial valuation availability when some current values are missing", () => {
  const result = summarizeCohortUnrealizedPerformance([
    { symbol: "BTC-USD", entryNotionalUsd: 1000, currentNotionalUsd: 1100 },
    { symbol: "ETH-USD", entryNotionalUsd: 500, currentNotionalUsd: null },
  ]);
  assert.equal(result.valuationAvailabilityStatus, "partial");
  assert.equal(result.exposureShareOfPortfolio, null);
});

// ─── deriveCohortGovernanceCompleteness ──────────────────────────────────────

test("deriveCohortGovernanceCompleteness: complete when nothing is broken", () => {
  const result = deriveCohortGovernanceCompleteness({
    isUnspecifiedCohort: false,
    bundles: [{ lifecycleStatus: "position_closed", convertedTradeIntentId: "i1", draftResolved: true }],
    closedPositions: [{ hasCloseReviewId: true, hasApprovedAudit: true, hasClosedAudit: true }],
  });
  assert.equal(result.sourceChainStatus, "complete");
  assert.equal(result.closeGovernanceCompletenessStatus, "complete");
});

test("deriveCohortGovernanceCompleteness: historical when close-review evidence predates the schema", () => {
  const result = deriveCohortGovernanceCompleteness({
    isUnspecifiedCohort: false,
    bundles: [{ lifecycleStatus: "position_closed", convertedTradeIntentId: "i1", draftResolved: true }],
    closedPositions: [{ hasCloseReviewId: false, hasApprovedAudit: false, hasClosedAudit: false }],
  });
  assert.equal(result.sourceChainStatus, "historical");
  assert.equal(result.closeGovernanceCompletenessStatus, "missing");
});

test("deriveCohortGovernanceCompleteness: unlinked for the unspecified cohort bucket", () => {
  const result = deriveCohortGovernanceCompleteness({ isUnspecifiedCohort: true, bundles: [], closedPositions: [] });
  assert.equal(result.sourceChainStatus, "unlinked");
});

test("deriveCohortGovernanceCompleteness: partial when some bundles are broken", () => {
  const result = deriveCohortGovernanceCompleteness({
    isUnspecifiedCohort: false,
    bundles: [
      { lifecycleStatus: "position_closed", convertedTradeIntentId: "i1", draftResolved: true },
      { lifecycleStatus: "incomplete", convertedTradeIntentId: "i2", draftResolved: true },
    ],
    closedPositions: [],
  });
  assert.equal(result.sourceChainStatus, "partial");
  assert.equal(result.closeGovernanceCompletenessStatus, "not_applicable");
});

test("deriveCohortGovernanceCompleteness: counts unlinked signals when a converted marker has no resolved draft", () => {
  const result = deriveCohortGovernanceCompleteness({
    isUnspecifiedCohort: false,
    bundles: [{ lifecycleStatus: "eligible", convertedTradeIntentId: "missing-intent", draftResolved: false }],
    closedPositions: [],
  });
  assert.equal(result.unlinkedSignalsCount, 1);
});

// ─── groupSignalsByCohort ─────────────────────────────────────────────────────

function makeBundle(overrides = {}) {
  return {
    signal: { id: "s1", action: "paper_buy_candidate", strategyKey: "momentum-v1", status: "active", convertedTradeIntentId: null, generatedAt: "2026-01-01T00:00:00Z" },
    eligibility: "eligible",
    conversionStatus: "not_converted",
    tradeIntent: null,
    decision: null,
    position: null,
    lifecycleStatus: "eligible",
    derivedRealizedPnlUsd: null,
    derivedRealizedPnlPct: null,
    derivedUnrealizedPnlUsd: null,
    derivedUnrealizedPnlPct: null,
    outcome: "unknown",
    ...overrides,
  };
}

test("groupSignalsByCohort: groups by recommendation type by default", () => {
  const groups = groupSignalsByCohort([
    makeBundle(),
    makeBundle({ signal: { ...makeBundle().signal, id: "s2", action: "watch" } }),
  ]);
  assert.equal(groups.size, 2);
  assert.ok(groups.has("type:paper_buy_candidate"));
  assert.ok(groups.has("type:watch"));
});

test("groupSignalsByCohort: unresolvable dimension falls into the shared unspecified group, never inferred from symbol", () => {
  const groups = groupSignalsByCohort(
    [makeBundle({ signal: { ...makeBundle().signal, action: null } })],
    "recommendation_type",
  );
  assert.equal(groups.size, 1);
  assert.ok(groups.get(UNSPECIFIED_COHORT_KEY).isUnspecifiedCohort);
});

test("groupSignalsByCohort: mixed strategy keys within a cohort become null (unspecified)", () => {
  const groups = groupSignalsByCohort([
    makeBundle({ signal: { ...makeBundle().signal, strategyKey: "momentum-v1" } }),
    makeBundle({ signal: { ...makeBundle().signal, id: "s2", strategyKey: "mean-reversion-v1" } }),
  ]);
  assert.equal(groups.get("type:paper_buy_candidate").strategyKey, null);
});

// ─── buildSignalCohortRows ────────────────────────────────────────────────────

test("buildSignalCohortRows: normalizes a cohort group into a full report row and sorts by total signals descending", () => {
  const groups = groupSignalsByCohort([
    makeBundle(),
    makeBundle({ signal: { ...makeBundle().signal, id: "s2", action: "watch" } }),
    makeBundle({ signal: { ...makeBundle().signal, id: "s3", action: "watch" } }),
  ]);
  const rows = buildSignalCohortRows({ groups, totalPortfolioOpenNotionalUsd: null });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].cohortLabel, "Watch");
  assert.equal(rows[0].totalSignals, 2);
  assert.ok(!("action" in rows[0]), "row must not leak raw DB fields");
});

test("buildSignalCohortRows: never attaches a mutation action field", () => {
  const groups = groupSignalsByCohort([makeBundle()]);
  const rows = buildSignalCohortRows({ groups, totalPortfolioOpenNotionalUsd: null });
  const serialized = JSON.stringify(rows);
  assert.doesNotMatch(serialized, /generateSignal|convertSignal|submitReview|closePosition/i);
});

// ─── buildIncompleteSignalOutcomeRows ────────────────────────────────────────

test("buildIncompleteSignalOutcomeRows: counts unconverted/incomplete/historical rows and explains reasons", () => {
  const bundles = [
    makeBundle({ eligibility: "eligible", conversionStatus: "not_converted" }),
    makeBundle({ signal: { ...makeBundle().signal, id: "s2", convertedTradeIntentId: "missing" }, eligibility: "eligible", conversionStatus: "converted", tradeIntent: null }),
    makeBundle({
      signal: { ...makeBundle().signal, id: "s3" },
      conversionStatus: "converted",
      tradeIntent: { id: "t3", status: "active", symbol: "BTC-USD", createdAt: "2026-01-01T00:00:00Z" },
      decision: null,
    }),
  ];
  const rows = buildIncompleteSignalOutcomeRows({ bundles, unattributedClosedPositionCount: 2 });
  const byType = Object.fromEntries(rows.map((r) => [r.recordType, r]));
  assert.equal(byType.eligible_not_converted.count, 1);
  assert.equal(byType.converted_missing_draft_link.count, 1);
  assert.equal(byType.drafts_without_review.count, 1);
  assert.equal(byType.historical_positions_missing_signal_source.count, 2);
  for (const row of rows) {
    assert.equal(row.readable, true);
    assert.ok(row.reason.length > 0);
  }
});
