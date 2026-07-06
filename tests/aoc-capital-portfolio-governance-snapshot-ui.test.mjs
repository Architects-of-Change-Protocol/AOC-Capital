// ─── AOC Capital Portfolio Governance Snapshot v1 (PR #21) — UI Copy &
// Safety Static Source Checks ────────────────────────────────────────────────
// Mirrors the static-source-check pattern used across this suite (e.g.
// tests/aoc-capital-signal-cohort-outcome-ui.test.mjs) — checks the page's
// content module and page source for required copy and forbidden
// execution/advice language, without rendering the React server component.
// Also checks that the other capital screens this PR is allowed to touch
// (capital nav layout, Portfolio Overview, Allocation & Exposure, Closed
// Performance, Strategy Attribution, Signal Cohorts, Position Detail) link
// out to the new Governance Snapshot page.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const contentTs = fs.readFileSync("src/lib/capital/portfolio-governance-snapshot-content.ts", "utf8");
const pageTsx = fs.readFileSync("src/app/(protected)/capital/governance/snapshot/page.tsx", "utf8");
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
const signalCohortsPageTsx = fs.readFileSync("src/app/(protected)/capital/performance/signals/page.tsx", "utf8");
const signalCohortsContentTs = fs.readFileSync("src/lib/capital/signal-cohort-outcome-content.ts", "utf8");
const positionDetailPageTsx = fs.readFileSync("src/app/(protected)/capital/positions/[id]/page.tsx", "utf8");
const positionDetailServiceTs = fs.readFileSync("src/lib/capital/position-detail-service.ts", "utf8");

const {
  PAGE_TITLE,
  PAGE_SUBTITLE,
  GOVERNANCE_BADGES,
  HEADER_NOTE,
  SECTION_TITLES,
  NAV_LINKS,
  NAV_LABEL_GOVERNANCE_SNAPSHOT,
  SOURCE_CHAIN_COMPLETENESS_NOTE,
  MVP_READINESS_NOTE,
  READ_ONLY_NOTE,
  LINK_COPY,
  EMPTY_NO_GAPS,
} = await import("../src/lib/capital/portfolio-governance-snapshot-content.ts");

// ─── Required copy ───────────────────────────────────────────────────────────

test("page title is Portfolio Governance Snapshot", () => {
  assert.equal(PAGE_TITLE, "Portfolio Governance Snapshot");
});

test("subtitle matches approved copy: read-only governance health, evidence completeness, paper-only safety posture", () => {
  assert.match(PAGE_SUBTITLE, /read-only governance health/i);
  assert.match(PAGE_SUBTITLE, /evidence completeness/i);
  assert.match(PAGE_SUBTITLE, /paper-only safety posture/i);
});

test("governance badges include all eight required badges", () => {
  for (const badge of [
    "Paper-only",
    "Read-only",
    "Governance snapshot",
    "Real execution locked",
    "No broker connected",
    "No live order routing",
    "No advice",
    "MVP review aid",
  ]) {
    assert.ok(GOVERNANCE_BADGES.includes(badge), `missing badge: ${badge}`);
  }
});

test("header note frames the page as a non-mutating governance/evidence summary", () => {
  assert.match(HEADER_NOTE, /governance evidence and readiness gaps/i);
  assert.match(HEADER_NOTE, /does not generate signals/i);
  assert.match(HEADER_NOTE, /place orders/i);
  assert.match(HEADER_NOTE, /investment advice/i);
});

test("source-chain completeness note matches approved copy", () => {
  assert.match(SOURCE_CHAIN_COMPLETENESS_NOTE, /source-chain completeness measures whether records can be traced across the paper lifecycle without guessing/i);
});

test("MVP readiness note matches approved copy", () => {
  assert.match(MVP_READINESS_NOTE, /internal MVP integration review only/i);
  assert.match(MVP_READINESS_NOTE, /does not indicate readiness for real trading or external execution/i);
});

test("read-only note frames the page as non-advisory", () => {
  assert.match(READ_ONLY_NOTE, /read-only/i);
  assert.match(READ_ONLY_NOTE, /does not provide investment advice/i);
});

test("empty-gaps copy matches approved framing", () => {
  assert.match(EMPTY_NO_GAPS, /no unlinked, incomplete, or historical records/i);
});

test("safe link copy is used instead of any mutation verb", () => {
  assert.equal(LINK_COPY.viewOverview, "View Portfolio Overview");
  assert.equal(LINK_COPY.viewAllocation, "View Allocation");
  assert.equal(LINK_COPY.viewClosedPerformance, "View Closed Performance");
  assert.equal(LINK_COPY.viewStrategyAttribution, "View Strategy Attribution");
  assert.equal(LINK_COPY.viewSignalCohorts, "View Signal Cohorts");
  assert.equal(LINK_COPY.viewPositions, "View Positions");
  assert.equal(LINK_COPY.viewSignals, "View Signals");
  assert.equal(LINK_COPY.viewTradeIntents, "View Trade Intents");
  assert.equal(LINK_COPY.viewStrategyLibrary, "View Strategy Library");
  assert.equal(LINK_COPY.viewInvestorConstitution, "View Investor Constitution");
  assert.equal(LINK_COPY.viewDetail, "View Detail");
});

test("all fourteen required section titles are present", () => {
  const titles = Object.values(SECTION_TITLES);
  for (const required of [
    "Governance Snapshot Header",
    "Executive Governance Summary",
    "Paper-Only Boundary Evidence",
    "Lifecycle Completeness",
    "Source-Chain Completeness",
    "Audit Evidence Summary",
    "Open Exposure & Risk Posture",
    "Realized / Unrealized Simulated P&L Summary",
    "Strategy Attribution Health",
    "Signal Cohort Health",
    "Unlinked / Incomplete / Historical Records",
    "MVP Integration Review Readiness",
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
  assert.equal(NAV_LINKS.governanceSnapshot, "/capital/governance/snapshot");
  assert.equal(NAV_LINKS.investorConstitution, "/capital/constitution/new");
});

test("nav label constant matches approved copy", () => {
  assert.equal(NAV_LABEL_GOVERNANCE_SNAPSHOT, "Governance Snapshot");
});

// ─── Page renders every required section ────────────────────────────────────

test("the page imports and renders getPortfolioGovernanceSnapshot and requireAuthUser", () => {
  assert.match(pageTsx, /getPortfolioGovernanceSnapshot/);
  assert.match(pageTsx, /requireAuthUser/);
});

test("the page references every SECTION_TITLES key", () => {
  for (const key of Object.keys(SECTION_TITLES)) {
    assert.match(pageTsx, new RegExp(`SECTION_TITLES\\.${key}\\b`));
  }
});

test("the page renders the empty-gaps state", () => {
  assert.match(pageTsx, /EMPTY_NO_GAPS/);
});

test("the page links back to Portfolio Overview and out to Strategy Attribution and Signal Cohorts", () => {
  assert.match(pageTsx, /NAV_LINKS\.overview/);
  assert.match(pageTsx, /NAV_LINKS\.strategyAttribution/);
  assert.match(pageTsx, /NAV_LINKS\.signalCohorts/);
});

// ─── Forbidden execution/action/advice language ─────────────────────────────

const FORBIDDEN_EXECUTION_COPY =
  /\bExecute\b|Place [Oo]rder|Trade [Nn]ow|Buy [Nn]ow|Sell [Nn]ow|Send to [Bb]roker|Connect [Ee]xchange|Real [Tt]rade|Live [Tt]rade|Fund [Aa]ccount|\bDeposit\b|\bWithdraw\b|Refresh [Vv]aluation|Close [Pp]osition|Request [Cc]lose [Rr]eview|Generate [Ss]ignal|Convert [Ss]ignal|Create [Dd]raft|Submit [Rr]eview|Rebalance|Increase [Aa]llocation|Reduce [Aa]llocation|Trade [Aa]gain|Reopen [Pp]osition/;

const FORBIDDEN_ADVICE_COPY =
  /Recommended signal|Recommended strategy|Best signal|Best strategy|Investment performance|\bAlpha\b|Real performance|Real trading ready|Broker ready|Live execution ready|Execution ready/i;

test("the governance-snapshot content module never uses forbidden execution or advice copy", () => {
  assert.doesNotMatch(contentTs, FORBIDDEN_EXECUTION_COPY);
  assert.doesNotMatch(contentTs, FORBIDDEN_ADVICE_COPY);
});

test("the governance-snapshot page never uses forbidden execution or advice copy", () => {
  assert.doesNotMatch(pageTsx, FORBIDDEN_EXECUTION_COPY);
  assert.doesNotMatch(pageTsx, FORBIDDEN_ADVICE_COPY);
});

test("the page never recommends a strategy, signal, or trade", () => {
  assert.doesNotMatch(contentTs, /recommend(ed|s)? (signal|strategy|trade)/i);
  assert.doesNotMatch(pageTsx, /recommend(ed|s)? (signal|strategy|trade)/i);
});

test("MVP readiness copy never claims live-trading, broker, or execution readiness", () => {
  assert.doesNotMatch(pageTsx, /ready for live trading|broker ready|execution ready/i);
  assert.doesNotMatch(contentTs, /ready for live trading|broker ready|execution ready/i);
});

// ─── Nav wiring ──────────────────────────────────────────────────────────────

test("the capital layout nav links to /capital/governance/snapshot", () => {
  assert.match(capitalNavigationTs, /href:\s*"\/capital\/governance\/snapshot"/);
  assert.match(layoutTsx, /getCapitalNavGroups/);
});

test("Portfolio Overview links out to Governance Snapshot", () => {
  assert.match(overviewContentTs, /governanceSnapshot:\s*"\/capital\/governance\/snapshot"/);
  assert.match(overviewPageTsx, /NAV_LINKS\.governanceSnapshot/);
});

test("Allocation & Exposure links out to Governance Snapshot", () => {
  assert.match(allocationContentTs, /governanceSnapshot:\s*"\/capital\/governance\/snapshot"/);
  assert.match(allocationPageTsx, /NAV_LINKS\.governanceSnapshot/);
});

test("Closed Performance links out to Governance Snapshot", () => {
  assert.match(closedPerformanceContentTs, /governanceSnapshot:\s*"\/capital\/governance\/snapshot"/);
  assert.match(closedPerformancePageTsx, /NAV_LINKS\.governanceSnapshot/);
});

test("Strategy Attribution links out to Governance Snapshot", () => {
  assert.match(strategyAttributionContentTs, /governanceSnapshot:\s*"\/capital\/governance\/snapshot"/);
  assert.match(strategyAttributionPageTsx, /NAV_LINKS\.governanceSnapshot/);
});

test("Signal Cohorts links out to Governance Snapshot", () => {
  assert.match(signalCohortsContentTs, /governanceSnapshot:\s*"\/capital\/governance\/snapshot"/);
  assert.match(signalCohortsPageTsx, /NAV_LINKS\.governanceSnapshot/);
});

test("Position Detail's Related Links includes Governance Snapshot", () => {
  assert.match(positionDetailServiceTs, /governanceSnapshot:\s*"\/capital\/governance\/snapshot"/);
  assert.match(positionDetailPageTsx, /relatedLinks\.governanceSnapshot/);
});
