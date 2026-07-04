// ─── AOC Capital Governed Paper Close Position Review (PR #17) — Safety —
// Static Source Checks ───────────────────────────────────────────────────────
// requestPaperPositionCloseReview() (src/lib/capital/position-close-review-
// service.ts) is I/O-heavy (talks to Supabase) and this codebase has no
// live-Supabase test harness for that kind of module (same rationale as
// tests/aoc-capital-draft-cancel-safety.test.mjs). These tests statically
// inspect the service, API route, and database contract to pin down that:
//   - the open position is always re-read fresh from the database by id —
//     never a client-supplied close price/notional/realized P&L/quantity/
//     symbol/status
//   - a position that isn't open, or is missing valuation, is rejected
//     before any write
//   - the write goes through the governed, tenant-scoped, service-role client
//     and the atomic RPC
//   - the service never marks to market, refreshes valuation, or touches a
//     broker/exchange/order-routing capability
//   - the route reads no request body and accepts only the path param id
//   - the route returns the required governance response flags
//   - the older quick-close route/UI (PR #17 hardening) is disabled and
//     cannot mutate a paper position outside governed close review

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const serviceTs = fs.readFileSync("src/lib/capital/position-close-review-service.ts", "utf8");
const routeTs = fs.readFileSync("src/app/api/capital/positions/[id]/request-close-review/route.ts", "utf8");
const contractTs = fs.readFileSync("src/lib/trading/database-contract.ts", "utf8");
const legacyCloseRouteTs = fs.readFileSync("src/app/api/capital/paper-positions/[id]/close/route.ts", "utf8");
const positionActionsTsx = fs.readFileSync("src/app/(protected)/capital/positions/paper-position-actions.tsx", "utf8");
const positionsListPageTsx = fs.readFileSync("src/app/(protected)/capital/positions/page.tsx", "utf8");

function extractFunction(source, exportSignature) {
  const start = source.indexOf(exportSignature);
  assert.ok(start >= 0, `expected to find "${exportSignature}"`);
  const nextExportFn = source.indexOf("\nexport", start + exportSignature.length);
  return source.slice(start, nextExportFn > start ? nextExportFn : undefined);
}

const requestBody = extractFunction(serviceTs, "export async function requestPaperPositionCloseReview");

// ─── The position is always re-read fresh, never trusted from the client ───

test("requestPaperPositionCloseReview re-reads the paper position from the database by id before doing anything else", () => {
  const readIndex = requestBody.indexOf("getPaperPositionForReview(input.companyId, input.portfolioId, input.positionId)");
  const rpcIndex = requestBody.indexOf(".rpc(");
  assert.ok(readIndex >= 0, "expected the paper position to be re-read server-side by id");
  assert.ok(readIndex < rpcIndex, "the paper position must be read and validated before the RPC call");
});

test("RequestPaperPositionCloseReviewInput only carries companyId/actorUserId/actor/portfolioId/positionId — no close price/notional/P&L/quantity/symbol/status override", () => {
  const inputType = extractFunction(serviceTs, "export type RequestPaperPositionCloseReviewInput = {");
  assert.doesNotMatch(inputType, /closePrice|closeNotional|realizedPnl|quantity|symbol|side|status|broker|exchange|orderId|accountId/i);
});

test("the POST /request-close-review route never reads the request body — no close price/notional/P&L/quantity/symbol/status override is possible", () => {
  const codeOnly = routeTs.replace(/\/\*\*[\s\S]*?\*\//, "");
  assert.doesNotMatch(codeOnly, /request\.json\(/);
  assert.doesNotMatch(codeOnly, /\bbody\./);
});

// ─── Only an eligible open position can be submitted ────────────────────────

test("assertEligibleForCloseReview rejects an already-closed position, any non-open position, and missing valuation/entry-notional/quantity", () => {
  const assertBody = extractFunction(serviceTs, "function assertEligibleForCloseReview");
  assert.match(assertBody, /position\.status === "closed"/);
  assert.match(assertBody, /PaperPositionAlreadyClosedError/);
  assert.match(assertBody, /position\.status !== "open"/);
  assert.match(assertBody, /PaperPositionNotOpenError/);
  assert.match(assertBody, /current_price_usd === null \|\| position\.current_notional_usd === null/);
  assert.match(assertBody, /entry_notional_usd === null/);
  assert.match(assertBody, /PaperPositionMissingValuationError/);
});

test("requestPaperPositionCloseReview calls assertEligibleForCloseReview before the RPC call", () => {
  const assertIndex = requestBody.indexOf("assertEligibleForCloseReview(position)");
  const rpcIndex = requestBody.indexOf(".rpc(");
  assert.ok(assertIndex >= 0 && assertIndex < rpcIndex);
});

test("the route maps PaperPositionNotFoundError to 404 and the eligibility errors to 409", () => {
  assert.match(routeTs, /PaperPositionNotFoundError[\s\S]*?status:\s*404/);
  const conflictBranch = routeTs.match(/if \(\s*error instanceof PaperPositionNotOpenError[\s\S]*?status:\s*409[\s\S]*?\}/);
  assert.ok(conflictBranch, "expected a single branch handling the eligibility errors as 409");
  assert.match(conflictBranch[0], /PaperPositionAlreadyClosedError/);
  assert.match(conflictBranch[0], /PaperPositionMissingValuationError/);
  assert.match(conflictBranch[0], /PaperPositionAlreadyHasCloseReviewError/);
});

test("the route returns a generic 500 on PaperPositionCloseReviewFailedError / unexpected errors, never a raw DB error", () => {
  assert.match(routeTs, /status:\s*500/);
  assert.match(routeTs, /"Paper close review failed"/);
});

// ─── Governed write path ────────────────────────────────────────────────────

test("requestPaperPositionCloseReview writes through the governed service-role client (privileged()), not the plain authenticated client", () => {
  assert.match(requestBody, /privileged\("capital\/position-close-review"/);
});

test("requestPaperPositionCloseReview calls the close_paper_position_with_review_and_audit RPC to persist the close review, close mutation, and audit atomically", () => {
  assert.match(requestBody, /\.rpc\(\s*"close_paper_position_with_review_and_audit"/);
});

test("the service never inserts or updates paper_positions/paper_position_close_reviews/audit_ledger directly from the application layer — only the atomic RPC writes those tables", () => {
  assert.doesNotMatch(serviceTs, /\.from\(\s*"paper_positions"\s*\)\s*\.(insert|update)\(/);
  assert.doesNotMatch(serviceTs, /\.from\(\s*"paper_position_close_reviews"\s*\)\s*\.(insert|update)\(/);
  assert.doesNotMatch(serviceTs, /\.from\(\s*"audit_ledger"\s*\)\s*\.(insert|update)\(/);
});

test("the service never marks positions to market, refreshes valuation, or calls the older direct close path", () => {
  assert.doesNotMatch(serviceTs, /markPositionToMarket|markAllOpenPositions|listPaperPositionsMarked|mark_paper_position|mark_all_open_paper_positions|recordMarketPrice|closePaperPosition\(|close_paper_position\(/);
});

test("the service never generates signals, creates/submits/cancels draft trade intents, or calls evaluate_and_record_trade_intent", () => {
  const codeOnly = serviceTs
    .replace(/\/\*\*[\s\S]*?\*\//, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
  assert.doesNotMatch(codeOnly, /generateSignals|createDraftTradeIntentFromSignal|cancelDraftTradeIntent|submitDraftTradeIntentForReview|evaluate_and_record_trade_intent|submit_draft_trade_intent_for_review|cancel_draft_trade_intent_and_audit/);
});

test("the service never references broker/exchange/order-routing/API-key/withdrawal/deposit capabilities", () => {
  assert.doesNotMatch(serviceTs, /brokerClient|brokerApi|exchangeApi|orderRouter|apiSecret|privateKey|placeOrder|createOrder|executeTrade|withdrawal|deposit/i);
});

test("the route returns paperOnly true, realExecutionLocked true, brokerConnected false, and liveOrderRoutingEnabled false", () => {
  assert.match(routeTs, /paperOnly:\s*true/);
  assert.match(routeTs, /realExecutionLocked:\s*true/);
  assert.match(routeTs, /brokerConnected:\s*false/);
  assert.match(routeTs, /liveOrderRoutingEnabled:\s*false/);
});

test("the route is POST only — no GET/PUT/DELETE handler is exported", () => {
  assert.match(routeTs, /export async function POST/);
  assert.doesNotMatch(routeTs, /export async function (GET|PUT|DELETE|PATCH)/);
});

test("the route resolves position id only from the path param, never from the request body", () => {
  assert.match(routeTs, /const \{ id \} = await params;/);
  assert.match(routeTs, /positionId:\s*id/);
});

// ─── Database contract stays in sync ────────────────────────────────────────

test("PaperPositionRow carries closed_by/close_notional_usd/realized_pnl_pct/close_review_id", () => {
  assert.match(contractTs, /closed_by: string \| null;/);
  assert.match(contractTs, /close_notional_usd: number \| null;/);
  assert.match(contractTs, /realized_pnl_pct: number \| null;/);
  assert.match(contractTs, /close_review_id: string \| null;/);
});

test("AuditLedgerEventType includes paper_position_close_review_approved and paper_position_closed", () => {
  assert.match(contractTs, /"paper_position_close_review_approved"/);
  assert.match(contractTs, /"paper_position_closed"/);
});

test("PaperPositionCloseReviewRow is defined with the expected shape", () => {
  assert.match(contractTs, /export type PaperPositionCloseReviewRow = \{/);
  assert.match(contractTs, /paper_position_id: string;/);
  assert.match(contractTs, /decision: CloseReviewDecision;/);
});

// ─── Legacy quick-close route is disabled (PR #17 hardening) ────────────────
// The codebase used to also expose POST /api/capital/paper-positions/[id]/
// close, which bypassed governed close review entirely and refreshed
// valuation (via closePaperPosition -> recordMarketPrice) before closing at
// a freshly-fetched price. That conflicts with the product rule that a
// paper position may be closed only through governed close review, using
// only its already-stored valuation. These tests pin the legacy route down
// as a disabled, non-mutating compatibility guard.

test("the legacy quick-close route no longer calls closePaperPosition, markAllOpenPositions, or recordMarketPrice", () => {
  assert.doesNotMatch(legacyCloseRouteTs, /closePaperPosition\(|markAllOpenPositions\(|recordMarketPrice\(/);
});

test("the legacy quick-close route does not call requestPaperPositionCloseReview or any RPC", () => {
  assert.doesNotMatch(legacyCloseRouteTs, /requestPaperPositionCloseReview|\.rpc\(/);
});

test("the legacy quick-close route never touches paper_positions or audit_ledger", () => {
  assert.doesNotMatch(legacyCloseRouteTs, /\.from\(\s*"paper_positions"\s*\)/);
  assert.doesNotMatch(legacyCloseRouteTs, /\.from\(\s*"audit_ledger"\s*\)/);
});

test("the legacy quick-close route never reads a request body — there is nothing left for it to act on", () => {
  const codeOnly = legacyCloseRouteTs.replace(/\/\*\*[\s\S]*?\*\//, "");
  assert.doesNotMatch(codeOnly, /request\.json\(/);
  assert.doesNotMatch(codeOnly, /parseClosePositionRequest/);
});

test("the legacy quick-close route always responds 410 Gone with safe, non-DB-leaking JSON", () => {
  assert.match(legacyCloseRouteTs, /status:\s*410/);
  assert.match(legacyCloseRouteTs, /Legacy paper position close is disabled\. Use governed paper close review from Position Detail\./);
});

test("the legacy quick-close route is POST only — no GET/PUT/DELETE handler is exported", () => {
  assert.match(legacyCloseRouteTs, /export async function POST/);
  assert.doesNotMatch(legacyCloseRouteTs, /export async function (GET|PUT|DELETE|PATCH)/);
});

test("the /capital/positions list no longer renders a Close Position mutation button or posts to the legacy close route", () => {
  assert.doesNotMatch(positionActionsTsx, /Close Position/);
  assert.doesNotMatch(positionActionsTsx, /\/api\/capital\/paper-positions\/\$\{positionId\}\/close/);
  assert.doesNotMatch(positionsListPageTsx, /Close Position/);
  assert.doesNotMatch(positionsListPageTsx, /\/api\/capital\/paper-positions\/\$\{[^}]*\}\/close/);
});

test("the /capital/positions list links every row out to Position Detail (the only place a close can be requested)", () => {
  assert.match(positionsListPageTsx, /\/capital\/positions\/\$\{positionId\}/);
  assert.match(positionsListPageTsx, /View Detail/);
});

test("PositionActions no longer accepts or sends a closeReason — mark-to-market only", () => {
  assert.doesNotMatch(positionActionsTsx, /CloseReason|CLOSE_REASONS|closeReason/);
});
