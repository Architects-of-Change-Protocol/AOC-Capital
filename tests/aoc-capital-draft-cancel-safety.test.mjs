// ─── AOC Capital Cancel / Withdraw Draft Trade Intent (PR #13) — Safety —
// Static Source Checks ───────────────────────────────────────────────────────
// cancelDraftTradeIntent() (src/lib/capital/draft-trade-intent-cancel-
// service.ts) is I/O-heavy (talks to Supabase) and this codebase has no
// live-Supabase test harness for that kind of module (same rationale as
// tests/aoc-capital-submit-draft-trade-intent-safety.test.mjs). These tests
// statically inspect the service, API route, and UI source to pin down that:
//   - the draft is always re-read fresh from the database by id — never a
//     client-supplied symbol/side/quantity/notional/strategy/status
//   - a trade intent that isn't a draft is rejected before any write
//   - the write goes through the governed, tenant-scoped, service-role client
//   - cancellation never runs risk review, never submits, never creates
//     trade_decisions/paper_positions
//   - the route reads no request body and accepts only the path param id
//   - the UI never shows execution-style CTAs and requires explicit
//     confirmation before cancelling

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const serviceTs = fs.readFileSync("src/lib/capital/draft-trade-intent-cancel-service.ts", "utf8");
const routeTs = fs.readFileSync("src/app/api/capital/trade-intents/[id]/cancel-draft/route.ts", "utf8");
const buttonTs = fs.readFileSync("src/app/(protected)/capital/trade-intents/cancel-draft-button.tsx", "utf8");
const pageTs = fs.readFileSync("src/app/(protected)/capital/trade-intents/page.tsx", "utf8");
const reviewServiceTs = fs.readFileSync("src/lib/capital/draft-trade-intent-review-service.ts", "utf8");
const contractTs = fs.readFileSync("src/lib/trading/database-contract.ts", "utf8");

function extractFunction(source, exportSignature) {
  const start = source.indexOf(exportSignature);
  assert.ok(start >= 0, `expected to find "${exportSignature}"`);
  const nextExportFn = source.indexOf("\nexport", start + exportSignature.length);
  return source.slice(start, nextExportFn > start ? nextExportFn : undefined);
}

const cancelBody = extractFunction(serviceTs, "export async function cancelDraftTradeIntent");

// ─── The draft is always re-read fresh, never trusted from the client ──────

test("cancelDraftTradeIntent re-reads the trade intent from the database by id before doing anything else", () => {
  const readIndex = cancelBody.indexOf("getDraftTradeIntent(input.companyId, input.portfolioId, input.intentId)");
  const rpcIndex = cancelBody.indexOf(".rpc(");
  assert.ok(readIndex >= 0, "expected the trade intent to be re-read server-side by id");
  assert.ok(readIndex < rpcIndex, "the trade intent must be read and validated before the RPC call");
});

test("CancelDraftTradeIntentInput only carries companyId/actorUserId/actor/portfolioId/intentId — no symbol/side/quantity/notional/strategy/status override", () => {
  const inputType = extractFunction(serviceTs, "export type CancelDraftTradeIntentInput = {");
  assert.doesNotMatch(inputType, /symbol|side|quantity|notionalUsd|leverage|strategy|status|cancellationReason/i);
});

test("the POST /cancel-draft route never reads the request body — no symbol/side/quantity/notional/strategy/status override is possible", () => {
  const codeOnly = routeTs.replace(/\/\*\*[\s\S]*?\*\//, "");
  assert.doesNotMatch(codeOnly, /request\.json\(/);
  assert.doesNotMatch(codeOnly, /body\./);
});

// ─── Only a draft is cancellable ────────────────────────────────────────────

test("assertCancellable rejects any trade intent whose status is not 'draft'", () => {
  const assertBody = extractFunction(serviceTs, "function assertCancellable");
  assert.match(assertBody, /intent\.status !== "draft"/);
  assert.match(assertBody, /TradeIntentNotDraftError/);
});

test("cancelDraftTradeIntent calls assertCancellable before the RPC call", () => {
  const assertIndex = cancelBody.indexOf("assertCancellable(intent)");
  const rpcIndex = cancelBody.indexOf(".rpc(");
  assert.ok(assertIndex >= 0 && assertIndex < rpcIndex);
});

test("the route maps DraftTradeIntentNotFoundError to 404 and TradeIntentNotDraftError/DraftTradeIntentHasPaperPositionError to 409", () => {
  assert.match(routeTs, /DraftTradeIntentNotFoundError[\s\S]*?status:\s*404/);
  const conflictBranch = routeTs.match(/if \(error instanceof TradeIntentNotDraftError[\s\S]*?status:\s*409[\s\S]*?\}/);
  assert.ok(conflictBranch, "expected a single branch handling both non-draft and has-paper-position errors as 409");
  assert.match(conflictBranch[0], /DraftTradeIntentHasPaperPositionError/);
});

// ─── Governed write path ────────────────────────────────────────────────────

test("cancelDraftTradeIntent writes through the governed service-role client (privileged()), not the plain authenticated client", () => {
  assert.match(cancelBody, /privileged\("capital\/draft-trade-intent-cancel"/);
});

test("cancelDraftTradeIntent calls the cancel_draft_trade_intent_and_audit RPC to persist the cancellation and audit atomically", () => {
  assert.match(cancelBody, /\.rpc\(\s*"cancel_draft_trade_intent_and_audit"/);
});

test("the service never calls recordAuditEvent — every audit write happens inside the atomic RPC, not as a separate application-level write", () => {
  assert.doesNotMatch(serviceTs, /recordAuditEvent/);
});

test("the service never inserts or updates trade_intents/trade_decisions/paper_positions directly from the application layer — only the atomic RPC writes those tables", () => {
  assert.doesNotMatch(serviceTs, /\.from\(\s*"trade_intents"\s*\)\s*\.(insert|update)\(/);
  assert.doesNotMatch(serviceTs, /\.from\(\s*"trade_decisions"\s*\)\s*\.(insert|update)\(/);
  assert.doesNotMatch(serviceTs, /\.from\(\s*"paper_positions"\s*\)\s*\.(insert|update)\(/);
});

test("the service never calls submit-for-review or risk-evaluation entry points", () => {
  const codeOnly = serviceTs
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
  assert.doesNotMatch(codeOnly, /submit_draft_trade_intent_for_review|submitDraftTradeIntentForReview|evaluate_and_record_trade_intent/);
});

test("the service never marks positions to market or closes positions", () => {
  assert.doesNotMatch(serviceTs, /markPositionToMarket|markAllOpenPositions|closePaperPosition|mark_paper_position|close_paper_position/);
});

test("the service never references broker/API key/withdrawal/order-routing capabilities", () => {
  assert.doesNotMatch(serviceTs, /brokerEnabled|executionEnabled|requiresApiKey|placeOrder|createOrder|executeTrade|orderRouter|apiSecret|privateKey|withdrawal|deposit/i);
});

test("the route returns paperOnly true and realExecutionLocked true", () => {
  assert.match(routeTs, /paperOnly:\s*true/);
  assert.match(routeTs, /realExecutionLocked:\s*true/);
});

// ─── Submission service is unaffected: cancellation never submits ─────────

test("the submit-for-review service never references the cancel RPC or service — submitting and cancelling remain separate, exclusive actions", () => {
  assert.doesNotMatch(reviewServiceTs, /cancel_draft_trade_intent_and_audit|cancelDraftTradeIntent/);
});

// ─── Controlled vocabulary / UI ─────────────────────────────────────────────

test("the cancel button and trade-intents page never show Execute/Place order/Trade now/Buy now/Sell now/Send to broker/Connect exchange copy", () => {
  for (const source of [pageTs, buttonTs]) {
    assert.doesNotMatch(source, /\bExecute\b|Place [Oo]rder|Trade [Nn]ow|Buy [Nn]ow|Sell [Nn]ow|Send to [Bb]roker|Connect [Ee]xchange/);
  }
});

test("the cancel button POSTs with no request body — nothing for it to submit", () => {
  const fetchIndex = buttonTs.indexOf('fetch(`/api/capital/trade-intents/${intentId}/cancel-draft`');
  assert.ok(fetchIndex >= 0);
  const fetchCall = buttonTs.slice(fetchIndex, fetchIndex + 200);
  assert.doesNotMatch(fetchCall, /body:/);
});

test("the cancel button requires an explicit second confirmation step before it POSTs (a user-confirmed action, not a single click)", () => {
  assert.match(buttonTs, /confirming/);
  assert.match(buttonTs, /Keep Draft/);
  assert.match(buttonTs, /Cancel draft trade intent\?/);
});

test("the confirmation copy states what cancellation will not do", () => {
  assert.match(buttonTs, /submit the draft/);
  assert.match(buttonTs, /run risk review/);
  assert.match(buttonTs, /open a paper position/);
  assert.match(buttonTs, /place an order/);
  assert.match(buttonTs, /connect to a broker/);
  assert.match(buttonTs, /enable real execution/);
});

test("the trade-intents page only renders the cancel button for status === 'draft'", () => {
  const draftBlockIndex = pageTs.indexOf('intent.status === "draft"');
  const buttonIndex = pageTs.indexOf("<CancelDraftButton");
  assert.ok(draftBlockIndex >= 0 && buttonIndex >= 0);
  assert.ok(draftBlockIndex < buttonIndex, "the cancel button must be nested inside the draft-only conditional block");
});

test("the trade-intents page never renders submit/cancel actions for status === 'cancelled'", () => {
  const cancelledBlockMatch = pageTs.match(/intent\.status === "cancelled"[\s\S]*?\) : null\}/);
  assert.ok(cancelledBlockMatch);
  assert.doesNotMatch(cancelledBlockMatch[0], /<SubmitDraftForReviewButton|<CancelDraftButton/);
});

test("the trade-intents page shows safety copy for cancelled drafts", () => {
  assert.match(pageTs, /cancelled before Risk Constitution review/);
  assert.match(pageTs, /historical records only/);
});

// ─── Database contract stays in sync ────────────────────────────────────────

test("TradeIntentStatus includes cancelled and TradeIntentRow carries cancelled_at/cancelled_by", () => {
  assert.match(contractTs, /"draft" \| "pending" \| "approved" \| "rejected" \| "closed" \| "cancelled"/);
  assert.match(contractTs, /cancelled_at: string \| null;/);
  assert.match(contractTs, /cancelled_by: string \| null;/);
});

test("AuditLedgerEventType includes draft_trade_intent_cancelled", () => {
  assert.match(contractTs, /"draft_trade_intent_cancelled"/);
});
