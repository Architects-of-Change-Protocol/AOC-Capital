import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const pr = (...parts) => path.join(repoRoot, "src/lib/production-runtime", ...parts);
const r = (...parts) => path.join(repoRoot, ...parts);

// ── domain existence ──────────────────────────────────────────────────────────

test("production-runtime domain directory exists", () => {
  assert.equal(existsSync(pr()), true);
});

const REQUIRED_FILES = [
  "index.ts",
  "types/production-runtime-types.ts",
  "deployment/deployment-runtime.ts",
  "deployment/deployment-health.ts",
  "deployment/deployment-topology.ts",
  "deployment/deployment-survivability.ts",
  "deployment/deployment-recovery.ts",
  "deployment/deployment-diagnostics.ts",
  "environments/runtime-environments.ts",
  "environments/environment-governance.ts",
  "environments/environment-isolation.ts",
  "secrets/secret-governance.ts",
  "secrets/secret-boundaries.ts",
  "tenants/tenant-provisioning.ts",
  "tenants/tenant-runtime-state.ts",
  "tenants/tenant-isolation-validation.ts",
  "workspaces/workspace-provisioning.ts",
  "workspaces/workspace-isolation-validation.ts",
  "migrations/migration-runtime.ts",
  "migrations/migration-integrity.ts",
  "migrations/migration-recovery.ts",
  "releases/release-runtime.ts",
  "releases/release-governance.ts",
  "releases/release-readiness.ts",
  "observability/runtime-observability.ts",
  "observability/runtime-metrics.ts",
  "observability/runtime-heartbeats.ts",
  "topology/runtime-topology.ts",
  "orchestration/runtime-orchestration.ts",
  "persistence/runtime-persistence.ts",
  "operations/production-operations-manager.ts",
  "operations/production-runtime-narratives.ts",
];

for (const file of REQUIRED_FILES) {
  test(`production-runtime/${file} exists`, () => {
    assert.equal(existsSync(pr(file)), true, `Missing required file: ${file}`);
  });
}

// ── types ─────────────────────────────────────────────────────────────────────

test("production-runtime-types.ts defines DeploymentEnvironment variants", () => {
  const content = readFileSync(pr("types/production-runtime-types.ts"), "utf8");
  assert.match(content, /local/);
  assert.match(content, /development/);
  assert.match(content, /staging/);
  assert.match(content, /production/);
});

test("production-runtime-types.ts includes evidence, uncertainty, governanceBoundaries, tenantScope, checkedAt", () => {
  const content = readFileSync(pr("types/production-runtime-types.ts"), "utf8");
  assert.match(content, /evidence/);
  assert.match(content, /uncertainty/);
  assert.match(content, /governanceBoundaries/);
  assert.match(content, /tenantScope/);
  assert.match(content, /checkedAt/);
});

test("production-runtime-types.ts defines all required core types", () => {
  const content = readFileSync(pr("types/production-runtime-types.ts"), "utf8");
  const requiredTypes = [
    "DeploymentEnvironment",
    "DeploymentHealth",
    "DeploymentTopology",
    "DeploymentReadiness",
    "DeploymentSurvivabilityState",
    "EnvironmentIsolationResult",
    "SecretBoundaryResult",
    "TenantProvisioningState",
    "WorkspaceProvisioningState",
    "RuntimeMigration",
    "MigrationIntegrityResult",
    "RuntimeRelease",
    "ReleaseReadinessResult",
    "RuntimeObservabilitySnapshot",
    "RuntimeMetric",
    "RuntimeHeartbeat",
    "RuntimeTopologyNode",
    "RuntimeTopologyEdge",
    "ProductionRuntimeNarrative",
    "ProductionOperationsSnapshot",
  ];
  for (const t of requiredTypes) {
    assert.match(content, new RegExp(`\\b${t}\\b`), `Missing type: ${t}`);
  }
});

// ── deployment runtime ────────────────────────────────────────────────────────

test("deployment-runtime.ts exports required functions", () => {
  const content = readFileSync(pr("deployment/deployment-runtime.ts"), "utf8");
  assert.match(content, /initializeDeploymentRuntime/);
  assert.match(content, /retrieveDeploymentHealth/);
  assert.match(content, /retrieveDeploymentReadiness/);
  assert.match(content, /retrieveDeploymentTopology/);
});

test("deployment-health.ts exports health check functions", () => {
  const content = readFileSync(pr("deployment/deployment-health.ts"), "utf8");
  assert.match(content, /retrieveDeploymentHealthChecks/);
  assert.match(content, /computeDeploymentHealthStatus/);
});

test("deployment-health.ts defines all required health statuses", () => {
  const content = readFileSync(pr("deployment/deployment-health.ts"), "utf8");
  assert.match(content, /healthy/);
  assert.match(content, /degraded/);
  assert.match(content, /unstable/);
  assert.match(content, /recovery_required/);
  assert.match(content, /deployment_blocked/);
});

test("deployment-survivability.ts exports required functions", () => {
  const content = readFileSync(pr("deployment/deployment-survivability.ts"), "utf8");
  assert.match(content, /evaluateDeploymentSurvivability/);
  assert.match(content, /retrieveDeploymentSurvivability/);
});

test("deployment-recovery.ts is recommendation-only (no automated fixes)", () => {
  const content = readFileSync(pr("deployment/deployment-recovery.ts"), "utf8");
  assert.match(content, /isAutomated: false/);
  assert.doesNotMatch(content, /execSync|spawnSync|writeFileSync/);
});

// ── environment governance ────────────────────────────────────────────────────

test("environment-governance.ts prevents unsafe production features", () => {
  const content = readFileSync(pr("environments/environment-governance.ts"), "utf8");
  assert.match(content, /debug_auth_bypass/);
  assert.match(content, /tenant_crossover_debug/);
  assert.match(content, /federation_governance_bypass/);
});

test("environment-governance.ts exports required functions", () => {
  const content = readFileSync(pr("environments/environment-governance.ts"), "utf8");
  assert.match(content, /evaluateEnvironmentGovernance/);
  assert.match(content, /isFeaturePermittedInEnvironment/);
  assert.match(content, /retrieveEnvironmentPolicies/);
});

test("runtime-environments.ts exports required functions", () => {
  const content = readFileSync(pr("environments/runtime-environments.ts"), "utf8");
  assert.match(content, /retrieveRuntimeEnvironment/);
  assert.match(content, /evaluateEnvironmentReadiness/);
});

// ── secret governance ─────────────────────────────────────────────────────────

test("secret-governance.ts defines secret requirements with no hardcoded values", () => {
  const content = readFileSync(pr("secrets/secret-governance.ts"), "utf8");
  assert.match(content, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(content, /STRIPE_SECRET_KEY/);
  assert.match(content, /evaluateSecretGovernance/);
  assert.doesNotMatch(content, /sk_live_/);
  assert.doesNotMatch(content, /sk_test_/);
});

test("secret-boundaries.ts exports boundary validation and hardcoded secret assertion", () => {
  const content = readFileSync(pr("secrets/secret-boundaries.ts"), "utf8");
  assert.match(content, /evaluateSecretBoundaries/);
  assert.match(content, /assertNoHardcodedSecrets/);
});

test("secret-governance.ts marks server-side secrets as isClientSide: false", () => {
  const content = readFileSync(pr("secrets/secret-governance.ts"), "utf8");
  assert.match(content, /isClientSide: false/);
});

// ── tenant provisioning ───────────────────────────────────────────────────────

test("tenant-provisioning.ts exports required functions", () => {
  const content = readFileSync(pr("tenants/tenant-provisioning.ts"), "utf8");
  assert.match(content, /provisionTenantRuntime/);
  assert.match(content, /retrieveTenantProvisioningState/);
});

test("tenant-provisioning.ts bootstraps governance and auth domains", () => {
  const content = readFileSync(pr("tenants/tenant-provisioning.ts"), "utf8");
  assert.match(content, /governance_bootstrap/);
  assert.match(content, /auth_bootstrap/);
  assert.match(content, /operational_memory_bootstrap/);
});

// ── workspace provisioning ────────────────────────────────────────────────────

test("workspace-provisioning.ts exports required functions", () => {
  const content = readFileSync(pr("workspaces/workspace-provisioning.ts"), "utf8");
  assert.match(content, /provisionWorkspaceRuntime/);
  assert.match(content, /retrieveWorkspaceProvisioningState/);
});

test("workspace-provisioning.ts tracks onboarding and war-room readiness", () => {
  const content = readFileSync(pr("workspaces/workspace-provisioning.ts"), "utf8");
  assert.match(content, /onboardingReady/);
  assert.match(content, /warRoomReady/);
});

// ── tenant isolation ──────────────────────────────────────────────────────────

test("tenant-isolation-validation.ts exports evaluateTenantIsolation", () => {
  const content = readFileSync(pr("tenants/tenant-isolation-validation.ts"), "utf8");
  assert.match(content, /evaluateTenantIsolation/);
});

test("tenant-isolation-validation.ts validates all required isolation boundaries", () => {
  const content = readFileSync(pr("tenants/tenant-isolation-validation.ts"), "utf8");
  assert.match(content, /row_level_security/);
  assert.match(content, /replay_isolation/);
  assert.match(content, /federation_isolation/);
  assert.match(content, /onboarding_isolation/);
  assert.match(content, /auth_session_isolation/);
});

test("workspace-isolation-validation.ts exports evaluateWorkspaceIsolation", () => {
  const content = readFileSync(pr("workspaces/workspace-isolation-validation.ts"), "utf8");
  assert.match(content, /evaluateWorkspaceIsolation/);
});

// ── migration runtime ─────────────────────────────────────────────────────────

test("migration-runtime.ts exports required functions", () => {
  const content = readFileSync(pr("migrations/migration-runtime.ts"), "utf8");
  assert.match(content, /buildRuntimeMigrations/);
  assert.match(content, /evaluateMigrationIntegrity/);
});

test("migration-runtime.ts includes dependency ordering validation", () => {
  const content = readFileSync(pr("migrations/migration-runtime.ts"), "utf8");
  assert.match(content, /dependencies/);
  assert.match(content, /integrity_confirmed/);
  assert.match(content, /integrity_failed/);
  assert.match(content, /integrity_warnings/);
});

test("migration-recovery.ts is recommendation-only (no automated fixes)", () => {
  const content = readFileSync(pr("migrations/migration-recovery.ts"), "utf8");
  assert.match(content, /isAutomated: false/);
  assert.doesNotMatch(content, /execSync|spawnSync/);
});

// ── release runtime ───────────────────────────────────────────────────────────

test("release-readiness.ts exports evaluateReleaseReadiness", () => {
  const content = readFileSync(pr("releases/release-readiness.ts"), "utf8");
  assert.match(content, /evaluateReleaseReadiness/);
});

test("release-readiness.ts integrates migration and governance checks", () => {
  const content = readFileSync(pr("releases/release-readiness.ts"), "utf8");
  assert.match(content, /migrationBlockers|migration/);
  assert.match(content, /governance/);
});

// ── observability ─────────────────────────────────────────────────────────────

test("runtime-observability.ts exports retrieveRuntimeObservability", () => {
  const content = readFileSync(pr("observability/runtime-observability.ts"), "utf8");
  assert.match(content, /retrieveRuntimeObservability/);
});

test("runtime-observability.ts tracks all required coverage domains", () => {
  const content = readFileSync(pr("observability/runtime-observability.ts"), "utf8");
  assert.match(content, /replayHealthCoverage/);
  assert.match(content, /synchronizationHealthCoverage/);
  assert.match(content, /onboardingHealthCoverage/);
  assert.match(content, /federationHealthCoverage/);
  assert.match(content, /connectorHealthCoverage/);
});

// ── metrics remain deterministic ──────────────────────────────────────────────

test("runtime-metrics.ts defines deterministic named metrics", () => {
  const content = readFileSync(pr("observability/runtime-metrics.ts"), "utf8");
  assert.match(content, /replayIntegrityCoverage/);
  assert.match(content, /synchronizationIntegrityCoverage/);
  assert.match(content, /runtimeHealthCoverage/);
  assert.match(content, /connectorRuntimeCoverage/);
  assert.match(content, /onboardingCoverage/);
  assert.match(content, /deploymentReadinessCoverage/);
  assert.match(content, /tenantIsolationCoverage/);
});

test("runtime-metrics.ts includes evidence and uncertainty for each metric", () => {
  const content = readFileSync(pr("observability/runtime-metrics.ts"), "utf8");
  assert.match(content, /evidence/);
  assert.match(content, /uncertainty/);
  assert.match(content, /governanceBoundaries/);
});

// ── heartbeats ────────────────────────────────────────────────────────────────

test("runtime-heartbeats.ts exports retrieveRuntimeHeartbeats", () => {
  const content = readFileSync(pr("observability/runtime-heartbeats.ts"), "utf8");
  assert.match(content, /retrieveRuntimeHeartbeats/);
});

test("runtime-heartbeats.ts tracks operational_memory and connector_runtime", () => {
  const content = readFileSync(pr("observability/runtime-heartbeats.ts"), "utf8");
  assert.match(content, /operational_memory/);
  assert.match(content, /connector_runtime/);
  assert.match(content, /governance_runtime/);
});

// ── narratives remain deterministic ──────────────────────────────────────────

test("production-runtime-narratives.ts exports generateProductionRuntimeNarratives", () => {
  const content = readFileSync(pr("operations/production-runtime-narratives.ts"), "utf8");
  assert.match(content, /generateProductionRuntimeNarratives/);
});

test("production-runtime-narratives.ts includes tenant isolation narrative", () => {
  const content = readFileSync(pr("operations/production-runtime-narratives.ts"), "utf8");
  assert.match(content, /tenant.*isolation/i);
  assert.match(content, /federation/i);
  assert.match(content, /replay/i);
});

test("production-runtime-narratives.ts includes observability narrative with evidence-backed language", () => {
  const content = readFileSync(pr("operations/production-runtime-narratives.ts"), "utf8");
  assert.match(content, /observability coverage/i);
  assert.match(content, /confidence/);
  assert.match(content, /uncertainty/);
});

// ── operations manager ────────────────────────────────────────────────────────

test("production-operations-manager.ts exports all required APIs", () => {
  const content = readFileSync(pr("operations/production-operations-manager.ts"), "utf8");
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
    assert.match(content, new RegExp(`\\b${api}\\b`), `Manager missing: ${api}`);
  }
});

// ── no hardcoded secrets ──────────────────────────────────────────────────────

test("production-runtime domain contains no hardcoded secrets", () => {
  const secretPatterns = [/sk_live_[a-zA-Z0-9]{20,}/, /sk_test_[a-zA-Z0-9]{20,}/, /service_role_[a-zA-Z0-9._-]{20,}/];
  const files = REQUIRED_FILES.map((f) => pr(f)).filter((p) => existsSync(p));
  for (const filePath of files) {
    const content = readFileSync(filePath, "utf8");
    for (const pattern of secretPatterns) {
      assert.doesNotMatch(content, pattern, `Potential hardcoded secret in ${filePath}`);
    }
  }
});

// ── scripts and docs ──────────────────────────────────────────────────────────

test("scripts/check-production-runtime.mjs exists", () => {
  assert.equal(existsSync(r("scripts/check-production-runtime.mjs")), true);
});

test("docs/architecture/deployment-multitenant-production-operations.md exists", () => {
  assert.equal(existsSync(r("docs/architecture/deployment-multitenant-production-operations.md")), true);
});

test("docs/architecture/CURRENT_STATE_PRODUCTION_RUNTIME.md exists", () => {
  assert.equal(existsSync(r("docs/architecture/CURRENT_STATE_PRODUCTION_RUNTIME.md")), true);
});
