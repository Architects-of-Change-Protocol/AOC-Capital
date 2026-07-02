// ─── AOC Capital Advisor — Risk Profile Mapping — Tests ────────────────────────
// Pure-function tests; no Supabase / live database required.

import { test } from "node:test";
import assert from "node:assert/strict";

const { mapRiskProfile } = await import("../src/lib/advisor/risk-profile.ts");

test("low drawdown tolerance with a conservative appetite maps to conservative", () => {
  const profile = mapRiskProfile({ riskAppetite: "conservative", maxTolerableDrawdownPct: 5 });
  assert.equal(profile, "conservative");
});

test("a conservative stated appetite caps the profile even with high drawdown tolerance", () => {
  const profile = mapRiskProfile({ riskAppetite: "conservative", maxTolerableDrawdownPct: 90 });
  assert.equal(profile, "conservative");
});

test("a low drawdown tolerance caps the profile even with an aggressive stated appetite", () => {
  const profile = mapRiskProfile({ riskAppetite: "aggressive", maxTolerableDrawdownPct: 5 });
  assert.equal(profile, "conservative");
});

test("moderate appetite with mid drawdown tolerance maps to balanced", () => {
  const profile = mapRiskProfile({ riskAppetite: "moderate", maxTolerableDrawdownPct: 15 });
  assert.equal(profile, "balanced");
});

test("moderate appetite with high drawdown tolerance maps to growth (moderate ceiling)", () => {
  const profile = mapRiskProfile({ riskAppetite: "moderate", maxTolerableDrawdownPct: 90 });
  assert.equal(profile, "growth");
});

test("aggressive appetite with a very high drawdown tolerance maps to aggressive", () => {
  const profile = mapRiskProfile({ riskAppetite: "aggressive", maxTolerableDrawdownPct: 50 });
  assert.equal(profile, "aggressive");
});

test("drawdown boundary values map to the expected bucket", () => {
  assert.equal(mapRiskProfile({ riskAppetite: "aggressive", maxTolerableDrawdownPct: 10 }), "conservative");
  assert.equal(mapRiskProfile({ riskAppetite: "aggressive", maxTolerableDrawdownPct: 10.01 }), "balanced");
  assert.equal(mapRiskProfile({ riskAppetite: "aggressive", maxTolerableDrawdownPct: 20 }), "balanced");
  assert.equal(mapRiskProfile({ riskAppetite: "aggressive", maxTolerableDrawdownPct: 20.01 }), "growth");
  assert.equal(mapRiskProfile({ riskAppetite: "aggressive", maxTolerableDrawdownPct: 35 }), "growth");
  assert.equal(mapRiskProfile({ riskAppetite: "aggressive", maxTolerableDrawdownPct: 35.01 }), "aggressive");
});
