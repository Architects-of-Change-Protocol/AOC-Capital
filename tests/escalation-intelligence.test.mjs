import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const engine = fs.readFileSync("src/lib/vault/escalation-intelligence.ts", "utf8");
const route = fs.readFileSync("src/app/api/copilot/route.ts", "utf8");

test("escalation intelligence exports deterministic API", () => {
  for (const token of [
    "export async function analyzeOperationalEscalation",
    "export async function calculateEscalationPressure",
    "export async function calculateEscalationEffectiveness",
    "export async function calculateEscalationFatigue",
    "export async function calculateGovernancePressure",
    "export async function calculateExecutionBreakdownRisk",
    "export async function calculateEscalationRecoveryImpact",
    "export function classifyEscalationSeverity",
    "export function determineEscalationLifecycleStage",
    "export function buildEscalationIntelligenceSummary",
  ]) assert.match(engine, new RegExp(token));
});

test("escalation calculations are explicit and bounded", () => {
  assert.match(engine, /MAX_ESCALATION_SIGNALS = 12/);
  assert.match(engine, /MAX_ESCALATION_SUMMARIES = 5/);
  assert.match(engine, /MAX_ESCALATION_EVIDENCE = 3/);
  assert.match(engine, /input\.recurrenceCount \* 8 \+ input\.unresolvedPressure \* 0\.26/);
  assert.match(engine, /input\.resolvedEscalations \* 8 \+ input\.approvalsAccelerated \* 5/);
  assert.match(engine, /input\.recurrenceCount \* 9 \+ input\.repeatedDomainPressure \* 0\.22/);
  assert.match(engine, /input\.delayedApprovals \* 12 \+ input\.governanceChains \* 10/);
  assert.match(engine, /input\.escalationPressure \* 0\.30/);
  assert.match(engine, /input\.executionFlowImprovement \* 0\.24/);
  assert.match(engine, /const clamp = \(v: number, min = 0, max = 100\)/);
});

test("severity and lifecycle mappings are deterministic", () => {
  assert.match(engine, /if \(score >= 85\) return "critical"/);
  assert.match(engine, /if \(score >= 70\) return "high"/);
  assert.match(engine, /if \(score >= 45\) return "moderate"/);
  assert.match(engine, /if \(input\.resolved\) return "resolved"/);
  assert.match(engine, /if \(input\.recurrenceCount >= 3 && input\.unresolvedPressure >= 65 && input\.escalationEffectiveness < 50\) return "fatigued"/);
  assert.match(engine, /if \(input\.recurrenceCount >= 3 && input\.unresolvedPressure >= 60\) return "chronic"/);
  assert.match(engine, /if \(input\.unresolvedPressure >= 55\) return "active"/);
  assert.match(engine, /return "emerging"/);
});

test("copilot integration executes before inference and injects bounded escalation summaries", () => {
  assert.match(route, /analyzeOperationalEscalation/);
  assert.match(route, /const escalationIntelligence = await analyzeOperationalEscalation\(/);
  assert.match(route, /Operational Escalation Intelligence:/);
  assert.match(route, /boundedEscalationSummary = escalationIntelligence\.summaries\.slice\(0, 5\)/);
  assert.match(route, /runInference\(/);
  assert.doesNotMatch(route, /Operational Escalation Intelligence:[\s\S]*escalationIntelligence\.signals/);
  assert.doesNotMatch(route, /Operational Escalation Intelligence:[\s\S]*profile:/);
  assert.match(route, /let boundedEscalationSummary = \["Operational escalation intelligence degraded; bounded escalation defaults applied\."\]/);
});
