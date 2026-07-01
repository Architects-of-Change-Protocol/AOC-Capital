import type {
  DeploymentEnvironment,
  ReleaseReadinessResult,
} from "../types/production-runtime-types.js";
import { buildRuntimeRelease } from "./release-runtime.js";
import { evaluateReleaseGovernance } from "./release-governance.js";

export function evaluateReleaseReadiness(
  version: string,
  environment: DeploymentEnvironment
): ReleaseReadinessResult {
  const now = new Date().toISOString();
  const release = buildRuntimeRelease(version, environment);
  const governance = evaluateReleaseGovernance(environment);

  const blockers = [
    ...release.deploymentBlockers,
    ...release.migrationBlockers,
    ...governance.violations,
  ];

  const warnings = [
    ...release.observabilityBlockers,
    ...release.onboardingBlockers,
    ...governance.missingApprovals
      .filter(() => environment !== "production")
      .map((a) => `Governance approval recommended: ${a}`),
  ];

  const status: ReleaseReadinessResult["status"] =
    blockers.length > 0 ? "blocked" : warnings.length > 0 ? "releasable_with_warnings" : "releasable";

  return {
    status,
    version,
    environment,
    blockers,
    warnings,
    evidence: [
      `Release ${version} readiness evaluated for ${environment}`,
      `Deployment health: ${release.status}`,
      `Governance: ${governance.governanceApproved ? "approved" : "pending"}`,
    ],
    uncertainty: [
      "Release readiness is evaluated against structural contracts only",
      "Live runtime state at deployment time may differ from static evaluation",
    ],
    governanceBoundaries: [
      "Release readiness cannot bypass governance approval requirements",
      "Production releases blocked by any governance violation",
    ],
    checkedAt: now,
  };
}
