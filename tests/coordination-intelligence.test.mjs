import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const engine = fs.readFileSync("src/lib/vault/coordination-intelligence.ts", "utf8");
const route = fs.readFileSync("src/app/api/copilot/route.ts", "utf8");

test("coordination intelligence exports deterministic API", () => {
  for (const token of [
    "export async function analyzeOperationalCoordination",
    "export async function buildCoordinationGraph",
    "export async function calculateHandoffFriction",
    "export async function calculateDependencyChainRisk",
    "export async function calculateCoordinationBottleneckScore",
    "export async function calculateExecutionFlowStability",
    "export async function calculateCoordinationRecoveryPressure",
    "export function classifyCoordinationRisk",
    "export function determineCoordinationContext",
    "export function buildCoordinationIntelligenceSummary",
  ]) assert.match(engine, new RegExp(token));
});

test("coordination graph is bounded and deterministic", () => {
  assert.match(engine, /MAX_COORDINATION_NODES = 24/);
  assert.match(engine, /MAX_COORDINATION_EDGES = 32/);
  assert.match(engine, /MAX_COORDINATION_SIGNALS = 12/);
  assert.match(engine, /MAX_COORDINATION_SUMMARIES = 5/);
  assert.match(engine, /MAX_COORDINATION_EVIDENCE = 3/);
  assert.match(engine, /signal\.type\.includes\("dependency"\).*"depends_on"/s);
  assert.match(engine, /signal\.type\.includes\("blocker"\).*"blocks"/s);
  assert.match(engine, /signal\.type\.includes\("approval"\) \|\| signal\.type\.includes\("governance"\).*"requires_approval_from"/s);
  assert.match(engine, /const ROLE_CATALOG = \[/);
  assert.doesNotMatch(engine, /firstName|lastName|fullName|displayName/);
});

test("coordination scoring formulas are explicit and bounded", () => {
  assert.match(engine, /failedHandoffs \* 8 \+ escalations \* 6/);
  assert.match(engine, /recurringDependency \* 7 \+ timelineDrift \* 4/);
  assert.match(engine, /input\.node\.unresolvedPressure \* 0\.20/);
  assert.match(engine, /resolved \* 4 - unresolved \* 3/);
  assert.match(engine, /input\.coordinationRisk \* 0\.34/);
  assert.match(engine, /const clamp = \(v: number, min = 0, max = 100\)/);
});

test("classification thresholds and context mapping are deterministic", () => {
  assert.match(engine, /if \(score >= 85\) return "critical"/);
  assert.match(engine, /if \(score >= 70\) return "high"/);
  assert.match(engine, /if \(score >= 45\) return "moderate"/);
  assert.match(engine, /if \(input\.dependencyChainRisk >= 70\) return "dependency_chain"/);
  assert.match(engine, /if \(input\.handoffFriction >= 70\) return "handoff_friction"/);
  assert.match(engine, /if \(input\.approvalPressure >= 65\) return "approval_bottleneck"/);
});

test("copilot integration is before inference and injects compact bounded summaries", () => {
  assert.match(route, /analyzeOperationalCoordination/);
  assert.match(route, /const coordinationIntelligence = await analyzeOperationalCoordination\(/);
  assert.match(route, /Operational Coordination Intelligence:/);
  assert.match(route, /boundedCoordinationSummary = coordinationIntelligence\.summaries\.slice\(0, 5\)/);
  assert.match(route, /runInference\(/);
  assert.doesNotMatch(route, /Operational Coordination Intelligence:[\s\S]*coordinationIntelligence\.graph/);
  assert.doesNotMatch(route, /Operational Coordination Intelligence:[\s\S]*nodes:/);
  assert.doesNotMatch(route, /Operational Coordination Intelligence:[\s\S]*edges:/);
  assert.match(route, /let boundedCoordinationSummary = \["Operational coordination intelligence degraded; bounded coordination defaults applied\."\]/);
});
