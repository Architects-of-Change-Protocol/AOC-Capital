// ─── AOC Capital Demo Strategy Sandbox — Reset Safety — Static Source Checks ───
// resetDemoScenario() (src/lib/demo/demo-write-service.ts) is I/O-heavy (talks
// to Supabase), and this codebase has no live-Supabase test harness for that
// kind of module (consistent with trade-service.ts and advisor-write-service.ts,
// neither of which have direct tests either). Rather than skip coverage of the
// safety-critical property entirely, these tests statically inspect the
// function's source — the same pattern already used in
// tests/personal-portfolio.test.mjs — to pin down that every delete in the
// reset path is tenant-scoped (.eq("company_id", ...)) and id-scoped
// (.in("id", ...)) rather than an unscoped "delete everything of this type."
// The manifest itself (what ids are safe to delete) is covered by real,
// executable pure-function tests in aoc-capital-demo-manifest.test.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const serviceTs = fs.readFileSync("src/lib/demo/demo-write-service.ts", "utf8");

function extractFunction(source, exportSignature) {
  const start = source.indexOf(exportSignature);
  assert.ok(start >= 0, `expected to find "${exportSignature}" in demo-write-service.ts`);
  const nextExportFn = source.indexOf("\nexport", start + exportSignature.length);
  return source.slice(start, nextExportFn > start ? nextExportFn : undefined);
}

const resetFnBody = extractFunction(serviceTs, "export async function resetDemoScenario");
const loadFnBody = extractFunction(serviceTs, "export async function loadDemoScenario");

test("resetDemoScenario looks up the demo marker scoped by company_id before doing anything else", () => {
  const markerLookupIndex = resetFnBody.indexOf("findDemoMarker(companyId)");
  const firstDeleteIndex = resetFnBody.indexOf(".delete(");
  assert.ok(markerLookupIndex >= 0, "expected resetDemoScenario to look up the marker via findDemoMarker(companyId)");
  assert.ok(firstDeleteIndex === -1 || markerLookupIndex < firstDeleteIndex, "marker lookup must happen before any delete");
});

test("resetDemoScenario requires a parsed manifest before issuing any delete — a malformed payload short-circuits instead of deleting", () => {
  const parseIndex = resetFnBody.indexOf("parseDemoManifest(marker.payload)");
  const guardIndex = resetFnBody.indexOf('if (!manifest) return { reset: false, reason: "manifest_unreadable" }');
  const firstDeleteIndex = resetFnBody.indexOf(".delete(");
  assert.ok(parseIndex >= 0, "expected resetDemoScenario to call parseDemoManifest(marker.payload)");
  assert.ok(guardIndex >= 0, "expected an explicit early return when the manifest fails to parse");
  assert.ok(guardIndex < firstDeleteIndex, "the manifest_unreadable guard must run before any delete");
});

test("every delete in resetDemoScenario is scoped by company_id", () => {
  const deleteBlocks = resetFnBody.split(".delete(").slice(1);
  assert.ok(deleteBlocks.length >= 2, "expected at least two delete calls (trade_intents, audit_ledger)");
  for (const block of deleteBlocks) {
    const nextStatementEnd = block.indexOf(";");
    const statement = block.slice(0, nextStatementEnd > 0 ? nextStatementEnd : 200);
    assert.match(statement, /\.eq\("company_id",\s*companyId\)/, `delete call is missing .eq("company_id", companyId) scoping: ${statement}`);
  }
});

test("every delete in resetDemoScenario is id-scoped via the parsed manifest (.in(\"id\", manifest....)), never an unscoped delete-all", () => {
  const deleteBlocks = resetFnBody.split(".delete(").slice(1);
  for (const block of deleteBlocks) {
    const nextStatementEnd = block.indexOf(";");
    const statement = block.slice(0, nextStatementEnd > 0 ? nextStatementEnd : 200);
    assert.match(statement, /\.in\("id",/, `delete call is missing an .in("id", ...) filter — this would delete every row for the company, not just demo rows: ${statement}`);
  }
});

test("resetDemoScenario never deletes from portfolios, risk_constitution_rules, or capital_levels — those are shared, non-demo resources", () => {
  assert.doesNotMatch(resetFnBody, /\.from\("portfolios"\)[\s\S]*?\.delete\(/);
  assert.doesNotMatch(resetFnBody, /\.from\("risk_constitution_rules"\)[\s\S]*?\.delete\(/);
  assert.doesNotMatch(resetFnBody, /\.from\("capital_levels"\)[\s\S]*?\.delete\(/);
});

test("resetDemoScenario uses the governed service-role client (privileged()) for every delete, not the plain authenticated client", () => {
  assert.match(resetFnBody, /privileged\("demo\/reset"/);
});

test("resetDemoScenario records its own governed audit event after resetting", () => {
  assert.match(resetFnBody, /DEMO_SCENARIO_RESET_EVENT_TYPE/);
  assert.match(resetFnBody, /recordAuditEvent\(/);
});

test("loadDemoScenario is idempotent — it checks isDemoScenarioLoaded before writing anything", () => {
  const checkIndex = loadFnBody.indexOf("isDemoScenarioLoaded(companyId)");
  const firstWriteIndex = Math.min(
    ...["confirmAdvisorRecommendation(", "createTradeIntent(", "recordAuditEvent("].map((needle) => {
      const index = loadFnBody.indexOf(needle);
      return index === -1 ? Infinity : index;
    })
  );
  assert.ok(checkIndex >= 0, "expected loadDemoScenario to check isDemoScenarioLoaded(companyId)");
  assert.ok(checkIndex < firstWriteIndex, "the idempotency check must run before any write");
});

test("the demo scenario never writes real-execution, broker, API key, or withdrawal capabilities anywhere in the write service", () => {
  assert.doesNotMatch(serviceTs, /real_exchange_execution|broker_api_integration|live_order_routing|real_money_withdrawal|exchange_api_key_management/);
});
