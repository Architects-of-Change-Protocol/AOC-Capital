import type {
  DeploymentEnvironment,
  DeploymentHealth,
  DeploymentTopology,
  DeploymentSurvivabilityState,
  TenantProvisioningState,
  WorkspaceProvisioningState,
  MigrationIntegrityResult,
  ReleaseReadinessResult,
  RuntimeObservabilitySnapshot,
  RuntimeMetric,
  RuntimeHeartbeat,
  ProductionOperationsSnapshot,
} from "../types/production-runtime-types.js";
import { retrieveDeploymentHealth, retrieveDeploymentTopology } from "../deployment/deployment-runtime.js";
import { retrieveDeploymentSurvivability } from "../deployment/deployment-survivability.js";
import { retrieveRuntimeEnvironment } from "../environments/runtime-environments.js";
import { retrieveTenantProvisioningState } from "../tenants/tenant-provisioning.js";
import { retrieveWorkspaceProvisioningState } from "../workspaces/workspace-provisioning.js";
import { evaluateMigrationIntegrity } from "../migrations/migration-runtime.js";
import { evaluateReleaseReadiness } from "../releases/release-readiness.js";
import { retrieveRuntimeObservability } from "../observability/runtime-observability.js";
import { retrieveRuntimeMetrics } from "../observability/runtime-metrics.js";
import { retrieveRuntimeHeartbeats } from "../observability/runtime-heartbeats.js";
import { generateProductionRuntimeNarratives } from "./production-runtime-narratives.js";

export function retrieveOperationsDeploymentHealth(
  environment?: DeploymentEnvironment
): DeploymentHealth {
  const env = environment ?? retrieveRuntimeEnvironment();
  return retrieveDeploymentHealth(env);
}

export function retrieveOperationsDeploymentTopology(
  environment?: DeploymentEnvironment
): DeploymentTopology {
  const env = environment ?? retrieveRuntimeEnvironment();
  return retrieveDeploymentTopology(env);
}

export function retrieveOperationsDeploymentSurvivability(
  environment?: DeploymentEnvironment
): DeploymentSurvivabilityState {
  const env = environment ?? retrieveRuntimeEnvironment();
  return retrieveDeploymentSurvivability(env);
}

export function retrieveOperationsRuntimeEnvironment(): DeploymentEnvironment {
  return retrieveRuntimeEnvironment();
}

export function retrieveOperationsTenantProvisioning(
  tenantId: string
): TenantProvisioningState {
  return retrieveTenantProvisioningState(tenantId);
}

export function retrieveOperationsWorkspaceProvisioning(
  workspaceId: string,
  tenantId: string
): WorkspaceProvisioningState {
  return retrieveWorkspaceProvisioningState(workspaceId, tenantId);
}

export function retrieveOperationsMigrationIntegrity(): MigrationIntegrityResult {
  return evaluateMigrationIntegrity();
}

export function retrieveOperationsReleaseReadiness(
  version: string,
  environment?: DeploymentEnvironment
): ReleaseReadinessResult {
  const env = environment ?? retrieveRuntimeEnvironment();
  return evaluateReleaseReadiness(version, env);
}

export function retrieveOperationsRuntimeObservability(
  environment?: DeploymentEnvironment
): RuntimeObservabilitySnapshot {
  const env = environment ?? retrieveRuntimeEnvironment();
  return retrieveRuntimeObservability(env);
}

export function retrieveOperationsRuntimeMetrics(
  environment?: DeploymentEnvironment,
  tenantScope?: string
): RuntimeMetric[] {
  const env = environment ?? retrieveRuntimeEnvironment();
  return retrieveRuntimeMetrics(env, tenantScope);
}

export function retrieveOperationsRuntimeHeartbeats(
  environment?: DeploymentEnvironment
): RuntimeHeartbeat[] {
  const env = environment ?? retrieveRuntimeEnvironment();
  return retrieveRuntimeHeartbeats(env);
}

export function retrieveProductionOperationsSnapshot(
  version: string,
  environment?: DeploymentEnvironment
): ProductionOperationsSnapshot {
  const now = new Date().toISOString();
  const env = environment ?? retrieveRuntimeEnvironment();

  const deploymentHealth = retrieveDeploymentHealth(env);
  const topology = retrieveDeploymentTopology(env);
  const survivability = retrieveDeploymentSurvivability(env);
  const observability = retrieveRuntimeObservability(env);
  const metrics = retrieveRuntimeMetrics(env);
  const heartbeats = retrieveRuntimeHeartbeats(env);
  const releaseReadiness = evaluateReleaseReadiness(version, env);
  const narratives = generateProductionRuntimeNarratives({
    deploymentHealth,
    survivability,
    releaseReadiness,
    observability,
    environment: env,
  });

  return {
    environment: env,
    deploymentHealth,
    topology,
    survivability,
    observability,
    metrics,
    heartbeats,
    releaseReadiness,
    narratives,
    checkedAt: now,
  };
}
