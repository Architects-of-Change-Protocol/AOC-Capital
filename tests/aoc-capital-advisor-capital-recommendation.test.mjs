// ─── AOC Capital Advisor — Recommended Capital Level — Tests ───────────────────
// Pure-function tests; no Supabase / live database required.

import { test } from "node:test";
import assert from "node:assert/strict";

const { recommendCapitalLevel, SANDBOX_CEILING_BY_RISK_PROFILE } = await import("../src/lib/advisor/capital-recommendation.ts");

test("a request within the sandbox ceiling is used as-is", () => {
  const result = recommendCapitalLevel(500, "balanced");
  assert.equal(result.recommendedBaseCapitalUsd, 500);
  assert.equal(result.tier, "starter");
});

test("a request above the sandbox ceiling is clamped down to the ceiling", () => {
  const result = recommendCapitalLevel(50000, "conservative");
  assert.equal(result.recommendedBaseCapitalUsd, SANDBOX_CEILING_BY_RISK_PROFILE.conservative);
  assert.match(result.rationale, /capped/);
});

test("every risk profile has its own sandbox ceiling and higher profiles allow more capital", () => {
  const conservative = recommendCapitalLevel(1_000_000, "conservative");
  const balanced = recommendCapitalLevel(1_000_000, "balanced");
  const growth = recommendCapitalLevel(1_000_000, "growth");
  const aggressive = recommendCapitalLevel(1_000_000, "aggressive");

  assert.ok(conservative.recommendedBaseCapitalUsd < balanced.recommendedBaseCapitalUsd);
  assert.ok(balanced.recommendedBaseCapitalUsd < growth.recommendedBaseCapitalUsd);
  assert.ok(growth.recommendedBaseCapitalUsd < aggressive.recommendedBaseCapitalUsd);
});

test("a non-positive or non-finite starting capital falls back to a sane default", () => {
  const zero = recommendCapitalLevel(0, "balanced");
  assert.ok(zero.recommendedBaseCapitalUsd > 0);

  const negative = recommendCapitalLevel(-500, "balanced");
  assert.ok(negative.recommendedBaseCapitalUsd > 0);

  const notANumber = recommendCapitalLevel(NaN, "balanced");
  assert.ok(notANumber.recommendedBaseCapitalUsd > 0);
});

test("the recommended capital never exceeds that profile's sandbox ceiling", () => {
  for (const profile of ["conservative", "balanced", "growth", "aggressive"]) {
    for (const requested of [1, 100, 999, 1000, 2500, 5000, 10000, 999999]) {
      const result = recommendCapitalLevel(requested, profile);
      assert.ok(result.recommendedBaseCapitalUsd <= SANDBOX_CEILING_BY_RISK_PROFILE[profile]);
      assert.ok(result.recommendedBaseCapitalUsd <= requested || requested <= 0);
    }
  }
});

test("tier classification follows the recommended amount", () => {
  assert.equal(recommendCapitalLevel(1000, "aggressive").tier, "starter");
  assert.equal(recommendCapitalLevel(2500, "aggressive").tier, "standard");
  assert.equal(recommendCapitalLevel(5000, "aggressive").tier, "expanded");
  assert.equal(recommendCapitalLevel(10000, "aggressive").tier, "maximum");
});
