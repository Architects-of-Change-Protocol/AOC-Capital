/**
 * Validation script: check-production-runtime
 *
 * Verifies that the production-runtime domain exists, all required files are present,
 * tests exist, docs exist, and package.json includes the check:production-runtime script.
 *
 * Run via: node scripts/check-production-runtime.mjs
 * Wired into package.json as "check:production-runtime".
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const p = (...parts) => path.join(root, ...parts);

const errors = [];
const warnings = [];

function error(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

// ── required production-runtime files ────────────────────────────────────────

const REQUIRED_FILES = [
  "src/lib/production-runtime/index.ts",
  "src/lib/production-runtime/types/production-runtime-types.ts",
  "src/lib/production-runtime/deployment/deployment-runtime.ts",
  "src/lib/production-runtime/deployment/deployment-health.ts",
  "src/lib/production-runtime/deployment/deployment-topology.ts",
  "src/lib/production-runtime/deployment/deployment-survivability.ts",
  "src/lib/production-runtime/deployment/deployment-recovery.ts",
  "src/lib/production-runtime/deployment/deployment-diagnostics.ts",
  "src/lib/production-runtime/environments/runtime-environments.ts",
  "src/lib/production-runtime/environments/environment-governance.ts",
  "src/lib/production-runtime/environments/environment-isolation.ts",
  "src/lib/production-runtime/secrets/secret-governance.ts",
  "src/lib/production-runtime/secrets/secret-boundaries.ts",
  "src/lib/production-runtime/tenants/tenant-provisioning.ts",
  "src/lib/production-runtime/tenants/tenant-runtime-state.ts",
  "src/lib/production-runtime/tenants/tenant-isolation-validation.ts",
  "src/lib/production-runtime/workspaces/workspace-provisioning.ts",
  "src/lib/production-runtime/workspaces/workspace-isolation-validation.ts",
  "src/lib/production-runtime/migrations/migration-runtime.ts",
  "src/lib/production-runtime/migrations/migration-integrity.ts",
  "src/lib/production-runtime/migrations/migration-recovery.ts",
  "src/lib/production-runtime/releases/release-runtime.ts",
  "src/lib/production-runtime/releases/release-governance.ts",
  "src/lib/production-runtime/releases/release-readiness.ts",
  "src/lib/production-runtime/observability/runtime-observability.ts",
  "src/lib/production-runtime/observability/runtime-metrics.ts",
  "src/lib/production-runtime/observability/runtime-heartbeats.ts",
  "src/lib/production-runtime/topology/runtime-topology.ts",
  "src/lib/production-runtime/orchestration/runtime-orchestration.ts",
  "src/lib/production-runtime/persistence/runtime-persistence.ts",
  "src/lib/production-runtime/operations/production-operations-manager.ts",
  "src/lib/production-runtime/operations/production-runtime-narratives.ts",
];

for (const file of REQUIRED_FILES) {
  if (!fs.existsSync(p(file))) {
    error(`Missing required file: ${file}`);
  }
}

// ── test file ─────────────────────────────────────────────────────────────────

if (!fs.existsSync(p("tests/production-runtime.test.mjs"))) {
  error("Missing test file: tests/production-runtime.test.mjs");
}

// ── architecture docs ─────────────────────────────────────────────────────────

if (!fs.existsSync(p("docs/architecture/deployment-multitenant-production-operations.md"))) {
  error("Missing architecture doc: docs/architecture/deployment-multitenant-production-operations.md");
}

if (!fs.existsSync(p("docs/architecture/CURRENT_STATE_PRODUCTION_RUNTIME.md"))) {
  error("Missing architecture doc: docs/architecture/CURRENT_STATE_PRODUCTION_RUNTIME.md");
}

// ── package.json includes check:production-runtime ───────────────────────────

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
  if (pkg && !pkg.scripts?.["check:production-runtime"]) {
    error("package.json is missing script: check:production-runtime");
  }
}

// ── deployment runtime API surface ───────────────────────────────────────────

const managerPath = p("src/lib/production-runtime/operations/production-operations-manager.ts");
if (fs.existsSync(managerPath)) {
  const content = fs.readFileSync(managerPath, "utf8");
  const requiredApis = [
    "retrieveOperationsDeploymentHealth",
    "retrieveOperationsDeploymentTopology",
    "retrieveOperationsDeploymentSurvivability",
    "retrieveOperationsRuntimeEnvironment",
    "retrieveOperationsTenantProvisioning",
    "retrieveOperationsWorkspaceProvisioning",
    "retrieveOperationsMigrationIntegrity",
    "retrieveOperationsReleaseReadiness",
    "retrieveOperationsRuntimeObservability",
    "retrieveOperationsRuntimeMetrics",
    "retrieveOperationsRuntimeHeartbeats",
    "retrieveProductionOperationsSnapshot",
  ];
  for (const api of requiredApis) {
    if (!content.includes(api)) {
      error(`production-operations-manager.ts missing required API: ${api}`);
    }
  }
}

// ── tenant isolation validation ───────────────────────────────────────────────

const isolationPath = p("src/lib/production-runtime/tenants/tenant-isolation-validation.ts");
if (fs.existsSync(isolationPath)) {
  const content = fs.readFileSync(isolationPath, "utf8");
  if (!/evaluateTenantIsolation/.test(content)) {
    error("tenant-isolation-validation.ts missing evaluateTenantIsolation");
  }
  if (!/row_level_security/.test(content)) {
    error("tenant-isolation-validation.ts missing row_level_security boundary");
  }
}

// ── secret governance safety ──────────────────────────────────────────────────

const secretGovPath = p("src/lib/production-runtime/secrets/secret-governance.ts");
if (fs.existsSync(secretGovPath)) {
  const content = fs.readFileSync(secretGovPath, "utf8");
  if (!/isClientSide: false/.test(content)) {
    error("secret-governance.ts must mark server-side secrets as isClientSide: false");
  }
  if (/sk_live_[a-zA-Z0-9]{10,}/.test(content)) {
    error("secret-governance.ts contains what appears to be a hardcoded Stripe live secret");
  }
}

// ── recovery recommendations only ────────────────────────────────────────────

const recoveryPath = p("src/lib/production-runtime/deployment/deployment-recovery.ts");
if (fs.existsSync(recoveryPath)) {
  const content = fs.readFileSync(recoveryPath, "utf8");
  if (/execSync|spawnSync|writeFileSync/.test(content)) {
    error("deployment-recovery.ts must not automate fixes (no execSync/spawnSync/writeFileSync)");
  }
  if (!content.includes("isAutomated: false")) {
    warn("deployment-recovery.ts does not explicitly mark isAutomated: false");
  }
}

// ── environment governance prevents dangerous features ────────────────────────

const envGovPath = p("src/lib/production-runtime/environments/environment-governance.ts");
if (fs.existsSync(envGovPath)) {
  const content = fs.readFileSync(envGovPath, "utf8");
  if (!/debug_auth_bypass/.test(content)) {
    error("environment-governance.ts missing debug_auth_bypass governance policy");
  }
  if (!/tenant_crossover_debug/.test(content)) {
    error("environment-governance.ts missing tenant_crossover_debug governance policy");
  }
  if (!/federation_governance_bypass/.test(content)) {
    error("environment-governance.ts missing federation_governance_bypass governance policy");
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
  console.log("check-production-runtime: FAILED");
  process.exit(1);
}

console.log("check-production-runtime: PASSED — production runtime domain is complete.");
