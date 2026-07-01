import type {
  DeploymentEnvironment,
  DeploymentHealth,
  DeploymentReadiness,
  DeploymentTopology,
} from "../types/production-runtime-types.js";
import { retrieveDeploymentHealthChecks, computeDeploymentHealthStatus } from "./deployment-health.js";
import { buildDeploymentTopologyGraph } from "./deployment-topology.js";

export function initializeDeploymentRuntime(environment: DeploymentEnvironment): {
  initialized: boolean;
  environment: DeploymentEnvironment;
  evidence: string[];
  uncertainty: string[];
  checkedAt: string;
} {
  const now = new Date().toISOString();
  return {
    initialized: true,
    environment,
    evidence: [
      `Deployment runtime initialized for environment: ${environment}`,
      "Production runtime domain present",
      "Deployment health checks registered",
    ],
    uncertainty: [
      "Static initialization does not validate live runtime connections",
      "Environment variable resolution depends on host configuration",
    ],
    checkedAt: now,
  };
}

export function retrieveDeploymentHealth(environment: DeploymentEnvironment): DeploymentHealth {
  const now = new Date().toISOString();
  const checks = retrieveDeploymentHealthChecks(environment);
  const status = computeDeploymentHealthStatus(checks);

  const blockers = checks
    .filter((c) => c.status === "deployment_blocked" || c.status === "recovery_required")
    .map((c) => `${c.subsystem}: ${c.status}`);

  const warnings = checks
    .filter((c) => c.status === "degraded" || c.status === "unstable")
    .map((c) => `${c.subsystem}: ${c.status}`);

  return {
    status,
    environment,
    healthChecks: checks,
    blockers,
    warnings,
    evidence: [
      `Health evaluated for ${checks.length} subsystems`,
      `Environment: ${environment}`,
      `Blocker count: ${blockers.length}`,
    ],
    uncertainty: [
      "Health checks are structural — live subsystem behavior is not verified",
      "Runtime availability at deploy time may differ from static evaluation",
    ],
    governanceBoundaries: [
      "Deployment health does not bypass governance authorization",
      "Tenant-scoped health data requires authorized access",
    ],
    checkedAt: now,
  };
}

export function retrieveDeploymentReadiness(environment: DeploymentEnvironment): DeploymentReadiness {
  const now = new Date().toISOString();
  const health = retrieveDeploymentHealth(environment);

  const blockers: string[] = [...health.blockers];
  const warnings: string[] = [...health.warnings];

  if (environment === "production" && health.status === "degraded") {
    blockers.push("Production deployment blocked: runtime is degraded");
  }

  const status =
    blockers.length > 0
      ? "blocked"
      : warnings.length > 0
      ? "ready_with_warnings"
      : "ready";

  return {
    status,
    environment,
    blockers,
    warnings,
    evidence: [
      `Readiness derived from deployment health: ${health.status}`,
      `Environment: ${environment}`,
    ],
    uncertainty: [
      "Readiness is evaluated against structural checks only",
      "Production readiness under concurrent load is not assessed",
    ],
    governanceBoundaries: [
      "Deployment readiness does not override governance-gated releases",
      "Production deployments require release governance sign-off",
    ],
    checkedAt: now,
  };
}

export function retrieveDeploymentTopology(environment: DeploymentEnvironment): DeploymentTopology {
  return buildDeploymentTopologyGraph(environment);
}
