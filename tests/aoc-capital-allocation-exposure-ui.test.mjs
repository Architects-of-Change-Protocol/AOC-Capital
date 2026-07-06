// ─── AOC Capital Allocation & Exposure Views v1 (PR #15) — UI Copy & Safety
// Static Source Checks ───────────────────────────────────────────────────────
// Mirrors the static-source-check pattern used across this suite (e.g.
// tests/aoc-capital-portfolio-overview-ui.test.mjs) — checks the page's
// content module and page source for required copy and forbidden execution
// language, without rendering the React server component.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const contentTs = fs.readFileSync("src/lib/capital/allocation-exposure-content.ts", "utf8");
const pageTsx = fs.readFileSync("src/app/(protected)/capital/allocation/page.tsx", "utf8");
const layoutTsx = fs.readFileSync("src/app/(protected)/capital/layout.tsx", "utf8");
const capitalNavigationTs = fs.readFileSync("src/lib/capital/capital-navigation.ts", "utf8");
const overviewPageTsx = fs.readFileSync("src/app/(protected)/capital/overview/page.tsx", "utf8");
const overviewContentTs = fs.readFileSync("src/lib/capital/portfolio-overview-content.ts", "utf8");

const {
  PAGE_TITLE,
  PAGE_SUBTITLE,
  GOVERNANCE_BADGES,
  GOVERNANCE_NOTE,
  EMPTY_NO_OPEN_POSITIONS,
  EMPTY_NO_BASE_CAPITAL,
  EMPTY_NO_RISK_LIMIT,
  SECTION_TITLES,
  NAV_LINKS,
} = await import("../src/lib/capital/allocation-exposure-content.ts");

// ─── Required copy ───────────────────────────────────────────────────────────

test("page title is Allocation & Exposure", () => {
  assert.equal(PAGE_TITLE, "Allocation & Exposure");
});

test("subtitle names read-only, simulated exposure, and real execution locked", () => {
  assert.match(PAGE_SUBTITLE, /read-only/i);
  assert.match(PAGE_SUBTITLE, /simulated paper exposure/i);
  assert.match(PAGE_SUBTITLE, /real execution remains locked/i);
});

test("governance badges include Paper-only, Real execution locked, No broker connected, No live order routing", () => {
  assert.ok(GOVERNANCE_BADGES.includes("Paper-only"));
  assert.ok(GOVERNANCE_BADGES.includes("Real execution locked"));
  assert.ok(GOVERNANCE_BADGES.includes("No broker connected"));
  assert.ok(GOVERNANCE_BADGES.includes("No live order routing"));
});

test("governance note frames the page as read-only and non-mutating", () => {
  assert.match(GOVERNANCE_NOTE, /read-only/i);
  assert.match(GOVERNANCE_NOTE, /does not generate signals, submit drafts, open positions, or enable execution/i);
});

test("empty states cover no positions, no base capital, and no risk limit", () => {
  assert.match(EMPTY_NO_OPEN_POSITIONS, /no open paper positions/i);
  assert.match(EMPTY_NO_BASE_CAPITAL, /base capital is not modeled/i);
  assert.match(EMPTY_NO_RISK_LIMIT, /risk limit proximity is not available/i);
});

test("all eight required section titles are present", () => {
  const titles = Object.values(SECTION_TITLES);
  for (const required of [
    "Allocation Summary",
    "Exposure by Symbol",
    "Position Contribution",
    "Concentration & Risk Proximity",
    "Cash vs Invested Simulation",
    "P&L Contribution",
    "Allocation Table",
    "Exposure Notes",
  ]) {
    assert.ok(titles.includes(required), `missing section title: ${required}`);
  }
});

test("nav links point at existing routes, not invented ones", () => {
  assert.equal(NAV_LINKS.overview, "/capital/overview");
  assert.equal(NAV_LINKS.positions, "/capital/positions");
  assert.equal(NAV_LINKS.tradeIntents, "/capital/trade-intents");
});

// ─── Page renders every required section ────────────────────────────────────

test("the page imports and renders getAllocationExposureOverview and requireAuthUser", () => {
  assert.match(pageTsx, /getAllocationExposureOverview/);
  assert.match(pageTsx, /requireAuthUser/);
});

test("the page references every SECTION_TITLES key", () => {
  for (const key of Object.keys(SECTION_TITLES)) {
    assert.match(pageTsx, new RegExp(`SECTION_TITLES\\.${key}\\b`));
  }
});

test("the page links back to Portfolio Overview, Paper Positions, and Trade Intents", () => {
  assert.match(pageTsx, /NAV_LINKS\.overview/);
  assert.match(pageTsx, /NAV_LINKS\.positions/);
  assert.match(pageTsx, /NAV_LINKS\.tradeIntents/);
});

// ─── Forbidden execution language ───────────────────────────────────────────

const FORBIDDEN_EXECUTION_COPY =
  /\bExecute\b|Place [Oo]rder|Trade [Nn]ow|Buy [Nn]ow|Sell [Nn]ow|Send to [Bb]roker|Connect [Ee]xchange|Real [Tt]rade|Live [Tt]rade|Fund [Aa]ccount|\bDeposit\b|\bWithdraw\b|Rebalance [Nn]ow|Optimize [Aa]utomatically/;

test("the allocation content module never uses forbidden execution language", () => {
  assert.doesNotMatch(contentTs, FORBIDDEN_EXECUTION_COPY);
});

test("the allocation page never uses forbidden execution language", () => {
  assert.doesNotMatch(pageTsx, FORBIDDEN_EXECUTION_COPY);
});

test("the allocation page never renders a close-position or rebalance button", () => {
  assert.doesNotMatch(pageTsx, /[Cc]lose [Pp]osition|[Rr]ebalance/);
});

// ─── Nav wiring ──────────────────────────────────────────────────────────────

test("the capital layout nav links to /capital/allocation", () => {
  assert.match(capitalNavigationTs, /href:\s*"\/capital\/allocation"/);
  assert.match(layoutTsx, /getCapitalNavGroups/);
});

test("Portfolio Overview links out to Allocation & Exposure", () => {
  assert.match(overviewContentTs, /allocation:\s*"\/capital\/allocation"/);
  assert.match(overviewPageTsx, /NAV_LINKS\.allocation/);
});
