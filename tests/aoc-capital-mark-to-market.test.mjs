// ─── AOC Capital — Mark-to-Market P&L Calculations — Tests ─────────────────────
// Pure-function tests; no Supabase / live database required.

import { test } from "node:test";
import assert from "node:assert/strict";

const { computePositionPnlUsd, computePnlPct, computeNotionalUsd } = await import("../src/lib/trading/mark-to-market.ts");

test("a long position marked above entry price produces positive unrealized P&L", () => {
  const pnl = computePositionPnlUsd("buy", 2, 100, 110);
  assert.equal(pnl, 20);
});

test("a long position marked below entry price produces negative unrealized P&L", () => {
  const pnl = computePositionPnlUsd("buy", 2, 100, 90);
  assert.equal(pnl, -20);
});

test("a long position marked exactly at entry price produces zero P&L", () => {
  assert.equal(computePositionPnlUsd("buy", 5, 50, 50), 0);
});

test("realized P&L on close uses the same math as unrealized P&L, with the close price as the mark", () => {
  const unrealizedAtSamePrice = computePositionPnlUsd("buy", 3, 200, 220);
  const realizedAtClose = computePositionPnlUsd("buy", 3, 200, 220);
  assert.equal(unrealizedAtSamePrice, realizedAtClose);
  assert.equal(realizedAtClose, 60);
});

test("a short position is handled defensively with an inverted sign (Level 1 never creates new shorts)", () => {
  const pnl = computePositionPnlUsd("sell", 2, 100, 90);
  assert.equal(pnl, 20); // short gains when price falls
});

test("P&L percentage is calculated against the entry (cost-basis) notional", () => {
  const pnlUsd = computePositionPnlUsd("buy", 2, 100, 110); // 20
  const pct = computePnlPct(pnlUsd, 200); // entry notional = 2 * 100
  assert.equal(pct, 10);
});

test("P&L percentage is zero when entry notional is zero or negative (defensive, avoids divide-by-zero)", () => {
  assert.equal(computePnlPct(50, 0), 0);
  assert.equal(computePnlPct(50, -10), 0);
});

test("notional is quantity times price", () => {
  assert.equal(computeNotionalUsd(3, 150), 450);
});
