// ─── AOC Capital Position Detail & Lifecycle Timeline v1 (PR #16) — UI Copy
// & Safety Static Source Checks ─────────────────────────────────────────────
// Mirrors the static-source-check pattern used across this suite (e.g.
// tests/aoc-capital-allocation-exposure-ui.test.mjs) — checks the page's
// content module and page source for required copy and forbidden execution
// language, without rendering the React server component.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const contentTs = fs.readFileSync("src/lib/capital/position-detail-content.ts", "utf8");
const pageTsx = fs.readFileSync("src/app/(protected)/capital/positions/[id]/page.tsx", "utf8");
const positionsListPageTsx = fs.readFileSync("src/app/(protected)/capital/positions/page.tsx", "utf8");
const allocationPageTsx = fs.readFileSync("src/app/(protected)/capital/allocation/page.tsx", "utf8");

const {
  PAGE_TITLE,
  PAGE_SUBTITLE,
  GOVERNANCE_BADGES,
  GOVERNANCE_NOTE,
  POSITION_HEADER_NOTE,
  DECISION_APPROVED_NOTE,
  DECISION_MISSING_NOTE,
  MTM_EMPTY_NOTE,
  SECTION_TITLES,
  NAV_LINKS,
} = await import("../src/lib/capital/position-detail-content.ts");

// ─── Required copy ───────────────────────────────────────────────────────────

test("page title is Position Detail", () => {
  assert.equal(PAGE_TITLE, "Position Detail");
});

test("subtitle names read-only, lifecycle, and real execution locked", () => {
  assert.match(PAGE_SUBTITLE, /read-only/i);
  assert.match(PAGE_SUBTITLE, /lifecycle/i);
  assert.match(PAGE_SUBTITLE, /real execution remains locked/i);
});

test("governance badges include Paper-only, Real execution locked, No broker connected, No live order routing, Read-only", () => {
  assert.ok(GOVERNANCE_BADGES.includes("Paper-only"));
  assert.ok(GOVERNANCE_BADGES.includes("Real execution locked"));
  assert.ok(GOVERNANCE_BADGES.includes("No broker connected"));
  assert.ok(GOVERNANCE_BADGES.includes("No live order routing"));
  assert.ok(GOVERNANCE_BADGES.includes("Read-only"));
});

test("governance note frames the page as read-only and non-mutating", () => {
  assert.match(GOVERNANCE_NOTE, /read-only/i);
  assert.match(GOVERNANCE_NOTE, /does not refresh market data, open or close positions, submit drafts, or place orders/i);
});

test("position header note frames this as a simulated paper position with no real order placed", () => {
  assert.equal(POSITION_HEADER_NOTE, "This is a simulated paper position. No real order was placed.");
});

test("decision approved/missing copy matches the approved product copy", () => {
  assert.equal(DECISION_APPROVED_NOTE, "Risk Constitution approved this paper intent before the simulated position was opened.");
  assert.match(DECISION_MISSING_NOTE, /^No linked Risk Constitution decision was found for this position\./);
});

test("mark-to-market empty-state copy matches the approved product copy", () => {
  assert.equal(MTM_EMPTY_NOTE, "Detailed mark-to-market history is not available yet. Current valuation reflects the latest stored paper position state.");
});

test("all ten required section titles are present", () => {
  const titles = Object.values(SECTION_TITLES);
  for (const required of [
    "Position Header",
    "Current Position Snapshot",
    "Source Chain",
    "Risk Constitution Decision",
    "Lifecycle Timeline",
    "Mark-to-Market / Valuation History",
    "P&L Breakdown",
    "Audit Trail",
    "Governance & Safety",
    "Related Links",
  ]) {
    assert.ok(titles.includes(required), `missing section title: ${required}`);
  }
});

test("nav links point at existing routes, not invented ones", () => {
  assert.equal(NAV_LINKS.positions, "/capital/positions");
  assert.equal(NAV_LINKS.allocation, "/capital/allocation");
  assert.equal(NAV_LINKS.overview, "/capital/overview");
  assert.equal(NAV_LINKS.tradeIntents, "/capital/trade-intents");
  assert.equal(NAV_LINKS.signals, "/capital/signals");
  assert.equal(NAV_LINKS.performance, "/capital/performance");
});

// ─── Page renders every required section ────────────────────────────────────

test("the page imports and renders getPositionDetail and requireAuthUser", () => {
  assert.match(pageTsx, /getPositionDetail/);
  assert.match(pageTsx, /requireAuthUser/);
});

test("the page calls notFound() when the position could not be resolved", () => {
  assert.match(pageTsx, /notFound\(\)/);
  assert.match(pageTsx, /PositionDetailNotFoundError/);
});

test("the page references every SECTION_TITLES key", () => {
  for (const key of Object.keys(SECTION_TITLES)) {
    assert.match(pageTsx, new RegExp(`SECTION_TITLES\\.${key}\\b`));
  }
});

test("the page links back to Paper Positions, Allocation & Exposure, Portfolio Overview, Trade Intents, Signals, and Performance", () => {
  assert.match(pageTsx, /relatedLinks\.positions/);
  assert.match(pageTsx, /relatedLinks\.allocation/);
  assert.match(pageTsx, /relatedLinks\.overview/);
  assert.match(pageTsx, /relatedLinks\.tradeIntents/);
  assert.match(pageTsx, /relatedLinks\.signals/);
  assert.match(pageTsx, /relatedLinks\.performance/);
});

// ─── Forbidden execution language ───────────────────────────────────────────

const FORBIDDEN_EXECUTION_COPY =
  /\bExecute\b|Place [Oo]rder|Trade [Nn]ow|Buy [Nn]ow|Sell [Nn]ow|Send to [Bb]roker|Connect [Ee]xchange|Real [Tt]rade|Live [Tt]rade|Fund [Aa]ccount|\bDeposit\b|\bWithdraw\b|Rebalance [Nn]ow|Optimize [Aa]utomatically|Refresh [Vv]aluation|Close [Pp]osition/;

test("the position detail content module never uses forbidden execution language", () => {
  assert.doesNotMatch(contentTs, FORBIDDEN_EXECUTION_COPY);
});

test("the position detail page never uses forbidden execution language", () => {
  assert.doesNotMatch(pageTsx, FORBIDDEN_EXECUTION_COPY);
});

// ─── Nav wiring from other capital screens ──────────────────────────────────

test("the Paper Positions list links out to Position Detail", () => {
  assert.match(positionsListPageTsx, /\/capital\/positions\/\$\{positionId\}/);
});

test("the Allocation & Exposure page links position rows out to Position Detail", () => {
  assert.match(allocationPageTsx, /\/capital\/positions\/\$\{p\.id\}/);
});

test("neither nav-wiring link uses forbidden execution/mutation link text", () => {
  assert.doesNotMatch(positionsListPageTsx, /Manage Position|Trade Position/);
  assert.doesNotMatch(allocationPageTsx, /Manage Position|Trade Position/);
});
