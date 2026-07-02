// ─── AOC Capital Advisor — Intake Classification — Tests ───────────────────────
// Pure-function tests; no Supabase / live database required.

import { test } from "node:test";
import assert from "node:assert/strict";

const { classifyIntake } = await import("../src/lib/advisor/intake.ts");

const validRaw = () => ({
  startingCapitalUsd: 1000,
  primaryObjective: "balanced_growth",
  timeHorizon: "medium_term",
  riskAppetite: "moderate",
  maxTolerableDrawdownPct: 15,
  preferredMarkets: ["crypto", "equities"],
  autonomyLevel: "assisted",
  tradingMode: "recommendations_only",
  wantsGatedRealExecution: false,
});

test("a fully valid intake is classified successfully", () => {
  const result = classifyIntake(validRaw());
  assert.equal(result.ok, true);
  assert.equal(result.intake.startingCapitalUsd, 1000);
  assert.equal(result.intake.primaryObjective, "balanced_growth");
  assert.deepEqual(result.intake.preferredMarkets, ["crypto", "equities"]);
});

test("non-object input is rejected", () => {
  const result = classifyIntake("not an object");
  assert.equal(result.ok, false);
});

test("null input is rejected", () => {
  const result = classifyIntake(null);
  assert.equal(result.ok, false);
});

test("non-positive startingCapitalUsd is rejected", () => {
  const result = classifyIntake({ ...validRaw(), startingCapitalUsd: 0 });
  assert.equal(result.ok, false);
  assert.match(result.error, /startingCapitalUsd/);
});

test("an invalid primaryObjective is rejected", () => {
  const result = classifyIntake({ ...validRaw(), primaryObjective: "yolo" });
  assert.equal(result.ok, false);
  assert.match(result.error, /primaryObjective/);
});

test("an invalid riskAppetite is rejected", () => {
  const result = classifyIntake({ ...validRaw(), riskAppetite: "reckless" });
  assert.equal(result.ok, false);
  assert.match(result.error, /riskAppetite/);
});

test("maxTolerableDrawdownPct is clamped into [0, 100]", () => {
  const tooHigh = classifyIntake({ ...validRaw(), maxTolerableDrawdownPct: 250 });
  assert.equal(tooHigh.ok, true);
  assert.equal(tooHigh.intake.maxTolerableDrawdownPct, 100);

  const negative = classifyIntake({ ...validRaw(), maxTolerableDrawdownPct: -20 });
  assert.equal(negative.ok, true);
  assert.equal(negative.intake.maxTolerableDrawdownPct, 0);
});

test("preferredMarkets is deduplicated and filtered to known values", () => {
  const result = classifyIntake({ ...validRaw(), preferredMarkets: ["crypto", "crypto", "not-a-market", "equities"] });
  assert.equal(result.ok, true);
  assert.deepEqual(result.intake.preferredMarkets, ["crypto", "equities"]);
});

test("an empty preferredMarkets list is rejected", () => {
  const result = classifyIntake({ ...validRaw(), preferredMarkets: [] });
  assert.equal(result.ok, false);
  assert.match(result.error, /preferredMarkets/);
});

test("preferredMarkets with only unknown values is rejected", () => {
  const result = classifyIntake({ ...validRaw(), preferredMarkets: ["forex"] });
  assert.equal(result.ok, false);
});

test("an invalid autonomyLevel is rejected", () => {
  const result = classifyIntake({ ...validRaw(), autonomyLevel: "godmode" });
  assert.equal(result.ok, false);
  assert.match(result.error, /autonomyLevel/);
});

test("an invalid tradingMode is rejected", () => {
  const result = classifyIntake({ ...validRaw(), tradingMode: "live_execution" });
  assert.equal(result.ok, false);
  assert.match(result.error, /tradingMode/);
});

test("wantsGatedRealExecution coerces any non-true value to false", () => {
  const result = classifyIntake({ ...validRaw(), wantsGatedRealExecution: "yes" });
  assert.equal(result.ok, true);
  assert.equal(result.intake.wantsGatedRealExecution, false);
});

test("wantsGatedRealExecution passes through true", () => {
  const result = classifyIntake({ ...validRaw(), wantsGatedRealExecution: true });
  assert.equal(result.ok, true);
  assert.equal(result.intake.wantsGatedRealExecution, true);
});

test("a missing field is rejected with a descriptive error", () => {
  const raw = validRaw();
  delete raw.timeHorizon;
  const result = classifyIntake(raw);
  assert.equal(result.ok, false);
  assert.match(result.error, /timeHorizon/);
});
