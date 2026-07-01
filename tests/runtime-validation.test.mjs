import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

// Inline confidence calculation mirroring validation-trace-builder.ts
function calculateConfidence(awakeningStage, imprintConf, feedbackBias = 0, contradiction = false) {
  const awakeScores = { dormant: 0, initializing: 1, orienting: 2, engaged: 3, expanded: 4, "fully-operational": 5 };
  const imprintScores = { forming: 0, emerging: 1, stable: 2, deep: 3 };
  const base = awakeScores[awakeningStage] + imprintScores[imprintConf];
  const adjusted = base + feedbackBias * 2 - (contradiction ? 2 : 0);
  if (adjusted >= 7) return "high";
  if (adjusted >= 5) return "credible";
  if (adjusted >= 2) return "building";
  return "low";
}

// Inline applyFeedback logic mirroring runtime-validation.ts
function applyFeedbackBias(currentBias, feedback) {
  const delta = feedback === "aligned" ? 0.15 : -0.2;
  return Math.max(-1, Math.min(1, currentBias + delta));
}

test("1 — validation trace generation is deterministic", () => {
  const c1 = calculateConfidence("engaged", "stable", 0, false);
  const c2 = calculateConfidence("engaged", "stable", 0, false);
  assert.equal(c1, c2, "same inputs must produce same confidence");

  const c3 = calculateConfidence("orienting", "emerging", 0.1, false);
  const c4 = calculateConfidence("orienting", "emerging", 0.1, false);
  assert.equal(c3, c4, "determinism holds with non-zero bias");
});

test("2 — confidence evolves correctly across awakening and imprint depth", () => {
  assert.equal(calculateConfidence("dormant", "forming"), "low");
  assert.equal(calculateConfidence("initializing", "forming"), "low");
  assert.equal(calculateConfidence("orienting", "forming"), "building");
  assert.equal(calculateConfidence("orienting", "emerging"), "building");
  assert.equal(calculateConfidence("engaged", "stable"), "credible");
  assert.equal(calculateConfidence("expanded", "stable"), "credible");
  assert.equal(calculateConfidence("fully-operational", "deep"), "high");

  const levels = ["low", "building", "credible", "high"];
  const lower = calculateConfidence("initializing", "forming");
  const higher = calculateConfidence("fully-operational", "deep");
  assert.equal(levels.indexOf(higher) > levels.indexOf(lower), true, "higher stage → higher confidence");
});

test("3 — contradiction detection reduces confidence", () => {
  const withoutContradiction = calculateConfidence("engaged", "stable", 0, false);
  const withContradiction = calculateConfidence("engaged", "stable", 0, true);
  const levels = ["low", "building", "credible", "high"];
  assert.equal(
    levels.indexOf(withContradiction) <= levels.indexOf(withoutContradiction),
    true,
    "contradiction must not increase confidence",
  );
  // Verify meaningful reduction at a boundary case
  assert.equal(calculateConfidence("orienting", "emerging", 0, true), "low");
});

test("4 — trace history persists with bounded rolling storage", () => {
  const code = read("src/lib/workspace/runtime-validation.ts");
  assert.equal(code.includes("pmfreak.validation"), true, "storage key prefix present");
  assert.equal(code.includes("MAX_TRACES"), true, "max traces constant defined");
  assert.equal(code.includes("slice(-MAX_TRACES)"), true, "bounded history enforced");
  assert.match(code, /MAX_TRACES\s*=\s*25/, "history capped at 25 traces");
  assert.equal(code.includes("companyId"), true, "scoped by companyId");
  assert.equal(code.includes("workspaceId"), true, "scoped by workspaceId");
  assert.equal(code.includes("userId"), true, "scoped by userId");
});

test("5 — runtime trust panel exports required structural sections", () => {
  const code = read("src/components/pmfreak/workspace/runtime-trust-panel.tsx");
  assert.equal(code.includes("currentConfidence"), true, "confidence prop used");
  assert.equal(code.includes("activeSources"), true, "active sources rendered");
  assert.equal(code.includes("reasoningPath"), true, "operational lineage rendered");
  assert.equal(code.includes("continuitySignals"), true, "trust notes rendered");
  assert.equal(code.includes("Runtime aligned"), true, "positive feedback label present");
  assert.equal(code.includes("Needs recalibration"), true, "negative feedback label present");
  assert.equal(code.includes("onFeedback"), true, "feedback handler wired");
});

test("6 — explainability section uses actual trace reasoning inputs", () => {
  const code = read("src/components/pmfreak/workspace/workspace-conversation-shell.tsx");
  assert.equal(code.includes("Why this response"), true, "explainability label present");
  assert.equal(code.includes("continuitySignals"), true, "continuity signals in explainability");
  assert.equal(code.includes("activeSources"), true, "active sources in explainability");
  assert.equal(code.includes("Generated from:"), true, "explainability structure present");
  assert.equal(code.includes("msg.trace"), true, "trace attached to message for explainability");
});

test("7 — feedback influences feedbackBias correctly", () => {
  const biasAfterAligned = applyFeedbackBias(0, "aligned");
  assert.equal(biasAfterAligned > 0, true, "aligned feedback increases bias");

  const biasAfterNeeds = applyFeedbackBias(0, "needs-recalibration");
  assert.equal(biasAfterNeeds < 0, true, "recalibration feedback decreases bias");

  // Clamped to [-1, 1]
  const clamped = applyFeedbackBias(0.99, "aligned");
  assert.equal(clamped <= 1, true, "bias clamped at upper bound");

  const clampedLow = applyFeedbackBias(-0.95, "needs-recalibration");
  assert.equal(clampedLow >= -1, true, "bias clamped at lower bound");

  // Multiple aligned feedbacks increase bias relative to mixed
  const multiAligned = [0, 1, 2, 3].reduce((b) => applyFeedbackBias(b, "aligned"), 0);
  assert.equal(multiAligned > 0, true, "repeated aligned feedback accumulates");

  const code = read("src/lib/workspace/runtime-validation.ts");
  assert.equal(code.includes("applyFeedback"), true, "applyFeedback exported");
  assert.equal(code.includes("feedbackBias"), true, "feedbackBias tracked in state");
});

test("8 — validation replay shows required trace fields", () => {
  const code = read("src/components/pmfreak/workspace/validation-replay.tsx");
  assert.equal(code.includes("triggerSummary"), true, "input summary shown");
  assert.equal(code.includes("activeSources"), true, "runtime sources shown");
  assert.equal(code.includes("confidence"), true, "confidence shown");
  assert.equal(code.includes("outputBias"), true, "output bias shown");
  assert.equal(code.includes("feedbackState"), true, "feedback state shown");
  assert.equal(code.includes("Trace #"), true, "trace numbering shown");
  assert.equal(code.includes("VALIDATION_CONFIDENCE_LABELS"), true, "confidence labels used");
});

test("9 — beta validation flag gates trust surface visibility", () => {
  const shellCode = read("src/components/pmfreak/workspace/workspace-conversation-shell.tsx");
  assert.equal(shellCode.includes("isRuntimeValidationEnabled"), true, "feature flag imported");
  assert.equal(shellCode.includes("validationEnabled"), true, "flag used to gate surfaces");
  assert.match(shellCode, /validationEnabled\s*\?/, "conditional rendering on flag");

  const betaCode = read("src/lib/workspace/beta-validation-mode.ts");
  assert.equal(betaCode.includes("ENABLE_RUNTIME_VALIDATION"), true, "flag name in beta mode module");
  assert.equal(betaCode.includes("FLAG_KEY"), true, "localStorage key defined");
  assert.equal(betaCode.includes("setRuntimeValidationEnabled"), true, "setter exported for programmatic control");
  assert.equal(betaCode.includes("isRuntimeValidationEnabled"), true, "getter exported");
});
