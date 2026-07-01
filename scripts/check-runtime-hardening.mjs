/**
 * Validation script: check-runtime-hardening
 *
 * Verifies that the runtime hardening domain exists, all required files are present,
 * tests exist, docs exist, and package.json includes the check:runtime-hardening script.
 *
 * Run via: node scripts/check-runtime-hardening.mjs
 * Wired into package.json as "check:runtime-hardening".
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const p = (...parts) => path.join(root, ...parts);

const errors = [];
const warnings = [];

function error(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

// ── required hardening files ──────────────────────────────────────────────────

const REQUIRED_HARDENING_FILES = [
  "src/lib/runtime-hardening/index.ts",
  "src/lib/runtime-hardening/runtime-hardening-types.ts",
  "src/lib/runtime-hardening/runtime-hardening-manager.ts",
  "src/lib/runtime-hardening/startup-assertions.ts",
  "src/lib/runtime-hardening/runtime-invariants.ts",
  "src/lib/runtime-hardening/cognition-contracts.ts",
  "src/lib/runtime-hardening/runtime-boundary-validation.ts",
  "src/lib/runtime-hardening/replay-integrity.ts",
  "src/lib/runtime-hardening/synchronization-integrity.ts",
  "src/lib/runtime-hardening/anti-corruption-layer.ts",
  "src/lib/runtime-hardening/degraded-mode.ts",
  "src/lib/runtime-hardening/runtime-survivability.ts",
  "src/lib/runtime-hardening/runtime-health.ts",
  "src/lib/runtime-hardening/runtime-slo.ts",
  "src/lib/runtime-hardening/runtime-readiness.ts",
  "src/lib/runtime-hardening/runtime-recovery.ts",
  "src/lib/runtime-hardening/runtime-failure-classification.ts",
  "src/lib/runtime-hardening/runtime-launch-gates.ts",
  "src/lib/runtime-hardening/runtime-governance.ts",
  "src/lib/runtime-hardening/runtime-isolation.ts",
  "src/lib/runtime-hardening/runtime-integrity-diagnostics.ts",
  "src/lib/runtime-hardening/runtime-hardening-narratives.ts",
];

for (const file of REQUIRED_HARDENING_FILES) {
  if (!fs.existsSync(p(file))) {
    error(`Missing required hardening file: ${file}`);
  }
}

// ── test file ─────────────────────────────────────────────────────────────────

if (!fs.existsSync(p("tests/runtime-hardening.test.mjs"))) {
  error("Missing test file: tests/runtime-hardening.test.mjs");
}

// ── architecture docs ─────────────────────────────────────────────────────────

if (!fs.existsSync(p("docs/architecture/runtime-hardening-enterprise-productionization.md"))) {
  error("Missing architecture doc: docs/architecture/runtime-hardening-enterprise-productionization.md");
}

if (!fs.existsSync(p("docs/architecture/CURRENT_STATE_RUNTIME_HARDENING.md"))) {
  error("Missing architecture doc: docs/architecture/CURRENT_STATE_RUNTIME_HARDENING.md");
}

// ── package.json includes check:runtime-hardening ────────────────────────────

const pkgPath = p("package.json");
if (!fs.existsSync(pkgPath)) {
  error("package.json not found");
} else {
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  } catch {
    error("package.json is not valid JSON");
  }
  if (pkg && !pkg.scripts?.["check:runtime-hardening"]) {
    error("package.json is missing script: check:runtime-hardening");
  }
}

// ── manager API surface ───────────────────────────────────────────────────────

const managerPath = p("src/lib/runtime-hardening/runtime-hardening-manager.ts");
if (fs.existsSync(managerPath)) {
  const content = fs.readFileSync(managerPath, "utf8");
  const requiredApis = [
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
  for (const api of requiredApis) {
    if (!content.includes(api)) {
      error(`runtime-hardening-manager.ts missing required API: ${api}`);
    }
  }
}

// ── anti-corruption layer safety ──────────────────────────────────────────────

const aclPath = p("src/lib/runtime-hardening/anti-corruption-layer.ts");
if (fs.existsSync(aclPath)) {
  const content = fs.readFileSync(aclPath, "utf8");
  if (!/normalizeRuntimeConfidence/.test(content)) {
    error("anti-corruption-layer.ts missing normalizeRuntimeConfidence");
  }
  if (!/rejectMalformedRuntimeSignal/.test(content)) {
    error("anti-corruption-layer.ts missing rejectMalformedRuntimeSignal");
  }
  if (/execSync|spawnSync/.test(content)) {
    error("anti-corruption-layer.ts must not call execSync or spawnSync");
  }
}

// ── recovery recommendations only (no automated fixes) ───────────────────────

const recoveryPath = p("src/lib/runtime-hardening/runtime-recovery.ts");
if (fs.existsSync(recoveryPath)) {
  const content = fs.readFileSync(recoveryPath, "utf8");
  if (/execSync|spawnSync|writeFileSync/.test(content)) {
    error("runtime-recovery.ts must not automate fixes (no execSync/spawnSync/writeFileSync)");
  }
  if (!content.includes("isAutomated: false")) {
    warn("runtime-recovery.ts does not explicitly mark isAutomated: false");
  }
}

// ── report ────────────────────────────────────────────────────────────────────

if (warnings.length > 0) {
  console.log(`WARNINGS (${warnings.length}):`);
  for (const w of warnings) console.log(`  WARN  ${w}`);
  console.log();
}

if (errors.length > 0) {
  console.log(`ERRORS (${errors.length}):`);
  for (const e of errors) console.log(`  ERROR ${e}`);
  console.log();
  console.log("check-runtime-hardening: FAILED");
  process.exit(1);
}

console.log("check-runtime-hardening: PASSED — runtime hardening domain is complete.");
