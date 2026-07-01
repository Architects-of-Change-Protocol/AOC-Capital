import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const rh = (...parts) => path.join(repoRoot, "src/lib/runtime-hardening", ...parts);
const r = (...parts) => path.join(repoRoot, ...parts);

// ── domain existence ──────────────────────────────────────────────────────────

test("runtime-hardening domain directory exists", () => {
  assert.equal(existsSync(rh()), true);
});

const REQUIRED_FILES = [
  "index.ts",
  "runtime-hardening-types.ts",
  "runtime-hardening-manager.ts",
  "startup-assertions.ts",
  "runtime-invariants.ts",
  "cognition-contracts.ts",
  "runtime-boundary-validation.ts",
  "replay-integrity.ts",
  "synchronization-integrity.ts",
  "anti-corruption-layer.ts",
  "degraded-mode.ts",
  "runtime-survivability.ts",
  "runtime-health.ts",
  "runtime-slo.ts",
  "runtime-readiness.ts",
  "runtime-recovery.ts",
  "runtime-failure-classification.ts",
  "runtime-launch-gates.ts",
  "runtime-governance.ts",
  "runtime-isolation.ts",
  "runtime-integrity-diagnostics.ts",
  "runtime-hardening-narratives.ts",
];

for (const file of REQUIRED_FILES) {
  test(`runtime-hardening/${file} exists`, () => {
    assert.equal(existsSync(rh(file)), true, `Missing required file: ${file}`);
  });
}

// ── manager exports ───────────────────────────────────────────────────────────

test("runtime-hardening-manager.ts exports required APIs", () => {
  const content = readFileSync(rh("runtime-hardening-manager.ts"), "utf8");
  const requiredExports = [
    "retrieveRuntimeHealth",
    "retrieveRuntimeIntegrity",
    "retrieveReplayIntegrity",
    "retrieveSynchronizationIntegrity",
    "retrieveRuntimeSurvivability",
    "retrieveLaunchReadiness",
    "retrieveRuntimeDiagnostics",
    "retrieveRuntimeNarratives",
    "retrieveOperationalSLOs",
  ];
  for (const fn of requiredExports) {
    assert.match(content, new RegExp(`\\b${fn}\\b`), `Manager missing: ${fn}`);
  }
});

// ── startup assertions ────────────────────────────────────────────────────────

test("startup-assertions.ts mentions critical subsystem scripts", () => {
  const content = readFileSync(rh("startup-assertions.ts"), "utf8");
  assert.match(content, /check-operational-memory/);
  assert.match(content, /check-autonomous-intervention/);
  assert.match(content, /check-executive-command/);
  assert.match(content, /check-external-connector-runtime/);
  assert.match(content, /runtime-consumer/);
});

test("startup-assertions.ts exports required functions", () => {
  const content = readFileSync(rh("startup-assertions.ts"), "utf8");
  assert.match(content, /buildStartupAssertions/);
  assert.match(content, /evaluateStartupAssertions/);
  assert.match(content, /retrieveStartupAssertionSummary/);
});

// ── runtime invariants ────────────────────────────────────────────────────────

test("runtime-invariants.ts includes tenant/workspace/governance/replay/source-lineage invariants", () => {
  const content = readFileSync(rh("runtime-invariants.ts"), "utf8");
  assert.match(content, /tenant/i);
  assert.match(content, /workspace/i);
  assert.match(content, /governance/i);
  assert.match(content, /replay/i);
  assert.match(content, /lineage/i);
});

test("runtime-invariants.ts exports required functions", () => {
  const content = readFileSync(rh("runtime-invariants.ts"), "utf8");
  assert.match(content, /buildRuntimeInvariants/);
  assert.match(content, /evaluateRuntimeInvariants/);
  assert.match(content, /retrieveRuntimeInvariantSummary/);
});

// ── anti-corruption layer ─────────────────────────────────────────────────────

test("anti-corruption-layer.ts bounds confidence between 0 and 1", () => {
  const content = readFileSync(rh("anti-corruption-layer.ts"), "utf8");
  assert.match(content, /raw < 0/);
  assert.match(content, /raw > 1/);
  assert.match(content, /normalizeRuntimeConfidence/);
});

test("anti-corruption-layer.ts rejects malformed signals", () => {
  const content = readFileSync(rh("anti-corruption-layer.ts"), "utf8");
  assert.match(content, /rejectMalformedRuntimeSignal/);
  assert.match(content, /rejectionReasons/);
});

test("anti-corruption-layer.ts exports all required functions", () => {
  const content = readFileSync(rh("anti-corruption-layer.ts"), "utf8");
  const fns = [
    "sanitizeRuntimeEvidence",
    "normalizeRuntimeConfidence",
    "validateRuntimeBoundaryIds",
    "rejectMalformedRuntimeSignal",
    "enforceBoundedUncertainty",
    "buildAntiCorruptionResult",
  ];
  for (const fn of fns) {
    assert.match(content, new RegExp(`\\b${fn}\\b`), `Missing: ${fn}`);
  }
});

// ── launch readiness ──────────────────────────────────────────────────────────

test("runtime-readiness.ts includes blockers/warnings/status semantics", () => {
  const content = readFileSync(rh("runtime-readiness.ts"), "utf8");
  assert.match(content, /blockers/);
  assert.match(content, /warnings/);
  assert.match(content, /blocked/);
  assert.match(content, /ready_with_warnings/);
  assert.match(content, /ready/);
});

test("runtime-launch-gates.ts includes required gate categories", () => {
  const content = readFileSync(rh("runtime-launch-gates.ts"), "utf8");
  assert.match(content, /package_integrity/);
  assert.match(content, /governance_readiness/);
  assert.match(content, /replay_readiness/);
  assert.match(content, /runtime_authorization_readiness/);
});

// ── recovery recommendations ──────────────────────────────────────────────────

test("runtime-recovery.ts provides recommendation-only suggestions (no automated fixes)", () => {
  const content = readFileSync(rh("runtime-recovery.ts"), "utf8");
  assert.match(content, /isAutomated: false/);
  assert.match(content, /recommendRuntimeRecovery/);
  assert.doesNotMatch(content, /execSync|spawnSync|writeFileSync/);
});

// ── types ─────────────────────────────────────────────────────────────────────

test("runtime-hardening-types.ts defines all required subsystems", () => {
  const content = readFileSync(rh("runtime-hardening-types.ts"), "utf8");
  const subsystems = [
    "operational_memory",
    "nutrient_bridge",
    "continuity_retrieval",
    "cross_domain_correlation",
    "predictive_intelligence",
    "autonomous_intervention",
    "intervention_learning",
    "executive_command",
    "organizational_digital_twin",
    "realtime_telemetry",
    "event_bus",
    "war_room_ui",
    "external_connectors",
    "runtime_authorization",
    "governance",
    "billing",
    "upload_pipeline",
  ];
  for (const s of subsystems) {
    assert.match(content, new RegExp(s), `Missing subsystem: ${s}`);
  }
});

test("runtime-hardening-types.ts includes governance boundaries in result types", () => {
  const content = readFileSync(rh("runtime-hardening-types.ts"), "utf8");
  assert.match(content, /governanceBoundaries/);
  assert.match(content, /confidence/);
  assert.match(content, /uncertainty/);
  assert.match(content, /evidence/);
  assert.match(content, /checkedAt/);
});

// ── degraded mode ─────────────────────────────────────────────────────────────

test("degraded-mode.ts defines launch_blocked status", () => {
  const content = readFileSync(rh("degraded-mode.ts"), "utf8");
  assert.match(content, /launch_blocked/);
  assert.match(content, /classifyDegradedMode/);
  assert.match(content, /retrieveDegradedModeState/);
});

// ── SLOs ──────────────────────────────────────────────────────────────────────

test("runtime-slo.ts defines all required SLOs", () => {
  const content = readFileSync(rh("runtime-slo.ts"), "utf8");
  assert.match(content, /package_json_valid/);
  assert.match(content, /validation_scripts_present/);
  assert.match(content, /replay_integrity_present/);
  assert.match(content, /synchronization_integrity_present/);
  assert.match(content, /governance_boundaries_present/);
  assert.match(content, /source_lineage_present/);
  assert.match(content, /connector_runtime_present/);
  assert.match(content, /build_test_contracts_present/);
});

// ── validation script ─────────────────────────────────────────────────────────

test("scripts/check-runtime-hardening.mjs exists", () => {
  assert.equal(existsSync(r("scripts/check-runtime-hardening.mjs")), true);
});

// ── docs ──────────────────────────────────────────────────────────────────────

test("docs/architecture/runtime-hardening-enterprise-productionization.md exists", () => {
  assert.equal(existsSync(r("docs/architecture/runtime-hardening-enterprise-productionization.md")), true);
});

test("docs/architecture/CURRENT_STATE_RUNTIME_HARDENING.md exists", () => {
  assert.equal(existsSync(r("docs/architecture/CURRENT_STATE_RUNTIME_HARDENING.md")), true);
});
