// ─── AOC Capital Demo Strategy Sandbox — Reset Manifest — Tests ────────────────
// Pure-function tests; no Supabase / live database / network calls required.
// resetDemoScenario() (demo-write-service.ts) only ever deletes rows whose ids
// come out of parseDemoManifest() — these tests pin down the safety property
// that matters most: a manifest can only ever name exactly the ids it was
// built with, and anything that doesn't match the expected shape parses to
// null (never a partial/best-guess manifest), so a malformed payload can
// never be misread as "reset everything for this company."

import { test } from "node:test";
import assert from "node:assert/strict";

const { buildDemoScenarioPayload, parseDemoManifest, DEMO_SCENARIO_KEY } = await import("../src/lib/demo/manifest.ts");

function sampleManifest() {
  return {
    portfolioId: "11111111-1111-1111-1111-111111111111",
    tradeIntentIds: ["aaaaaaaa-0000-0000-0000-000000000001", "aaaaaaaa-0000-0000-0000-000000000002"],
    paperPositionIds: ["bbbbbbbb-0000-0000-0000-000000000001"],
    auditEventIds: ["cccccccc-0000-0000-0000-000000000001", "cccccccc-0000-0000-0000-000000000002", "cccccccc-0000-0000-0000-000000000003"],
  };
}

test("buildDemoScenarioPayload round-trips through parseDemoManifest with the exact same ids — reset only affects records named in the manifest", () => {
  const manifest = sampleManifest();
  const payload = buildDemoScenarioPayload({
    stepCount: 7,
    approvedCount: 4,
    rejectedCount: 1,
    closedCount: 2,
    openCount: 2,
    manifest,
  });

  assert.equal(payload.demoScenarioKey, DEMO_SCENARIO_KEY);
  assert.equal(payload.paperOnly, true);

  const parsed = parseDemoManifest(payload);
  assert.deepEqual(parsed, manifest);
});

test("parseDemoManifest never invents or expands ids beyond what the payload contains", () => {
  const manifest = sampleManifest();
  const payload = buildDemoScenarioPayload({ stepCount: 1, approvedCount: 1, rejectedCount: 0, closedCount: 0, openCount: 1, manifest });
  const parsed = parseDemoManifest(payload);

  assert.equal(parsed.tradeIntentIds.length, manifest.tradeIntentIds.length);
  assert.equal(parsed.paperPositionIds.length, manifest.paperPositionIds.length);
  assert.equal(parsed.auditEventIds.length, manifest.auditEventIds.length);
  for (const id of parsed.tradeIntentIds) assert.ok(manifest.tradeIntentIds.includes(id));
  for (const id of parsed.auditEventIds) assert.ok(manifest.auditEventIds.includes(id));
});

test("parseDemoManifest returns null for a payload with the wrong demoScenarioKey — a foreign/old-format payload is never trusted", () => {
  const payload = { ...buildDemoScenarioPayload({ stepCount: 1, approvedCount: 1, rejectedCount: 0, closedCount: 0, openCount: 0, manifest: sampleManifest() }), demoScenarioKey: "some-other-key" };
  assert.equal(parseDemoManifest(payload), null);
});

test("parseDemoManifest returns null for non-object payloads (null, string, number, array)", () => {
  assert.equal(parseDemoManifest(null), null);
  assert.equal(parseDemoManifest(undefined), null);
  assert.equal(parseDemoManifest("not an object"), null);
  assert.equal(parseDemoManifest(42), null);
  assert.equal(parseDemoManifest([]), null);
});

test("parseDemoManifest returns null when manifest is missing entirely", () => {
  assert.equal(parseDemoManifest({ demoScenarioKey: DEMO_SCENARIO_KEY, paperOnly: true }), null);
});

test("parseDemoManifest returns null when any id array is malformed (not an array of strings)", () => {
  const base = sampleManifest();
  const brokenTradeIntentIds = { ...base, tradeIntentIds: "not-an-array" };
  const brokenPositionIds = { ...base, paperPositionIds: [1, 2, 3] };
  const brokenAuditIds = { ...base, auditEventIds: null };

  assert.equal(parseDemoManifest(buildDemoScenarioPayload({ stepCount: 1, approvedCount: 1, rejectedCount: 0, closedCount: 0, openCount: 0, manifest: brokenTradeIntentIds })), null);
  assert.equal(parseDemoManifest(buildDemoScenarioPayload({ stepCount: 1, approvedCount: 1, rejectedCount: 0, closedCount: 0, openCount: 0, manifest: brokenPositionIds })), null);
  assert.equal(parseDemoManifest(buildDemoScenarioPayload({ stepCount: 1, approvedCount: 1, rejectedCount: 0, closedCount: 0, openCount: 0, manifest: brokenAuditIds })), null);
});

test("parseDemoManifest returns null when portfolioId is missing or empty — never falls back to a wildcard/company-wide reset", () => {
  const base = sampleManifest();
  const missingPortfolio = { ...base, portfolioId: "" };
  const noPortfolioKey = { tradeIntentIds: base.tradeIntentIds, paperPositionIds: base.paperPositionIds, auditEventIds: base.auditEventIds };

  assert.equal(parseDemoManifest(buildDemoScenarioPayload({ stepCount: 1, approvedCount: 1, rejectedCount: 0, closedCount: 0, openCount: 0, manifest: missingPortfolio })), null);
  assert.equal(parseDemoManifest(buildDemoScenarioPayload({ stepCount: 1, approvedCount: 1, rejectedCount: 0, closedCount: 0, openCount: 0, manifest: noPortfolioKey })), null);
});

test("an empty manifest (no trade intents, no positions, no audit events yet) still parses — reset on a scenario that only got as far as the advisor step is a safe no-op-ish delete, not an error", () => {
  const emptyManifest = { portfolioId: "11111111-1111-1111-1111-111111111111", tradeIntentIds: [], paperPositionIds: [], auditEventIds: [] };
  const payload = buildDemoScenarioPayload({ stepCount: 0, approvedCount: 0, rejectedCount: 0, closedCount: 0, openCount: 0, manifest: emptyManifest });
  assert.deepEqual(parseDemoManifest(payload), emptyManifest);
});
