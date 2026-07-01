import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const engine = fs.readFileSync("src/lib/vault/intervention-efficacy.ts", "utf8");
const route = fs.readFileSync("src/app/api/copilot/route.ts", "utf8");

test("scoring exports and deterministic formulas are present", () => {
  for (const token of [
    "export async function calculateInterventionEfficacy",
    "export async function calculateStakeholderResponsiveness",
    "export async function buildOperationalConfidenceProfile",
    "export function computeInterventionSuccessRate",
    "export function computeInterventionFailureRate",
    "export function computeOperationalConfidence",
    "export function computeEscalationInstability",
    "export function computeRecoveryStability",
    "export function classifyOperationalTrust",
    "export function buildInterventionEfficacySummary",
  ]) assert.match(engine, new RegExp(token));

  assert.match(engine, /\(input\.resolved \+ \(input\.partiallyResolved \?\? 0\) \* 0\.5\) \/ input\.total/);
  assert.match(engine, /\(input\.failed \+ input\.ignored\) \/ input\.total/);
  assert.match(engine, /return clamp\(Math\.round\(\(escalationRate \* 40 \+ failedRate \* 30 \+ ignoredRate \* 20 \+ repeatedRate \* 10\) \* 100\)\)/);
  assert.match(engine, /return clamp\(Math\.round\(\(weightedRecovery \* 50 \+ freshnessFactor \* 20 \+ dependencyFactor \* 15 \+ timelineFactor \* 15\) \* 100\)\)/);
  assert.match(engine, /return clamp\(Math\.round\(score\)\)/);
});

test("trust thresholds and bounds are deterministic", () => {
  assert.match(engine, /if \(confidence >= 85\) return "trusted"/);
  assert.match(engine, /if \(confidence >= 70\) return "stable"/);
  assert.match(engine, /if \(confidence >= 50\) return "volatile"/);
  assert.match(engine, /if \(confidence >= 30\) return "degrading"/);
  assert.match(engine, /return "unreliable"/);
  assert.match(engine, /const clamp = \(v: number, min = 0, max = 100\)/);
});

test("stakeholder responsiveness penalizes ignored and escalation-heavy behavior", () => {
  assert.match(engine, /ignoredCount = items\.filter\(\(i\) => i\.outcomeStatus === "ignored"\)\.length/);
  assert.match(engine, /resolvedCount = items\.filter\(\(i\) => i\.outcomeStatus === "resolved" \|\| i\.outcomeStatus === "partially_resolved"\)\.length/);
  assert.match(engine, /escalationVolatility = clamp\(Math\.round\(\(escalationCount \/ Math\.max\(1, totalInterventions\)\) \* 100\)\)/);
  assert.match(engine, /responsivenessScore = clamp\(Math\.round\(coordinationReliability - escalationVolatility \* 0\.3\)\)/);
});

test("copilot integrates efficacy scoring before inference with bounded context and fail-soft behavior", () => {
  assert.match(route, /const \[efficacy, stakeholders, confidence\] = await Promise\.all\(\[/);
  assert.match(route, /calculateInterventionEfficacy\(/);
  assert.match(route, /buildOperationalConfidenceProfile\(/);
  assert.match(route, /buildInterventionEfficacySummary\(/);
  assert.match(route, /Operational Confidence:/);
  assert.match(route, /intervention_efficacy_scoring_failed/);
  assert.doesNotMatch(route, /Operational Confidence:[\s\S]*target_stakeholders/);
});
