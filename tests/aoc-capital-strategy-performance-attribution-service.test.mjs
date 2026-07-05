// ─── AOC Capital Strategy-Level Performance Attribution v1 (PR #19) — Pure
// Function Tests ─────────────────────────────────────────────────────────────
// getStrategyPerformanceAttribution() is I/O-heavy (talks to Supabase) and
// this codebase has no live-Supabase test harness for that kind of module
// (same rationale as tests/aoc-capital-closed-position-performance-service.
// test.mjs). Every other export in strategy-performance-attribution-service.ts
// is a pure, deterministic, I/O-free function — fully unit-testable here.

import { test } from "node:test";
import assert from "node:assert/strict";

const {
  UNLINKED_STRATEGY_KEY,
  deriveStrategySourceKey,
  deriveRealizedPnl,
  deriveRealizedReturn,
  deriveUnrealizedPnl,
  deriveUnrealizedReturn,
  classifyPositionOutcome,
  summarizeStrategyLifecycleFunnel,
  summarizeStrategyRealizedPerformance,
  summarizeStrategyUnrealizedPerformance,
  summarizeStrategyWinLoss,
  deriveStrategyGovernanceCompleteness,
  groupAttributionByStrategy,
  buildStrategyAttributionRows,
  buildUnlinkedAttributionRows,
} = await import("../src/lib/capital/strategy-performance-attribution-service.ts");

// ─── deriveStrategySourceKey ──────────────────────────────────────────────────

test("deriveStrategySourceKey: returns strategy profile key when present", () => {
  assert.equal(deriveStrategySourceKey({ strategyProfileKey: "momentum-v1", signalStrategyKey: "other" }), "momentum-v1");
});

test("deriveStrategySourceKey: falls back to signal strategy key when no profile key", () => {
  assert.equal(deriveStrategySourceKey({ signalStrategyKey: "momentum-v1" }), "momentum-v1");
});

test("deriveStrategySourceKey: returns unlinked sentinel when no source chain exists", () => {
  assert.equal(deriveStrategySourceKey({}), UNLINKED_STRATEGY_KEY);
  assert.equal(deriveStrategySourceKey({ strategyProfileKey: null, signalStrategyKey: null }), UNLINKED_STRATEGY_KEY);
});

// ─── deriveRealizedPnl ────────────────────────────────────────────────────────

test("deriveRealizedPnl: uses stored realized_pnl_usd when available", () => {
  assert.equal(deriveRealizedPnl({ realizedPnlUsd: 42, closeNotionalUsd: 1000, entryNotionalUsd: 900 }), 42);
});

test("deriveRealizedPnl: falls back to close_notional_usd - entry_notional_usd when stored value missing", () => {
  assert.equal(deriveRealizedPnl({ realizedPnlUsd: null, closeNotionalUsd: 1100, entryNotionalUsd: 1000 }), 100);
});

test("deriveRealizedPnl: returns null when neither source is available", () => {
  assert.equal(deriveRealizedPnl({ realizedPnlUsd: null, closeNotionalUsd: null, entryNotionalUsd: 1000 }), null);
  assert.equal(deriveRealizedPnl({ realizedPnlUsd: null, closeNotionalUsd: 1100, entryNotionalUsd: null }), null);
});

// ─── deriveRealizedReturn ─────────────────────────────────────────────────────

test("deriveRealizedReturn: uses stored realized_pnl_pct when available", () => {
  assert.equal(deriveRealizedReturn({ realizedPnlPct: 0.05, realizedPnlUsd: 100, entryNotionalUsd: 1000 }), 0.05);
});

test("deriveRealizedReturn: falls back to realizedPnlUsd / entryNotionalUsd", () => {
  assert.equal(deriveRealizedReturn({ realizedPnlPct: null, realizedPnlUsd: 50, entryNotionalUsd: 500 }), 0.1);
});

test("deriveRealizedReturn: returns null on zero or negative denominator", () => {
  assert.equal(deriveRealizedReturn({ realizedPnlPct: null, realizedPnlUsd: 50, entryNotionalUsd: 0 }), null);
  assert.equal(deriveRealizedReturn({ realizedPnlPct: null, realizedPnlUsd: 50, entryNotionalUsd: -10 }), null);
});

// ─── deriveUnrealizedPnl ──────────────────────────────────────────────────────

test("deriveUnrealizedPnl: uses current_notional_usd - entry_notional_usd", () => {
  assert.equal(deriveUnrealizedPnl({ currentNotionalUsd: 1100, entryNotionalUsd: 1000 }), 100);
});

test("deriveUnrealizedPnl: null on missing current_notional_usd", () => {
  assert.equal(deriveUnrealizedPnl({ currentNotionalUsd: null, entryNotionalUsd: 1000 }), null);
});

test("deriveUnrealizedPnl: null on missing entry_notional_usd", () => {
  assert.equal(deriveUnrealizedPnl({ currentNotionalUsd: 1100, entryNotionalUsd: null }), null);
});

// ─── deriveUnrealizedReturn ───────────────────────────────────────────────────

test("deriveUnrealizedReturn: divides unrealizedPnlUsd by entryNotionalUsd when positive", () => {
  assert.equal(deriveUnrealizedReturn({ unrealizedPnlUsd: 50, entryNotionalUsd: 500 }), 0.1);
});

test("deriveUnrealizedReturn: null when entryNotionalUsd is zero or missing", () => {
  assert.equal(deriveUnrealizedReturn({ unrealizedPnlUsd: 50, entryNotionalUsd: 0 }), null);
  assert.equal(deriveUnrealizedReturn({ unrealizedPnlUsd: 50, entryNotionalUsd: null }), null);
  assert.equal(deriveUnrealizedReturn({ unrealizedPnlUsd: null, entryNotionalUsd: 500 }), null);
});

// ─── classifyPositionOutcome ──────────────────────────────────────────────────

test("classifyPositionOutcome: winner/loser/flat/unknown", () => {
  assert.equal(classifyPositionOutcome(10), "winner");
  assert.equal(classifyPositionOutcome(-10), "loser");
  assert.equal(classifyPositionOutcome(0), "flat");
  assert.equal(classifyPositionOutcome(null), "unknown");
});

// ─── summarizeStrategyLifecycleFunnel ────────────────────────────────────────

function baseFunnelCounts(overrides = {}) {
  return {
    signalCount: 10,
    eligibleSignalCount: 8,
    convertedSignalCount: 4,
    draftCount: 4,
    cancelledDraftCount: 1,
    submittedDraftCount: 3,
    approvedReviewCount: 2,
    rejectedReviewCount: 1,
    openedPositionCount: 2,
    openPositionCount: 1,
    closedPositionCount: 1,
    closeReviewCount: 1,
    ...overrides,
  };
}

test("summarizeStrategyLifecycleFunnel: computes rates safely when denominators are positive", () => {
  const funnel = summarizeStrategyLifecycleFunnel(baseFunnelCounts());
  assert.equal(funnel.signalToDraftRate, 0.5);
  assert.equal(funnel.draftSubmissionRate, 0.75);
  assert.equal(funnel.reviewApprovalRate, 2 / 3);
  assert.equal(funnel.approvedToPositionRate, 1);
  assert.equal(funnel.positionCloseRate, 0.5);
});

test("summarizeStrategyLifecycleFunnel: returns null (not zero) rates when denominators are zero", () => {
  const funnel = summarizeStrategyLifecycleFunnel(
    baseFunnelCounts({ eligibleSignalCount: 0, draftCount: 0, approvedReviewCount: 0, rejectedReviewCount: 0, openedPositionCount: 0 }),
  );
  assert.equal(funnel.signalToDraftRate, null);
  assert.equal(funnel.draftSubmissionRate, null);
  assert.equal(funnel.reviewApprovalRate, null);
  assert.equal(funnel.approvedToPositionRate, null);
  assert.equal(funnel.positionCloseRate, null);
});

test("summarizeStrategyLifecycleFunnel: never treats missing data as zero — counts pass through unchanged", () => {
  const counts = baseFunnelCounts();
  const funnel = summarizeStrategyLifecycleFunnel(counts);
  for (const key of Object.keys(counts)) {
    assert.equal(funnel[key], counts[key]);
  }
});

// ─── summarizeStrategyWinLoss ─────────────────────────────────────────────────

function outcomeRow(realizedPnlUsd) {
  return { realizedPnlUsd, outcome: classifyPositionOutcome(realizedPnlUsd) };
}

test("summarizeStrategyWinLoss: counts winners/losers/flat/unknown and excludes unknown from rates", () => {
  const rows = [outcomeRow(10), outcomeRow(20), outcomeRow(-5), outcomeRow(0), outcomeRow(null)];
  const stats = summarizeStrategyWinLoss(rows);
  assert.equal(stats.winners, 2);
  assert.equal(stats.losers, 1);
  assert.equal(stats.flat, 1);
  assert.equal(stats.unknown, 1);
  assert.equal(stats.winRate, 0.5);
  assert.equal(stats.lossRate, 0.25);
});

test("summarizeStrategyWinLoss: payoff ratio safe (null with no winners or no losers)", () => {
  assert.equal(summarizeStrategyWinLoss([outcomeRow(-10), outcomeRow(-20)]).payoffRatio, null);
  assert.equal(summarizeStrategyWinLoss([outcomeRow(10), outcomeRow(20)]).payoffRatio, null);
  assert.equal(summarizeStrategyWinLoss([outcomeRow(20), outcomeRow(-10)]).payoffRatio, 2);
});

// ─── summarizeStrategyRealizedPerformance ────────────────────────────────────

test("summarizeStrategyRealizedPerformance: sums, weights, and highlights best/worst/latest", () => {
  const rows = [
    { id: "a", symbol: "AAPL", closedAt: "2026-01-01T00:00:00.000Z", entryNotionalUsd: 1000, closeNotionalUsd: 1100, realizedPnlUsd: 100, realizedPnlPct: 0.1 },
    { id: "b", symbol: "MSFT", closedAt: "2026-01-05T00:00:00.000Z", entryNotionalUsd: 500, closeNotionalUsd: 450, realizedPnlUsd: -50, realizedPnlPct: -0.1 },
  ];
  const summary = summarizeStrategyRealizedPerformance(rows);
  assert.equal(summary.totalRealizedPnlUsd, 50);
  assert.equal(summary.weightedRealizedReturnPct, 50 / 1500);
  assert.equal(summary.bestClosedPosition.symbol, "AAPL");
  assert.equal(summary.worstClosedPosition.symbol, "MSFT");
  assert.equal(summary.latestClosedPosition.symbol, "MSFT");
});

test("summarizeStrategyRealizedPerformance: missing data handled without guessing", () => {
  const rows = [{ id: "a", symbol: "AAPL", closedAt: "2026-01-01T00:00:00.000Z", entryNotionalUsd: 1000, closeNotionalUsd: null, realizedPnlUsd: null, realizedPnlPct: null }];
  const summary = summarizeStrategyRealizedPerformance(rows);
  assert.equal(summary.totalRealizedPnlUsd, 0);
  assert.equal(summary.positionsWithRealizedPnl, 0);
  assert.equal(summary.bestClosedPosition, null);
  assert.equal(summary.averageRealizedReturnPct, null);
});

// ─── summarizeStrategyUnrealizedPerformance ──────────────────────────────────

test("summarizeStrategyUnrealizedPerformance: sums open exposure and unrealized P&L using stored values only", () => {
  const rows = [
    { symbol: "AAPL", entryNotionalUsd: 1000, currentNotionalUsd: 1100 },
    { symbol: "MSFT", entryNotionalUsd: 500, currentNotionalUsd: 480 },
  ];
  const summary = summarizeStrategyUnrealizedPerformance(rows, 1580);
  assert.equal(summary.unrealizedPnlUsd, 80);
  assert.equal(summary.valuationAvailabilityStatus, "complete");
  assert.equal(summary.exposureShareOfPortfolio, 1580 / 1580);
});

test("summarizeStrategyUnrealizedPerformance: partial valuation availability when some current values are missing", () => {
  const rows = [
    { symbol: "AAPL", entryNotionalUsd: 1000, currentNotionalUsd: null },
    { symbol: "MSFT", entryNotionalUsd: 500, currentNotionalUsd: 480 },
  ];
  const summary = summarizeStrategyUnrealizedPerformance(rows);
  assert.equal(summary.valuationAvailabilityStatus, "partial");
  assert.equal(summary.exposureShareOfPortfolio, null);
});

test("summarizeStrategyUnrealizedPerformance: not_available with zero open positions", () => {
  const summary = summarizeStrategyUnrealizedPerformance([]);
  assert.equal(summary.valuationAvailabilityStatus, "not_available");
  assert.equal(summary.unrealizedPnlUsd, 0);
});

// ─── deriveStrategyGovernanceCompleteness ────────────────────────────────────

test("deriveStrategyGovernanceCompleteness: complete when all closed positions have full evidence", () => {
  const result = deriveStrategyGovernanceCompleteness({
    isUnlinkedGroup: false,
    closedPositions: [{ hasCloseReviewId: true, hasApprovedAudit: true, hasClosedAudit: true }],
  });
  assert.equal(result.closeGovernanceCompletenessStatus, "complete");
  assert.equal(result.sourceChainStatus, "complete");
});

test("deriveStrategyGovernanceCompleteness: missing when none have evidence", () => {
  const result = deriveStrategyGovernanceCompleteness({
    isUnlinkedGroup: false,
    closedPositions: [{ hasCloseReviewId: false, hasApprovedAudit: false, hasClosedAudit: false }],
  });
  assert.equal(result.closeGovernanceCompletenessStatus, "missing");
  assert.equal(result.historicalRecordCount, 1);
});

test("deriveStrategyGovernanceCompleteness: partial when mixed, not_applicable when no closed positions", () => {
  const partial = deriveStrategyGovernanceCompleteness({
    isUnlinkedGroup: false,
    closedPositions: [
      { hasCloseReviewId: true, hasApprovedAudit: true, hasClosedAudit: true },
      { hasCloseReviewId: false, hasApprovedAudit: false, hasClosedAudit: false },
    ],
  });
  assert.equal(partial.closeGovernanceCompletenessStatus, "partial");

  const notApplicable = deriveStrategyGovernanceCompleteness({ isUnlinkedGroup: false, closedPositions: [] });
  assert.equal(notApplicable.closeGovernanceCompletenessStatus, "not_applicable");
});

test("deriveStrategyGovernanceCompleteness: unlinked group is always marked unlinked regardless of evidence", () => {
  const result = deriveStrategyGovernanceCompleteness({ isUnlinkedGroup: true, closedPositions: [] });
  assert.equal(result.sourceChainStatus, "unlinked");
});

// ─── groupAttributionByStrategy ──────────────────────────────────────────────

test("groupAttributionByStrategy: groups traceable records by strategy key", () => {
  const groups = groupAttributionByStrategy({
    signals: [{ id: "s1", strategyKey: "momentum-v1", strategyName: "Momentum v1", action: "paper_buy_candidate", status: "active", convertedTradeIntentId: null, generatedAt: "2026-01-01" }],
    tradeIntents: [{ id: "i1", strategyKey: "momentum-v1", strategyName: "Momentum v1", status: "draft", symbol: "BTC-USD", createdAt: "2026-01-01" }],
    decisions: [],
    positions: [],
  });
  assert.equal(groups.size, 1);
  const group = groups.get("momentum-v1");
  assert.ok(group);
  assert.equal(group.isUnlinkedGroup, false);
  assert.equal(group.signals.length, 1);
  assert.equal(group.tradeIntents.length, 1);
});

test("groupAttributionByStrategy: unresolved records land in a single shared unlinked group", () => {
  const groups = groupAttributionByStrategy({
    signals: [],
    tradeIntents: [{ id: "i1", strategyKey: null, strategyName: null, status: "draft", symbol: "BTC-USD", createdAt: "2026-01-01" }],
    decisions: [],
    positions: [{ id: "p1", strategyKey: null, strategyName: null, symbol: "BTC-USD", status: "open", openedAt: "2026-01-01", closedAt: null, entryNotionalUsd: 100, currentNotionalUsd: 100, closeNotionalUsd: null, realizedPnlUsd: null, realizedPnlPct: null, closeReviewId: null, hasApprovedCloseReview: false, hasApprovedCloseReviewAudit: false, hasClosedAudit: false }],
  });
  assert.equal(groups.size, 1);
  const group = groups.get(UNLINKED_STRATEGY_KEY);
  assert.ok(group);
  assert.equal(group.isUnlinkedGroup, true);
  assert.equal(group.tradeIntents.length, 1);
  assert.equal(group.positions.length, 1);
});

test("groupAttributionByStrategy: never infers a strategy key from a symbol", () => {
  const groups = groupAttributionByStrategy({
    signals: [],
    tradeIntents: [
      { id: "i1", strategyKey: null, strategyName: null, status: "draft", symbol: "BTC-USD", createdAt: "2026-01-01" },
      { id: "i2", strategyKey: null, strategyName: null, status: "draft", symbol: "BTC-USD", createdAt: "2026-01-02" },
    ],
    decisions: [],
    positions: [],
  });
  assert.equal(groups.size, 1);
  assert.ok(groups.has(UNLINKED_STRATEGY_KEY));
});

// ─── buildStrategyAttributionRows ────────────────────────────────────────────

test("buildStrategyAttributionRows: normalizes a group into a row with computed metrics and safe hrefs, no action fields", () => {
  const groups = groupAttributionByStrategy({
    signals: [{ id: "s1", strategyKey: "momentum-v1", strategyName: "Momentum v1", action: "paper_buy_candidate", status: "active", convertedTradeIntentId: "i1", generatedAt: "2026-01-01" }],
    tradeIntents: [{ id: "i1", strategyKey: "momentum-v1", strategyName: "Momentum v1", status: "approved", symbol: "BTC-USD", createdAt: "2026-01-01" }],
    decisions: [{ id: "d1", tradeIntentId: "i1", strategyKey: "momentum-v1", strategyName: "Momentum v1", verdict: "approved", decidedAt: "2026-01-02" }],
    positions: [
      {
        id: "p1",
        strategyKey: "momentum-v1",
        strategyName: "Momentum v1",
        symbol: "BTC-USD",
        status: "closed",
        openedAt: "2026-01-02",
        closedAt: "2026-01-06",
        entryNotionalUsd: 1000,
        currentNotionalUsd: null,
        closeNotionalUsd: 1100,
        realizedPnlUsd: 100,
        realizedPnlPct: 0.1,
        closeReviewId: "cr1",
        hasApprovedCloseReview: true,
        hasApprovedCloseReviewAudit: true,
        hasClosedAudit: true,
      },
    ],
  });

  const rows = buildStrategyAttributionRows({ groups, totalPortfolioOpenNotionalUsd: null });
  assert.equal(rows.length, 1);
  const row = rows[0];
  assert.equal(row.strategyKey, "momentum-v1");
  assert.equal(row.strategyName, "Momentum v1");
  assert.equal(row.sourceType, "signal_strategy");
  assert.equal(row.lifecycleFunnel.closedPositionCount, 1);
  assert.equal(row.realizedPerformance.totalRealizedPnlUsd, 100);
  assert.equal(row.governance.closeGovernanceCompletenessStatus, "complete");
  assert.equal(row.detailHrefs.strategyLibrary, "/capital/strategies");
  assert.equal(
    Object.keys(row).some((k) => /action|close|submit|cancel|generate/i.test(k)),
    false,
  );
});

test("buildStrategyAttributionRows: sorts by total realized P&L descending", () => {
  const groups = groupAttributionByStrategy({
    signals: [],
    tradeIntents: [],
    decisions: [],
    positions: [
      {
        id: "p1",
        strategyKey: "low-pnl",
        strategyName: "Low PnL",
        symbol: "BTC-USD",
        status: "closed",
        openedAt: "2026-01-01",
        closedAt: "2026-01-02",
        entryNotionalUsd: 1000,
        currentNotionalUsd: null,
        closeNotionalUsd: 1010,
        realizedPnlUsd: 10,
        realizedPnlPct: 0.01,
        closeReviewId: "cr1",
        hasApprovedCloseReview: true,
        hasApprovedCloseReviewAudit: true,
        hasClosedAudit: true,
      },
      {
        id: "p2",
        strategyKey: "high-pnl",
        strategyName: "High PnL",
        symbol: "ETH-USD",
        status: "closed",
        openedAt: "2026-01-01",
        closedAt: "2026-01-02",
        entryNotionalUsd: 1000,
        currentNotionalUsd: null,
        closeNotionalUsd: 1500,
        realizedPnlUsd: 500,
        realizedPnlPct: 0.5,
        closeReviewId: "cr2",
        hasApprovedCloseReview: true,
        hasApprovedCloseReviewAudit: true,
        hasClosedAudit: true,
      },
    ],
  });

  const rows = buildStrategyAttributionRows({ groups, totalPortfolioOpenNotionalUsd: null });
  assert.equal(rows[0].strategyKey, "high-pnl");
  assert.equal(rows[1].strategyKey, "low-pnl");
});

// ─── buildUnlinkedAttributionRows ─────────────────────────────────────────────

test("buildUnlinkedAttributionRows: counts unlinked records and explains reasons without mutating", () => {
  const groups = groupAttributionByStrategy({
    signals: [],
    tradeIntents: [{ id: "i1", strategyKey: null, strategyName: null, status: "draft", symbol: "BTC-USD", createdAt: "2026-01-01" }],
    decisions: [],
    positions: [],
  });
  const rows = buildUnlinkedAttributionRows({ unlinkedGroup: groups.get(UNLINKED_STRATEGY_KEY), allClosedPositions: [] });
  const draftsRow = rows.find((r) => r.recordType === "drafts");
  assert.equal(draftsRow.count, 1);
  assert.ok(draftsRow.reason.length > 0);
  assert.equal(draftsRow.readable, true);
});

test("buildUnlinkedAttributionRows: reports closed positions missing governance evidence", () => {
  const rows = buildUnlinkedAttributionRows({
    unlinkedGroup: undefined,
    allClosedPositions: [
      { id: "p1", strategyKey: null, strategyName: null, symbol: "BTC-USD", status: "closed", openedAt: "2026-01-01", closedAt: "2026-01-02", entryNotionalUsd: 1000, currentNotionalUsd: null, closeNotionalUsd: 1000, realizedPnlUsd: 0, realizedPnlPct: 0, closeReviewId: null, hasApprovedCloseReview: false, hasApprovedCloseReviewAudit: false, hasClosedAudit: false },
    ],
  });
  const missingGovernanceRow = rows.find((r) => r.recordType === "closed_positions_missing_governance");
  assert.equal(missingGovernanceRow.count, 1);
});
