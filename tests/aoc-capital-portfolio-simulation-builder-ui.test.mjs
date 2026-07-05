// ─── AOC Capital Portfolio Simulation Builder (/capital/simulations/new) —
// UI Copy & Safety Static Source Checks ──────────────────────────────────────
// Mirrors the static-source-check pattern used across this suite (e.g.
// tests/aoc-capital-constitution-result-ui.test.mjs) — checks the route's
// page, content component, and copy module source for required copy and
// forbidden execution/advice language, without rendering React.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const ROUTE_DIR = "src/app/(protected)/capital/simulations/new";

const pageTsx = fs.readFileSync(`${ROUTE_DIR}/page.tsx`, "utf8");
const contentComponentTsx = fs.readFileSync(`${ROUTE_DIR}/portfolio-simulation-builder-content.tsx`, "utf8");
const contentTs = fs.readFileSync("src/lib/capital/portfolio-simulation-builder-content.ts", "utf8");
const domainTs = fs.readFileSync("src/features/capital/domain/portfolio-simulation-builder.ts", "utf8");
const handoffTs = fs.readFileSync("src/lib/capital/investor-constitution-handoff.ts", "utf8");
const resultContentComponentTsx = fs.readFileSync(
  "src/app/(protected)/capital/constitution/result/constitution-result-content.tsx",
  "utf8"
);

const {
  PAGE_TITLE,
  PAGE_SUBTITLE,
  STATUS_BADGE_PAPER_ONLY,
  STATUS_BADGE_NO_REAL_ORDER,
  STATUS_BADGE_REAL_EXECUTION_LOCKED,
  NO_CONSTITUTION_HEADING,
  SECTION_TITLE_STRATEGY_SELECTION,
  SECTION_TITLE_ASSUMPTIONS,
  ASSUMPTIONS_LABELS,
  SECTION_TITLE_ALLOCATION,
  ALLOCATION_TOTAL_LABEL,
  CTA_VALIDATE,
  CTA_CREATE_SIMULATION_RECORD,
  CTA_CREATE_SIMULATION_RECORD_DISABLED_REASON,
  STRATEGY_GROUP_TITLES,
} = await import("../src/lib/capital/portfolio-simulation-builder-content.ts");

// ─── Route exists ────────────────────────────────────────────────────────────

test("the /capital/simulations/new route exists", () => {
  assert.ok(fs.existsSync(`${ROUTE_DIR}/page.tsx`));
  assert.ok(fs.existsSync(`${ROUTE_DIR}/portfolio-simulation-builder-content.tsx`));
});

test("the page requires an authenticated user and renders the content component", () => {
  assert.match(pageTsx, /requireAuthUser/);
  assert.match(pageTsx, /PortfolioSimulationBuilderContent/);
});

// ─── Required copy ───────────────────────────────────────────────────────────

test("page title is 'Build a Paper Portfolio Simulation'", () => {
  assert.equal(PAGE_TITLE, "Build a Paper Portfolio Simulation");
  assert.match(contentComponentTsx, /PAGE_TITLE/);
});

test("subtitle mentions educational paper trading and not investment advice", () => {
  assert.match(PAGE_SUBTITLE, /educational paper trading/i);
  assert.match(PAGE_SUBTITLE, /not investment advice/i);
});

test("badges cover paper trading only, no real order, and real execution locked", () => {
  assert.match(STATUS_BADGE_PAPER_ONLY, /paper trading only/i);
  assert.match(STATUS_BADGE_NO_REAL_ORDER, /no real order/i);
  assert.match(STATUS_BADGE_REAL_EXECUTION_LOCKED, /real execution locked/i);
  assert.match(contentComponentTsx, /STATUS_BADGE_PAPER_ONLY/);
  assert.match(contentComponentTsx, /STATUS_BADGE_NO_REAL_ORDER/);
  assert.match(contentComponentTsx, /STATUS_BADGE_REAL_EXECUTION_LOCKED/);
});

test("missing-constitution empty state uses the required heading, copy, and CTA", () => {
  assert.equal(NO_CONSTITUTION_HEADING, "Create an Investor Constitution before building a simulation.");
  assert.match(contentComponentTsx, /NO_CONSTITUTION_HEADING/);
  assert.match(contentComponentTsx, /NO_CONSTITUTION_COPY/);
  assert.match(contentComponentTsx, /NO_CONSTITUTION_CTA/);
  assert.match(contentComponentTsx, /href="\/capital\/constitution\/new"/);
});

test("strategy selection section is titled 'Select an approved paper strategy'", () => {
  assert.equal(SECTION_TITLE_STRATEGY_SELECTION, "Select an approved paper strategy");
  assert.match(contentComponentTsx, /SECTION_TITLE_STRATEGY_SELECTION/);
});

test("unavailable strategy groups cover advisor review, blocked, and locked", () => {
  assert.equal(STRATEGY_GROUP_TITLES.requiresAdvisorReview, "Requires advisor review");
  assert.equal(STRATEGY_GROUP_TITLES.blockedByConstitution, "Blocked by Investor Constitution");
  assert.equal(STRATEGY_GROUP_TITLES.lockedAdvanced, "Advanced / locked");
  assert.match(contentComponentTsx, /STRATEGY_GROUP_TITLES\.requiresAdvisorReview/);
  assert.match(contentComponentTsx, /STRATEGY_GROUP_TITLES\.blockedByConstitution/);
  assert.match(contentComponentTsx, /STRATEGY_GROUP_TITLES\.lockedAdvanced/);
});

test("simulation assumptions section uses the required section title and safe input labels", () => {
  assert.equal(SECTION_TITLE_ASSUMPTIONS, "Simulation Assumptions");
  assert.equal(ASSUMPTIONS_LABELS.initialAmount, "Initial simulated amount");
  assert.equal(ASSUMPTIONS_LABELS.monthlyContribution, "Monthly simulated contribution");
  assert.equal(ASSUMPTIONS_LABELS.timeHorizonYears, "Simulation horizon");
  assert.equal(ASSUMPTIONS_LABELS.rebalanceFrequency, "Rebalance frequency");
  assert.match(contentComponentTsx, /SECTION_TITLE_ASSUMPTIONS/);
  assert.match(contentComponentTsx, /ASSUMPTIONS_LABELS\.initialAmount/);
  assert.match(contentComponentTsx, /ASSUMPTIONS_LABELS\.monthlyContribution/);
  assert.match(contentComponentTsx, /ASSUMPTIONS_LABELS\.timeHorizonYears/);
  assert.match(contentComponentTsx, /ASSUMPTIONS_LABELS\.rebalanceFrequency/);
});

test("hypothetical allocation section shows the required section title and total allocation label", () => {
  assert.equal(SECTION_TITLE_ALLOCATION, "Hypothetical Allocation");
  assert.equal(ALLOCATION_TOTAL_LABEL, "Total allocation");
  assert.match(contentComponentTsx, /SECTION_TITLE_ALLOCATION/);
  assert.match(contentComponentTsx, /ALLOCATION_TOTAL_LABEL/);
});

test("CTA area shows 'Validate Paper Simulation' and a disabled 'Create Simulation Record' with the required helper copy", () => {
  assert.equal(CTA_VALIDATE, "Validate Paper Simulation");
  assert.equal(CTA_CREATE_SIMULATION_RECORD, "Create Simulation Record");
  assert.equal(CTA_CREATE_SIMULATION_RECORD_DISABLED_REASON, "Simulation record persistence comes next.");
  assert.match(contentComponentTsx, /CTA_VALIDATE/);
  assert.match(contentComponentTsx, /CTA_CREATE_SIMULATION_RECORD/);
  assert.match(contentComponentTsx, /disabled/);
});

// ─── Domain layer wiring ─────────────────────────────────────────────────────

test("the content component uses the domain builder functions rather than re-implementing allocation logic", () => {
  assert.match(contentComponentTsx, /buildDefaultAllocationForStrategy/);
  assert.match(contentComponentTsx, /validateDraftSimulationAllocation/);
  assert.match(contentComponentTsx, /validateSimulationAssumptions/);
  assert.match(contentComponentTsx, /buildPortfolioSimulationDraft/);
  assert.match(contentComponentTsx, /getSimulationBuilderEligibility/);
});

test("the content component reads the Investor Constitution through the existing sessionStorage handoff, not a new mechanism", () => {
  assert.match(contentComponentTsx, /loadInvestorConstitutionForResult/);
});

test("the eligibility helper reuses buildStrategyEligibilitySummary rather than duplicating suitability logic", () => {
  assert.match(domainTs, /buildStrategyEligibilitySummary/);
  assert.match(domainTs, /evaluateStrategySuitability/);
});

// ─── Navigation from the Constitution Result page ───────────────────────────

test("the Constitution Result page links to /capital/simulations/new", () => {
  assert.match(resultContentComponentTsx, /href="\/capital\/simulations\/new"/);
});

// ─── Safety: no LLM, no market data, no simulation persistence/trade-intent/broker/execution surface ─

const SAFETY_SOURCES = { pageTsx, contentComponentTsx, contentTs, domainTs, handoffTs };

test("no source file in the simulation builder feature calls an LLM, fetches market data, or touches Supabase", () => {
  for (const [name, source] of Object.entries(SAFETY_SOURCES)) {
    for (const forbidden of [
      /openai/i,
      /anthropic/i,
      /chat\.completions/,
      /responses\.create/,
      /getMarketData/,
      /markAllOpenPositions/,
      /createSupabaseServerClient/,
      /supabase\./i,
    ]) {
      assert.doesNotMatch(source, forbidden, `${name} should not match ${forbidden}`);
    }
  }
});

test("no source file in the simulation builder feature creates a signal, trade intent, paper position, or submits for Risk Constitution review", () => {
  for (const [name, source] of Object.entries(SAFETY_SOURCES)) {
    for (const forbidden of [
      /generateSignals\(/,
      /createTradeIntent/i,
      /submitDraftTradeIntentForReview/,
      /submit draft/i,
      /Risk Constitution review/i,
      /openPaperPosition/i,
      /closePaperPosition/i,
      /requestPaperCloseReview/i,
    ]) {
      assert.doesNotMatch(source, forbidden, `${name} should not match ${forbidden}`);
    }
  }
});

test("no source file in the simulation builder feature connects to a broker or exchange, stores API keys, or routes a real order", () => {
  for (const [name, source] of Object.entries(SAFETY_SOURCES)) {
    for (const forbidden of [
      /\bbroker\b/i,
      /\bexchange\b/i,
      /accountId/,
      /orderId/,
      /apiSecret/i,
      /privateKey/i,
      /placeOrder/i,
      /createOrder/i,
      /executeTrade/i,
      /orderRouter/i,
      /signedRequest/i,
      /withdraw/i,
      /\bdeposit\b/i,
      /liveOrder/i,
      /realOrder/i,
      /executionStatus/i,
    ]) {
      assert.doesNotMatch(source, forbidden, `${name} should not match ${forbidden}`);
    }
  }
});

test("no source file in the simulation builder feature adds an order/trade-intent/persistence API route", () => {
  for (const [name, source] of Object.entries(SAFETY_SOURCES)) {
    for (const forbidden of [/\/api\/capital\/trade-intents/, /\/api\/capital\/paper-positions/, /\/api\/capital\/simulations/]) {
      assert.doesNotMatch(source, forbidden, `${name} should not match ${forbidden}`);
    }
  }
});

test("the route never posts a mutation over the network", () => {
  assert.doesNotMatch(pageTsx, /fetch\(/);
  assert.doesNotMatch(contentComponentTsx, /fetch\(/);
});

test("the content component never persists a simulation record — it only builds a local draft", () => {
  assert.doesNotMatch(contentComponentTsx, /createDraftSimulationRecord/);
  assert.doesNotMatch(contentComponentTsx, /\.insert\(|\.upsert\(/);
});

const FORBIDDEN_EXECUTION_COPY =
  /recommended portfolio|you should invest|\bbuy\b|\bsell\b|\bexecute\b|place order|send to broker|connect exchange|live trade|real trade|best portfolio|profit forecast|guaranteed return|expected return|alpha prediction/i;

test("the page never uses forbidden execution/advice/prediction language", () => {
  assert.doesNotMatch(pageTsx, FORBIDDEN_EXECUTION_COPY);
});

test("the content component never uses forbidden execution/advice/prediction language", () => {
  assert.doesNotMatch(contentComponentTsx, FORBIDDEN_EXECUTION_COPY);
});

test("the copy module never uses forbidden execution/advice/prediction language", () => {
  assert.doesNotMatch(contentTs, FORBIDDEN_EXECUTION_COPY);
});

test("the domain module never uses forbidden execution/advice/prediction language in user-facing strings", () => {
  assert.doesNotMatch(domainTs, FORBIDDEN_EXECUTION_COPY);
});
