import type {
  DeploymentEnvironment,
  TenantProvisioningState,
  WorkspaceProvisioningState,
} from "../types/production-runtime-types.js";
import { retrieveDeploymentHealth } from "../deployment/deployment-runtime.js";
import { evaluateDeploymentSurvivability } from "../deployment/deployment-survivability.js";
import { evaluateReleaseReadiness } from "../releases/release-readiness.js";
import { retrieveRuntimeObservability } from "../observability/runtime-observability.js";
import { provisionTenantRuntime } from "../tenants/tenant-provisioning.js";
import { provisionWorkspaceRuntime } from "../workspaces/workspace-provisioning.js";

export interface RuntimeOrchestrationResult {
  environment: DeploymentEnvironment;
  deploymentHealthStatus: string;
  survivabilityScore: number;
  releaseReadinessStatus: string;
  observabilityStatus: string;
  evidence: string[];
  uncertainty: string[];
  governanceBoundaries: string[];
  checkedAt: string;
}

export function orchestrateRuntime(
  version: string,
  environment: DeploymentEnvironment
): RuntimeOrchestrationResult {
  const now = new Date().toISOString();

  const health = retrieveDeploymentHealth(environment);
  const survivability = evaluateDeploymentSurvivability(environment);
  const releaseReadiness = evaluateReleaseReadiness(version, environment);
  const observability = retrieveRuntimeObservability(environment);

  return {
    environment,
    deploymentHealthStatus: health.status,
    survivabilityScore: survivability.survivabilityScore,
    releaseReadinessStatus: releaseReadiness.status,
    observabilityStatus: observability.deploymentHealth,
    evidence: [
      `Runtime orchestration for ${version} in ${environment}`,
      `Deployment health: ${health.status}`,
      `Survivability: ${(survivability.survivabilityScore * 100).toFixed(1)}%`,
      `Release readiness: ${releaseReadiness.status}`,
    ],
    uncertainty: [
      "Orchestration state is evaluated from structural contracts only",
      "Live orchestration under concurrent load is not assessed",
    ],
    governanceBoundaries: [
      "Runtime orchestration must not bypass governance authorization",
      "Tenant and workspace orchestration must preserve isolation boundaries",
    ],
    checkedAt: now,
  };
}

export function orchestrateTenantProvisioningRuntime(
  tenantId: string
): TenantProvisioningState {
  return provisionTenantRuntime(tenantId);
}

export function orchestrateWorkspaceProvisioningRuntime(
  workspaceId: string,
  tenantId: string
): WorkspaceProvisioningState {
  return provisionWorkspaceRuntime(workspaceId, tenantId);
}
