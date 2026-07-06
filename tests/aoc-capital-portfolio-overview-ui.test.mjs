// ─── AOC Capital Portfolio Overview Dashboard v1 (PR #14) — UI Copy & Safety
// Static Source Checks ───────────────────────────────────────────────────────
// Mirrors the static-source-check pattern used across this suite (e.g.
// tests/aoc-capital-command-center.test.mjs) — checks the dashboard's content
// module and page source for required copy and forbidden execution language,
// without rendering the React server component.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const contentTs = fs.readFileSync("src/lib/capital/portfolio-overview-content.ts", "utf8");
const pageTsx = fs.readFileSync("src/app/(protected)/capital/overview/page.tsx", "utf8");
const layoutTsx = fs.readFileSync("src/app/(protected)/capital/layout.tsx", "utf8");
const capitalNavigationTs = fs.readFileSync("src/lib/capital/capital-navigation.ts", "utf8");

const {
  PAGE_TITLE,
  PAGE_SUBTITLE,
  GOVERNANCE_BADGES,
  FRESHNESS_NOTE,
  REJECTED_DECISIONS_NOTE,
  EMPTY_NO_OPEN_POSITIONS,
  EMPTY_NO_DRAFT_INTENTS,
  EMPTY_NO_DECISIONS,
  EMPTY_NO_STRATEGY_SELECTED,
  SECTION_TITLES,
  NAV_LINKS,
} = await import("../src/lib/capital/portfolio-overview-content.ts");

// ─── Required copy ───────────────────────────────────────────────────────────

test("page title is Portfolio Overview", () => {
  assert.equal(PAGE_TITLE, "Portfolio Overview");
});

test("subtitle names signals recommend / Risk Constitution decides / real execution locked", () => {
  assert.match(PAGE_SUBTITLE, /signals recommend/i);
  assert.match(PAGE_SUBTITLE, /risk constitution decides/i);
  assert.match(PAGE_SUBTITLE, /real execution remains locked/i);
});

test("governance badges include Paper-only, Real execution locked, No broker connected, No live order routing", () => {
  assert.ok(GOVERNANCE_BADGES.includes("Paper-only"));
  assert.ok(GOVERNANCE_BADGES.includes("Real execution locked"));
  assert.ok(GOVERNANCE_BADGES.includes("No broker connected"));
  assert.ok(GOVERNANCE_BADGES.includes("No live order routing"));
});

test("freshness note explains data reflects the latest stored state", () => {
  assert.match(FRESHNESS_NOTE, /latest stored paper-capital state/i);
});

test("rejected-decisions copy frames rejections as part of the governance loop, not an error", () => {
  assert.match(REJECTED_DECISIONS_NOTE, /governance loop/i);
});

test("empty states cover positions, drafts, decisions, and no-strategy-selected", () => {
  assert.match(EMPTY_NO_OPEN_POSITIONS, /no open paper positions/i);
  assert.match(EMPTY_NO_DRAFT_INTENTS, /no draft trade intents/i);
  assert.match(EMPTY_NO_DECISIONS, /no recent risk constitution decisions/i);
  assert.match(EMPTY_NO_STRATEGY_SELECTED, /select a strategy/i);
});

test("all ten required section titles are present", () => {
  const titles = Object.values(SECTION_TITLES);
  for (const required of [
    "Portfolio Summary",
    "Selected Strategy",
    "Risk Constitution Status",
    "Signal Pipeline",
    "Draft Intent Pipeline",
    "Decision Summary",
    "Open Paper Positions",
    "Performance Snapshot",
    "Recent Activity",
    "Recommended Next Action",
  ]) {
    assert.ok(titles.includes(required), `missing section title: ${required}`);
  }
});

test("nav links point at the existing routes, not invented ones", () => {
  assert.equal(NAV_LINKS.signals, "/capital/signals");
  assert.equal(NAV_LINKS.tradeIntents, "/capital/trade-intents");
  assert.equal(NAV_LINKS.positions, "/capital/positions");
  assert.equal(NAV_LINKS.strategyLibrary, "/capital/strategies");
  assert.equal(NAV_LINKS.performance, "/capital/performance");
});

// ─── Page renders every required section ────────────────────────────────────

test("the page imports and renders getPortfolioOverview and requireAuthUser", () => {
  assert.match(pageTsx, /getPortfolioOverview/);
  assert.match(pageTsx, /requireAuthUser/);
});

test("the page references every SECTION_TITLES key", () => {
  for (const key of Object.keys(SECTION_TITLES)) {
    assert.match(pageTsx, new RegExp(`SECTION_TITLES\\.${key}\\b`));
  }
});

test("the page links out to signals, trade-intents, positions, strategy library, and performance", () => {
  assert.match(pageTsx, /NAV_LINKS\.signals/);
  assert.match(pageTsx, /NAV_LINKS\.tradeIntents/);
  assert.match(pageTsx, /NAV_LINKS\.positions/);
  assert.match(pageTsx, /NAV_LINKS\.strategyLibrary/);
  assert.match(pageTsx, /NAV_LINKS\.performance/);
});

// ─── Forbidden execution language ───────────────────────────────────────────

const FORBIDDEN_EXECUTION_COPY = /\bExecute\b|Place [Oo]rder|Trade [Nn]ow|Buy [Nn]ow|Sell [Nn]ow|Send to [Bb]roker|Connect [Ee]xchange|Real [Tt]rade|Live [Tt]rade|Fund [Aa]ccount|\bDeposit\b|\bWithdraw\b/;

test("the dashboard content module never uses forbidden execution language", () => {
  assert.doesNotMatch(contentTs, FORBIDDEN_EXECUTION_COPY);
});

test("the dashboard page never uses forbidden execution language", () => {
  assert.doesNotMatch(pageTsx, FORBIDDEN_EXECUTION_COPY);
});

test("the dashboard page never renders a form or submit button that posts a mutation", () => {
  assert.doesNotMatch(pageTsx, /<form\b/);
  assert.doesNotMatch(pageTsx, /fetch\(/);
});

// ─── Nav wiring ──────────────────────────────────────────────────────────────

test("the capital layout nav links to /capital/overview", () => {
  assert.match(capitalNavigationTs, /href:\s*"\/capital\/overview"/);
  assert.match(layoutTsx, /getCapitalNavGroups/);
});
