// ─── AOC Capital Allocation & Exposure Views v1 (PR #15) — Pure Function
// Tests ───────────────────────────────────────────────────────────────────
// groupPositionsBySymbol(), deriveConcentrationStatus(), deriveExposurePosture(),
// deriveAllocationSummary(), and deriveExposureNotes() are pure, I/O-free
// functions (src/lib/capital/allocation-exposure-service.ts) — fully
// unit-testable the same way computePortfolioSummary() and
// getNextPortfolioAction() are tested elsewhere in this suite.

import { test } from "node:test";
import assert from "node:assert/strict";

const {
  groupPositionsBySymbol,
  deriveConcentrationStatus,
  deriveExposurePosture,
  deriveAllocationSummary,
  deriveExposureNotes,
} = await import("../src/lib/capital/allocation-exposure-service.ts");

// ─── groupPositionsBySymbol ──────────────────────────────────────────────────

test("groupPositionsBySymbol: groups multiple open positions by symbol and sums quantity/notional", () => {
  const result = groupPositionsBySymbol([
    { symbol: "BTC-USD", quantity: 0.05, entryPriceUsd: 60000, currentPriceUsd: 64000, entryNotionalUsd: 3000, currentNotionalUsd: 3200 },
    { symbol: "BTC-USD", quantity: 0.02, entryPriceUsd: 62000, currentPriceUsd: 64000, entryNotionalUsd: 1240, currentNotionalUsd: 1280 },
    { symbol: "ETH-USD", quantity: 1, entryPriceUsd: 2500, currentPriceUsd: 2400, entryNotionalUsd: 2500, currentNotionalUsd: 2400 },
  ]);

  assert.equal(result.length, 2);
  const btc = result.find((s) => s.symbol === "BTC-USD");
  assert.equal(btc.openPositionsCount, 2);
  assert.equal(btc.totalQuantity, 0.07);
  assert.equal(btc.entryNotionalUsd, 4240);
  assert.equal(btc.currentNotionalUsd, 4480);
  assert.equal(btc.unrealizedPnlUsd, 240);
});

test("groupPositionsBySymbol: computes average entry price and current price", () => {
  const [btc] = groupPositionsBySymbol([{ symbol: "BTC-USD", quantity: 0.1, entryPriceUsd: 60000, currentPriceUsd: 65000, entryNotionalUsd: 6000, currentNotionalUsd: 6500 }]);
  assert.equal(btc.averageEntryPriceUsd, 60000);
  assert.equal(btc.currentPriceUsd, 65000);
});

test("groupPositionsBySymbol: handles missing current_notional_usd by falling back to entry notional, with zero unrealized P&L contribution", () => {
  const [btc] = groupPositionsBySymbol([{ symbol: "BTC-USD", quantity: 0.1, entryPriceUsd: 60000, currentPriceUsd: null, entryNotionalUsd: 6000, currentNotionalUsd: null }]);
  assert.equal(btc.currentNotionalUsd, 6000);
  assert.equal(btc.unrealizedPnlUsd, 0);
});

test("groupPositionsBySymbol: handles empty input", () => {
  assert.deepEqual(groupPositionsBySymbol([]), []);
});

test("groupPositionsBySymbol: sorts symbols by current notional descending", () => {
  const result = groupPositionsBySymbol([
    { symbol: "ETH-USD", quantity: 1, entryPriceUsd: 2000, currentPriceUsd: 2000, entryNotionalUsd: 2000, currentNotionalUsd: 2000 },
    { symbol: "BTC-USD", quantity: 1, entryPriceUsd: 5000, currentPriceUsd: 5000, entryNotionalUsd: 5000, currentNotionalUsd: 5000 },
  ]);
  assert.deepEqual(result.map((s) => s.symbol), ["BTC-USD", "ETH-USD"]);
});

// ─── deriveConcentrationStatus ────────────────────────────────────────────────

test("deriveConcentrationStatus: no positions/exposure -> no_data", () => {
  assert.equal(deriveConcentrationStatus(null), "no_data");
});

test("deriveConcentrationStatus: largest <= 35% -> diversified", () => {
  assert.equal(deriveConcentrationStatus(0.35), "diversified");
  assert.equal(deriveConcentrationStatus(0.1), "diversified");
});

test("deriveConcentrationStatus: >35% and <=60% -> moderate_concentration", () => {
  assert.equal(deriveConcentrationStatus(0.36), "moderate_concentration");
  assert.equal(deriveConcentrationStatus(0.6), "moderate_concentration");
});

test("deriveConcentrationStatus: >60% and <95% -> high_concentration", () => {
  assert.equal(deriveConcentrationStatus(0.61), "high_concentration");
  assert.equal(deriveConcentrationStatus(0.94), "high_concentration");
});

test("deriveConcentrationStatus: >=95% -> single_symbol", () => {
  assert.equal(deriveConcentrationStatus(0.95), "single_symbol");
  assert.equal(deriveConcentrationStatus(1), "single_symbol");
});

// ─── deriveExposurePosture ────────────────────────────────────────────────────

const BASE_POSTURE_INPUT = {
  hasBaseCapital: true,
  openExposureUsd: 0,
  exposureRatio: null,
  largestSymbolWeight: null,
  exposureLimitUsage: null,
};

test("deriveExposurePosture: no base capital and no positions -> not_ready", () => {
  const result = deriveExposurePosture({ ...BASE_POSTURE_INPUT, hasBaseCapital: false, openExposureUsd: 0 });
  assert.equal(result, "not_ready");
});

test("deriveExposurePosture: base capital and no exposure -> idle", () => {
  const result = deriveExposurePosture({ ...BASE_POSTURE_INPUT, openExposureUsd: 0 });
  assert.equal(result, "idle");
});

test("deriveExposurePosture: balanced exposure -> balanced", () => {
  const result = deriveExposurePosture({ ...BASE_POSTURE_INPUT, openExposureUsd: 500, exposureRatio: 0.4, largestSymbolWeight: 0.3, exposureLimitUsage: 0.5 });
  assert.equal(result, "balanced");
});

test("deriveExposurePosture: largest symbol concentration >35% -> watch_concentration", () => {
  const result = deriveExposurePosture({ ...BASE_POSTURE_INPUT, openExposureUsd: 500, exposureRatio: 0.4, largestSymbolWeight: 0.4, exposureLimitUsage: 0.5 });
  assert.equal(result, "watch_concentration");
});

test("deriveExposurePosture: largest symbol concentration >60% -> high_concentration", () => {
  const result = deriveExposurePosture({ ...BASE_POSTURE_INPUT, openExposureUsd: 500, exposureRatio: 0.4, largestSymbolWeight: 0.7, exposureLimitUsage: 0.5 });
  assert.equal(result, "high_concentration");
});

test("deriveExposurePosture: risk limit usage >=80% -> near_exposure_limit", () => {
  const result = deriveExposurePosture({ ...BASE_POSTURE_INPUT, openExposureUsd: 500, exposureRatio: 0.5, largestSymbolWeight: 0.2, exposureLimitUsage: 0.85 });
  assert.equal(result, "near_exposure_limit");
});

test("deriveExposurePosture: risk limit usage >100% -> over_exposure_limit", () => {
  const result = deriveExposurePosture({ ...BASE_POSTURE_INPUT, openExposureUsd: 500, exposureRatio: 0.7, largestSymbolWeight: 0.2, exposureLimitUsage: 1.1 });
  assert.equal(result, "over_exposure_limit");
});

test("deriveExposurePosture: over-exposure limit takes priority over a merely watch-level concentration", () => {
  const result = deriveExposurePosture({ ...BASE_POSTURE_INPUT, openExposureUsd: 500, exposureRatio: 0.7, largestSymbolWeight: 0.4, exposureLimitUsage: 1.2 });
  assert.equal(result, "over_exposure_limit");
});

// ─── deriveAllocationSummary ──────────────────────────────────────────────────

test("deriveAllocationSummary: computes simulated portfolio value, cash, exposure ratio, and concentration together", () => {
  const result = deriveAllocationSummary({
    baseCapitalUsd: 1000,
    openExposureUsd: 400,
    unrealizedPnlUsd: 20,
    realizedPnlUsd: 10,
    largestSymbolExposureUsd: 300,
    maxExposureRatio: 0.6,
  });

  assert.equal(result.totalPnlUsd, 30);
  assert.equal(result.simulatedPortfolioValueUsd, 1030);
  assert.equal(result.availableSimulatedCashUsd, 610);
  assert.equal(result.exposureRatio, 0.4);
  assert.equal(result.largestSymbolWeight, 0.75);
  assert.equal(result.concentrationStatus, "high_concentration");
  assert.ok(result.exposureLimitUsage > 0.6 && result.exposureLimitUsage < 0.7);
});

test("deriveAllocationSummary: no open exposure -> no_data concentration, idle posture", () => {
  const result = deriveAllocationSummary({
    baseCapitalUsd: 1000,
    openExposureUsd: 0,
    unrealizedPnlUsd: 0,
    realizedPnlUsd: 0,
    largestSymbolExposureUsd: 0,
    maxExposureRatio: 0.6,
  });
  assert.equal(result.concentrationStatus, "no_data");
  assert.equal(result.exposurePosture, "idle");
  assert.equal(result.largestSymbolWeight, null);
});

test("deriveAllocationSummary: no known max exposure ratio -> exposureLimitUsage is null", () => {
  const result = deriveAllocationSummary({
    baseCapitalUsd: 1000,
    openExposureUsd: 400,
    unrealizedPnlUsd: 0,
    realizedPnlUsd: 0,
    largestSymbolExposureUsd: 100,
    maxExposureRatio: null,
  });
  assert.equal(result.exposureLimitUsage, null);
});

// ─── deriveExposureNotes ──────────────────────────────────────────────────────

const BASE_NOTES_INPUT = {
  hasOpenPositions: true,
  concentrationStatus: "diversified",
  largestSymbol: "BTC-USD",
  largestSymbolWeight: 0.3,
  exposureRatio: 0.4,
  topGainer: null,
  topLoser: null,
  riskLimitProximityAvailable: true,
};

test("deriveExposureNotes: no positions -> single empty note", () => {
  const notes = deriveExposureNotes({ ...BASE_NOTES_INPUT, hasOpenPositions: false });
  assert.equal(notes.length, 1);
  assert.equal(notes[0].kind, "empty");
  assert.match(notes[0].message, /no open paper positions/i);
});

test("deriveExposureNotes: single-symbol concentration note", () => {
  const notes = deriveExposureNotes({ ...BASE_NOTES_INPUT, concentrationStatus: "single_symbol", largestSymbolWeight: 0.99 });
  const note = notes.find((n) => n.kind === "concentration");
  assert.ok(note);
  assert.match(note.message, /concentrated in one symbol: BTC-USD/);
});

test("deriveExposureNotes: high-concentration note includes the weight percentage", () => {
  const notes = deriveExposureNotes({ ...BASE_NOTES_INPUT, concentrationStatus: "high_concentration", largestSymbolWeight: 0.7 });
  const note = notes.find((n) => n.kind === "concentration");
  assert.ok(note);
  assert.match(note.message, /BTC-USD represents 70% of open simulated exposure/);
});

test("deriveExposureNotes: exposure ratio note when base capital is available", () => {
  const notes = deriveExposureNotes({ ...BASE_NOTES_INPUT, exposureRatio: 0.62 });
  const note = notes.find((n) => n.kind === "exposure");
  assert.ok(note);
  assert.match(note.message, /62% of base simulated capital/);
});

test("deriveExposureNotes: cash/base-capital-unavailable note when exposure ratio is null", () => {
  const notes = deriveExposureNotes({ ...BASE_NOTES_INPUT, exposureRatio: null });
  const note = notes.find((n) => n.kind === "cash");
  assert.ok(note);
  assert.match(note.message, /base capital is not modeled/);
});

test("deriveExposureNotes: top loser note", () => {
  const notes = deriveExposureNotes({ ...BASE_NOTES_INPUT, topLoser: { symbol: "ETH-USD", unrealizedPnlUsd: -50 } });
  const note = notes.find((n) => n.kind === "pnl" && n.message.includes("loss"));
  assert.ok(note);
  assert.match(note.message, /ETH-USD is the largest unrealized loss contributor/);
});

test("deriveExposureNotes: top gainer note", () => {
  const notes = deriveExposureNotes({ ...BASE_NOTES_INPUT, topGainer: { symbol: "SOL-USD", unrealizedPnlUsd: 40 } });
  const note = notes.find((n) => n.kind === "pnl" && n.message.includes("gain"));
  assert.ok(note);
  assert.match(note.message, /SOL-USD is the largest unrealized gain contributor/);
});

test("deriveExposureNotes: risk-limit-unavailable note", () => {
  const notes = deriveExposureNotes({ ...BASE_NOTES_INPUT, riskLimitProximityAvailable: false });
  const note = notes.find((n) => n.kind === "risk_limit");
  assert.ok(note);
  assert.match(note.message, /risk limit proximity is not available yet/i);
});

test("deriveExposureNotes: never contains buy/sell/execution advice", () => {
  const notes = deriveExposureNotes({
    ...BASE_NOTES_INPUT,
    concentrationStatus: "single_symbol",
    topGainer: { symbol: "BTC-USD", unrealizedPnlUsd: 10 },
    topLoser: { symbol: "ETH-USD", unrealizedPnlUsd: -10 },
    riskLimitProximityAvailable: false,
  });
  for (const note of notes) {
    assert.doesNotMatch(note.message, /\bbuy\b|\bsell\b|should|recommend|advice/i);
  }
});
