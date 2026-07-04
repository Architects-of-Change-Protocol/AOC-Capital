// ─── AOC Capital Closed Position Performance & Realized P&L Reporting v1
// (PR #18) — Pure Function Tests ─────────────────────────────────────────────
// getClosedPositionPerformance() is I/O-heavy (talks to Supabase) and this
// codebase has no live-Supabase test harness for that kind of module (same
// rationale as tests/aoc-capital-position-detail-service.test.mjs). Every
// other export in closed-position-performance-service.ts is a pure,
// deterministic, I/O-free function — fully unit-testable here.

import { test } from "node:test";
import assert from "node:assert/strict";

const {
  deriveRealizedPnl,
  deriveRealizedReturn,
  classifyClosedPositionOutcome,
  summarizeWinLossStats,
  summarizeRealizedVsUnrealized,
  deriveGovernanceEvidenceStatus,
  buildClosedPositionRows,
  groupClosedPerformanceBySymbol,
  groupClosedPerformanceBySource,
} = await import("../src/lib/capital/closed-position-performance-service.ts");

// ─── deriveRealizedPnl ────────────────────────────────────────────────────────

test("deriveRealizedPnl: uses stored realized_pnl_usd when available", () => {
  assert.equal(deriveRealizedPnl({ realizedPnlUsd: 42, closeNotionalUsd: 1000, entryNotionalUsd: 900 }), 42);
});

test("deriveRealizedPnl: falls back to close_notional_usd - entry_notional_usd when stored value missing", () => {
  assert.equal(deriveRealizedPnl({ realizedPnlUsd: null, closeNotionalUsd: 1100, entryNotionalUsd: 1000 }), 100);
});

test("deriveRealizedPnl: returns null when close_notional_usd missing and no stored value", () => {
  assert.equal(deriveRealizedPnl({ realizedPnlUsd: null, closeNotionalUsd: null, entryNotionalUsd: 1000 }), null);
});

test("deriveRealizedPnl: returns null when entry_notional_usd missing and no stored value", () => {
  assert.equal(deriveRealizedPnl({ realizedPnlUsd: null, closeNotionalUsd: 1100, entryNotionalUsd: null }), null);
});

test("deriveRealizedPnl: handles zero P&L", () => {
  assert.equal(deriveRealizedPnl({ realizedPnlUsd: 0, closeNotionalUsd: 1000, entryNotionalUsd: 1000 }), 0);
});

test("deriveRealizedPnl: handles negative P&L", () => {
  assert.equal(deriveRealizedPnl({ realizedPnlUsd: -50, closeNotionalUsd: 950, entryNotionalUsd: 1000 }), -50);
});

test("deriveRealizedPnl: never substitutes current_notional_usd — only close_notional_usd is an accepted fallback input", () => {
  // The function signature has no currentNotionalUsd field at all — passing
  // it through would be a type error, which is itself the safety guarantee.
  const result = deriveRealizedPnl({ realizedPnlUsd: null, closeNotionalUsd: null, entryNotionalUsd: 1000 });
  assert.equal(result, null);
});

// ─── deriveRealizedReturn ─────────────────────────────────────────────────────

test("deriveRealizedReturn: uses stored realized_pnl_pct when available", () => {
  assert.equal(deriveRealizedReturn({ realizedPnlPct: 0.05, realizedPnlUsd: 100, entryNotionalUsd: 1000 }), 0.05);
});

test("deriveRealizedReturn: falls back to realizedPnlUsd / entryNotionalUsd", () => {
  assert.equal(deriveRealizedReturn({ realizedPnlPct: null, realizedPnlUsd: 50, entryNotionalUsd: 500 }), 0.1);
});

test("deriveRealizedReturn: returns null when entryNotionalUsd is zero", () => {
  assert.equal(deriveRealizedReturn({ realizedPnlPct: null, realizedPnlUsd: 50, entryNotionalUsd: 0 }), null);
});

test("deriveRealizedReturn: returns null when entryNotionalUsd is negative", () => {
  assert.equal(deriveRealizedReturn({ realizedPnlPct: null, realizedPnlUsd: 50, entryNotionalUsd: -10 }), null);
});

test("deriveRealizedReturn: returns null when realizedPnlUsd is unavailable", () => {
  assert.equal(deriveRealizedReturn({ realizedPnlPct: null, realizedPnlUsd: null, entryNotionalUsd: 1000 }), null);
});

// ─── classifyClosedPositionOutcome ────────────────────────────────────────────

test("classifyClosedPositionOutcome: winner", () => {
  assert.equal(classifyClosedPositionOutcome(10), "winner");
});

test("classifyClosedPositionOutcome: loser", () => {
  assert.equal(classifyClosedPositionOutcome(-10), "loser");
});

test("classifyClosedPositionOutcome: flat", () => {
  assert.equal(classifyClosedPositionOutcome(0), "flat");
});

test("classifyClosedPositionOutcome: unknown when null", () => {
  assert.equal(classifyClosedPositionOutcome(null), "unknown");
});

// ─── summarizeWinLossStats ────────────────────────────────────────────────────

function outcomeRow(realizedPnlUsd) {
  return { realizedPnlUsd, outcome: classifyClosedPositionOutcome(realizedPnlUsd) };
}

test("summarizeWinLossStats: counts winners/losers/flat/unknown", () => {
  const rows = [outcomeRow(10), outcomeRow(20), outcomeRow(-5), outcomeRow(0), outcomeRow(null)];
  const stats = summarizeWinLossStats(rows);
  assert.equal(stats.winners, 2);
  assert.equal(stats.losers, 1);
  assert.equal(stats.flat, 1);
  assert.equal(stats.unknown, 1);
});

test("summarizeWinLossStats: win rate and loss rate exclude unknown from the denominator", () => {
  const rows = [outcomeRow(10), outcomeRow(-5), outcomeRow(null), outcomeRow(null)];
  const stats = summarizeWinLossStats(rows);
  assert.equal(stats.winRate, 0.5);
  assert.equal(stats.lossRate, 0.5);
});

test("summarizeWinLossStats: average winner and loser P&L", () => {
  const rows = [outcomeRow(10), outcomeRow(30), outcomeRow(-10), outcomeRow(-20)];
  const stats = summarizeWinLossStats(rows);
  assert.equal(stats.averageWinnerPnlUsd, 20);
  assert.equal(stats.averageLoserPnlUsd, -15);
});

test("summarizeWinLossStats: payoff ratio computed when safe", () => {
  const rows = [outcomeRow(20), outcomeRow(-10)];
  const stats = summarizeWinLossStats(rows);
  assert.equal(stats.payoffRatio, 2);
});

test("summarizeWinLossStats: payoff ratio is null when there are no winners", () => {
  const rows = [outcomeRow(-10), outcomeRow(-20)];
  const stats = summarizeWinLossStats(rows);
  assert.equal(stats.payoffRatio, null);
});

test("summarizeWinLossStats: payoff ratio is null when there are no losers", () => {
  const rows = [outcomeRow(10), outcomeRow(20)];
  const stats = summarizeWinLossStats(rows);
  assert.equal(stats.payoffRatio, null);
});

test("summarizeWinLossStats: rates are null when every row is unknown", () => {
  const rows = [outcomeRow(null), outcomeRow(null)];
  const stats = summarizeWinLossStats(rows);
  assert.equal(stats.winRate, null);
  assert.equal(stats.lossRate, null);
});

// ─── summarizeRealizedVsUnrealized ────────────────────────────────────────────

test("summarizeRealizedVsUnrealized: sums realized and unrealized P&L and marks complete", () => {
  const openPositions = [
    { entryNotionalUsd: 1000, currentNotionalUsd: 1100 },
    { entryNotionalUsd: 500, currentNotionalUsd: 480 },
  ];
  const closedRows = [{ realizedPnlUsd: 50 }, { realizedPnlUsd: -20 }];
  const split = summarizeRealizedVsUnrealized(openPositions, closedRows);
  assert.equal(split.unrealizedPnlUsd, 80);
  assert.equal(split.realizedPnlUsd, 30);
  assert.equal(split.totalPnlUsd, 110);
  assert.equal(split.availability, "complete");
});

test("summarizeRealizedVsUnrealized: handles missing open valuation as partial", () => {
  const openPositions = [{ entryNotionalUsd: 1000, currentNotionalUsd: null }];
  const closedRows = [{ realizedPnlUsd: 50 }];
  const split = summarizeRealizedVsUnrealized(openPositions, closedRows);
  assert.equal(split.unrealizedPnlUsd, 0);
  assert.equal(split.realizedPnlUsd, 50);
  assert.equal(split.totalPnlUsd, null);
  assert.equal(split.availability, "partial");
});

test("summarizeRealizedVsUnrealized: handles missing closed realized P&L as partial", () => {
  const openPositions = [{ entryNotionalUsd: 1000, currentNotionalUsd: 1050 }];
  const closedRows = [{ realizedPnlUsd: null }];
  const split = summarizeRealizedVsUnrealized(openPositions, closedRows);
  assert.equal(split.realizedPnlUsd, 0);
  assert.equal(split.unrealizedPnlUsd, 50);
  assert.equal(split.totalPnlUsd, null);
  assert.equal(split.availability, "partial");
});

test("summarizeRealizedVsUnrealized: not_available when nothing is known", () => {
  const split = summarizeRealizedVsUnrealized([{ entryNotionalUsd: 1000, currentNotionalUsd: null }], [{ realizedPnlUsd: null }]);
  assert.equal(split.availability, "not_available");
  assert.equal(split.totalPnlUsd, null);
});

test("summarizeRealizedVsUnrealized: complete (trivially) when there is no open or closed data at all", () => {
  const split = summarizeRealizedVsUnrealized([], []);
  assert.equal(split.availability, "complete");
  assert.equal(split.totalPnlUsd, 0);
});

// ─── deriveGovernanceEvidenceStatus ───────────────────────────────────────────

test("deriveGovernanceEvidenceStatus: complete when close_review_id + both audit events exist", () => {
  const status = deriveGovernanceEvidenceStatus({ hasCloseReviewId: true, hasApprovedAudit: true, hasClosedAudit: true });
  assert.equal(status, "complete");
});

test("deriveGovernanceEvidenceStatus: missing when none exist", () => {
  const status = deriveGovernanceEvidenceStatus({ hasCloseReviewId: false, hasApprovedAudit: false, hasClosedAudit: false });
  assert.equal(status, "missing");
});

test("deriveGovernanceEvidenceStatus: partial when only one marker exists (historical/legacy-shaped)", () => {
  const status = deriveGovernanceEvidenceStatus({ hasCloseReviewId: true, hasApprovedAudit: false, hasClosedAudit: false });
  assert.equal(status, "partial");
});

test("deriveGovernanceEvidenceStatus: partial when two of three markers exist", () => {
  const status = deriveGovernanceEvidenceStatus({ hasCloseReviewId: true, hasApprovedAudit: true, hasClosedAudit: false });
  assert.equal(status, "partial");
});

// ─── buildClosedPositionRows ───────────────────────────────────────────────────

function baseRawPosition(overrides = {}) {
  return {
    id: "pos-1",
    symbol: "AAPL",
    quantity: 10,
    status: "closed",
    openedAt: "2026-01-01T00:00:00.000Z",
    closedAt: "2026-01-06T00:00:00.000Z",
    entryPriceUsd: 100,
    closePriceUsd: 110,
    entryNotionalUsd: 1000,
    closeNotionalUsd: 1100,
    realizedPnlUsd: 100,
    realizedPnlPct: 0.1,
    closeReviewId: "review-1",
    tradeIntentId: "intent-1",
    ...overrides,
  };
}

test("buildClosedPositionRows: normalizes a closed row and computes holding period", () => {
  const rows = buildClosedPositionRows({
    positions: [baseRawPosition()],
    tradeIntentsById: new Map(),
    signalsById: new Map(),
    closeReviewPositionIds: new Set(["pos-1"]),
    auditFlagsByPositionId: new Map([["pos-1", { hasApprovedAudit: true, hasClosedAudit: true }]]),
  });

  assert.equal(rows.length, 1);
  const row = rows[0];
  assert.equal(row.id, "pos-1");
  assert.equal(row.realizedPnlUsd, 100);
  assert.equal(row.realizedPnlPct, 0.1);
  assert.equal(row.outcome, "winner");
  assert.equal(row.holdingPeriodDays, 5);
  assert.equal(row.detailHref, "/capital/positions/pos-1");
  assert.equal(row.governanceEvidenceStatus, "complete");
  assert.equal(row.sourceChainStatus, "unlinked");
});

test("buildClosedPositionRows: skips rows whose status is not closed", () => {
  const rows = buildClosedPositionRows({
    positions: [baseRawPosition({ status: "open", closedAt: null })],
    tradeIntentsById: new Map(),
    signalsById: new Map(),
    closeReviewPositionIds: new Set(),
    auditFlagsByPositionId: new Map(),
  });
  assert.equal(rows.length, 0);
});

test("buildClosedPositionRows: handles missing realized figures without guessing", () => {
  const rows = buildClosedPositionRows({
    positions: [baseRawPosition({ realizedPnlUsd: null, realizedPnlPct: null, closeNotionalUsd: null })],
    tradeIntentsById: new Map(),
    signalsById: new Map(),
    closeReviewPositionIds: new Set(),
    auditFlagsByPositionId: new Map(),
  });
  assert.equal(rows[0].realizedPnlUsd, null);
  assert.equal(rows[0].realizedPnlPct, null);
  assert.equal(rows[0].outcome, "unknown");
});

test("buildClosedPositionRows: marks governance evidence missing for legacy-shaped closed positions", () => {
  const rows = buildClosedPositionRows({
    positions: [baseRawPosition({ closeReviewId: null })],
    tradeIntentsById: new Map(),
    signalsById: new Map(),
    closeReviewPositionIds: new Set(),
    auditFlagsByPositionId: new Map(),
  });
  assert.equal(rows[0].closeReviewId, null);
  assert.equal(rows[0].governanceEvidenceStatus, "missing");
});

test("buildClosedPositionRows: resolves a complete source chain from trade intent + signal", () => {
  const rows = buildClosedPositionRows({
    positions: [baseRawPosition()],
    tradeIntentsById: new Map([["intent-1", { id: "intent-1", source: "signal_recommendation", paperSignalRecommendationId: "signal-1" }]]),
    signalsById: new Map([["signal-1", { id: "signal-1", strategyKey: "momentum-v1", strategyName: "Momentum v1" }]]),
    closeReviewPositionIds: new Set(),
    auditFlagsByPositionId: new Map(),
  });
  assert.equal(rows[0].sourceChainStatus, "complete");
  assert.equal(rows[0].sourceStrategyId, "momentum-v1");
  assert.equal(rows[0].sourceStrategyName, "Momentum v1");
  assert.equal(rows[0].signalId, "signal-1");
});

test("buildClosedPositionRows: partial source chain when the trade intent points at a signal that never resolved", () => {
  const rows = buildClosedPositionRows({
    positions: [baseRawPosition()],
    tradeIntentsById: new Map([["intent-1", { id: "intent-1", source: "signal_recommendation", paperSignalRecommendationId: "signal-missing" }]]),
    signalsById: new Map(),
    closeReviewPositionIds: new Set(),
    auditFlagsByPositionId: new Map(),
  });
  assert.equal(rows[0].sourceChainStatus, "partial");
  assert.equal(rows[0].sourceStrategyId, null);
});

test("buildClosedPositionRows: unlinked when the draft was manual (not sourced from a signal)", () => {
  const rows = buildClosedPositionRows({
    positions: [baseRawPosition()],
    tradeIntentsById: new Map([["intent-1", { id: "intent-1", source: "manual", paperSignalRecommendationId: null }]]),
    signalsById: new Map(),
    closeReviewPositionIds: new Set(),
    auditFlagsByPositionId: new Map(),
  });
  assert.equal(rows[0].sourceChainStatus, "unlinked");
  assert.equal(rows[0].sourceStrategyId, null);
  assert.equal(rows[0].sourceStrategyName, null);
});

// ─── groupClosedPerformanceBySymbol ───────────────────────────────────────────

test("groupClosedPerformanceBySymbol: groups, sums, and sorts by total realized P&L descending", () => {
  const rows = buildClosedPositionRows({
    positions: [
      baseRawPosition({ id: "a", symbol: "AAPL", realizedPnlUsd: 10, realizedPnlPct: 0.01 }),
      baseRawPosition({ id: "b", symbol: "AAPL", realizedPnlUsd: 20, realizedPnlPct: 0.02 }),
      baseRawPosition({ id: "c", symbol: "MSFT", realizedPnlUsd: 100, realizedPnlPct: 0.1 }),
    ],
    tradeIntentsById: new Map(),
    signalsById: new Map(),
    closeReviewPositionIds: new Set(),
    auditFlagsByPositionId: new Map(),
  });

  const groups = groupClosedPerformanceBySymbol(rows);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].symbol, "MSFT");
  assert.equal(groups[0].totalRealizedPnlUsd, 100);
  assert.equal(groups[1].symbol, "AAPL");
  assert.equal(groups[1].closedPositionsCount, 2);
  assert.equal(groups[1].totalRealizedPnlUsd, 30);
  assert.equal(groups[1].averageRealizedReturnPct, 0.015);
});

test("groupClosedPerformanceBySymbol: governance completeness reflects per-symbol evidence", () => {
  const rows = buildClosedPositionRows({
    positions: [baseRawPosition({ id: "a", symbol: "AAPL", closeReviewId: "review-a" }), baseRawPosition({ id: "b", symbol: "AAPL", closeReviewId: null })],
    tradeIntentsById: new Map(),
    signalsById: new Map(),
    closeReviewPositionIds: new Set(["a"]),
    auditFlagsByPositionId: new Map([["a", { hasApprovedAudit: true, hasClosedAudit: true }]]),
  });
  const groups = groupClosedPerformanceBySymbol(rows);
  assert.equal(groups[0].governanceCompleteness, "partial");
});

// ─── groupClosedPerformanceBySource ───────────────────────────────────────────

test("groupClosedPerformanceBySource: attributes only fully-traceable rows to a strategy", () => {
  const rows = buildClosedPositionRows({
    positions: [
      baseRawPosition({ id: "a", symbol: "AAPL", realizedPnlUsd: 10, tradeIntentId: "intent-1" }),
      baseRawPosition({ id: "b", symbol: "MSFT", realizedPnlUsd: 30, tradeIntentId: "intent-manual" }),
    ],
    tradeIntentsById: new Map([
      ["intent-1", { id: "intent-1", source: "signal_recommendation", paperSignalRecommendationId: "signal-1" }],
      ["intent-manual", { id: "intent-manual", source: "manual", paperSignalRecommendationId: null }],
    ]),
    signalsById: new Map([["signal-1", { id: "signal-1", strategyKey: "momentum-v1", strategyName: "Momentum v1" }]]),
    closeReviewPositionIds: new Set(),
    auditFlagsByPositionId: new Map(),
  });

  const groups = groupClosedPerformanceBySource(rows);
  assert.equal(groups.length, 2);
  const strategyGroup = groups.find((g) => g.sourceStrategyId === "momentum-v1");
  const unlinkedGroup = groups.find((g) => g.sourceStrategyId === null);
  assert.ok(strategyGroup);
  assert.equal(strategyGroup.traceabilityStatus, "complete");
  assert.equal(strategyGroup.closedPositionsCount, 1);
  assert.ok(unlinkedGroup);
  assert.equal(unlinkedGroup.traceabilityStatus, "unlinked");
  assert.equal(unlinkedGroup.closedPositionsCount, 1);
});

test("groupClosedPerformanceBySource: never invents attribution from the symbol alone", () => {
  const rows = buildClosedPositionRows({
    positions: [baseRawPosition({ id: "a", symbol: "AAPL" }), baseRawPosition({ id: "b", symbol: "AAPL", tradeIntentId: null })],
    tradeIntentsById: new Map(),
    signalsById: new Map(),
    closeReviewPositionIds: new Set(),
    auditFlagsByPositionId: new Map(),
  });
  const groups = groupClosedPerformanceBySource(rows);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].sourceStrategyId, null);
  assert.equal(groups[0].traceabilityStatus, "unlinked");
});
