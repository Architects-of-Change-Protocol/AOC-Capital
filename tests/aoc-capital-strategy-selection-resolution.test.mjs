// ─── AOC Capital Strategy Library — Stale Selection Resolution ─────────────────
// resolveSelectedStrategy() (src/lib/capital/strategy-selection-service.ts) is
// a pure, synchronous function — no Supabase / network I/O — so unlike the
// I/O-heavy functions covered by tests/aoc-capital-strategy-selection-safety.test.mjs
// it can be imported and exercised directly. These tests confirm a persisted
// strategy_key that no longer exists in the static library (e.g. it was later
// removed from STRATEGY_LIBRARY) is surfaced as a clear stale/unavailable
// warning instead of crashing or silently looking like the user never
// selected a strategy — and that this never enables execution and never
// implies a trade intent or paper position exists.

import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveSelectedStrategy } from "../src/lib/capital/strategy-selection-service.ts";

function makeProfile(overrides = {}) {
  return {
    id: "profile-1",
    company_id: "company-1",
    portfolio_id: "portfolio-1",
    strategy_key: "conservative_crypto_trend",
    strategy_name: "Conservative Crypto Trend",
    risk_profile: "conservative",
    supported_symbols: ["BTC-USD", "ETH-USD"],
    paper_only: true,
    real_execution_locked: true,
    selected_at: "2026-01-01T00:00:00.000Z",
    selected_by: "user-1",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("resolveSelectedStrategy returns no selection and no stale warning when nothing has been selected", () => {
  const resolved = resolveSelectedStrategy(null);
  assert.deepEqual(resolved, {
    selectedStrategy: null,
    staleSelectedStrategy: null,
    paperOnly: true,
    realExecutionLocked: true,
  });
});

test("resolveSelectedStrategy resolves a currently-valid strategy_key to the live library entry", () => {
  const resolved = resolveSelectedStrategy(makeProfile());
  assert.ok(resolved.selectedStrategy);
  assert.equal(resolved.selectedStrategy.key, "conservative_crypto_trend");
  assert.equal(resolved.staleSelectedStrategy, null);
  assert.equal(resolved.paperOnly, true);
  assert.equal(resolved.realExecutionLocked, true);
});

test("resolveSelectedStrategy never throws for a strategy_key removed from the static library", () => {
  const profile = makeProfile({ strategy_key: "retired_strategy_no_longer_in_library", strategy_name: "Retired Strategy" });
  assert.doesNotThrow(() => resolveSelectedStrategy(profile));
});

test("resolveSelectedStrategy surfaces a clear stale/unavailable warning for a removed strategy_key instead of a bare null that implies 'never selected'", () => {
  const profile = makeProfile({ strategy_key: "retired_strategy_no_longer_in_library", strategy_name: "Retired Strategy" });
  const resolved = resolveSelectedStrategy(profile);
  assert.equal(resolved.selectedStrategy, null);
  assert.ok(resolved.staleSelectedStrategy, "expected a staleSelectedStrategy object, not a bare null");
  assert.equal(resolved.staleSelectedStrategy.strategyKey, "retired_strategy_no_longer_in_library");
  assert.equal(resolved.staleSelectedStrategy.strategyName, "Retired Strategy");
  assert.ok(resolved.staleSelectedStrategy.reason.length > 0);
});

test("resolveSelectedStrategy keeps paperOnly/realExecutionLocked true for a stale selection — a stale key never enables execution", () => {
  const profile = makeProfile({ strategy_key: "retired_strategy_no_longer_in_library" });
  const resolved = resolveSelectedStrategy(profile);
  assert.equal(resolved.paperOnly, true);
  assert.equal(resolved.realExecutionLocked, true);
});

test("resolveSelectedStrategy for a stale selection never returns anything shaped like a trade intent or paper position", () => {
  const profile = makeProfile({ strategy_key: "retired_strategy_no_longer_in_library" });
  const resolved = resolveSelectedStrategy(profile);
  const serialized = JSON.stringify(resolved);
  assert.doesNotMatch(serialized, /tradeIntent|paperPosition|position_id|trade_intent_id/i);
});
