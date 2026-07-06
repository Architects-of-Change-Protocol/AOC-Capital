// ─── AOC Capital Signal Cohort Outcome Tracking v1 (PR #20) — UI Copy &
// Safety Static Source Checks ────────────────────────────────────────────────
// Mirrors the static-source-check pattern used across this suite (e.g.
// tests/aoc-capital-strategy-performance-attribution-ui.test.mjs) — checks
// the page's content module and page source for required copy and forbidden
// execution/advice language, without rendering the React server component.
// Also checks that the other capital screens this PR is allowed to touch
// (Portfolio Overview, Allocation & Exposure, Closed Performance, Strategy
// Attribution, Position Detail, capital nav layout) link out to the new
// Signal Cohorts page.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const contentTs = fs.readFileSync("src/lib/capital/signal-cohort-outcome-content.ts", "utf8");
const pageTsx = fs.readFileSync("src/app/(protected)/capital/performance/signals/page.tsx", "utf8");
const layoutTsx = fs.readFileSync("src/app/(protected)/capital/layout.tsx", "utf8");
const capitalNavigationTs = fs.readFileSync("src/lib/capital/capital-navigation.ts", "utf8");
const overviewPageTsx = fs.readFileSync("src/app/(protected)/capital/overview/page.tsx", "utf8");
const overviewContentTs = fs.readFileSync("src/lib/capital/portfolio-overview-content.ts", "utf8");
const allocationPageTsx = fs.readFileSync("src/app/(protected)/capital/allocation/page.tsx", "utf8");
const allocationContentTs = fs.readFileSync("src/lib/capital/allocation-exposure-content.ts", "utf8");
const closedPerformancePageTsx = fs.readFileSync("src/app/(protected)/capital/performance/closed/page.tsx", "utf8");
const closedPerformanceContentTs = fs.readFileSync("src/lib/capital/closed-position-performance-content.ts", "utf8");
const strategyAttributionPageTsx = fs.readFileSync("src/app/(protected)/capital/performance/strategies/page.tsx", "utf8");
const strategyAttributionContentTs = fs.readFileSync("src/lib/capital/strategy-performance-attribution-content.ts", "utf8");
const positionDetailPageTsx = fs.readFileSync("src/app/(protected)/capital/positions/[id]/page.tsx", "utf8");
const positionDetailServiceTs = fs.readFileSync("src/lib/capital/position-detail-service.ts", "utf8");

const {
  PAGE_TITLE,
  PAGE_SUBTITLE,
  GOVERNANCE_BADGES,
  HEADER_NOTE,
  EMPTY_NO_SIGNAL_COHORTS,
  SECTION_TITLES,
  NAV_LINKS,
  NAV_LABEL_SIGNAL_COHORTS,
  GOVERNANCE_COMPLETENESS_NOTE,
  UNCONVERTED_INCOMPLETE_HISTORICAL_NOTE,
  READ_ONLY_NOTE,
  LINK_COPY,
} = await import("../src/lib/capital/signal-cohort-outcome-content.ts");

// ─── Required copy ───────────────────────────────────────────────────────────

test("page title is Signal Cohort Outcomes", () => {
  assert.equal(PAGE_TITLE, "Signal Cohort Outcomes");
});

test("subtitle names read-only, governed simulation lifecycle, and real execution locked", () => {
  assert.match(PAGE_SUBTITLE, /read-only/i);
  assert.match(PAGE_SUBTITLE, /governed simulation lifecycle/i);
  assert.match(PAGE_SUBTITLE, /real execution remains locked/i);
});

test("governance badges include the seven required badges", () => {
  for (const badge of ["Paper-only", "Signal cohorts", "Read-only", "Real execution locked", "No broker connected", "No live order routing", "No advice"]) {
    assert.ok(GOVERNANCE_BADGES.includes(badge), `missing badge: ${badge}`);
  }
});

test("header note frames the page as source-chain-only tracking and non-advisory", () => {
  assert.match(HEADER_NOTE, /tracks simulated outcomes/i);
  assert.match(HEADER_NOTE, /does not.*(generate signals|create drafts|place orders|provide investment advice)/i);
});

test("empty state matches approved copy", () => {
  assert.match(EMPTY_NO_SIGNAL_COHORTS, /no signal cohort activity yet/i);
});

test("governance completeness note matches approved copy", () => {
  assert.match(
    GOVERNANCE_COMPLETENESS_NOTE,
    /source-chain completeness measures how much of the simulated paper lifecycle can be traced from a signal recommendation to downstream outcomes/i,
  );
});

test("unconverted/incomplete/historical note matches approved copy", () => {
  assert.match(UNCONVERTED_INCOMPLETE_HISTORICAL_NOTE, /remain visible for historical reporting/i);
  assert.match(UNCONVERTED_INCOMPLETE_HISTORICAL_NOTE, /could not resolve a complete signal outcome chain/i);
});

test("read-only note frames the page as non-advisory", () => {
  assert.match(READ_ONLY_NOTE, /read-only/i);
  assert.match(READ_ONLY_NOTE, /does not provide investment advice/i);
});

test("safe link copy is used instead of any mutation verb", () => {
  assert.equal(LINK_COPY.viewSignals, "View Signals");
  assert.equal(LINK_COPY.viewSourceChain, "View Source Chain");
  assert.equal(LINK_COPY.viewPositions, "View Positions");
  assert.equal(LINK_COPY.viewStrategyAttribution, "View Strategy Attribution");
  assert.equal(LINK_COPY.viewClosedPerformance, "View Closed Performance");
  assert.equal(LINK_COPY.viewDetail, "View Detail");
});

test("all thirteen required section titles are present", () => {
  const titles = Object.values(SECTION_TITLES);
  for (const required of [
    "Signal Cohort Header",
    "Signal Outcome Summary",
    "Signal Lifecycle Funnel",
    "Cohort Conversion Rates",
    "Risk Review Outcomes by Signal Cohort",
    "Position Outcomes by Signal Cohort",
    "Realized P&L by Signal Cohort",
    "Unrealized P&L / Open Exposure by Signal Cohort",
    "Governance & Source-Chain Completeness",
    "Signal Cohort Table",
    "Unconverted / Incomplete / Historical Signals",
    "Methodology & Safety Notes",
    "Related Links",
  ]) {
    assert.ok(titles.includes(required), `missing section title: ${required}`);
  }
});

test("nav links point at existing routes, not invented ones", () => {
  assert.equal(NAV_LINKS.overview, "/capital/overview");
  assert.equal(NAV_LINKS.allocation, "/capital/allocation");
  assert.equal(NAV_LINKS.positions, "/capital/positions");
  assert.equal(NAV_LINKS.signals, "/capital/signals");
  assert.equal(NAV_LINKS.tradeIntents, "/capital/trade-intents");
  assert.equal(NAV_LINKS.strategies, "/capital/strategies");
  assert.equal(NAV_LINKS.performance, "/capital/performance");
  assert.equal(NAV_LINKS.closedPerformance, "/capital/performance/closed");
  assert.equal(NAV_LINKS.strategyAttribution, "/capital/performance/strategies");
  assert.equal(NAV_LINKS.signalCohorts, "/capital/performance/signals");
});

test("nav label constant matches approved copy", () => {
  assert.equal(NAV_LABEL_SIGNAL_COHORTS, "Signal Cohorts");
});

// ─── Page renders every required section ────────────────────────────────────

test("the page imports and renders getSignalCohortOutcomes and requireAuthUser", () => {
  assert.match(pageTsx, /getSignalCohortOutcomes/);
  assert.match(pageTsx, /requireAuthUser/);
});

test("the page references every SECTION_TITLES key", () => {
  for (const key of Object.keys(SECTION_TITLES)) {
    assert.match(pageTsx, new RegExp(`SECTION_TITLES\\.${key}\\b`));
  }
});

test("the page renders the empty state for zero signal cohorts", () => {
  assert.match(pageTsx, /EMPTY_NO_SIGNAL_COHORTS/);
});

test("the page links back to Portfolio Overview and out to Strategy Attribution and Closed Performance", () => {
  assert.match(pageTsx, /NAV_LINKS\.overview/);
  assert.match(pageTsx, /NAV_LINKS\.strategyAttribution/);
  assert.match(pageTsx, /NAV_LINKS\.closedPerformance/);
});

// ─── Forbidden execution/action/advice language ─────────────────────────────

const FORBIDDEN_EXECUTION_COPY =
  /\bExecute\b|Place [Oo]rder|Trade [Nn]ow|Buy [Nn]ow|Sell [Nn]ow|Send to [Bb]roker|Connect [Ee]xchange|Real [Tt]rade|Live [Tt]rade|Fund [Aa]ccount|\bDeposit\b|\bWithdraw\b|Refresh [Vv]aluation|Close [Pp]osition|Request [Cc]lose [Rr]eview|Generate [Ss]ignal|Convert [Ss]ignal|Create [Dd]raft|Submit [Rr]eview|Rebalance|Increase [Aa]llocation|Reduce [Aa]llocation|Trade [Aa]gain|Reopen [Pp]osition/;

const FORBIDDEN_ADVICE_COPY = /Recommended signal|Best signal|Investment performance|\bAlpha\b|Real performance|You should use this signal|\bBuy\b|\bSell\b/i;

test("the signal-cohort content module never uses forbidden execution or advice copy", () => {
  assert.doesNotMatch(contentTs, FORBIDDEN_EXECUTION_COPY);
  assert.doesNotMatch(contentTs, FORBIDDEN_ADVICE_COPY);
});

test("the signal-cohort page never uses forbidden execution or advice copy", () => {
  assert.doesNotMatch(pageTsx, FORBIDDEN_EXECUTION_COPY);
  assert.doesNotMatch(pageTsx, FORBIDDEN_ADVICE_COPY);
});

test("the page never recommends a signal or provides investment advice", () => {
  assert.doesNotMatch(contentTs, /recommend(ed|s)? signal/i);
  assert.doesNotMatch(pageTsx, /recommend(ed|s)? signal/i);
});

test("'Winning signal' only ever appears as a closed-position outcome label, never as page copy", () => {
  assert.doesNotMatch(contentTs, /winning signal/i);
  assert.doesNotMatch(pageTsx, /winning signal/i);
});

// ─── Nav wiring ──────────────────────────────────────────────────────────────

test("the capital layout nav links to /capital/performance/signals", () => {
  assert.match(capitalNavigationTs, /href:\s*"\/capital\/performance\/signals"/);
  assert.match(layoutTsx, /getCapitalNavGroups/);
});

test("Portfolio Overview links out to Signal Cohorts", () => {
  assert.match(overviewContentTs, /signalCohorts:\s*"\/capital\/performance\/signals"/);
  assert.match(overviewPageTsx, /NAV_LINKS\.signalCohorts/);
});

test("Allocation & Exposure links out to Signal Cohorts", () => {
  assert.match(allocationContentTs, /signalCohorts:\s*"\/capital\/performance\/signals"/);
  assert.match(allocationPageTsx, /NAV_LINKS\.signalCohorts/);
});

test("Closed Performance links out to Signal Cohorts", () => {
  assert.match(closedPerformanceContentTs, /signalCohorts:\s*"\/capital\/performance\/signals"/);
  assert.match(closedPerformancePageTsx, /NAV_LINKS\.signalCohorts/);
});

test("Strategy Attribution links out to Signal Cohorts", () => {
  assert.match(strategyAttributionContentTs, /signalCohorts:\s*"\/capital\/performance\/signals"/);
  assert.match(strategyAttributionPageTsx, /NAV_LINKS\.signalCohorts/);
});

test("Position Detail's Related Links includes Signal Cohorts", () => {
  assert.match(positionDetailServiceTs, /signalCohorts:\s*"\/capital\/performance\/signals"/);
  assert.match(positionDetailPageTsx, /relatedLinks\.signalCohorts/);
});
