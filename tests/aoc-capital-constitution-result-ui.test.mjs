// ─── AOC Capital — Investor Constitution Result (/capital/constitution/result)
// — UI Copy & Safety Static Source Checks ────────────────────────────────────
// Mirrors the static-source-check pattern used across this suite (e.g.
// tests/aoc-capital-investor-constitution-intake-ui.test.mjs) — checks the
// route's content module, page, and client component source for required
// copy and forbidden execution/advice language, without rendering React.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const ROUTE_DIR = "src/app/(protected)/capital/constitution/result";

const pageTsx = fs.readFileSync(`${ROUTE_DIR}/page.tsx`, "utf8");
const contentComponentTsx = fs.readFileSync(`${ROUTE_DIR}/constitution-result-content.tsx`, "utf8");
const resultContentTs = fs.readFileSync("src/lib/capital/investor-constitution-result-content.ts", "utf8");
const handoffTs = fs.readFileSync("src/lib/capital/investor-constitution-handoff.ts", "utf8");
const readingTs = fs.readFileSync("src/features/capital/domain/investor-constitution-reading.ts", "utf8");
const eligibilityTs = fs.readFileSync("src/features/capital/domain/strategy-eligibility-summary.ts", "utf8");

const {
  PAGE_TITLE,
  PAGE_SUBTITLE,
  STATUS_BADGE_PAPER_ONLY,
  STATUS_BADGE_REAL_EXECUTION_LOCKED,
  ELIGIBILITY_SECTION_TITLES,
  EMPTY_STATE_NO_STRATEGIES,
  EMPTY_STATE_ONLY_CASH,
  CTA_CONTINUE_TO_SIMULATION,
  CTA_CONTINUE_TO_SIMULATION_DISABLED_REASON,
} = await import("../src/lib/capital/investor-constitution-result-content.ts");

// ─── Route exists ────────────────────────────────────────────────────────────

test("the /capital/constitution/result route exists", () => {
  assert.ok(fs.existsSync(`${ROUTE_DIR}/page.tsx`));
  assert.ok(fs.existsSync(`${ROUTE_DIR}/constitution-result-content.tsx`));
});

test("the page requires an authenticated user", () => {
  assert.match(pageTsx, /requireAuthUser/);
});

test("the page renders the result content component", () => {
  assert.match(pageTsx, /ConstitutionResultContent/);
});

// ─── Required copy ───────────────────────────────────────────────────────────

test("page title is 'Your Investor Constitution v0.1'", () => {
  assert.equal(PAGE_TITLE, "Your Investor Constitution v0.1");
  assert.match(contentComponentTsx, /RESULT_TITLE/);
});

test("subtitle states this is not investment advice", () => {
  assert.match(PAGE_SUBTITLE, /not investment advice/i);
});

test("status badges include paper trading only and real execution locked", () => {
  assert.match(STATUS_BADGE_PAPER_ONLY, /paper trading only/i);
  assert.match(STATUS_BADGE_REAL_EXECUTION_LOCKED, /real execution locked/i);
  assert.match(contentComponentTsx, /STATUS_BADGE_PAPER_ONLY/);
  assert.match(contentComponentTsx, /STATUS_BADGE_REAL_EXECUTION_LOCKED/);
});

test("eligibility section titles match the required grouping copy", () => {
  assert.equal(ELIGIBILITY_SECTION_TITLES.availableForSimulation, "Available for paper simulation");
  assert.equal(ELIGIBILITY_SECTION_TITLES.blockedByConstitution, "Blocked by Investor Constitution");
  assert.equal(ELIGIBILITY_SECTION_TITLES.requiresAdvisorReview, "Requires advisor review");
  assert.equal(ELIGIBILITY_SECTION_TITLES.lockedAdvanced, "Advanced / locked");
});

test("the content component renders all eligibility groups", () => {
  assert.match(contentComponentTsx, /ELIGIBILITY_SECTION_TITLES\.availableForSimulation/);
  assert.match(contentComponentTsx, /ELIGIBILITY_SECTION_TITLES\.blockedByConstitution/);
  assert.match(contentComponentTsx, /ELIGIBILITY_SECTION_TITLES\.requiresAdvisorReview/);
  assert.match(contentComponentTsx, /ELIGIBILITY_SECTION_TITLES\.lockedAdvanced/);
  assert.match(contentComponentTsx, /ELIGIBILITY_SECTION_TITLES\.deprecatedOrBlocked/);
});

test("empty-state copy covers no available strategies and cash-only availability", () => {
  assert.match(EMPTY_STATE_NO_STRATEGIES, /no strategies are currently available for paper simulation/i);
  assert.match(EMPTY_STATE_ONLY_CASH, /prioritizes liquidity/i);
  assert.match(contentComponentTsx, /EMPTY_STATE_NO_STRATEGIES/);
  assert.match(contentComponentTsx, /EMPTY_STATE_ONLY_CASH/);
});

test("the content component shows strategy version, suitability messages, prohibited instruments, and max crypto exposure", () => {
  assert.match(contentComponentTsx, /card\.version/);
  assert.match(contentComponentTsx, /card\.suitability\.flags/);
  assert.match(contentComponentTsx, /Prohibited instruments/);
  assert.match(contentComponentTsx, /Max crypto exposure/);
});

// ─── Next-step CTA ───────────────────────────────────────────────────────────

test("CTA copy is 'Continue to Strategy Simulation' with a disabled reason of 'Simulation builder comes next'", () => {
  assert.equal(CTA_CONTINUE_TO_SIMULATION, "Continue to Strategy Simulation");
  assert.equal(CTA_CONTINUE_TO_SIMULATION_DISABLED_REASON, "Simulation builder comes next");
});

test("the CTA button is disabled in the content component and does not create a simulation", () => {
  assert.match(contentComponentTsx, /CTA_CONTINUE_TO_SIMULATION/);
  assert.match(contentComponentTsx, /disabled/);
  assert.doesNotMatch(contentComponentTsx, /createSimulation|createDraftSimulationRecord/);
});

// ─── Domain layer wiring ─────────────────────────────────────────────────────

test("the eligibility summary module calls the existing Strategy Registry and Suitability Consistency Engine rather than duplicating rules", () => {
  assert.match(eligibilityTs, /STRATEGY_REGISTRY/);
  assert.match(eligibilityTs, /evaluateStrategySuitability/);
});

test("the reading module never imports an LLM client or prompt builder", () => {
  assert.doesNotMatch(readingTs, /openai|anthropic|capital-explanation-prompt/i);
});

// ─── Safety: no LLM, no market data, no simulation/trade-intent/broker/execution surface ─

const SAFETY_SOURCES = { pageTsx, contentComponentTsx, resultContentTs, handoffTs, readingTs, eligibilityTs };

test("no source file in the result feature calls an LLM or fetches market data", () => {
  for (const [name, source] of Object.entries(SAFETY_SOURCES)) {
    for (const forbidden of [/openai/i, /anthropic/i, /getMarketData/, /createSupabaseServerClient/, /supabase\./i]) {
      assert.doesNotMatch(source, forbidden, `${name} should not match ${forbidden}`);
    }
  }
});

test("no source file in the result feature creates a simulation record, trade intent, or order", () => {
  for (const [name, source] of Object.entries(SAFETY_SOURCES)) {
    for (const forbidden of [
      /createDraftSimulationRecord/,
      /createTradeIntent/,
      /placeOrder/i,
      /submitOrder/i,
      /\/api\/capital\/trade-intents/,
      /\/api\/capital\/paper-positions/,
    ]) {
      assert.doesNotMatch(source, forbidden, `${name} should not match ${forbidden}`);
    }
  }
});

test("no source file in the result feature connects to a broker or exchange, or routes a real order", () => {
  for (const [name, source] of Object.entries(SAFETY_SOURCES)) {
    for (const forbidden of [/\bbroker\b/i, /\bexchange\b/i, /connectExchange/i, /liveOrder/i, /realOrder/i, /liveTrade/i, /realTrade/i]) {
      assert.doesNotMatch(source, forbidden, `${name} should not match ${forbidden}`);
    }
  }
});

test("the route never posts a mutation over the network", () => {
  assert.doesNotMatch(pageTsx, /fetch\(/);
  assert.doesNotMatch(contentComponentTsx, /fetch\(/);
});

const FORBIDDEN_EXECUTION_COPY =
  /recommended portfolio|you should invest|\bbuy\b|\bsell\b|\bexecute\b|place order|send to broker|live trade|real trade|best portfolio/i;

test("the page never uses forbidden execution/advice language", () => {
  assert.doesNotMatch(pageTsx, FORBIDDEN_EXECUTION_COPY);
});

test("the content component never uses forbidden execution/advice language", () => {
  assert.doesNotMatch(contentComponentTsx, FORBIDDEN_EXECUTION_COPY);
});

test("the result content module never uses forbidden execution/advice language", () => {
  assert.doesNotMatch(resultContentTs, FORBIDDEN_EXECUTION_COPY);
});
