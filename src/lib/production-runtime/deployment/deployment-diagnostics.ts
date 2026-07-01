import type { DeploymentEnvironment } from "../types/production-runtime-types.js";
import { retrieveDeploymentHealthChecks } from "./deployment-health.js";
import { evaluateDeploymentSurvivability } from "./deployment-survivability.js";

export interface DeploymentDiagnostic {
  id: string;
  subsystem: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  message: string;
  evidence: string[];
  recommendation: string;
  checkedAt: string;
}

export function generateDeploymentDiagnostics(
  environment: DeploymentEnvironment
): DeploymentDiagnostic[] {
  const now = new Date().toISOString();
  const checks = retrieveDeploymentHealthChecks(environment);
  const survivability = evaluateDeploymentSurvivability(environment);
  const diagnostics: DeploymentDiagnostic[] = [];

  for (const check of checks) {
    if (check.status === "healthy") continue;

    const severity = deriveSeverity(check.status);
    diagnostics.push({
      id: `diag:${check.subsystem}`,
      subsystem: check.subsystem,
      severity,
      message: `Subsystem ${check.subsystem} is ${check.status} in ${environment} environment.`,
      evidence: check.evidence,
      recommendation: buildSubsystemRecommendation(check.subsystem),
      checkedAt: now,
    });
  }

  if (survivability.survivabilityScore < 0.8) {
    diagnostics.push({
      id: "diag:survivability_low",
      subsystem: "deployment",
      severity: "high",
      message: `Deployment survivability score is ${(survivability.survivabilityScore * 100).toFixed(1)}% — below 80% threshold.`,
      evidence: survivability.evidence,
      recommendation:
        "Review degraded subsystems and resolve recovery blockers before proceeding with deployment.",
      checkedAt: now,
    });
  }

  return diagnostics;
}

function deriveSeverity(
  status: string
): "critical" | "high" | "medium" | "low" | "info" {
  switch (status) {
    case "deployment_blocked":
      return "critical";
    case "recovery_required":
      return "critical";
    case "unstable":
      return "high";
    case "degraded":
      return "medium";
    default:
      return "info";
  }
}

function buildSubsystemRecommendation(subsystem: string): string {
  const recs: Record<string, string> = {
    observability: "Restore observability pipeline and verify event bus connectivity.",
    connector_runtime: "Verify connector authentication credentials and federation health.",
    operational_memory: "Check Supabase connectivity and migration state.",
    governance: "Review governance authorization configuration and policy engine.",
    federation_runtime: "Validate federation runtime and connector dependencies.",
  };
  return recs[subsystem] ?? `Review ${subsystem} runtime configuration and dependencies.`;
}
