import type {
  DeploymentEnvironment,
  RuntimeRelease,
  ReleaseReadinessResult,
} from "../types/production-runtime-types.js";
import { evaluateMigrationIntegrity } from "../migrations/migration-runtime.js";
import { retrieveDeploymentHealth } from "../deployment/deployment-runtime.js";

export function buildRuntimeRelease(
  version: string,
  environment: DeploymentEnvironment
): RuntimeRelease {
  const now = new Date().toISOString();
  const migrationIntegrity = evaluateMigrationIntegrity();
  const deploymentHealth = retrieveDeploymentHealth(environment);

  const deploymentBlockers = deploymentHealth.blockers;
  const migrationBlockers = migrationIntegrity.blockers;
  const observabilityBlockers: string[] = [];
  const onboardingBlockers: string[] = [];
  const governanceBlockers: string[] = [];

  if (environment === "production" && deploymentHealth.status === "degraded") {
    observabilityBlockers.push("Observability coverage is degraded in production environment");
  }

  const status: ReleaseReadinessResult["status"] =
    deploymentBlockers.length > 0 ||
    migrationBlockers.length > 0 ||
    governanceBlockers.length > 0
      ? "blocked"
      : observabilityBlockers.length > 0 ||
        onboardingBlockers.length > 0 ||
        deploymentHealth.warnings.length > 0
      ? "releasable_with_warnings"
      : "releasable";

  return {
    version,
    environment,
    status,
    deploymentBlockers,
    migrationBlockers,
    observabilityBlockers,
    onboardingBlockers,
    governanceBlockers,
    checkedAt: now,
  };
}

export function retrieveReleaseDiagnostics(
  version: string,
  environment: DeploymentEnvironment
): {
  release: RuntimeRelease;
  allBlockers: string[];
  allWarnings: string[];
  evidence: string[];
} {
  const release = buildRuntimeRelease(version, environment);
  const allBlockers = [
    ...release.deploymentBlockers,
    ...release.migrationBlockers,
    ...release.governanceBlockers,
  ];
  const allWarnings = [
    ...release.observabilityBlockers,
    ...release.onboardingBlockers,
  ];

  return {
    release,
    allBlockers,
    allWarnings,
    evidence: [
      `Release ${version} evaluated for ${environment}`,
      `Status: ${release.status}`,
      `Blockers: ${allBlockers.length}, Warnings: ${allWarnings.length}`,
    ],
  };
}
