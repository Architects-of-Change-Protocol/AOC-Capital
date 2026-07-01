import type { DeploymentEnvironment } from "../types/production-runtime-types.js";
import { evaluateDeploymentSurvivability } from "./deployment-survivability.js";

export interface DeploymentRecoveryRecommendation {
  id: string;
  subsystem: string;
  recommendation: string;
  priority: "critical" | "high" | "medium" | "low";
  isAutomated: false;
  evidence: string[];
  uncertainty: string[];
  checkedAt: string;
}

export function retrieveDeploymentRecoveryRecommendations(
  environment: DeploymentEnvironment
): DeploymentRecoveryRecommendation[] {
  const now = new Date().toISOString();
  const survivability = evaluateDeploymentSurvivability(environment);
  const recommendations: DeploymentRecoveryRecommendation[] = [];

  for (const service of survivability.degradedServices) {
    const rec = buildRecoveryRecommendation(service, environment, now);
    if (rec) recommendations.push(rec);
  }

  for (const blocker of survivability.blockers) {
    recommendations.push({
      id: `recovery:blocker:${Date.now()}`,
      subsystem: "deployment",
      recommendation: `Resolve deployment blocker before proceeding: ${blocker}. Requires operator intervention.`,
      priority: "critical",
      isAutomated: false,
      evidence: [`Blocker detected: ${blocker}`],
      uncertainty: ["Specific remediation path depends on runtime configuration"],
      checkedAt: now,
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: "recovery:none_required",
      subsystem: "deployment",
      recommendation:
        "No active recovery recommendations. Deployment survivability is within acceptable bounds.",
      priority: "low",
      isAutomated: false,
      evidence: [`Survivability score: ${(survivability.survivabilityScore * 100).toFixed(1)}%`],
      uncertainty: ["Static evaluation — live failure conditions may differ"],
      checkedAt: now,
    });
  }

  return recommendations;
}

function buildRecoveryRecommendation(
  subsystem: string,
  environment: DeploymentEnvironment,
  now: string
): DeploymentRecoveryRecommendation | null {
  const map: Record<string, { recommendation: string; priority: "critical" | "high" | "medium" | "low" }> = {
    observability: {
      recommendation:
        "Observability runtime is degraded. Review observability pipeline configuration and ensure event bus connectivity.",
      priority: "medium",
    },
    connector_runtime: {
      recommendation:
        "Connector runtime is degraded. Verify connector authentication and federation health.",
      priority: "high",
    },
    federation_runtime: {
      recommendation:
        "Federation runtime is degraded. Check connector runtime dependencies and governance-safe federation configuration.",
      priority: "high",
    },
    operational_memory: {
      recommendation:
        "Operational memory is degraded. Verify Supabase persistence connectivity and migration state.",
      priority: "critical",
    },
  };

  const entry = map[subsystem];
  if (!entry) return null;

  return {
    id: `recovery:${subsystem}`,
    subsystem,
    recommendation: `[${environment.toUpperCase()}] ${entry.recommendation}`,
    priority: entry.priority,
    isAutomated: false,
    evidence: [`Subsystem ${subsystem} classified as degraded in ${environment} environment`],
    uncertainty: ["Recovery recommendation is based on structural analysis — root cause may differ"],
    checkedAt: now,
  };
}
