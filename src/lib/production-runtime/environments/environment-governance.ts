import type { DeploymentEnvironment } from "../types/production-runtime-types.js";

export interface EnvironmentGovernanceResult {
  environment: DeploymentEnvironment;
  allowedFeatures: string[];
  restrictedFeatures: string[];
  violations: string[];
  warnings: string[];
  evidence: string[];
  uncertainty: string[];
  governanceBoundaries: string[];
  checkedAt: string;
}

export interface EnvironmentGovernancePolicy {
  featureId: string;
  allowedEnvironments: DeploymentEnvironment[];
  description: string;
}

const GOVERNANCE_POLICIES: EnvironmentGovernancePolicy[] = [
  {
    featureId: "debug_auth_bypass",
    allowedEnvironments: ["local"],
    description: "Debug authentication bypass must never reach production or staging",
  },
  {
    featureId: "mock_data_injection",
    allowedEnvironments: ["local", "development"],
    description: "Mock data injection is restricted to non-production environments",
  },
  {
    featureId: "tenant_crossover_debug",
    allowedEnvironments: [],
    description: "Tenant crossover debug is never permitted in any environment",
  },
  {
    featureId: "replay_access_unrestricted",
    allowedEnvironments: ["local"],
    description: "Unrestricted replay access is only permitted in local development",
  },
  {
    featureId: "production_deployment",
    allowedEnvironments: ["production"],
    description: "Production deployments are only permitted in production environment",
  },
  {
    featureId: "staging_deployment",
    allowedEnvironments: ["staging", "production"],
    description: "Staging deployment patterns permitted in staging and production",
  },
  {
    featureId: "federation_governance_bypass",
    allowedEnvironments: [],
    description: "Governance bypass for federation is never permitted",
  },
];

export function evaluateEnvironmentGovernance(
  environment: DeploymentEnvironment,
  requestedFeatures: string[]
): EnvironmentGovernanceResult {
  const now = new Date().toISOString();
  const allowedFeatures: string[] = [];
  const restrictedFeatures: string[] = [];
  const violations: string[] = [];
  const warnings: string[] = [];

  for (const feature of requestedFeatures) {
    const policy = GOVERNANCE_POLICIES.find((p) => p.featureId === feature);
    if (!policy) {
      warnings.push(`Unknown feature gate: ${feature} — defaulting to restricted`);
      restrictedFeatures.push(feature);
      continue;
    }

    if (policy.allowedEnvironments.length === 0) {
      violations.push(`Feature ${feature} is never permitted: ${policy.description}`);
      restrictedFeatures.push(feature);
    } else if (policy.allowedEnvironments.includes(environment)) {
      allowedFeatures.push(feature);
    } else {
      restrictedFeatures.push(feature);
      if (environment === "production" || environment === "staging") {
        violations.push(
          `Feature ${feature} is not permitted in ${environment}: ${policy.description}`
        );
      }
    }
  }

  return {
    environment,
    allowedFeatures,
    restrictedFeatures,
    violations,
    warnings,
    evidence: [
      `${requestedFeatures.length} features evaluated for ${environment}`,
      `Allowed: ${allowedFeatures.length}, Restricted: ${restrictedFeatures.length}`,
    ],
    uncertainty: [
      "Feature gate evaluation is based on static policy definitions",
      "Runtime feature flag overrides are not evaluated here",
    ],
    governanceBoundaries: [
      "Governance violations must not be overridden at runtime without operator approval",
      "Production environment restrictions are enforced unconditionally",
    ],
    checkedAt: now,
  };
}

export function isFeaturePermittedInEnvironment(
  featureId: string,
  environment: DeploymentEnvironment
): boolean {
  const policy = GOVERNANCE_POLICIES.find((p) => p.featureId === featureId);
  if (!policy) return false;
  return policy.allowedEnvironments.includes(environment);
}

export function retrieveEnvironmentPolicies(): EnvironmentGovernancePolicy[] {
  return [...GOVERNANCE_POLICIES];
}
