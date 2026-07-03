// ─── AOC Capital Portfolio Overview Dashboard v1 (PR #14) — Pure Function
// Tests ───────────────────────────────────────────────────────────────────
// getNextPortfolioAction() and derivePortfolioGovernanceStatus() are pure,
// I/O-free functions (src/lib/capital/portfolio-overview-service.ts) — fully
// unit-testable the same way computeStrategyPerformance() and
// computePortfolioSummary() are tested elsewhere in this suite.

import { test } from "node:test";
import assert from "node:assert/strict";

const { getNextPortfolioAction, derivePortfolioGovernanceStatus } = await import("../src/lib/capital/portfolio-overview-service.ts");
const { NAV_LINKS } = await import("../src/lib/capital/portfolio-overview-content.ts");

const BASE_NEXT_ACTION_INPUT = {
  hasSelectedStrategy: true,
  staleSelectedStrategy: false,
  performanceReviewRequired: false,
  convertibleSignalsCount: 0,
  draftCount: 0,
  recentRejectedDecisionsCount: 0,
  openPositionsCount: 0,
  hasAnySignals: true,
};

// ─── getNextPortfolioAction — deterministic priority order ──────────────────

test("no selected strategy -> select_strategy, linking to the Strategy Library", () => {
  const result = getNextPortfolioAction({ ...BASE_NEXT_ACTION_INPUT, hasSelectedStrategy: false });
  assert.equal(result.kind, "select_strategy");
  assert.equal(result.href, NAV_LINKS.strategyLibrary);
});

test("stale selected strategy -> review_strategy, linking to the Strategy Library", () => {
  const result = getNextPortfolioAction({ ...BASE_NEXT_ACTION_INPUT, staleSelectedStrategy: true });
  assert.equal(result.kind, "review_strategy");
  assert.equal(result.href, NAV_LINKS.strategyLibrary);
});

test("performance review required -> review_strategy, linking to Performance Review", () => {
  const result = getNextPortfolioAction({ ...BASE_NEXT_ACTION_INPUT, performanceReviewRequired: true });
  assert.equal(result.kind, "review_strategy");
  assert.equal(result.href, NAV_LINKS.performance);
});

test("convertible signals present -> review_signals, linking to Signals", () => {
  const result = getNextPortfolioAction({ ...BASE_NEXT_ACTION_INPUT, convertibleSignalsCount: 2 });
  assert.equal(result.kind, "review_signals");
  assert.equal(result.href, NAV_LINKS.signals);
});

test("draft intents pending -> review_drafts, linking to Trade Intents", () => {
  const result = getNextPortfolioAction({ ...BASE_NEXT_ACTION_INPUT, draftCount: 1 });
  assert.equal(result.kind, "review_drafts");
  assert.equal(result.href, NAV_LINKS.tradeIntents);
});

test("recent rejected decisions -> review_rejections, linking to Trade Intents", () => {
  const result = getNextPortfolioAction({ ...BASE_NEXT_ACTION_INPUT, recentRejectedDecisionsCount: 1 });
  assert.equal(result.kind, "review_rejections");
  assert.equal(result.href, NAV_LINKS.tradeIntents);
});

test("open positions exist -> monitor_positions, linking to Paper Positions", () => {
  const result = getNextPortfolioAction({ ...BASE_NEXT_ACTION_INPUT, openPositionsCount: 1 });
  assert.equal(result.kind, "monitor_positions");
  assert.equal(result.href, NAV_LINKS.positions);
});

test("strategy selected but no signals generated yet -> generate_signals, linking to Signals", () => {
  const result = getNextPortfolioAction({ ...BASE_NEXT_ACTION_INPUT, hasAnySignals: false });
  assert.equal(result.kind, "generate_signals");
  assert.equal(result.href, NAV_LINKS.signals);
});

test("no condition triggers a required action -> none, with a null href", () => {
  const result = getNextPortfolioAction(BASE_NEXT_ACTION_INPUT);
  assert.equal(result.kind, "none");
  assert.equal(result.href, null);
});

test("priority order: no strategy wins over every other condition", () => {
  const result = getNextPortfolioAction({
    ...BASE_NEXT_ACTION_INPUT,
    hasSelectedStrategy: false,
    staleSelectedStrategy: true,
    performanceReviewRequired: true,
    convertibleSignalsCount: 5,
    draftCount: 5,
    recentRejectedDecisionsCount: 5,
    openPositionsCount: 5,
  });
  assert.equal(result.kind, "select_strategy");
});

test("priority order: stale strategy wins over convertible signals and drafts", () => {
  const result = getNextPortfolioAction({ ...BASE_NEXT_ACTION_INPUT, staleSelectedStrategy: true, convertibleSignalsCount: 3, draftCount: 3 });
  assert.equal(result.kind, "review_strategy");
});

test("every next-action result has a non-empty title and description", () => {
  const inputs = [
    { ...BASE_NEXT_ACTION_INPUT, hasSelectedStrategy: false },
    { ...BASE_NEXT_ACTION_INPUT, staleSelectedStrategy: true },
    { ...BASE_NEXT_ACTION_INPUT, performanceReviewRequired: true },
    { ...BASE_NEXT_ACTION_INPUT, convertibleSignalsCount: 1 },
    { ...BASE_NEXT_ACTION_INPUT, draftCount: 1 },
    { ...BASE_NEXT_ACTION_INPUT, recentRejectedDecisionsCount: 1 },
    { ...BASE_NEXT_ACTION_INPUT, openPositionsCount: 1 },
    { ...BASE_NEXT_ACTION_INPUT, hasAnySignals: false },
    BASE_NEXT_ACTION_INPUT,
  ];
  for (const input of inputs) {
    const result = getNextPortfolioAction(input);
    assert.ok(result.title.length > 0);
    assert.ok(result.description.length > 0);
  }
});

// ─── derivePortfolioGovernanceStatus — deterministic dashboard risk posture ─

const BASE_GOVERNANCE_INPUT = {
  hasSelectedStrategy: true,
  staleSelectedStrategy: false,
  performanceReviewRequired: false,
  draftCount: 0,
  blockedSignalsCount: 0,
  rejectedDecisionsCount: 0,
  strategyHealth: "healthy",
};

test("no selected strategy -> not_ready", () => {
  const result = derivePortfolioGovernanceStatus({ ...BASE_GOVERNANCE_INPUT, hasSelectedStrategy: false });
  assert.equal(result.status, "not_ready");
});

test("blocked signals present -> blocked, even with an otherwise healthy strategy", () => {
  const result = derivePortfolioGovernanceStatus({ ...BASE_GOVERNANCE_INPUT, blockedSignalsCount: 2 });
  assert.equal(result.status, "blocked");
});

test("breached strategy health -> blocked", () => {
  const result = derivePortfolioGovernanceStatus({ ...BASE_GOVERNANCE_INPUT, strategyHealth: "breached" });
  assert.equal(result.status, "blocked");
});

test("stale strategy with no blocking condition -> review_needed", () => {
  const result = derivePortfolioGovernanceStatus({ ...BASE_GOVERNANCE_INPUT, staleSelectedStrategy: true });
  assert.equal(result.status, "review_needed");
});

test("performance review required -> review_needed", () => {
  const result = derivePortfolioGovernanceStatus({ ...BASE_GOVERNANCE_INPUT, performanceReviewRequired: true });
  assert.equal(result.status, "review_needed");
});

test("drafts pending -> review_needed", () => {
  const result = derivePortfolioGovernanceStatus({ ...BASE_GOVERNANCE_INPUT, draftCount: 1 });
  assert.equal(result.status, "review_needed");
});

test("recent rejected decisions -> review_needed", () => {
  const result = derivePortfolioGovernanceStatus({ ...BASE_GOVERNANCE_INPUT, rejectedDecisionsCount: 1 });
  assert.equal(result.status, "review_needed");
});

test("caution strategy health -> review_needed", () => {
  const result = derivePortfolioGovernanceStatus({ ...BASE_GOVERNANCE_INPUT, strategyHealth: "caution" });
  assert.equal(result.status, "review_needed");
});

test("strategy selected, no stale selection, no urgent condition -> healthy", () => {
  const result = derivePortfolioGovernanceStatus(BASE_GOVERNANCE_INPUT);
  assert.equal(result.status, "healthy");
});

test("every governance result includes at least one human-readable reason", () => {
  const inputs = [
    { ...BASE_GOVERNANCE_INPUT, hasSelectedStrategy: false },
    { ...BASE_GOVERNANCE_INPUT, blockedSignalsCount: 1 },
    { ...BASE_GOVERNANCE_INPUT, staleSelectedStrategy: true },
    BASE_GOVERNANCE_INPUT,
  ];
  for (const input of inputs) {
    const result = derivePortfolioGovernanceStatus(input);
    assert.ok(result.reasons.length > 0);
  }
});

test("governance status never uses the phrase 'certified compliant'", () => {
  const inputs = [BASE_GOVERNANCE_INPUT, { ...BASE_GOVERNANCE_INPUT, blockedSignalsCount: 1 }, { ...BASE_GOVERNANCE_INPUT, hasSelectedStrategy: false }];
  for (const input of inputs) {
    const result = derivePortfolioGovernanceStatus(input);
    for (const reason of result.reasons) {
      assert.doesNotMatch(reason, /certified compliant/i);
    }
  }
});
