// ─── AOC Capital Strategy-Level Performance Attribution v1 (PR #19) — UI
// Copy & Safety Static Source Checks ──────────────────────────────────────────
// Mirrors the static-source-check pattern used across this suite (e.g.
// tests/aoc-capital-closed-position-performance-ui.test.mjs) — checks the
// page's content module and page source for required copy and forbidden
// execution/advice language, without rendering the React server component.
// Also checks that the other capital screens this PR is allowed to touch
// (Portfolio Overview, Allocation & Exposure, Closed Performance, Position
// Detail, capital nav layout) link out to the new Strategy Attribution page.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const contentTs = fs.readFileSync("src/lib/capital/strategy-performance-attribution-content.ts", "utf8");
const pageTsx = fs.readFileSync("src/app/(protected)/capital/performance/strategies/page.tsx", "utf8");
const layoutTsx = fs.readFileSync("src/app/(protected)/capital/layout.tsx", "utf8");
const overviewPageTsx = fs.readFileSync("src/app/(protected)/capital/overview/page.tsx", "utf8");
const overviewContentTs = fs.readFileSync("src/lib/capital/portfolio-overview-content.ts", "utf8");
const allocationPageTsx = fs.readFileSync("src/app/(protected)/capital/allocation/page.tsx", "utf8");
const allocationContentTs = fs.readFileSync("src/lib/capital/allocation-exposure-content.ts", "utf8");
const closedPerformancePageTsx = fs.readFileSync("src/app/(protected)/capital/performance/closed/page.tsx", "utf8");
const closedPerformanceContentTs = fs.readFileSync("src/lib/capital/closed-position-performance-content.ts", "utf8");
const positionDetailPageTsx = fs.readFileSync("src/app/(protected)/capital/positions/[id]/page.tsx", "utf8");
const positionDetailServiceTs = fs.readFileSync("src/lib/capital/position-detail-service.ts", "utf8");

const {
  PAGE_TITLE,
  PAGE_SUBTITLE,
  GOVERNANCE_BADGES,
  HEADER_NOTE,
  EMPTY_NO_ATTRIBUTED_STRATEGIES,
  SECTION_TITLES,
  NAV_LINKS,
  GOVERNANCE_COMPLETENESS_NOTE,
  UNLINKED_RECORDS_NOTE,
  READ_ONLY_NOTE,
  LINK_COPY,
} = await import("../src/lib/capital/strategy-performance-attribution-content.ts");

// ─── Required copy ───────────────────────────────────────────────────────────

test("page title is Strategy Performance Attribution", () => {
  assert.equal(PAGE_TITLE, "Strategy Performance Attribution");
});

test("subtitle names read-only, traceable strategy source chain, and real execution locked", () => {
  assert.match(PAGE_SUBTITLE, /read-only/i);
  assert.match(PAGE_SUBTITLE, /traceable strategy source chain/i);
  assert.match(PAGE_SUBTITLE, /real execution remains locked/i);
});

test("governance badges include the seven required badges", () => {
  for (const badge of ["Paper-only", "Strategy attribution", "Read-only", "Real execution locked", "No broker connected", "No live order routing", "No advice"]) {
    assert.ok(GOVERNANCE_BADGES.includes(badge), `missing badge: ${badge}`);
  }
});

test("header note frames the page as attribution-only and non-advisory", () => {
  assert.match(HEADER_NOTE, /attributes simulated paper outcomes/i);
  assert.match(HEADER_NOTE, /does not.*provide investment advice/i);
});

test("empty state matches approved copy", () => {
  assert.match(EMPTY_NO_ATTRIBUTED_STRATEGIES, /no attributable strategy activity yet/i);
});

test("governance completeness note matches approved copy", () => {
  assert.match(GOVERNANCE_COMPLETENESS_NOTE, /attribution completeness measures how much of the simulated paper lifecycle can be traced back to a strategy source chain/i);
});

test("unlinked records note matches approved copy", () => {
  assert.match(UNLINKED_RECORDS_NOTE, /remain visible for historical reporting/i);
  assert.match(UNLINKED_RECORDS_NOTE, /could not resolve a complete strategy source chain/i);
});

test("read-only note frames the page as non-advisory", () => {
  assert.match(READ_ONLY_NOTE, /read-only/i);
  assert.match(READ_ONLY_NOTE, /does not provide investment advice/i);
});

test("safe link copy is used instead of any mutation verb", () => {
  assert.equal(LINK_COPY.viewStrategy, "View Strategy");
  assert.equal(LINK_COPY.viewSourceChain, "View Source Chain");
  assert.equal(LINK_COPY.viewPositions, "View Positions");
  assert.equal(LINK_COPY.viewClosedPerformance, "View Closed Performance");
  assert.equal(LINK_COPY.viewDetail, "View Detail");
});

test("all eleven required section titles are present", () => {
  const titles = Object.values(SECTION_TITLES);
  for (const required of [
    "Attribution Header",
    "Strategy Attribution Summary",
    "Lifecycle Funnel by Strategy",
    "Realized P&L by Strategy",
    "Unrealized P&L / Open Exposure by Strategy",
    "Strategy Win / Loss / Flat Summary",
    "Governance & Source-Chain Completeness",
    "Strategy Attribution Table",
    "Unlinked / Historical Records",
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
});

// ─── Page renders every required section ────────────────────────────────────

test("the page imports and renders getStrategyPerformanceAttribution and requireAuthUser", () => {
  assert.match(pageTsx, /getStrategyPerformanceAttribution/);
  assert.match(pageTsx, /requireAuthUser/);
});

test("the page references every SECTION_TITLES key", () => {
  for (const key of Object.keys(SECTION_TITLES)) {
    assert.match(pageTsx, new RegExp(`SECTION_TITLES\\.${key}\\b`));
  }
});

test("the page renders the empty state for zero attributed strategies", () => {
  assert.match(pageTsx, /EMPTY_NO_ATTRIBUTED_STRATEGIES/);
});

test("the page links back to Portfolio Overview and Strategy Library, and out to Closed Performance", () => {
  assert.match(pageTsx, /NAV_LINKS\.overview/);
  assert.match(pageTsx, /NAV_LINKS\.strategies/);
  assert.match(pageTsx, /NAV_LINKS\.closedPerformance/);
});

// ─── Forbidden execution/action/advice language ─────────────────────────────

const FORBIDDEN_EXECUTION_COPY =
  /\bExecute\b|Place [Oo]rder|Trade [Nn]ow|Buy [Nn]ow|Sell [Nn]ow|Send to [Bb]roker|Connect [Ee]xchange|Real [Tt]rade|Live [Tt]rade|Fund [Aa]ccount|\bDeposit\b|\bWithdraw\b|Refresh [Vv]aluation|Close [Pp]osition|Request [Cc]lose [Rr]eview|Generate [Ss]ignal|Create [Dd]raft|Submit [Rr]eview|Rebalance|Increase [Aa]llocation|Reduce [Aa]llocation|Trade [Aa]gain|Reopen [Pp]osition/;

const FORBIDDEN_ADVICE_COPY = /Recommended strategy|Best strategy to use|Winning strategy|Investment performance|\bAlpha\b|Real performance/i;

test("the strategy-attribution content module never uses forbidden execution or advice copy", () => {
  assert.doesNotMatch(contentTs, FORBIDDEN_EXECUTION_COPY);
  assert.doesNotMatch(contentTs, FORBIDDEN_ADVICE_COPY);
});

test("the strategy-attribution page never uses forbidden execution or advice copy", () => {
  assert.doesNotMatch(pageTsx, FORBIDDEN_EXECUTION_COPY);
  assert.doesNotMatch(pageTsx, FORBIDDEN_ADVICE_COPY);
});

test("the page never recommends a strategy or provides investment advice", () => {
  assert.doesNotMatch(contentTs, /recommend(ed|s)? strategy/i);
  assert.doesNotMatch(pageTsx, /recommend(ed|s)? strategy/i);
});

// ─── Nav wiring ──────────────────────────────────────────────────────────────

test("the capital layout nav links to /capital/performance/strategies", () => {
  assert.match(layoutTsx, /href:\s*"\/capital\/performance\/strategies"/);
});

test("Portfolio Overview links out to Strategy Attribution", () => {
  assert.match(overviewContentTs, /strategyAttribution:\s*"\/capital\/performance\/strategies"/);
  assert.match(overviewPageTsx, /NAV_LINKS\.strategyAttribution/);
});

test("Allocation & Exposure links out to Strategy Attribution", () => {
  assert.match(allocationContentTs, /strategyAttribution:\s*"\/capital\/performance\/strategies"/);
  assert.match(allocationPageTsx, /NAV_LINKS\.strategyAttribution/);
});

test("Closed Performance links out to Strategy Attribution", () => {
  assert.match(closedPerformanceContentTs, /strategyAttribution:\s*"\/capital\/performance\/strategies"/);
  assert.match(closedPerformancePageTsx, /NAV_LINKS\.strategyAttribution/);
});

test("Position Detail's Related Links includes Strategy Attribution", () => {
  assert.match(positionDetailServiceTs, /strategyAttribution:\s*"\/capital\/performance\/strategies"/);
  assert.match(positionDetailPageTsx, /relatedLinks\.strategyAttribution/);
});
