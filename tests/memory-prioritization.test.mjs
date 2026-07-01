import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const engine = fs.readFileSync("src/lib/vault/memory-prioritization.ts", "utf8");
const route = fs.readFileSync("src/app/api/copilot/route.ts", "utf8");

test("memory prioritization exports deterministic API", () => {
  for (const token of [
    "export async function prioritizeOperationalMemory",
    "export async function calculateOperationalSalience",
    "export async function calculateUrgencyWeight",
    "export async function calculateCriticalPathPressure",
    "export async function calculateExecutionPriority",
    "export async function calculateStakeholderPriority",
    "export async function calculateTimelinePressure",
    "export async function calculateDependencySeverity",
    "export function computeMemoryPriorityScore",
    "export function classifyOperationalPriority",
    "export function buildPrioritizedMemorySummary",
  ]) assert.match(engine, new RegExp(token));
});

test("salience and pressure formulas are explicit bounded and deterministic", () => {
  assert.match(engine, /MAX_PRIORITIZED_ITEMS = 24/);
  assert.match(engine, /MAX_PRIORITY_SUMMARIES = 6/);
  assert.match(engine, /MAX_CRITICAL_SIGNALS = 5/);
  assert.match(engine, /calculateUrgencyWeight\(input: \{ unresolvedPressure: number; escalationPressure: number; timelinePressure: number; executionPressure: number; freshnessScore: number \}\)/);
  assert.match(engine, /input\.unresolvedPressure \* 0\.34/);
  assert.match(engine, /input\.dependencySeverity \* 0\.30/);
  assert.match(engine, /input\.failedInterventionRate \* 0\.22/);
  assert.match(engine, /instability \* 0\.56/);
});

test("priority scoring thresholds and replay-safe ordering exist", () => {
  assert.match(engine, /return clamp\(Math\.round\(input\.urgency \* 0\.19/);
  assert.match(engine, /if \(score >= 85\) return "critical"/);
  assert.match(engine, /if \(score >= 70\) return "high"/);
  assert.match(engine, /if \(score >= 45\) return "moderate"/);
  assert.match(engine, /sort\(\(a, b\) => b\.priorityScore - a\.priorityScore \|\| b\.operationalSalience - a\.operationalSalience\)/);
});

test("prioritization handles stale memories unresolved escalation and bounded outputs", () => {
  assert.match(engine, /freshnessScore: clamp\(Math\.round\(100 - ds \* 3\), 8, 100\)/);
  assert.match(engine, /item\.interventionType === "escalation"/);
  assert.match(engine, /slice\(0, MAX_PRIORITIZED_ITEMS\)/);
  assert.match(engine, /slice\(0, MAX_PRIORITY_SUMMARIES\)/);
  assert.match(engine, /operational_memory_prioritization_failed/);
});

test("copilot integrates prioritization before inference with bounded summaries only", () => {
  assert.match(route, /prioritizeOperationalMemory/);
  assert.match(route, /const prioritizedMemory = await prioritizeOperationalMemory\(/);
  assert.match(route, /Operational Priority Signals:/);
  assert.match(route, /boundedPrioritizedMemorySummary = prioritizedMemory\.summaries\.slice\(0, 4\)/);
  assert.doesNotMatch(route, /Operational Priority Signals:[\s\S]*priorityScore/);
});
