import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const engine = fs.readFileSync("src/lib/vault/adaptive-confidence.ts", "utf8");
const route = fs.readFileSync("src/app/api/copilot/route.ts", "utf8");

test("adaptive confidence exports deterministic engine API", () => {
  for (const token of [
    "export async function buildAdaptiveOperationalConfidence",
    "export async function calculateConfidenceEvolution",
    "export async function calculateOperationalDrift",
    "export async function calculateVolatilityTrajectory",
    "export async function calculateExecutionStability",
    "export function computeConfidenceAdjustment",
    "export function computeConfidenceDecay",
    "export function computeConfidenceRecovery",
    "export function classifyConfidenceTrajectory",
    "export function buildAdaptiveConfidenceSummary",
  ]) assert.match(engine, new RegExp(token));
});

test("stability drift and volatility formulas are explicit and bounded", () => {
  assert.match(engine, /MAX_ADAPTIVE_SUMMARIES = 5/);
  assert.match(engine, /MAX_CONFIDENCE_HISTORY = 24/);
  assert.match(engine, /MAX_VOLATILITY_SIGNALS = 12/);
  assert.match(engine, /const clamp = \(value: number, min = 0, max = 100\)/);
  assert.match(engine, /return clamp\(Math\.round\(\n\s*\(resolved \/ total\) \* 45/);
  assert.match(engine, /return clamp\(Math\.round\(\n\s*unresolvedPressure \* 0\.30/);
  assert.match(engine, /return clamp\(Math\.round\(escalationRecurrence \* 0\.26/);
});

test("confidence evolution and trajectory thresholds are deterministic", () => {
  assert.match(engine, /return clamp\(Math\.round\(\(positive - negative\) \/ 18\), -12, 8\)/);
  assert.match(engine, /const baseDecay = input\.unresolvedPressure >= 70 \? 2 : 3/);
  assert.match(engine, /return clamp\(Math\.round\(recovery \* 0\.35\)\)/);
  assert.match(engine, /if \(confidence >= 85\) return "improving"/);
  assert.match(engine, /if \(confidence >= 70\) return "stable"/);
  assert.match(engine, /if \(confidence >= 50\) return "fragile"/);
  assert.match(engine, /if \(confidence >= 30\) return "degrading"/);
  assert.match(engine, /return "critical"/);
});

test("fail-soft degraded behavior and bounded summaries exist", () => {
  assert.match(engine, /adaptive_confidence_failed/);
  assert.match(engine, /operationalConfidence: 35/);
  assert.match(engine, /confidenceTrajectory: "degrading"/);
  assert.match(engine, /slice\(0, MAX_ADAPTIVE_SUMMARIES\)/);
  assert.match(engine, /slice\(-\(MAX_CONFIDENCE_HISTORY - 1\)\)/);
});

test("copilot integrates adaptive confidence before inference with bounded injection", () => {
  assert.match(route, /buildAdaptiveOperationalConfidence/);
  assert.match(route, /const adaptiveConfidence = await buildAdaptiveOperationalConfidence\(/);
  assert.match(route, /Adaptive Operational Confidence:/);
  assert.match(route, /boundedAdaptiveConfidenceSummary = adaptiveConfidence\.summaries\.slice\(0, 4\)/);
  assert.doesNotMatch(route, /Adaptive Operational Confidence:[\s\S]*operationalDrift":/);
});
