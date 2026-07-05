// ─── AOC Capital Portfolio Governance Snapshot v1 (PR #21) — Pure Function
// Tests ────────────────────────────────────────────────────────────────────
// getPortfolioGovernanceSnapshot() is I/O-heavy (it composes four other
// I/O-heavy read-only reports) and this codebase has no live-Supabase test
// harness for that kind of module (same rationale as
// tests/aoc-capital-signal-cohort-outcome-service.test.mjs). Every other
// export in portfolio-governance-snapshot-service.ts is a pure,
// deterministic, I/O-free function — fully unit-testable here.

import { test } from "node:test";
import assert from "node:assert/strict";

const {
  deriveGovernanceStatus,
  deriveReadinessStatus,
  derivePaperOnlyBoundaryEvidence,
  summarizeLifecycleCompleteness,
  summarizeSourceChainCompleteness,
  summarizeAuditEvidence,
  summarizeOpenExposurePosture,
  summarizeSimulatedPnl,
  summarizeStrategyAttributionHealth,
  summarizeSignalCohortHealth,
  buildGovernanceGapRows,
  buildMvpIntegrationReadinessChecklist,
} = await import("../src/lib/capital/portfolio-governance-snapshot-service.ts");

// ─── deriveGovernanceStatus ────────────────────────────────────────────────

test("deriveGovernanceStatus: strong when evidence is high and no safety boundary issues", () => {
  assert.equal(
    deriveGovernanceStatus({ hasSufficientData: true, safetyBoundaryIntact: true, evidenceCompletenessPct: 0.95, criticalGapCount: 0, highGapCount: 0 }),
    "strong",
  );
});

test("deriveGovernanceStatus: acceptable with minor gaps", () => {
  assert.equal(
    deriveGovernanceStatus({ hasSufficientData: true, safetyBoundaryIntact: true, evidenceCompletenessPct: 0.8, criticalGapCount: 0, highGapCount: 0 }),
    "acceptable",
  );
});

test("deriveGovernanceStatus: needs_review with meaningful non-critical gaps", () => {
  assert.equal(
    deriveGovernanceStatus({ hasSufficientData: true, safetyBoundaryIntact: true, evidenceCompletenessPct: 0.5, criticalGapCount: 0, highGapCount: 0 }),
    "needs_review",
  );
  assert.equal(
    deriveGovernanceStatus({ hasSufficientData: true, safetyBoundaryIntact: true, evidenceCompletenessPct: 0.95, criticalGapCount: 0, highGapCount: 1 }),
    "needs_review",
  );
});

test("deriveGovernanceStatus: incomplete with major missing evidence", () => {
  assert.equal(
    deriveGovernanceStatus({ hasSufficientData: true, safetyBoundaryIntact: true, evidenceCompletenessPct: 0.1, criticalGapCount: 0, highGapCount: 0 }),
    "incomplete",
  );
});

test("deriveGovernanceStatus: incomplete whenever a safety boundary is breached or a critical gap exists, regardless of evidence ratio", () => {
  assert.equal(
    deriveGovernanceStatus({ hasSufficientData: true, safetyBoundaryIntact: false, evidenceCompletenessPct: 1, criticalGapCount: 0, highGapCount: 0 }),
    "incomplete",
  );
  assert.equal(
    deriveGovernanceStatus({ hasSufficientData: true, safetyBoundaryIntact: true, evidenceCompletenessPct: 1, criticalGapCount: 1, highGapCount: 0 }),
    "incomplete",
  );
});

test("deriveGovernanceStatus: not_available with insufficient data", () => {
  assert.equal(
    deriveGovernanceStatus({ hasSufficientData: false, safetyBoundaryIntact: true, evidenceCompletenessPct: 1, criticalGapCount: 0, highGapCount: 0 }),
    "not_available",
  );
  assert.equal(
    deriveGovernanceStatus({ hasSufficientData: true, safetyBoundaryIntact: true, evidenceCompletenessPct: null, criticalGapCount: 0, highGapCount: 0 }),
    "not_available",
  );
});

test("deriveGovernanceStatus: downgrades conservatively — never upgrades past what the evidence supports", () => {
  const low = deriveGovernanceStatus({ hasSufficientData: true, safetyBoundaryIntact: true, evidenceCompletenessPct: 0.2, criticalGapCount: 0, highGapCount: 0 });
  const high = deriveGovernanceStatus({ hasSufficientData: true, safetyBoundaryIntact: true, evidenceCompletenessPct: 0.99, criticalGapCount: 0, highGapCount: 0 });
  const order = ["incomplete", "needs_review", "acceptable", "strong"];
  assert.ok(order.indexOf(low) <= order.indexOf(high));
});

// ─── deriveReadinessStatus ─────────────────────────────────────────────────

test("deriveReadinessStatus: ready_for_review when boundary intact and no gaps", () => {
  assert.equal(deriveReadinessStatus({ hasSufficientData: true, safetyBoundaryIntact: true, criticalGapCount: 0, highGapCount: 0, mediumGapCount: 0 }), "ready_for_review");
});

test("deriveReadinessStatus: needs_minor_review for medium gaps only", () => {
  assert.equal(deriveReadinessStatus({ hasSufficientData: true, safetyBoundaryIntact: true, criticalGapCount: 0, highGapCount: 0, mediumGapCount: 2 }), "needs_minor_review");
});

test("deriveReadinessStatus: needs_hardening for high-severity gaps", () => {
  assert.equal(deriveReadinessStatus({ hasSufficientData: true, safetyBoundaryIntact: true, criticalGapCount: 0, highGapCount: 1, mediumGapCount: 0 }), "needs_hardening");
});

test("deriveReadinessStatus: blocked only for a critical safety issue", () => {
  assert.equal(deriveReadinessStatus({ hasSufficientData: true, safetyBoundaryIntact: false, criticalGapCount: 0, highGapCount: 0, mediumGapCount: 0 }), "blocked");
  assert.equal(deriveReadinessStatus({ hasSufficientData: true, safetyBoundaryIntact: true, criticalGapCount: 1, highGapCount: 0, mediumGapCount: 0 }), "blocked");
});

test("deriveReadinessStatus: not_available with insufficient data", () => {
  assert.equal(deriveReadinessStatus({ hasSufficientData: false, safetyBoundaryIntact: true, criticalGapCount: 0, highGapCount: 0, mediumGapCount: 0 }), "not_available");
});

// ─── derivePaperOnlyBoundaryEvidence ───────────────────────────────────────

test("derivePaperOnlyBoundaryEvidence: returns the fixed literal safety flags", () => {
  const evidence = derivePaperOnlyBoundaryEvidence();
  assert.equal(evidence.paperOnly, true);
  assert.equal(evidence.readOnly, true);
  assert.equal(evidence.realExecutionLocked, true);
  assert.equal(evidence.brokerConnected, false);
  assert.equal(evidence.liveOrderRoutingEnabled, false);
  assert.equal(evidence.tradingApiKeysPresent, false);
  assert.equal(evidence.withdrawalsEnabled, false);
  assert.equal(evidence.depositsEnabled, false);
  assert.equal(evidence.marketDataFetched, false);
  assert.equal(evidence.mutationsPerformed, false);
  assert.equal(evidence.llmCalled, false);
  assert.equal(evidence.investmentAdviceProvided, false);
});

// ─── summarizeLifecycleCompleteness ────────────────────────────────────────

function lifecycleInput(overrides = {}) {
  return {
    strategyCount: 2,
    signalCount: 10,
    eligibleSignalCount: 8,
    convertedSignalCount: 6,
    notConvertedSignalCount: 4,
    draftCount: 6,
    cancelledDraftCount: 1,
    submittedReviewCount: 5,
    approvedReviewCount: 4,
    rejectedReviewCount: 1,
    openedPositionCount: 4,
    openPositionCount: 1,
    closedPositionCount: 3,
    closeReviewCount: 3,
    realizedOutcomeRecordCount: 3,
    completeChainCount: 4,
    incompleteChainCount: 0,
    historicalRecordCount: 0,
    ...overrides,
  };
}

test("summarizeLifecycleCompleteness: does not penalize signals that simply did not advance", () => {
  const result = summarizeLifecycleCompleteness(lifecycleInput());
  assert.equal(result.notAdvancedChains, 4);
  // completeness is computed only over the 6 signals that advanced (10 - 4 not-advanced), not all 10.
  assert.equal(result.completenessPct, 4 / 6);
});

test("summarizeLifecycleCompleteness: complete chain counted directly", () => {
  const result = summarizeLifecycleCompleteness(lifecycleInput({ completeChainCount: 6, incompleteChainCount: 0 }));
  assert.equal(result.completeChains, 6);
  assert.equal(result.completenessPct, 1);
});

test("summarizeLifecycleCompleteness: unlinked/incomplete chain reduces completeness", () => {
  const result = summarizeLifecycleCompleteness(lifecycleInput({ completeChainCount: 3, incompleteChainCount: 3 }));
  assert.equal(result.unlinkedChains, 3);
  assert.ok(result.completenessPct < 1);
});

test("summarizeLifecycleCompleteness: historical records tracked separately from unlinked/incomplete", () => {
  const result = summarizeLifecycleCompleteness(lifecycleInput({ completeChainCount: 3, historicalRecordCount: 2 }));
  assert.equal(result.historicalChains, 2);
});

test("summarizeLifecycleCompleteness: returns null (never zero) completeness when nothing advanced", () => {
  const result = summarizeLifecycleCompleteness(lifecycleInput({ signalCount: 5, notConvertedSignalCount: 5, completeChainCount: 0 }));
  assert.equal(result.completenessPct, null);
});

test("summarizeLifecycleCompleteness: never infers from a symbol — input has no symbol field at all", () => {
  const result = summarizeLifecycleCompleteness(lifecycleInput());
  assert.ok(!("symbol" in result));
});

test("summarizeLifecycleCompleteness: exposes all required count fields", () => {
  const result = summarizeLifecycleCompleteness(lifecycleInput());
  for (const key of [
    "strategies",
    "signals",
    "eligibleSignals",
    "convertedSignals",
    "drafts",
    "cancelledDrafts",
    "submittedDrafts",
    "approvedReviews",
    "rejectedReviews",
    "openedPositions",
    "openPositions",
    "closedPositions",
    "closeReviews",
    "realizedOutcomeRecords",
  ]) {
    assert.ok(key in result.counts, `missing count field: ${key}`);
  }
});

// ─── summarizeSourceChainCompleteness ──────────────────────────────────────

test("summarizeSourceChainCompleteness: passes through complete/partial/unlinked/historical/not_applicable counts", () => {
  const result = summarizeSourceChainCompleteness({
    completeCount: 5,
    partialCount: 2,
    unlinkedCount: 1,
    historicalCount: 3,
    notApplicableCount: 0,
    overallSourceChainCompletenessPct: 0.7,
  });
  assert.equal(result.complete, 5);
  assert.equal(result.partial, 2);
  assert.equal(result.unlinked, 1);
  assert.equal(result.historical, 3);
  assert.equal(result.notApplicable, 0);
  assert.equal(result.completenessPct, 0.7);
});

test("summarizeSourceChainCompleteness: never backfills — completenessPct stays null when the input is null", () => {
  const result = summarizeSourceChainCompleteness({ completeCount: 0, partialCount: 0, unlinkedCount: 0, historicalCount: 0, notApplicableCount: 0, overallSourceChainCompletenessPct: null });
  assert.equal(result.completenessPct, null);
});

// ─── summarizeAuditEvidence ─────────────────────────────────────────────────

test("summarizeAuditEvidence: complete close governance evidence", () => {
  const result = summarizeAuditEvidence({
    closedPositionCount: 3,
    positionsWithCloseReviewId: 3,
    positionsWithApprovedCloseReviewAudit: 3,
    positionsWithClosedAudit: 3,
    positionsWithCompleteEvidence: 3,
    positionsMissingGovernedEvidence: 0,
  });
  assert.equal(result.closeGovernanceStatus, "complete");
  assert.equal(result.missingAuditEvidenceCount, 0);
});

test("summarizeAuditEvidence: partial close governance evidence", () => {
  const result = summarizeAuditEvidence({
    closedPositionCount: 4,
    positionsWithCloseReviewId: 2,
    positionsWithApprovedCloseReviewAudit: 2,
    positionsWithClosedAudit: 2,
    positionsWithCompleteEvidence: 2,
    positionsMissingGovernedEvidence: 1,
  });
  assert.equal(result.closeGovernanceStatus, "partial");
});

test("summarizeAuditEvidence: missing close governance evidence", () => {
  const result = summarizeAuditEvidence({
    closedPositionCount: 2,
    positionsWithCloseReviewId: 0,
    positionsWithApprovedCloseReviewAudit: 0,
    positionsWithClosedAudit: 0,
    positionsWithCompleteEvidence: 0,
    positionsMissingGovernedEvidence: 2,
  });
  assert.equal(result.closeGovernanceStatus, "missing");
});

test("summarizeAuditEvidence: not_applicable when there are no closed positions", () => {
  const result = summarizeAuditEvidence({
    closedPositionCount: 0,
    positionsWithCloseReviewId: 0,
    positionsWithApprovedCloseReviewAudit: 0,
    positionsWithClosedAudit: 0,
    positionsWithCompleteEvidence: 0,
    positionsMissingGovernedEvidence: 0,
  });
  assert.equal(result.closeGovernanceStatus, "not_applicable");
  assert.equal(result.expectedAuditEvidenceCount, 0);
});

// ─── summarizeOpenExposurePosture ──────────────────────────────────────────

test("summarizeOpenExposurePosture: not_available with zero open positions", () => {
  const result = summarizeOpenExposurePosture({
    openPositionCount: 0,
    totalEntryNotionalOpenUsd: null,
    totalCurrentNotionalOpenUsd: null,
    largestSymbolWeight: null,
    exposureLimitUsage: null,
  });
  assert.equal(result.posture, "not_available");
});

test("summarizeOpenExposurePosture: low posture with modest concentration and limit usage", () => {
  const result = summarizeOpenExposurePosture({
    openPositionCount: 3,
    totalEntryNotionalOpenUsd: 1000,
    totalCurrentNotionalOpenUsd: 1050,
    largestSymbolWeight: 0.2,
    exposureLimitUsage: 0.1,
  });
  assert.equal(result.posture, "low");
  assert.equal(result.unrealizedPnlUsd, 50);
});

test("summarizeOpenExposurePosture: high posture when exposure limit usage is near the ceiling", () => {
  const result = summarizeOpenExposurePosture({
    openPositionCount: 3,
    totalEntryNotionalOpenUsd: 1000,
    totalCurrentNotionalOpenUsd: 1000,
    largestSymbolWeight: 0.2,
    exposureLimitUsage: 0.95,
  });
  assert.equal(result.posture, "high");
});

test("summarizeOpenExposurePosture: never refreshes valuation — unrealizedPnlUsd is null when either notional side is missing", () => {
  const result = summarizeOpenExposurePosture({
    openPositionCount: 2,
    totalEntryNotionalOpenUsd: 1000,
    totalCurrentNotionalOpenUsd: null,
    largestSymbolWeight: 0.3,
    exposureLimitUsage: 0.5,
  });
  assert.equal(result.unrealizedPnlUsd, null);
});

// ─── summarizeSimulatedPnl ──────────────────────────────────────────────────

test("summarizeSimulatedPnl: sums realized + unrealized only when both are known", () => {
  const result = summarizeSimulatedPnl({
    realizedPnlUsd: 100,
    unrealizedPnlUsd: -20,
    weightedRealizedReturnPct: 0.1,
    openPositionCount: 1,
    closedPositionCount: 2,
    missingRealizedPnlCount: 0,
    missingUnrealizedPnlCount: 0,
  });
  assert.equal(result.totalSimulatedPnlUsd, 80);
});

test("summarizeSimulatedPnl: total is null (never a partial guess) when either side is missing", () => {
  const result = summarizeSimulatedPnl({
    realizedPnlUsd: 100,
    unrealizedPnlUsd: null,
    weightedRealizedReturnPct: null,
    openPositionCount: 1,
    closedPositionCount: 2,
    missingRealizedPnlCount: 0,
    missingUnrealizedPnlCount: 1,
  });
  assert.equal(result.totalSimulatedPnlUsd, null);
});

// ─── summarizeStrategyAttributionHealth ────────────────────────────────────

test("summarizeStrategyAttributionHealth: not_available with no strategy data at all", () => {
  const result = summarizeStrategyAttributionHealth({
    attributableStrategyCount: 0,
    unlinkedRecordCount: 0,
    historicalRecordCount: 0,
    overallGovernanceCompletenessPct: null,
    totalRealizedPnlUsd: 0,
    totalUnrealizedPnlUsd: 0,
  });
  assert.equal(result.status, "not_available");
});

test("summarizeStrategyAttributionHealth: strong status when completeness is high and nothing is unlinked", () => {
  const result = summarizeStrategyAttributionHealth({
    attributableStrategyCount: 3,
    unlinkedRecordCount: 0,
    historicalRecordCount: 0,
    overallGovernanceCompletenessPct: 1,
    totalRealizedPnlUsd: 500,
    totalUnrealizedPnlUsd: 20,
  });
  assert.equal(result.status, "strong");
});

// ─── summarizeSignalCohortHealth ───────────────────────────────────────────

test("summarizeSignalCohortHealth: not_available with zero signals", () => {
  const result = summarizeSignalCohortHealth({
    totalSignals: 0,
    eligibleSignals: 0,
    convertedSignals: 0,
    notConvertedSignals: 0,
    submittedReviews: 0,
    approvedReviews: 0,
    rejectedReviews: 0,
    openedPositions: 0,
    openPositions: 0,
    closedPositions: 0,
    incompleteOutcomeCount: 0,
    historicalRecordCount: 0,
    overallSourceChainCompletenessPct: null,
  });
  assert.equal(result.status, "not_available");
});

test("summarizeSignalCohortHealth: needs_review when incomplete outcomes exist", () => {
  const result = summarizeSignalCohortHealth({
    totalSignals: 10,
    eligibleSignals: 8,
    convertedSignals: 5,
    notConvertedSignals: 3,
    submittedReviews: 5,
    approvedReviews: 4,
    rejectedReviews: 1,
    openedPositions: 4,
    openPositions: 1,
    closedPositions: 3,
    incompleteOutcomeCount: 2,
    historicalRecordCount: 0,
    overallSourceChainCompletenessPct: 0.95,
  });
  assert.equal(result.status, "needs_review");
});

// ─── buildGovernanceGapRows ─────────────────────────────────────────────────

function gapInput(overrides = {}) {
  return {
    paperOnlyBoundary: {
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
    },
    unlinkedSignalCount: 0,
    unlinkedDraftCount: 0,
    unlinkedDecisionCount: 0,
    unlinkedPositionCount: 0,
    historicalClosedPositionCount: 0,
    closedPositionsMissingCloseReviewId: 0,
    closedPositionsMissingCloseAudit: 0,
    openPositionsMissingValuation: 0,
    strategyAttributionGapCount: 0,
    signalCohortGapCount: 0,
    ...overrides,
  };
}

test("buildGovernanceGapRows: paper-only boundary row is info (not critical) when all safety flags are intact", () => {
  const rows = buildGovernanceGapRows(gapInput());
  const boundaryRow = rows.find((r) => r.id === "paper_only_boundary");
  assert.equal(boundaryRow.severity, "info");
  assert.equal(boundaryRow.count, 0);
});

test("buildGovernanceGapRows: paper-only boundary row becomes critical if a safety flag ever breaks", () => {
  const rows = buildGovernanceGapRows(gapInput({ paperOnlyBoundary: { ...gapInput().paperOnlyBoundary, brokerConnected: true } }));
  const boundaryRow = rows.find((r) => r.id === "paper_only_boundary");
  assert.equal(boundaryRow.severity, "critical");
  assert.equal(boundaryRow.count, 1);
});

test("buildGovernanceGapRows: closed positions missing close audit evidence is high severity", () => {
  const rows = buildGovernanceGapRows(gapInput({ closedPositionsMissingCloseAudit: 2 }));
  const row = rows.find((r) => r.id === "closed_missing_close_audit");
  assert.equal(row.severity, "high");
  assert.equal(row.count, 2);
});

test("buildGovernanceGapRows: historical closed positions are always info severity — never penalized", () => {
  const rows = buildGovernanceGapRows(gapInput({ historicalClosedPositionCount: 5 }));
  const row = rows.find((r) => r.id === "historical_closed_positions");
  assert.equal(row.severity, "info");
  assert.equal(row.count, 5);
});

test("buildGovernanceGapRows: never proposes remediation — no row includes an action field", () => {
  const rows = buildGovernanceGapRows(gapInput());
  for (const row of rows) {
    assert.ok(!("action" in row));
    assert.ok(!("remediation" in row));
  }
});

// ─── buildMvpIntegrationReadinessChecklist ─────────────────────────────────

function checklistInput(overrides = {}) {
  return {
    paperOnlyBoundary: gapInput().paperOnlyBoundary,
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
    criticalGapCount: 0,
    ...overrides,
  };
}

test("buildMvpIntegrationReadinessChecklist: all pass when every boundary is intact and no critical gaps exist", () => {
  const checklist = buildMvpIntegrationReadinessChecklist(checklistInput());
  const boundaryItem = checklist.find((i) => i.key === "paper_only_boundary_intact");
  assert.equal(boundaryItem.status, "pass");
  const criticalItem = checklist.find((i) => i.key === "no_critical_governance_gaps");
  assert.equal(criticalItem.status, "pass");
});

test("buildMvpIntegrationReadinessChecklist: fails the boundary item when a safety flag breaks", () => {
  const checklist = buildMvpIntegrationReadinessChecklist(checklistInput({ paperOnlyBoundary: { ...checklistInput().paperOnlyBoundary, realExecutionLocked: false } }));
  const boundaryItem = checklist.find((i) => i.key === "paper_only_boundary_intact");
  assert.equal(boundaryItem.status, "fail");
});

test("buildMvpIntegrationReadinessChecklist: reports tests/build/lint/artifact items as not_available (never guessed)", () => {
  const checklist = buildMvpIntegrationReadinessChecklist(checklistInput());
  for (const key of ["tests_passing", "build_passing", "safety_grep_clean", "unrelated_artifacts_excluded"]) {
    const item = checklist.find((i) => i.key === key);
    assert.ok(item, `missing checklist item: ${key}`);
    assert.equal(item.status, "not_available");
  }
});

test("buildMvpIntegrationReadinessChecklist: never claims live-trading/broker/execution readiness in any evidence string", () => {
  const checklist = buildMvpIntegrationReadinessChecklist(checklistInput());
  for (const item of checklist) {
    assert.doesNotMatch(item.evidence, /ready for live trading|broker ready|execution ready|live execution ready/i);
    assert.doesNotMatch(item.label, /ready for live trading|broker ready|execution ready|live execution ready/i);
  }
});
