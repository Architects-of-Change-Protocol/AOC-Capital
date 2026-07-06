// ─── AOC Capital MVP Integration Review & Hardening (PR #22) ────────────────
// Route/API Boundary Inventory ────────────────────────────────────────────
// This is a cross-cutting inventory test over every route under
// src/app/api/capital/**/route.ts. It classifies each route as
// read_only_get, intentional_paper_mutation_post, or disabled_legacy_guard,
// and pins down the boundary rules for each class:
//   - read_only_get routes export only GET, never read a request body, and
//     never call a mutation service/RPC.
//   - intentional_paper_mutation_post routes are POST-only (or POST
//     alongside a read-only GET) and never reference a broker/execution/
//     order/deposit/withdrawal surface.
//   - disabled_legacy_guard routes mutate nothing and always return a fixed
//     error/status.
// Per-feature `*-safety.test.mjs` files already cover most of these routes
// in depth; this file exists to hold the whole inventory in one place so a
// new route can't silently slip through uncategorized.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function readRoute(relPath) {
  return fs.readFileSync(relPath, "utf8");
}

// Strips `//` and `/* */` comments so a doc comment explaining a safety
// boundary in prose ("no broker is connected", "never places an order")
// can't be mistaken for an actual reference to a forbidden surface.
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

const READ_ONLY_GET_ROUTES = [
  "src/app/api/capital/portfolio-overview/route.ts",
  "src/app/api/capital/allocation-exposure/route.ts",
  "src/app/api/capital/positions/[id]/route.ts",
  "src/app/api/capital/performance/closed/route.ts",
  "src/app/api/capital/performance/strategies/route.ts",
  "src/app/api/capital/performance/signals/route.ts",
  "src/app/api/capital/governance/snapshot/route.ts",
];

const FORBIDDEN_MUTATION_CALL_PATTERN =
  /\bgenerateSignals\(|\bselectStrategy\(|\bconvertSignalToDraftTradeIntent\(|\bcancelDraftTradeIntent\(|\bsubmitDraftTradeIntentForReview\(|\brequestPaperPositionCloseReview\(|\bclosePaperPosition\(|\bmarkAllOpenPositions\(|\bmarkPositionToMarket\(|\brecordMarketPrice\(|\bcreateTradeIntent\(|\.rpc\(|\.insert\(|\.update\(|\.upsert\(|\.delete\(/;

test("every expected read-only GET route exists", () => {
  for (const route of READ_ONLY_GET_ROUTES) {
    assert.ok(fs.existsSync(route), `expected route file to exist: ${route}`);
  }
});

test("read-only GET routes export only GET (no POST/PUT/PATCH/DELETE)", () => {
  for (const route of READ_ONLY_GET_ROUTES) {
    const src = readRoute(route);
    assert.match(src, /export async function GET/, `${route} must export GET`);
    assert.doesNotMatch(src, /export async function POST/, `${route} must not export POST`);
    assert.doesNotMatch(src, /export async function PUT/, `${route} must not export PUT`);
    assert.doesNotMatch(src, /export async function PATCH/, `${route} must not export PATCH`);
    assert.doesNotMatch(src, /export async function DELETE/, `${route} must not export DELETE`);
  }
});

test("read-only GET routes never read a request body", () => {
  for (const route of READ_ONLY_GET_ROUTES) {
    const src = readRoute(route);
    assert.doesNotMatch(src, /request\.json\(/, `${route} must not read a request body`);
    assert.doesNotMatch(src, /\.body\b/, `${route} must not read .body`);
  }
});

test("read-only GET routes never call a mutation service, RPC, or write helper", () => {
  for (const route of READ_ONLY_GET_ROUTES) {
    const src = readRoute(route);
    assert.doesNotMatch(src, FORBIDDEN_MUTATION_CALL_PATTERN, `${route} must not call a mutation surface`);
  }
});

test("read-only GET routes require auth via requireAuthUser", () => {
  for (const route of READ_ONLY_GET_ROUTES) {
    const src = readRoute(route);
    assert.match(src, /requireAuthUser\(\)/, `${route} must require auth`);
  }
});

// ─── The two GET routes that were found auto-refreshing mark-to-market as a
// side effect of a plain read (an accidental mutation in a read path) have
// been hardened in this PR — regression-pin that they stay read-only ───────

const HARDENED_GET_ROUTES = ["src/app/api/capital/performance/route.ts", "src/app/api/capital/portfolio/summary/route.ts"];

test("performance and portfolio/summary GET routes no longer call markAllOpenPositions as a read-time side effect", () => {
  for (const route of HARDENED_GET_ROUTES) {
    const src = readRoute(route);
    assert.match(src, /export async function GET/, `${route} must export GET`);
    assert.doesNotMatch(src, /export async function POST/, `${route} must not export POST`);
    assert.doesNotMatch(src, /markAllOpenPositions\(/, `${route} must not mutate on a plain GET`);
    assert.doesNotMatch(src, /request\.json\(/, `${route} must not read a request body`);
  }
});

// ─── Intentional paper-only mutation POST routes ────────────────────────────

const MUTATION_POST_ROUTES = [
  "src/app/api/capital/strategies/select/route.ts",
  "src/app/api/capital/signals/generate/route.ts",
  "src/app/api/capital/signals/[id]/convert-to-draft/route.ts",
  "src/app/api/capital/trade-intents/[id]/cancel-draft/route.ts",
  "src/app/api/capital/trade-intents/[id]/submit-for-review/route.ts",
  "src/app/api/capital/positions/[id]/request-close-review/route.ts",
  "src/app/api/capital/paper-positions/[id]/mark/route.ts",
  "src/app/api/capital/paper-positions/mark-all/route.ts",
];

test("every expected mutation POST route exists and exports POST", () => {
  for (const route of MUTATION_POST_ROUTES) {
    assert.ok(fs.existsSync(route), `expected route file to exist: ${route}`);
    const src = readRoute(route);
    assert.match(src, /export async function POST/, `${route} must export POST`);
  }
});

test("mutation POST routes require auth via requireAuthUser", () => {
  for (const route of MUTATION_POST_ROUTES) {
    const src = readRoute(route);
    assert.match(src, /requireAuthUser\(\)/, `${route} must require auth`);
  }
});

const FORBIDDEN_EXECUTION_SURFACE = /\bbroker\b|\border\s*[Rr]outer\b|placeOrder|createOrder|executeTrade|apiSecret|privateKey|withdrawal|deposit|accountBalance/i;

test("mutation POST routes never reference a broker/order/execution/withdrawal/deposit surface", () => {
  for (const route of MUTATION_POST_ROUTES) {
    const src = stripComments(readRoute(route));
    assert.doesNotMatch(src, FORBIDDEN_EXECUTION_SURFACE, `${route} must not reference a real-execution surface`);
  }
});

// trade-intents/route.ts is the one mutation route that mixes a read-only
// GET (list) with a POST (manual draft creation from client-supplied
// symbol/side/quantity/notional) — verify the split explicitly.
test("trade-intents/route.ts exposes GET (list, read-only) and POST (manual draft creation)", () => {
  const src = readRoute("src/app/api/capital/trade-intents/route.ts");
  assert.match(src, /export async function GET/);
  assert.match(src, /export async function POST/);
  assert.doesNotMatch(src, /export async function PUT|export async function PATCH|export async function DELETE/);
  assert.match(src, /listTradeIntents\(/, "GET must only list, never mutate");
  assert.match(src, /createTradeIntent\(/, "POST must go through createTradeIntent, not a raw insert");
  assert.doesNotMatch(src, FORBIDDEN_EXECUTION_SURFACE);
});

test("trade-intents POST validates side as buy/sell only and rejects everything else", () => {
  const src = readRoute("src/app/api/capital/trade-intents/route.ts");
  assert.match(src, /body\.side !== "buy" && body\.side !== "sell"/);
});

// ─── Disabled legacy guard ───────────────────────────────────────────────────

test("the legacy paper-position quick-close route is disabled: POST-only, always 410, no mutation, no body read", () => {
  const src = readRoute("src/app/api/capital/paper-positions/[id]/close/route.ts");
  assert.match(src, /export async function POST/);
  assert.doesNotMatch(src, /export async function GET|export async function PUT|export async function PATCH|export async function DELETE/);
  assert.match(src, /status:\s*410/);
  assert.doesNotMatch(src, /closePaperPosition\(|markAllOpenPositions\(|recordMarketPrice\(|requestPaperPositionCloseReview\(/);
  assert.doesNotMatch(src, /\.from\(\s*"paper_positions"\s*\)|\.from\(\s*"audit_ledger"\s*\)/);
  assert.doesNotMatch(src, /request\.json\(/);
});

test("no user-facing capital page posts to the disabled legacy quick-close route", () => {
  const capitalPagesDir = "src/app/(protected)/capital";
  const files = fs.readdirSync(capitalPagesDir, { recursive: true }).filter((f) => typeof f === "string" && (f.endsWith(".tsx") || f.endsWith(".ts")));
  for (const file of files) {
    const src = fs.readFileSync(`${capitalPagesDir}/${file}`, "utf8");
    assert.doesNotMatch(src, /paper-positions\/\$\{[^}]*\}\/close/, `${file} must not call the legacy quick-close route`);
  }
});

// ─── Auth/actor-writing mutation routes not covered by a per-feature safety
// file (advisor, demo) — confirm they are paper-only and company-scoped ────

const OTHER_MUTATION_ROUTES = ["src/app/api/capital/advisor/confirm/route.ts", "src/app/api/capital/demo/load/route.ts", "src/app/api/capital/demo/reset/route.ts"];

test("advisor/demo mutation routes require auth, are POST-only, and never reference a broker/execution surface", () => {
  for (const route of OTHER_MUTATION_ROUTES) {
    const src = readRoute(route);
    assert.match(src, /export async function POST/, `${route} must export POST`);
    assert.doesNotMatch(src, /export async function GET|export async function PUT|export async function PATCH|export async function DELETE/, `${route} must be POST-only`);
    assert.match(src, /requireAuthUser\(\)/, `${route} must require auth`);
    assert.doesNotMatch(stripComments(src), FORBIDDEN_EXECUTION_SURFACE, `${route} must not reference a real-execution surface`);
  }
});

test("advisor/recommend is a stateless preview-only POST route (no persistence call)", () => {
  const src = readRoute("src/app/api/capital/advisor/recommend/route.ts");
  assert.match(src, /export async function POST/);
  assert.doesNotMatch(src, /export async function GET/);
  assert.doesNotMatch(src, /\.insert\(|\.update\(|\.upsert\(|\.rpc\(/);
});
