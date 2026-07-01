import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const retrieval = fs.readFileSync("src/lib/vault/continuity-retrieval.ts", "utf8");
const copilotRoute = fs.readFileSync("src/app/api/copilot/route.ts", "utf8");

test("retrieval exports deterministic scoring and retrieval API", () => {
  for (const token of [
    "export async function retrieveOperationalContinuity",
    "export function scoreContinuityCandidate",
    "export function buildContinuityContext",
    "export function classifyContinuityUrgency",
    "normalizeContinuityText",
    "extractOperationalKeywords",
    "calculateKeywordOverlap",
  ]) assert.match(retrieval, new RegExp(token));
});

test("retrieval behavior priorities and decay rules are encoded", () => {
  assert.match(retrieval, /blocker_signal:\s*1/);
  assert.match(retrieval, /escalation_signal:\s*1/);
  assert.match(retrieval, /delivery_drift_signal:\s*0\.84/);
  assert.match(retrieval, /financial_impediment_signal:\s*0\.84/);
  assert.match(retrieval, /if \(!request\.includeResolved && !unresolved\) continue/);
  assert.match(retrieval, /const recurrenceCount = group\.length/);
  assert.match(retrieval, /sort\(\(a, b\) => b\.relevanceScore - a\.relevanceScore/);
});

test("retrieval enforces project/workspace scope and bounded evidence", () => {
  assert.match(retrieval, /\.eq\("workspace_id", request\.workspaceId\)/);
  assert.match(retrieval, /if \(request\.projectId\) query = query\.eq\("project_id", request\.projectId\)/);
  assert.match(retrieval, /MAX_EXCERPT_CHARS = 240/);
  assert.match(retrieval, /slice\(0, MAX_EXCERPT_CHARS\)/);
  assert.match(retrieval, /MAX_CONTINUITY_SIGNALS = 24/);
  assert.match(retrieval, /MAX_EVIDENCE_EXCERPTS = 10/);
  assert.match(retrieval, /MAX_SUMMARY_ITEMS = 6/);
});

test("retrieval fail-soft degradation and dedupe fingerprints exist", () => {
  assert.match(retrieval, /status:\s*"degraded"/);
  assert.match(retrieval, /degradationReason/);
  assert.match(retrieval, /byFingerprint = new Map/);
  assert.match(retrieval, /const fp = `\$\{nutrient\.nutrientType\}:/);
});

test("copilot route integrates continuity retrieval before inference with bounded context", () => {
  assert.match(copilotRoute, /retrieveOperationalContinuityLegacy\(/);
  assert.match(copilotRoute, /buildRuntimeContinuityContext\(continuity\.continuitySignals, 8\)/);
  assert.match(copilotRoute, /Recent Operational Continuity:/);
  assert.doesNotMatch(copilotRoute, /source:\s*\$\{item\.sourceType\}:\$\{item\.sourceReference\}/);
});
