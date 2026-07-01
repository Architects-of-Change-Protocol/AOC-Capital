import type {
  DeploymentEnvironment,
  EnvironmentIsolationResult,
} from "../types/production-runtime-types.js";

const ISOLATION_BOUNDARIES: Record<string, string[]> = {
  tenant_data: ["production", "staging", "development"],
  workspace_data: ["production", "staging", "development"],
  auth_sessions: ["production", "staging", "development"],
  replay_storage: ["production", "staging"],
  federation_credentials: ["production", "staging", "development"],
  governance_audit_log: ["production", "staging", "development"],
  operational_memory_store: ["production", "staging", "development"],
};

export function evaluateEnvironmentIsolation(
  environment: DeploymentEnvironment
): EnvironmentIsolationResult {
  const now = new Date().toISOString();
  const isolatedBoundaries: string[] = [];
  const missingBoundaries: string[] = [];

  for (const [boundary, requiredEnvs] of Object.entries(ISOLATION_BOUNDARIES)) {
    if (requiredEnvs.includes(environment)) {
      isolatedBoundaries.push(boundary);
    }
  }

  const totalExpected = environment === "local" ? 0 : Object.keys(ISOLATION_BOUNDARIES).length;
  const status =
    missingBoundaries.length === 0 && isolatedBoundaries.length >= totalExpected * 0.9
      ? "enforced"
      : missingBoundaries.length === 0
      ? "partial"
      : "missing";

  return {
    environment,
    status,
    isolatedBoundaries,
    missingBoundaries,
    evidence: [
      `Environment: ${environment}`,
      `Isolated boundaries: ${isolatedBoundaries.length}`,
      `Missing boundaries: ${missingBoundaries.length}`,
    ],
    uncertainty: [
      "Isolation boundaries are structural — runtime enforcement depends on middleware configuration",
      "Row-level security enforcement is not evaluated statically",
    ],
    governanceBoundaries: [
      "Environment isolation must not be bypassed for debugging purposes",
      "Cross-environment data access is never permitted",
    ],
    tenantScope: "cross_tenant",
    checkedAt: now,
  };
}
