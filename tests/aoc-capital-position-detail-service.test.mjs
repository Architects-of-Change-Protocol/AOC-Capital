// ─── AOC Capital Position Detail & Lifecycle Timeline v1 (PR #16) — Pure
// Function Tests ─────────────────────────────────────────────────────────────
// derivePositionPnl(), deriveTraceabilityStatus(), buildPositionLifecycleTimeline(),
// summarizeAuditEvent(), and deriveCloseReviewEligibility() (added by PR #17,
// Governed Close Position Review) are pure, I/O-free functions
// (src/lib/capital/position-detail-service.ts) — fully unit-testable the same
// way groupPositionsBySymbol() and deriveAllocationSummary() are tested in
// tests/aoc-capital-allocation-exposure-service.test.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";

const {
  derivePositionPnl,
  deriveTraceabilityStatus,
  buildPositionLifecycleTimeline,
  summarizeAuditEvent,
  extractGovernanceFlags,
  deriveCloseReviewEligibility,
  TRACEABILITY_COMPLETE_MESSAGE,
  TRACEABILITY_PARTIAL_MESSAGE,
  TRACEABILITY_POSITION_ONLY_MESSAGE,
} = await import("../src/lib/capital/position-detail-service.ts");

// ─── derivePositionPnl ────────────────────────────────────────────────────────

test("derivePositionPnl: open position with unrealized gain", () => {
  const result = derivePositionPnl({ status: "open", entryNotionalUsd: 1000, currentNotionalUsd: 1100, realizedPnlUsd: null });
  assert.equal(result.unrealizedPnlUsd, 100);
  assert.equal(result.totalPnlUsd, 100);
  assert.equal(result.pnlStatus, "gain");
});

test("derivePositionPnl: open position with unrealized loss", () => {
  const result = derivePositionPnl({ status: "open", entryNotionalUsd: 1000, currentNotionalUsd: 900, realizedPnlUsd: null });
  assert.equal(result.unrealizedPnlUsd, -100);
  assert.equal(result.totalPnlUsd, -100);
  assert.equal(result.pnlStatus, "loss");
});

test("derivePositionPnl: open position with flat P&L", () => {
  const result = derivePositionPnl({ status: "open", entryNotionalUsd: 1000, currentNotionalUsd: 1000, realizedPnlUsd: null });
  assert.equal(result.unrealizedPnlUsd, 0);
  assert.equal(result.pnlStatus, "flat");
});

test("derivePositionPnl: not_available when current notional is missing", () => {
  const result = derivePositionPnl({ status: "open", entryNotionalUsd: 1000, currentNotionalUsd: null, realizedPnlUsd: null });
  assert.equal(result.unrealizedPnlUsd, null);
  assert.equal(result.totalPnlUsd, null);
  assert.equal(result.pnlStatus, "not_available");
});

test("derivePositionPnl: computes unrealized P&L percent", () => {
  const result = derivePositionPnl({ status: "open", entryNotionalUsd: 500, currentNotionalUsd: 550, realizedPnlUsd: null });
  assert.equal(result.unrealizedPnlPct, 0.1);
});

test("derivePositionPnl: divide-by-zero safe when entry notional is zero", () => {
  const result = derivePositionPnl({ status: "open", entryNotionalUsd: 0, currentNotionalUsd: 100, realizedPnlUsd: null });
  assert.equal(result.unrealizedPnlUsd, 100);
  assert.equal(result.unrealizedPnlPct, null);
});

test("derivePositionPnl: closed position uses the stored realized P&L only", () => {
  const result = derivePositionPnl({ status: "closed", entryNotionalUsd: 1000, currentNotionalUsd: 1050, realizedPnlUsd: 50 });
  assert.equal(result.realizedPnlUsd, 50);
  assert.equal(result.totalPnlUsd, 50);
  assert.equal(result.pnlStatus, "gain");
});

test("derivePositionPnl: never infers realized P&L when the stored figure is missing for a closed position", () => {
  const result = derivePositionPnl({ status: "closed", entryNotionalUsd: 1000, currentNotionalUsd: 1050, realizedPnlUsd: null });
  assert.equal(result.realizedPnlUsd, null);
  assert.equal(result.totalPnlUsd, null);
  assert.equal(result.pnlStatus, "not_available");
});

// ─── deriveTraceabilityStatus ─────────────────────────────────────────────────

const COMPLETE_TRACE_INPUT = {
  tradeIntentAvailable: true,
  decisionAvailable: true,
  signalRequired: true,
  signalAvailable: true,
  strategyAvailable: true,
  auditEventsAvailable: true,
};

test("deriveTraceabilityStatus: complete chain", () => {
  const result = deriveTraceabilityStatus(COMPLETE_TRACE_INPUT);
  assert.equal(result.status, "complete");
  assert.deepEqual(result.missing, []);
  assert.equal(result.message, TRACEABILITY_COMPLETE_MESSAGE);
});

test("deriveTraceabilityStatus: partial chain when an upstream record is missing", () => {
  const result = deriveTraceabilityStatus({ ...COMPLETE_TRACE_INPUT, decisionAvailable: false });
  assert.equal(result.status, "partial");
  assert.ok(result.missing.includes("decision"));
  assert.equal(result.message, TRACEABILITY_PARTIAL_MESSAGE);
});

test("deriveTraceabilityStatus: position_only when the trade intent itself could not be resolved", () => {
  const result = deriveTraceabilityStatus({ ...COMPLETE_TRACE_INPUT, tradeIntentAvailable: false });
  assert.equal(result.status, "position_only");
  assert.ok(result.missing.includes("trade_intent"));
  assert.equal(result.message, TRACEABILITY_POSITION_ONLY_MESSAGE);
});

test("deriveTraceabilityStatus: missing signal for a signal_recommendation-sourced draft is partial", () => {
  const result = deriveTraceabilityStatus({ ...COMPLETE_TRACE_INPUT, signalAvailable: false });
  assert.equal(result.status, "partial");
  assert.ok(result.missing.includes("signal"));
});

test("deriveTraceabilityStatus: signal is not required (and never reported missing) for a non-signal source", () => {
  const result = deriveTraceabilityStatus({
    ...COMPLETE_TRACE_INPUT,
    signalRequired: false,
    signalAvailable: false,
    strategyAvailable: false,
  });
  assert.equal(result.status, "complete");
  assert.ok(!result.missing.includes("signal"));
  assert.ok(!result.missing.includes("strategy"));
});

// ─── buildPositionLifecycleTimeline ───────────────────────────────────────────

const BASE_POSITION = { id: "pos-1", symbol: "BTC-USD", openedAt: "2026-01-03T00:00:00.000Z", closedAt: null, lastMarkedToMarketAt: null };

test("buildPositionLifecycleTimeline: includes position opened", () => {
  const timeline = buildPositionLifecycleTimeline({ strategy: null, signal: null, tradeIntent: null, decision: null, position: BASE_POSITION, auditEvents: [] });
  assert.ok(timeline.some((entry) => entry.kind === "position_opened"));
});

test("buildPositionLifecycleTimeline: includes signal generated when a signal is available", () => {
  const timeline = buildPositionLifecycleTimeline({
    strategy: null,
    signal: { id: "sig-1", symbol: "BTC-USD", action: "paper_buy_candidate", generatedAt: "2026-01-01T00:00:00.000Z" },
    tradeIntent: null,
    decision: null,
    position: BASE_POSITION,
    auditEvents: [],
  });
  assert.ok(timeline.some((entry) => entry.kind === "signal_generated"));
});

test("buildPositionLifecycleTimeline: includes draft created when a trade intent is available", () => {
  const timeline = buildPositionLifecycleTimeline({
    strategy: null,
    signal: null,
    tradeIntent: { id: "intent-1", symbol: "BTC-USD", side: "buy", createdAt: "2026-01-02T00:00:00.000Z" },
    decision: null,
    position: BASE_POSITION,
    auditEvents: [],
  });
  assert.ok(timeline.some((entry) => entry.kind === "draft_created"));
});

test("buildPositionLifecycleTimeline: includes submitted for review from an audit event", () => {
  const timeline = buildPositionLifecycleTimeline({
    strategy: null,
    signal: null,
    tradeIntent: { id: "intent-1", symbol: "BTC-USD", side: "buy", createdAt: "2026-01-02T00:00:00.000Z" },
    decision: null,
    position: BASE_POSITION,
    auditEvents: [
      { id: "audit-1", eventType: "trade_intent_submitted_for_review", subjectType: "trade_intent", subjectId: "intent-1", occurredAt: "2026-01-02T12:00:00.000Z", payload: {} },
    ],
  });
  assert.ok(timeline.some((entry) => entry.kind === "submitted_for_review"));
});

test("buildPositionLifecycleTimeline: includes risk decision when a decision is available", () => {
  const timeline = buildPositionLifecycleTimeline({
    strategy: null,
    signal: null,
    tradeIntent: { id: "intent-1", symbol: "BTC-USD", side: "buy", createdAt: "2026-01-02T00:00:00.000Z" },
    decision: { id: "dec-1", verdict: "approved", createdAt: "2026-01-02T13:00:00.000Z" },
    position: BASE_POSITION,
    auditEvents: [],
  });
  assert.ok(timeline.some((entry) => entry.kind === "risk_decision"));
});

test("buildPositionLifecycleTimeline: includes mark-to-market when lastMarkedToMarketAt is set", () => {
  const timeline = buildPositionLifecycleTimeline({
    strategy: null,
    signal: null,
    tradeIntent: null,
    decision: null,
    position: { ...BASE_POSITION, lastMarkedToMarketAt: "2026-01-04T00:00:00.000Z" },
    auditEvents: [],
  });
  assert.ok(timeline.some((entry) => entry.kind === "marked_to_market"));
});

test("buildPositionLifecycleTimeline: includes closed event when closedAt is set", () => {
  const timeline = buildPositionLifecycleTimeline({
    strategy: null,
    signal: null,
    tradeIntent: null,
    decision: null,
    position: { ...BASE_POSITION, closedAt: "2026-01-05T00:00:00.000Z" },
    auditEvents: [],
  });
  assert.ok(timeline.some((entry) => entry.kind === "position_closed"));
});

test("buildPositionLifecycleTimeline: sorts entries ascending by timestamp", () => {
  const timeline = buildPositionLifecycleTimeline({
    strategy: { id: "strat-1", name: "Momentum", selectedAt: "2026-01-01T00:00:00.000Z" },
    signal: { id: "sig-1", symbol: "BTC-USD", action: "paper_buy_candidate", generatedAt: "2026-01-02T00:00:00.000Z" },
    tradeIntent: { id: "intent-1", symbol: "BTC-USD", side: "buy", createdAt: "2026-01-03T00:00:00.000Z" },
    decision: { id: "dec-1", verdict: "approved", createdAt: "2026-01-04T00:00:00.000Z" },
    position: { ...BASE_POSITION, openedAt: "2026-01-05T00:00:00.000Z", closedAt: "2026-01-06T00:00:00.000Z" },
    auditEvents: [],
  });
  const timestamps = timeline.map((entry) => entry.timestamp);
  const sorted = [...timestamps].sort();
  assert.deepEqual(timestamps, sorted);
});

test("buildPositionLifecycleTimeline: de-duplicates a table-derived draft_created against its audit-ledger echo", () => {
  const timeline = buildPositionLifecycleTimeline({
    strategy: null,
    signal: null,
    tradeIntent: { id: "intent-1", symbol: "BTC-USD", side: "buy", createdAt: "2026-01-02T00:00:00.000Z" },
    decision: null,
    position: BASE_POSITION,
    auditEvents: [{ id: "audit-1", eventType: "trade_intent_created", subjectType: "trade_intent", subjectId: "intent-1", occurredAt: "2026-01-02T00:00:00.000Z", payload: {} }],
  });
  const draftEntries = timeline.filter((entry) => entry.kind === "draft_created");
  assert.equal(draftEntries.length, 1);
});

test("buildPositionLifecycleTimeline: de-duplicates a table-derived position_opened against its audit-ledger echo", () => {
  const timeline = buildPositionLifecycleTimeline({
    strategy: null,
    signal: null,
    tradeIntent: null,
    decision: null,
    position: BASE_POSITION,
    auditEvents: [{ id: "audit-1", eventType: "position_opened", subjectType: "paper_position", subjectId: "pos-1", occurredAt: "2026-01-03T00:00:00.000Z", payload: {} }],
  });
  const openedEntries = timeline.filter((entry) => entry.kind === "position_opened");
  assert.equal(openedEntries.length, 1);
});

// ─── buildPositionLifecycleTimeline: governed close review (PR #17) ─────────

test("buildPositionLifecycleTimeline: recognizes paper_position_close_review_approved as a close_review_approved entry", () => {
  const timeline = buildPositionLifecycleTimeline({
    strategy: null,
    signal: null,
    tradeIntent: null,
    decision: null,
    position: { ...BASE_POSITION, closedAt: "2026-01-06T00:00:00.000Z" },
    auditEvents: [
      {
        id: "audit-review",
        eventType: "paper_position_close_review_approved",
        subjectType: "paper_position",
        subjectId: "pos-1",
        occurredAt: "2026-01-06T00:00:00.000Z",
        payload: { paper_only: true, real_execution_locked: true },
      },
    ],
  });
  assert.ok(timeline.some((entry) => entry.kind === "close_review_approved"));
});

test("buildPositionLifecycleTimeline: recognizes paper_position_closed as a position_closed entry", () => {
  const timeline = buildPositionLifecycleTimeline({
    strategy: null,
    signal: null,
    tradeIntent: null,
    decision: null,
    position: { ...BASE_POSITION, closedAt: "2026-01-06T00:00:00.000Z" },
    auditEvents: [
      {
        id: "audit-closed",
        eventType: "paper_position_closed",
        subjectType: "paper_position",
        subjectId: "pos-1",
        occurredAt: "2026-01-06T00:00:00.000Z",
        payload: { paper_only: true, real_execution_locked: true },
      },
    ],
  });
  const closedEntries = timeline.filter((entry) => entry.kind === "position_closed");
  assert.equal(closedEntries.length, 1);
  assert.equal(closedEntries[0].id, "audit:audit-closed");
});

test("buildPositionLifecycleTimeline: orders the close review before the close event when the review is requested first", () => {
  const timeline = buildPositionLifecycleTimeline({
    strategy: null,
    signal: null,
    tradeIntent: null,
    decision: null,
    position: { ...BASE_POSITION, closedAt: "2026-01-06T00:05:00.000Z" },
    auditEvents: [
      {
        id: "audit-closed",
        eventType: "paper_position_closed",
        subjectType: "paper_position",
        subjectId: "pos-1",
        occurredAt: "2026-01-06T00:05:00.000Z",
        payload: {},
      },
      {
        id: "audit-review",
        eventType: "paper_position_close_review_approved",
        subjectType: "paper_position",
        subjectId: "pos-1",
        occurredAt: "2026-01-06T00:00:00.000Z",
        payload: {},
      },
    ],
  });
  const reviewIndex = timeline.findIndex((entry) => entry.kind === "close_review_approved");
  const closedIndex = timeline.findIndex((entry) => entry.kind === "position_closed");
  assert.ok(reviewIndex >= 0 && closedIndex >= 0);
  assert.ok(reviewIndex < closedIndex, "the close review must appear before the close it approved");
});

test("buildPositionLifecycleTimeline: does not duplicate the close event when both position_closed and paper_position_closed audit events exist for the same position — only one position_closed entry is emitted", () => {
  const timeline = buildPositionLifecycleTimeline({
    strategy: null,
    signal: null,
    tradeIntent: null,
    decision: null,
    position: { ...BASE_POSITION, closedAt: "2026-01-06T00:00:00.000Z" },
    auditEvents: [
      { id: "audit-legacy", eventType: "position_closed", subjectType: "paper_position", subjectId: "pos-1", occurredAt: "2026-01-06T00:00:00.000Z", payload: {} },
      { id: "audit-governed", eventType: "paper_position_closed", subjectType: "paper_position", subjectId: "pos-1", occurredAt: "2026-01-06T00:00:00.000Z", payload: {} },
    ],
  });
  const closedEntries = timeline.filter((entry) => entry.kind === "position_closed");
  assert.equal(closedEntries.length, 1, "only one position_closed timeline entry should ever be shown per position");
});

// ─── summarizeAuditEvent ──────────────────────────────────────────────────────

test("summarizeAuditEvent: maps known event types to a human-readable title", () => {
  const summary = summarizeAuditEvent({ eventType: "position_opened", subjectType: "paper_position", subjectId: "pos-1", payload: { entryPriceUsd: 100 } });
  assert.equal(summary.title, "Paper position opened");
  assert.match(summary.description, /\$100\.00/);
});

test("summarizeAuditEvent: handles an unknown event type with a generic summary", () => {
  const summary = summarizeAuditEvent({ eventType: "advisor_strategy_generated", subjectType: "portfolio", subjectId: "p-1", payload: {} });
  assert.equal(summary.description, "Related governance event recorded.");
});

test("summarizeAuditEvent: extracts governance flags present in the payload", () => {
  const summary = summarizeAuditEvent({
    eventType: "draft_trade_intent_cancelled",
    subjectType: "trade_intent",
    subjectId: "intent-1",
    payload: { paper_only: true, real_execution_locked: true, no_real_execution: true, no_broker_order: true, no_order_placed: true },
  });
  assert.deepEqual(summary.governanceFlags, {
    paperOnly: true,
    realExecutionLocked: true,
    noRealExecution: true,
    noBrokerOrder: true,
    noOrderPlaced: true,
  });
});

test("summarizeAuditEvent: defaults governance flags safely when the payload has none", () => {
  const summary = summarizeAuditEvent({ eventType: "position_marked_to_market", subjectType: "paper_position", subjectId: "pos-1", payload: {} });
  assert.deepEqual(summary.governanceFlags, {
    paperOnly: true,
    realExecutionLocked: true,
    noRealExecution: true,
    noBrokerOrder: true,
    noOrderPlaced: true,
  });
});

// ─── summarizeAuditEvent: governed close review (PR #17) ────────────────────

test("summarizeAuditEvent: maps paper_position_close_review_approved to safe human-readable copy", () => {
  const summary = summarizeAuditEvent({
    eventType: "paper_position_close_review_approved",
    subjectType: "paper_position",
    subjectId: "pos-1",
    payload: { paper_only: true, real_execution_locked: true },
  });
  assert.equal(summary.title, "Paper close review approved");
  assert.equal(summary.description, "Governed paper close review approved closing this simulated position.");
});

test("summarizeAuditEvent: maps paper_position_closed to safe human-readable copy", () => {
  const summary = summarizeAuditEvent({
    eventType: "paper_position_closed",
    subjectType: "paper_position",
    subjectId: "pos-1",
    payload: { paper_only: true, real_execution_locked: true },
  });
  assert.equal(summary.title, "Paper position closed");
  assert.equal(summary.description, "Simulated paper position was closed using stored paper valuation. No real order was placed.");
});

test("summarizeAuditEvent: governance flags are extracted from paper_position_close_review_approved and paper_position_closed payloads", () => {
  const payload = {
    paper_only: true,
    real_execution_locked: true,
    no_real_execution: true,
    no_broker_order: true,
    no_order_placed: true,
  };
  const reviewSummary = summarizeAuditEvent({ eventType: "paper_position_close_review_approved", subjectType: "paper_position", subjectId: "pos-1", payload });
  const closedSummary = summarizeAuditEvent({ eventType: "paper_position_closed", subjectType: "paper_position", subjectId: "pos-1", payload });
  const expectedFlags = { paperOnly: true, realExecutionLocked: true, noRealExecution: true, noBrokerOrder: true, noOrderPlaced: true };
  assert.deepEqual(reviewSummary.governanceFlags, expectedFlags);
  assert.deepEqual(closedSummary.governanceFlags, expectedFlags);
});

test("summarizeAuditEvent: defaults governance flags safely for paper_position_close_review_approved and paper_position_closed when the payload carries none", () => {
  const expectedFlags = { paperOnly: true, realExecutionLocked: true, noRealExecution: true, noBrokerOrder: true, noOrderPlaced: true };
  assert.deepEqual(summarizeAuditEvent({ eventType: "paper_position_close_review_approved", subjectType: "paper_position", subjectId: "pos-1", payload: {} }).governanceFlags, expectedFlags);
  assert.deepEqual(summarizeAuditEvent({ eventType: "paper_position_closed", subjectType: "paper_position", subjectId: "pos-1", payload: {} }).governanceFlags, expectedFlags);
});

test("summarizeAuditEvent: paper_position_close_review_approved and paper_position_closed copy never mentions execution/trading/broker/order-routing", () => {
  const forbidden = /\bexecute\b|trading|broker|order-routing|place an? order|sell now|trade now/i;
  const reviewSummary = summarizeAuditEvent({ eventType: "paper_position_close_review_approved", subjectType: "paper_position", subjectId: "pos-1", payload: {} });
  const closedSummary = summarizeAuditEvent({ eventType: "paper_position_closed", subjectType: "paper_position", subjectId: "pos-1", payload: {} });
  assert.doesNotMatch(reviewSummary.title, forbidden);
  assert.doesNotMatch(reviewSummary.description, forbidden);
  assert.doesNotMatch(closedSummary.title, forbidden);
  assert.doesNotMatch(closedSummary.description, forbidden);
});

test("extractGovernanceFlags: reads camelCase payload keys too", () => {
  const flags = extractGovernanceFlags({ paperOnly: true, realExecutionLocked: true, noRealExecution: true, noBrokerOrder: true, noOrderPlaced: true });
  assert.deepEqual(flags, { paperOnly: true, realExecutionLocked: true, noRealExecution: true, noBrokerOrder: true, noOrderPlaced: true });
});

// ─── deriveCloseReviewEligibility (PR #17) ────────────────────────────────────

const ELIGIBLE_OPEN_POSITION = {
  status: "open",
  currentPriceUsd: 65000,
  currentNotionalUsd: 221,
  entryNotionalUsd: 210.8,
  quantity: 0.0034,
};

test("deriveCloseReviewEligibility: an open position with current price/notional, entry notional, and positive quantity is eligible", () => {
  const result = deriveCloseReviewEligibility(ELIGIBLE_OPEN_POSITION);
  assert.equal(result.eligible, true);
  assert.equal(result.reason, null);
});

test("deriveCloseReviewEligibility: a closed position is not eligible (already_closed)", () => {
  const result = deriveCloseReviewEligibility({ ...ELIGIBLE_OPEN_POSITION, status: "closed" });
  assert.equal(result.eligible, false);
  assert.equal(result.reason, "already_closed");
});

test("deriveCloseReviewEligibility: missing current_price_usd is not eligible (missing_valuation)", () => {
  const result = deriveCloseReviewEligibility({ ...ELIGIBLE_OPEN_POSITION, currentPriceUsd: null });
  assert.equal(result.eligible, false);
  assert.equal(result.reason, "missing_valuation");
});

test("deriveCloseReviewEligibility: missing current_notional_usd is not eligible (missing_valuation)", () => {
  const result = deriveCloseReviewEligibility({ ...ELIGIBLE_OPEN_POSITION, currentNotionalUsd: null });
  assert.equal(result.eligible, false);
  assert.equal(result.reason, "missing_valuation");
});

test("deriveCloseReviewEligibility: missing entry_notional_usd is not eligible (missing_valuation)", () => {
  const result = deriveCloseReviewEligibility({ ...ELIGIBLE_OPEN_POSITION, entryNotionalUsd: null });
  assert.equal(result.eligible, false);
  assert.equal(result.reason, "missing_valuation");
});

test("deriveCloseReviewEligibility: quantity <= 0 is not eligible (missing_valuation)", () => {
  assert.equal(deriveCloseReviewEligibility({ ...ELIGIBLE_OPEN_POSITION, quantity: 0 }).eligible, false);
  assert.equal(deriveCloseReviewEligibility({ ...ELIGIBLE_OPEN_POSITION, quantity: 0 }).reason, "missing_valuation");
  assert.equal(deriveCloseReviewEligibility({ ...ELIGIBLE_OPEN_POSITION, quantity: -1 }).eligible, false);
});

test("deriveCloseReviewEligibility: reports not_open (distinct from already_closed) for any status other than open/closed", () => {
  // deriveCloseReviewEligibility only distinguishes "closed" as its own reason; any other
  // non-"open" status value falls through to the generic not_open branch.
  const result = deriveCloseReviewEligibility({ ...ELIGIBLE_OPEN_POSITION, status: "pending" });
  assert.equal(result.eligible, false);
  assert.equal(result.reason, "not_open");
});

test("deriveCloseReviewEligibility: the eligibility result never carries a message referencing execution/trading/broker", () => {
  const result = deriveCloseReviewEligibility({ ...ELIGIBLE_OPEN_POSITION, status: "closed" });
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /\bexecute\b|trading|broker|sell now|trade now|place an? order/i);
});
