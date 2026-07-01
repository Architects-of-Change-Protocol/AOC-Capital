import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const engine = fs.readFileSync("src/lib/vault/attention-orchestration.ts", "utf8");
const route = fs.readFileSync("src/app/api/copilot/route.ts", "utf8");

test("attention orchestration exports deterministic API", () => {
  for (const token of [
    "export async function orchestrateOperationalAttention",
    "export async function calculateAttentionPriority",
    "export async function calculateExecutiveVisibility",
    "export async function calculateEscalationVisibility",
    "export async function calculateDeliveryAttention",
    "export async function calculateStakeholderAttention",
    "export async function calculateGovernanceAttention",
    "export async function calculateOperationalAttentionPressure",
    "export function classifyAttentionLevel",
    "export function determineAttentionAudience",
    "export function buildAttentionRoutingSummary",
  ]) assert.match(engine, new RegExp(token));
});

test("attention calculations and bounds are explicit", () => {
  assert.match(engine, /MAX_ATTENTION_SIGNALS = 18/);
  assert.match(engine, /MAX_ROUTING_SUMMARIES = 5/);
  assert.match(engine, /MAX_EXECUTIVE_SIGNALS = 4/);
  assert.match(engine, /input\.governanceInstability \* 0\.24/);
  assert.match(engine, /input\.unresolvedEscalations \* 0\.29/);
  assert.match(engine, /input\.unresolvedBlockers \* 0\.32/);
  assert.match(engine, /input\.coordinationInstability \* 0\.34/);
  assert.match(engine, /input\.governanceVolatility \* 0\.27/);
});

test("routing and classification are deterministic and replay-safe", () => {
  assert.match(engine, /if \(score >= 85\) return "critical"/);
  assert.match(engine, /if \(score >= 70\) return "high"/);
  assert.match(engine, /if \(score >= 45\) return "moderate"/);
  assert.match(engine, /sort\(\(a, b\) => b\.attentionPriority - a\.attentionPriority \|\| b\.operationalPressure - a\.operationalPressure\)/);
  assert.match(engine, /if \(input\.governanceAttention >= 75 \|\| input\.escalationVisibility >= 80\) return "executive"/);
  assert.match(engine, /if \(input\.deliveryAttention >= 70 && input\.dependencySeverity >= 65\) return "technical_lead"/);
});

test("execution context mapping and fail-soft behavior exist", () => {
  assert.match(engine, /if \(input\.escalationVisibility >= 78\) return "escalation_management"/);
  assert.match(engine, /if \(input\.dependencySeverity >= 70\) return "dependency_resolution"/);
  assert.match(engine, /if \(input\.timelinePressure >= 70\) return "timeline_stabilization"/);
  assert.match(engine, /operational_attention_orchestration_failed/);
  assert.match(engine, /degraded:operational_attention/);
});

test("copilot integrates attention orchestration before inference with bounded summaries", () => {
  assert.match(route, /orchestrateOperationalAttention/);
  assert.match(route, /const attentionOrchestration = await orchestrateOperationalAttention\(/);
  assert.match(route, /Operational Attention Signals:/);
  assert.match(route, /boundedAttentionRoutingSummary = attentionOrchestration\.routingSummaries\.slice\(0, 4\)/);
  assert.doesNotMatch(route, /Operational Attention Signals:[\s\S]*attentionSignals/);
});
