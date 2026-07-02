// ─── AOC Capital — Close Position Request Validation — Tests ───────────────────
// Pure-function tests; no Supabase / live database required. The close price
// and realized P&L are always calculated server-side (see closePaperPosition
// in trade-service.ts) — closeReason is the only client-suppliable field, and
// this module is what keeps it constrained to the fixed enum.

import { test } from "node:test";
import assert from "node:assert/strict";

const { parseClosePositionRequest } = await import("../src/lib/trading/close-position-request.ts");
const { CLOSE_REASONS } = await import("../src/lib/trading/database-contract.ts");

test("a missing body defaults to closeReason = user_requested", () => {
  const result = parseClosePositionRequest(null);
  assert.equal(result.ok, true);
  assert.equal(result.request.closeReason, "user_requested");
});

test("an empty object defaults to closeReason = user_requested", () => {
  const result = parseClosePositionRequest({});
  assert.equal(result.ok, true);
  assert.equal(result.request.closeReason, "user_requested");
});

test("every allowed close reason is accepted", () => {
  for (const reason of CLOSE_REASONS) {
    const result = parseClosePositionRequest({ closeReason: reason });
    assert.equal(result.ok, true);
    assert.equal(result.request.closeReason, reason);
  }
});

test("an arbitrary close_reason string is rejected", () => {
  const result = parseClosePositionRequest({ closeReason: "because_i_felt_like_it" });
  assert.equal(result.ok, false);
  assert.match(result.error, /closeReason must be one of/);
});

test("a non-string closeReason is rejected", () => {
  const result = parseClosePositionRequest({ closeReason: 12345 });
  assert.equal(result.ok, false);
});

test("attempting to smuggle other governed fields (e.g. realizedPnlUsd, closePriceUsd) has no effect — they are simply ignored", () => {
  const result = parseClosePositionRequest({ closeReason: "stop_loss", realizedPnlUsd: 999999, closePriceUsd: 1 });
  assert.equal(result.ok, true);
  assert.deepEqual(result.request, { closeReason: "stop_loss" });
});

test("a non-object body is rejected", () => {
  const result = parseClosePositionRequest("not an object");
  assert.equal(result.ok, false);
});

test("an array body is rejected", () => {
  const result = parseClosePositionRequest([]);
  assert.equal(result.ok, false);
});
