import type {
  DeploymentEnvironment,
  DeploymentHealthCheck,
  DeploymentHealthStatus,
} from "../types/production-runtime-types.js";

const SUBSYSTEM_HEALTH_MAP: Record<string, DeploymentHealthStatus> = {
  runtime_authorization: "healthy",
  governance: "healthy",
  operational_memory: "healthy",
  connector_runtime: "healthy",
  onboarding_runtime: "healthy",
  replay_integrity: "healthy",
  synchronization_integrity: "healthy",
  upload_pipeline: "healthy",
  diagnostics: "healthy",
  federation_runtime: "healthy",
  event_bus: "healthy",
  observability: "degraded",
};

export function retrieveDeploymentHealthChecks(
  environment: DeploymentEnvironment
): DeploymentHealthCheck[] {
  const checks: DeploymentHealthCheck[] = [];

  for (const [subsystem, baseStatus] of Object.entries(SUBSYSTEM_HEALTH_MAP)) {
    const status = resolveSubsystemStatus(subsystem, baseStatus, environment);
    checks.push({
      id: `health:${subsystem}`,
      subsystem,
      status,
      evidence: [
        `Subsystem ${subsystem} evaluated for environment ${environment}`,
        `Base status: ${baseStatus}`,
      ],
      uncertainty: [
        "Static structural check — live subsystem availability not verified",
      ],
    });
  }

  return checks;
}

function resolveSubsystemStatus(
  subsystem: string,
  base: DeploymentHealthStatus,
  environment: DeploymentEnvironment
): DeploymentHealthStatus {
  if (environment === "production" && base === "degraded") {
    return "unstable";
  }
  if (environment === "local" && base === "unstable") {
    return "degraded";
  }
  return base;
}

export function computeDeploymentHealthStatus(
  checks: DeploymentHealthCheck[]
): DeploymentHealthStatus {
  const hasBlocked = checks.some((c) => c.status === "deployment_blocked");
  if (hasBlocked) return "deployment_blocked";

  const hasRecovery = checks.some((c) => c.status === "recovery_required");
  if (hasRecovery) return "recovery_required";

  const hasUnstable = checks.some((c) => c.status === "unstable");
  if (hasUnstable) return "unstable";

  const hasDegraded = checks.some((c) => c.status === "degraded");
  if (hasDegraded) return "degraded";

  return "healthy";
}
