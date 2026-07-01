import type {
  DeploymentEnvironment,
  DeploymentSurvivabilityState,
} from "../types/production-runtime-types.js";
import { retrieveDeploymentHealthChecks } from "./deployment-health.js";

export function evaluateDeploymentSurvivability(
  environment: DeploymentEnvironment
): DeploymentSurvivabilityState {
  const now = new Date().toISOString();
  const checks = retrieveDeploymentHealthChecks(environment);

  const degradedServices = checks
    .filter((c) => c.status === "degraded" || c.status === "unstable")
    .map((c) => c.subsystem);

  const criticalDegraded = checks.filter(
    (c) =>
      (c.status === "recovery_required" || c.status === "deployment_blocked") &&
      CRITICAL_SUBSYSTEMS.includes(c.subsystem)
  );

  const blockers = criticalDegraded.map(
    (c) => `Critical subsystem degraded: ${c.subsystem} — ${c.status}`
  );

  const totalChecks = checks.length;
  const healthyCount = checks.filter((c) => c.status === "healthy").length;
  const survivabilityScore = totalChecks > 0 ? healthyCount / totalChecks : 0;

  return {
    survivabilityScore,
    environment,
    degradedServices,
    recoveryRequired: criticalDegraded.length > 0,
    blockers,
    evidence: [
      `Survivability score: ${(survivabilityScore * 100).toFixed(1)}%`,
      `${healthyCount}/${totalChecks} subsystems healthy`,
      `Degraded services: ${degradedServices.length}`,
    ],
    uncertainty: [
      "Survivability score is computed from structural checks only",
      "Live failure propagation under load is not assessed",
      "Recovery time objectives are not validated statically",
    ],
    governanceBoundaries: [
      "Survivability state does not bypass governance authorization",
      "Degraded-mode decisions require operator review",
    ],
    checkedAt: now,
  };
}

export function retrieveDeploymentSurvivability(
  environment: DeploymentEnvironment
): DeploymentSurvivabilityState {
  return evaluateDeploymentSurvivability(environment);
}

const CRITICAL_SUBSYSTEMS = [
  "runtime_authorization",
  "governance",
  "operational_memory",
  "replay_integrity",
  "synchronization_integrity",
];
