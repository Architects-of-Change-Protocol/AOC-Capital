// ─── AOC Capital — Capital Command Center (/capital) — Content Tests ───────────
// Pure-data tests over the copy/navigation module that backs the /capital
// command center page. No Supabase / live database / rendering required —
// mirrors the pure-function test pattern used elsewhere in this suite.

import { test } from "node:test";
import assert from "node:assert/strict";

const {
  PAPER_ONLY_BANNER,
  WHAT_IS_AOC_CAPITAL,
  WHAT_PAPER_TRADING_MEANS,
  WHY_REAL_EXECUTION_IS_LOCKED,
  NOT_FINANCIAL_ADVICE_DISCLOSURE,
  LIVE_MARKET_DATA_DISCLOSURE,
  PRIMARY_ACTIONS,
  GUIDED_JOURNEY,
  TRUST_LADDER,
  DISCOVERABILITY_LINKS,
} = await import("../src/lib/capital/command-center-content.ts");

// ─── Paper-only / locked-execution language ─────────────────────────────────

test("paper-only banner language is present and unambiguous", () => {
  assert.match(PAPER_ONLY_BANNER, /paper only/i);
  assert.match(PAPER_ONLY_BANNER, /no real money/i);
});

test("what-paper-trading-means copy states no real order or money moves", () => {
  assert.match(WHAT_PAPER_TRADING_MEANS, /simulated/i);
  assert.match(WHAT_PAPER_TRADING_MEANS, /no real money/i);
});

test("why-real-execution-is-locked copy states there is no broker, API key, or live order routing", () => {
  assert.match(WHY_REAL_EXECUTION_IS_LOCKED, /locked/i);
  assert.match(WHY_REAL_EXECUTION_IS_LOCKED, /broker/i);
  assert.match(WHY_REAL_EXECUTION_IS_LOCKED, /api keys/i);
  assert.match(WHY_REAL_EXECUTION_IS_LOCKED, /live order routing/i);
});

test("not-financial-advice disclosure covers no real money, no broker/exchange, and no API keys", () => {
  assert.match(NOT_FINANCIAL_ADVICE_DISCLOSURE, /not financial advice/i);
  assert.match(NOT_FINANCIAL_ADVICE_DISCLOSURE, /no real money/i);
  assert.match(NOT_FINANCIAL_ADVICE_DISCLOSURE, /no broker or exchange/i);
  assert.match(NOT_FINANCIAL_ADVICE_DISCLOSURE, /no api keys/i);
});

test("live-market-data disclosure states it is read-only and never enables real trading, broker connections, or credentials", () => {
  assert.match(LIVE_MARKET_DATA_DISCLOSURE, /read-only/i);
  assert.match(LIVE_MARKET_DATA_DISCLOSURE, /never enables real trading/i);
  assert.match(LIVE_MARKET_DATA_DISCLOSURE, /no broker or exchange is connected/i);
  assert.match(LIVE_MARKET_DATA_DISCLOSURE, /no trading credentials/i);
  assert.match(LIVE_MARKET_DATA_DISCLOSURE, /no order is ever placed/i);
});

test("live-market-data disclosure prefers 'live public' and covers the four required safety statements", () => {
  assert.match(LIVE_MARKET_DATA_DISCLOSURE, /live public/i);
  assert.doesNotMatch(LIVE_MARKET_DATA_DISCLOSURE, /\blive trading\b/i);
  assert.match(LIVE_MARKET_DATA_DISCLOSURE, /paper-trading simulation only/i);
  assert.match(LIVE_MARKET_DATA_DISCLOSURE, /no broker or exchange account is connected/i);
  assert.match(LIVE_MARKET_DATA_DISCLOSURE, /no orders can be placed/i);
  assert.match(LIVE_MARKET_DATA_DISCLOSURE, /real execution remains locked/i);
});

test("why-real-execution-is-locked copy clarifies live public market data never grants order routing or account access", () => {
  assert.match(WHY_REAL_EXECUTION_IS_LOCKED, /read-only live public market data/i);
  assert.match(WHY_REAL_EXECUTION_IS_LOCKED, /never grants order routing/i);
});

test("what-is-aoc-capital copy names the advisor, risk constitution, and performance review", () => {
  assert.match(WHAT_IS_AOC_CAPITAL, /advisor/i);
  assert.match(WHAT_IS_AOC_CAPITAL, /risk constitution/i);
  assert.match(WHAT_IS_AOC_CAPITAL, /performance review/i);
});

// ─── Primary actions ─────────────────────────────────────────────────────────

test("primary actions are exactly Start Advisor, Choose Strategy, Load Demo Strategy, Review Performance, Generate Signals, in order", () => {
  assert.deepEqual(
    PRIMARY_ACTIONS.map((a) => a.label),
    ["Start Advisor", "Choose Strategy", "Load Demo Strategy", "Review Performance", "Generate Signals"]
  );
});

test("primary actions link to /capital/advisor, /capital/strategies, /capital/demo, /capital/performance, and /capital/signals", () => {
  assert.deepEqual(
    PRIMARY_ACTIONS.map((a) => a.href),
    ["/capital/advisor", "/capital/strategies", "/capital/demo", "/capital/performance", "/capital/signals"]
  );
});

test("every primary action has a non-empty description", () => {
  for (const action of PRIMARY_ACTIONS) {
    assert.ok(action.description.length > 0, `${action.label} is missing a description`);
  }
});

// ─── Guided journey ──────────────────────────────────────────────────────────

test("guided journey has exactly the eleven required stages in order", () => {
  assert.deepEqual(
    GUIDED_JOURNEY.map((s) => s.title),
    [
      "Advisor Intake",
      "Strategy Brief",
      "Strategy Library",
      "Signal Engine",
      "Risk Constitution",
      "Demo Sandbox",
      "Trade Intents",
      "Paper Positions",
      "Strategy Performance",
      "Audit Ledger",
      "Real Execution Readiness — Locked",
    ]
  );
});

test("guided journey steps are numbered 1 through 11 sequentially", () => {
  assert.deepEqual(GUIDED_JOURNEY.map((s) => s.step), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
});

test("guided journey links point at the real routes for each stage", () => {
  const hrefByTitle = Object.fromEntries(GUIDED_JOURNEY.map((s) => [s.title, s.href]));
  assert.equal(hrefByTitle["Advisor Intake"], "/capital/advisor");
  assert.equal(hrefByTitle["Strategy Brief"], "/capital/advisor");
  assert.equal(hrefByTitle["Strategy Library"], "/capital/strategies");
  assert.equal(hrefByTitle["Signal Engine"], "/capital/signals");
  assert.equal(hrefByTitle["Risk Constitution"], "/capital/risk-constitution");
  assert.equal(hrefByTitle["Demo Sandbox"], "/capital/demo");
  assert.equal(hrefByTitle["Trade Intents"], "/capital/trade-intents");
  assert.equal(hrefByTitle["Paper Positions"], "/capital/positions");
  assert.equal(hrefByTitle["Strategy Performance"], "/capital/performance");
  assert.equal(hrefByTitle["Audit Ledger"], "/capital/audit-ledger");
});

test("the final guided journey stage is locked and has no navigable href", () => {
  const last = GUIDED_JOURNEY[GUIDED_JOURNEY.length - 1];
  assert.equal(last.title, "Real Execution Readiness — Locked");
  assert.equal(last.locked, true);
  assert.equal(last.href, null);
});

test("no earlier guided journey stage is marked locked", () => {
  for (const step of GUIDED_JOURNEY.slice(0, -1)) {
    assert.notEqual(step.locked, true, `${step.title} should not be locked`);
  }
});

// ─── Capability / trust ladder ───────────────────────────────────────────────

test("capability ladder has exactly the four required levels in order", () => {
  assert.deepEqual(
    TRUST_LADDER.map((l) => l.title),
    ["Paper Simulation", "Expanded Paper Strategy", "Performance Readiness Review", "Gated Real Execution"]
  );
});

test("capability ladder levels are numbered 1 through 4", () => {
  assert.deepEqual(TRUST_LADDER.map((l) => l.level), [1, 2, 3, 4]);
});

test("only the real-execution level is locked; the rest are active or available", () => {
  const statusByTitle = Object.fromEntries(TRUST_LADDER.map((l) => [l.title, l.status]));
  assert.equal(statusByTitle["Paper Simulation"], "active");
  assert.equal(statusByTitle["Expanded Paper Strategy"], "available");
  assert.equal(statusByTitle["Performance Readiness Review"], "available");
  assert.equal(statusByTitle["Gated Real Execution"], "locked");
});

// ─── Discoverability links ───────────────────────────────────────────────────

test("discoverability links cover advisor, demo, performance, risk constitution, paper positions, market data, and audit ledger", () => {
  const hrefs = DISCOVERABILITY_LINKS.map((l) => l.href);
  for (const required of [
    "/capital/advisor",
    "/capital/strategies",
    "/capital/signals",
    "/capital/demo",
    "/capital/performance",
    "/capital/risk-constitution",
    "/capital/positions",
    "/capital/market-data",
    "/capital/audit-ledger",
  ]) {
    assert.ok(hrefs.includes(required), `missing discoverability link to ${required}`);
  }
});

test("every discoverability link has a unique href and a non-empty label", () => {
  const hrefs = DISCOVERABILITY_LINKS.map((l) => l.href);
  assert.equal(new Set(hrefs).size, hrefs.length);
  for (const link of DISCOVERABILITY_LINKS) {
    assert.ok(link.label.length > 0);
  }
});
