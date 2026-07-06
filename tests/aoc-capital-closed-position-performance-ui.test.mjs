// ─── AOC Capital Closed Position Performance & Realized P&L Reporting v1
// (PR #18) — UI Copy & Safety Static Source Checks ───────────────────────────
// Mirrors the static-source-check pattern used across this suite (e.g.
// tests/aoc-capital-allocation-exposure-ui.test.mjs) — checks the page's
// content module and page source for required copy and forbidden execution
// language, without rendering the React server component. Also checks that
// the other capital screens this PR is allowed to touch (Portfolio Overview,
// Allocation & Exposure, Position Detail, capital nav layout) link out to the
// new Closed Performance page.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const contentTs = fs.readFileSync("src/lib/capital/closed-position-performance-content.ts", "utf8");
const pageTsx = fs.readFileSync("src/app/(protected)/capital/performance/closed/page.tsx", "utf8");
const layoutTsx = fs.readFileSync("src/app/(protected)/capital/layout.tsx", "utf8");
const capitalNavigationTs = fs.readFileSync("src/lib/capital/capital-navigation.ts", "utf8");
const overviewPageTsx = fs.readFileSync("src/app/(protected)/capital/overview/page.tsx", "utf8");
const overviewContentTs = fs.readFileSync("src/lib/capital/portfolio-overview-content.ts", "utf8");
const allocationPageTsx = fs.readFileSync("src/app/(protected)/capital/allocation/page.tsx", "utf8");
const allocationContentTs = fs.readFileSync("src/lib/capital/allocation-exposure-content.ts", "utf8");
const positionDetailPageTsx = fs.readFileSync("src/app/(protected)/capital/positions/[id]/page.tsx", "utf8");
const positionDetailServiceTs = fs.readFileSync("src/lib/capital/position-detail-service.ts", "utf8");

const {
  PAGE_TITLE,
  PAGE_SUBTITLE,
  GOVERNANCE_BADGES,
  HEADER_NOTE,
  EMPTY_NO_CLOSED_POSITIONS,
  SECTION_TITLES,
  NAV_LINKS,
  GOVERNANCE_EVIDENCE_COMPLETE_NOTE,
  GOVERNANCE_EVIDENCE_MISSING_NOTE,
  SOURCE_ATTRIBUTION_NOTE,
  READ_ONLY_NOTE,
  LINK_COPY,
} = await import("../src/lib/capital/closed-position-performance-content.ts");

// ─── Required copy ───────────────────────────────────────────────────────────

test("page title is Closed Position Performance", () => {
  assert.equal(PAGE_TITLE, "Closed Position Performance");
});

test("subtitle names read-only, governed paper positions, and real execution locked", () => {
  assert.match(PAGE_SUBTITLE, /read-only/i);
  assert.match(PAGE_SUBTITLE, /governed paper positions/i);
  assert.match(PAGE_SUBTITLE, /real execution remains locked/i);
});

test("governance badges include the six required badges", () => {
  for (const badge of ["Paper-only", "Realized simulation", "Read-only", "Real execution locked", "No broker connected", "No live order routing"]) {
    assert.ok(GOVERNANCE_BADGES.includes(badge), `missing badge: ${badge}`);
  }
});

test("header note frames the page as non-mutating", () => {
  assert.match(HEADER_NOTE, /does not close positions, refresh valuation, place orders, or connect to brokers/i);
});

test("empty state matches approved copy", () => {
  assert.match(EMPTY_NO_CLOSED_POSITIONS, /no closed paper positions yet/i);
  assert.match(EMPTY_NO_CLOSED_POSITIONS, /governed paper close review/i);
});

test("governance evidence copy matches approved copy", () => {
  assert.match(GOVERNANCE_EVIDENCE_COMPLETE_NOTE, /governed close evidence confirms/i);
  assert.match(GOVERNANCE_EVIDENCE_MISSING_NOTE, /remains readable for historical reporting/i);
});

test("source attribution note matches approved copy", () => {
  assert.match(SOURCE_ATTRIBUTION_NOTE, /attributes simulated realized P&L only where the paper-governance source chain is available/i);
});

test("read-only note frames the page as non-advisory", () => {
  assert.match(READ_ONLY_NOTE, /read-only/i);
  assert.match(READ_ONLY_NOTE, /does not provide investment advice/i);
});

test("safe link copy is used instead of any mutation verb", () => {
  assert.equal(LINK_COPY.viewDetail, "View Detail");
  assert.equal(LINK_COPY.viewLifecycle, "View Lifecycle");
  assert.equal(LINK_COPY.openPositionDetail, "Open Position Detail");
});

test("all ten required section titles are present", () => {
  const titles = Object.values(SECTION_TITLES);
  for (const required of [
    "Performance Header",
    "Realized P&L Summary",
    "Realized vs Unrealized Split",
    "Win / Loss / Flat Summary",
    "Closed Performance by Symbol",
    "Closed Performance by Strategy / Source Chain",
    "Closed Position History",
    "Governance Evidence",
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
});

// ─── Page renders every required section ────────────────────────────────────

test("the page imports and renders getClosedPositionPerformance and requireAuthUser", () => {
  assert.match(pageTsx, /getClosedPositionPerformance/);
  assert.match(pageTsx, /requireAuthUser/);
});

test("the page references every SECTION_TITLES key", () => {
  for (const key of Object.keys(SECTION_TITLES)) {
    assert.match(pageTsx, new RegExp(`SECTION_TITLES\\.${key}\\b`));
  }
});

test("the page renders the empty state for zero closed positions", () => {
  assert.match(pageTsx, /EMPTY_NO_CLOSED_POSITIONS/);
});

test("the page links back to Portfolio Overview, Allocation & Exposure, and Paper Positions, and links each row to Position Detail", () => {
  assert.match(pageTsx, /NAV_LINKS\.overview/);
  assert.match(pageTsx, /NAV_LINKS\.allocation/);
  assert.match(pageTsx, /NAV_LINKS\.positions/);
  assert.match(pageTsx, /row\.detailHref/);
});

// ─── Forbidden execution language ───────────────────────────────────────────

const FORBIDDEN_EXECUTION_COPY =
  /\bExecute\b|Place [Oo]rder|Trade [Nn]ow|Buy [Nn]ow|Sell [Nn]ow|Send to [Bb]roker|Connect [Ee]xchange|Real [Tt]rade|Live [Tt]rade|Fund [Aa]ccount|\bDeposit\b|\bWithdraw\b|Refresh [Vv]aluation|Close [Pp]osition|Request [Cc]lose [Rr]eview|Trade [Aa]gain|Reopen [Pp]osition|Sell [Aa]gain|Buy [Aa]gain/;

test("the closed-performance content module never uses forbidden execution copy", () => {
  assert.doesNotMatch(contentTs, FORBIDDEN_EXECUTION_COPY);
});

test("the closed-performance page never uses forbidden execution copy", () => {
  assert.doesNotMatch(pageTsx, FORBIDDEN_EXECUTION_COPY);
});

test("the closed-performance page never renders a close-position or close-review action", () => {
  assert.doesNotMatch(pageTsx, /[Cc]lose [Pp]osition|[Rr]equest [Cc]lose [Rr]eview/);
});

test("this section is never called strategy alpha or investment performance", () => {
  assert.doesNotMatch(contentTs, /strategy alpha/i);
  assert.doesNotMatch(contentTs, /investment performance/i);
  assert.doesNotMatch(pageTsx, /strategy alpha/i);
  assert.doesNotMatch(pageTsx, /investment performance/i);
});

// ─── Nav wiring ──────────────────────────────────────────────────────────────

test("the capital layout nav links to /capital/performance/closed", () => {
  assert.match(capitalNavigationTs, /href:\s*"\/capital\/performance\/closed"/);
  assert.match(layoutTsx, /getCapitalNavGroups/);
});

test("Portfolio Overview links out to Closed Performance", () => {
  assert.match(overviewContentTs, /closedPerformance:\s*"\/capital\/performance\/closed"/);
  assert.match(overviewPageTsx, /NAV_LINKS\.closedPerformance/);
});

test("Allocation & Exposure links out to Closed Performance", () => {
  assert.match(allocationContentTs, /closedPerformance:\s*"\/capital\/performance\/closed"/);
  assert.match(allocationPageTsx, /NAV_LINKS\.closedPerformance/);
});

test("Position Detail's Related Links includes Closed Performance", () => {
  assert.match(positionDetailServiceTs, /closedPerformance:\s*"\/capital\/performance\/closed"/);
  assert.match(positionDetailPageTsx, /relatedLinks\.closedPerformance/);
});
