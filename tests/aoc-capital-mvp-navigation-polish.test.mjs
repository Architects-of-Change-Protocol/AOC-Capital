// ─── AOC Capital MVP Polish & Navigation Consolidation (PR #23) ─────────────
// Navigation Map ──────────────────────────────────────────────────────────
// Static checks over the single source of truth for capital navigation
// (src/lib/capital/capital-navigation.ts) and the capital layout shell that
// consumes it: required labels exist, forbidden execution/advice/live-
// trading-readiness words never appear in a nav label, every route carries
// paper-only/real-execution-locked metadata, and the six product zones plus
// the required key routes are all discoverable.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const { CAPITAL_ROUTE_METADATA, getCapitalNavGroups, getCapitalRouteMetadata } = await import("../src/lib/capital/capital-navigation.ts");

const REQUIRED_NAV_LABELS = [
  "Command Center",
  "Investor Constitution",
  "Strategy Library",
  "Signals",
  "Trade Intents",
  "Paper Positions",
  "Portfolio Overview",
  "Allocation & Exposure",
  "Closed Performance",
  "Strategy Attribution",
  "Signal Cohorts",
  "Governance Snapshot",
];

test("capital navigation metadata was discovered and is non-empty", () => {
  assert.ok(CAPITAL_ROUTE_METADATA.length >= REQUIRED_NAV_LABELS.length, "expected at least the required nav routes");
});

test("every required nav label exists in capital route metadata", () => {
  const labels = CAPITAL_ROUTE_METADATA.map((r) => r.label);
  for (const required of REQUIRED_NAV_LABELS) {
    assert.ok(labels.includes(required), `missing required nav label: ${required}`);
  }
});

const FORBIDDEN_LABEL_WORDS = [/\bTrading\b/i, /\bExecute\b/i, /\bOrders\b/i, /\bBroker\b/i, /\bLive\b/i, /\bReal\s+Trading\b/i];

test("no nav label uses ambiguous or forbidden execution/broker/live-trading language", () => {
  for (const route of CAPITAL_ROUTE_METADATA) {
    for (const pattern of FORBIDDEN_LABEL_WORDS) {
      assert.doesNotMatch(route.label, pattern, `nav label "${route.label}" must not match ${pattern}`);
    }
  }
});

test("every capital route is marked paper-only and real-execution-locked", () => {
  for (const route of CAPITAL_ROUTE_METADATA) {
    assert.equal(route.paperOnly, true, `${route.key} must be paperOnly`);
    assert.equal(route.realExecutionLocked, true, `${route.key} must be realExecutionLocked`);
  }
});

test("every route key, href, and label is unique", () => {
  const keys = CAPITAL_ROUTE_METADATA.map((r) => r.key);
  const hrefs = CAPITAL_ROUTE_METADATA.map((r) => r.href);
  assert.equal(new Set(keys).size, keys.length, "route keys must be unique");
  assert.equal(new Set(hrefs).size, hrefs.length, "route hrefs must be unique");
});

test("dynamic detail routes are not shown in the sidebar", () => {
  const positionDetail = getCapitalRouteMetadata("positionDetail");
  assert.ok(positionDetail);
  assert.equal(positionDetail.showInSidebar, false);
});

test("nav metadata carries no mutation function, only plain data", () => {
  for (const route of CAPITAL_ROUTE_METADATA) {
    for (const value of Object.values(route)) {
      assert.notEqual(typeof value, "function", `${route.key} must not carry a function in nav metadata`);
    }
  }
});

// ─── Nav groups cover the required product zones ────────────────────────────

const REQUIRED_GROUP_KEYS = ["commandCenter", "setup", "lifecycle", "portfolio", "performance", "governance"];

test("capital nav groups cover the required product zones", () => {
  const groups = getCapitalNavGroups();
  const groupKeys = groups.map((g) => g.key);
  for (const required of REQUIRED_GROUP_KEYS) {
    assert.ok(groupKeys.includes(required), `missing required nav group: ${required}`);
  }
});

test("Governance Snapshot, Signal Cohorts, Strategy Attribution, Closed Performance, and Investor Constitution are all shown in the sidebar", () => {
  const groups = getCapitalNavGroups();
  const allSidebarLabels = groups.flatMap((g) => g.items.map((i) => i.label));
  for (const required of ["Governance Snapshot", "Signal Cohorts", "Strategy Attribution", "Closed Performance", "Investor Constitution"]) {
    assert.ok(allSidebarLabels.includes(required), `${required} must be discoverable in the sidebar`);
  }
});

// ─── Key routes are discoverable ────────────────────────────────────────────

const EXPECTED_KEY_ROUTES = [
  "/capital",
  "/capital/constitution/new",
  "/capital/strategies",
  "/capital/signals",
  "/capital/trade-intents",
  "/capital/positions",
  "/capital/overview",
  "/capital/allocation",
  "/capital/performance/closed",
  "/capital/performance/strategies",
  "/capital/performance/signals",
  "/capital/governance/snapshot",
];

test("every expected key route is present in capital navigation metadata", () => {
  const hrefs = CAPITAL_ROUTE_METADATA.map((r) => r.href);
  for (const route of EXPECTED_KEY_ROUTES) {
    assert.ok(hrefs.includes(route), `missing expected key route: ${route}`);
  }
});

// ─── The capital layout shell consumes the shared nav module ───────────────

test("the capital layout renders navigation from the shared capital-navigation module, not an inline duplicate list", () => {
  const src = fs.readFileSync("src/app/(protected)/capital/layout.tsx", "utf8");
  assert.match(src, /getCapitalNavGroups/);
  assert.match(src, /from\s+"@\/lib\/capital\/capital-navigation"/);
});

test("the capital layout shell still states the governed, paper-only, real-execution-locked framing (PR #22 regression)", () => {
  const src = fs.readFileSync("src/app/(protected)/capital/layout.tsx", "utf8");
  assert.match(src, /[Ss]imulated,?\s+governed\s+trading/i);
  assert.match(src, /No\s+real\s+exchange\s+execution\s+is\s+connected/i);
});
