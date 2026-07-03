// ─── AOC Capital Submit Draft Intent for Risk Constitution Review (PR #12)
// — Safety — Static Source Checks ────────────────────────────────────────────
// submitDraftTradeIntentForReview() (src/lib/capital/draft-trade-intent-
// review-service.ts) is I/O-heavy (talks to Supabase) and this codebase has
// no live-Supabase test harness for that kind of module (same rationale as
// tests/aoc-capital-signal-trade-intent-handoff-safety.test.mjs). These tests
// statically inspect the service, API route, and UI source to pin down that:
//   - the draft is always re-read fresh from the database by id — never a
//     client-supplied symbol/side/quantity/notional/leverage
//   - a trade intent that isn't a draft is rejected before any write
//   - the write goes through the governed, tenant-scoped, service-role client
//   - submission, the risk verdict, and (if approved) the resulting paper
//     position all commit atomically through submit_draft_trade_intent_for_review()
//   - submitting is a separate, explicit user-confirmed action from draft
//     creation — never automatic, never triggered by signal conversion
//   - the UI never shows execution-style CTAs and never POSTs a request body

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const serviceTs = fs.readFileSync("src/lib/capital/draft-trade-intent-review-service.ts", "utf8");
const routeTs = fs.readFileSync("src/app/api/capital/trade-intents/[id]/submit-for-review/route.ts", "utf8");
const buttonTs = fs.readFileSync("src/app/(protected)/capital/trade-intents/submit-draft-for-review-button.tsx", "utf8");
const pageTs = fs.readFileSync("src/app/(protected)/capital/trade-intents/page.tsx", "utf8");
const handoffServiceTs = fs.readFileSync("src/lib/capital/signal-trade-intent-handoff-service.ts", "utf8");
const contractTs = fs.readFileSync("src/lib/trading/database-contract.ts", "utf8");

function extractFunction(source, exportSignature) {
  const start = source.indexOf(exportSignature);
  assert.ok(start >= 0, `expected to find "${exportSignature}"`);
  const nextExportFn = source.indexOf("\nexport", start + exportSignature.length);
  return source.slice(start, nextExportFn > start ? nextExportFn : undefined);
}

const submitBody = extractFunction(serviceTs, "export async function submitDraftTradeIntentForReview");

// ─── The draft is always re-read fresh, never trusted from the client ──────

test("submitDraftTradeIntentForReview re-reads the trade intent from the database by id before doing anything else", () => {
  const readIndex = submitBody.indexOf("getTradeIntentForSubmission(input.companyId, input.portfolioId, input.intentId)");
  const rpcIndex = submitBody.indexOf(".rpc(");
  assert.ok(readIndex >= 0, "expected the trade intent to be re-read server-side by id");
  assert.ok(readIndex < rpcIndex, "the trade intent must be read and validated before the RPC call");
});

test("SubmitDraftTradeIntentForReviewInput only carries companyId/actorUserId/actor/portfolioId/intentId — no symbol/side/quantity/notional/leverage override", () => {
  const inputType = extractFunction(serviceTs, "export type SubmitDraftTradeIntentForReviewInput = {");
  assert.doesNotMatch(inputType, /symbol|side|quantity|notionalUsd|leverage/i);
});

test("the POST /submit-for-review route never reads the request body — no symbol/side/quantity/notional override is possible", () => {
  const codeOnly = routeTs.replace(/\/\*\*[\s\S]*?\*\//, "");
  assert.doesNotMatch(codeOnly, /request\.json\(/);
  assert.doesNotMatch(codeOnly, /body\./);
});

// ─── Only a draft is submittable ────────────────────────────────────────────

test("assertSubmittable rejects any trade intent whose status is not 'draft'", () => {
  const assertBody = extractFunction(serviceTs, "function assertSubmittable");
  assert.match(assertBody, /intent\.status !== "draft"/);
  assert.match(assertBody, /TradeIntentNotDraftError/);
});

test("submitDraftTradeIntentForReview calls assertSubmittable before the RPC call", () => {
  const assertIndex = submitBody.indexOf("assertSubmittable(intent)");
  const rpcIndex = submitBody.indexOf(".rpc(");
  assert.ok(assertIndex >= 0 && assertIndex < rpcIndex);
});

test("the route maps TradeIntentNotFoundError to 404 and TradeIntentNotDraftError to 409", () => {
  assert.match(routeTs, /TradeIntentNotFoundError[\s\S]*?status:\s*404/);
  assert.match(routeTs, /TradeIntentNotDraftError[\s\S]*?status:\s*409/);
});

// ─── Governed write path ────────────────────────────────────────────────────

test("submitDraftTradeIntentForReview writes through the governed service-role client (privileged()), not the plain authenticated client", () => {
  assert.match(submitBody, /privileged\("capital\/draft-trade-intent-review"/);
});

test("submitDraftTradeIntentForReview calls the submit_draft_trade_intent_for_review RPC to persist submission, decision, and position atomically", () => {
  assert.match(submitBody, /\.rpc\(\s*"submit_draft_trade_intent_for_review"/);
});

test("the service never calls recordAuditEvent — every audit write happens inside the atomic RPC, not as a separate application-level write", () => {
  assert.doesNotMatch(serviceTs, /recordAuditEvent/);
});

test("the service never inserts or updates trade_intents/trade_decisions/paper_positions directly from the application layer — only the atomic RPC writes those tables", () => {
  assert.doesNotMatch(serviceTs, /\.from\(\s*"trade_intents"\s*\)\s*\.(insert|update)\(/);
  assert.doesNotMatch(serviceTs, /\.from\(\s*"trade_decisions"\s*\)\s*\.(insert|update)\(/);
  assert.doesNotMatch(serviceTs, /\.from\(\s*"paper_positions"\s*\)\s*\.(insert|update)\(/);
});

// ─── Draft creation is unaffected: still never submits, never evaluates ────

test("the signal-to-draft handoff service still never calls the submit-for-review RPC or service — draft creation never automatically submits", () => {
  assert.doesNotMatch(handoffServiceTs, /submit_draft_trade_intent_for_review|submitDraftTradeIntentForReview/);
});

test("the submit-for-review service and route never reference real-execution, broker, API key, or withdrawal capabilities as anything other than blocked-capability strings", () => {
  for (const source of [serviceTs, routeTs, buttonTs]) {
    assert.doesNotMatch(source, /brokerEnabled|executionEnabled|requiresApiKey|placeOrder|createOrder|executeTrade|orderRouter|apiSecret|privateKey/);
  }
});

// ─── Controlled vocabulary / UI ─────────────────────────────────────────────

test("the submit button and trade-intents page never show Execute/Place order/Trade now/Send to broker/Connect exchange copy", () => {
  for (const source of [pageTs, buttonTs]) {
    assert.doesNotMatch(source, /\bExecute\b|Place [Oo]rder|Trade [Nn]ow|Send to [Bb]roker|Connect [Ee]xchange/);
  }
});

test("the submit button POSTs with no request body — nothing for it to submit", () => {
  const fetchIndex = buttonTs.indexOf('fetch(`/api/capital/trade-intents/${intentId}/submit-for-review`');
  assert.ok(fetchIndex >= 0);
  const fetchCall = buttonTs.slice(fetchIndex, fetchIndex + 200);
  assert.doesNotMatch(fetchCall, /body:/);
});

test("the trade-intents page only renders the submit button for status === 'draft'", () => {
  const draftBlockIndex = pageTs.indexOf('intent.status === "draft"');
  const buttonIndex = pageTs.indexOf("<SubmitDraftForReviewButton");
  assert.ok(draftBlockIndex >= 0 && buttonIndex >= 0);
  assert.ok(draftBlockIndex < buttonIndex, "the submit button must be nested inside the draft-only conditional block");
});

// ─── Database contract stays in sync ────────────────────────────────────────

test("AuditLedgerEventType includes trade_intent_submitted_for_review", () => {
  assert.match(contractTs, /"trade_intent_submitted_for_review"/);
});
