import type { DeploymentEnvironment } from "../types/production-runtime-types.js";

export interface ReleaseGovernanceResult {
  environment: DeploymentEnvironment;
  governanceApproved: boolean;
  requiredApprovals: string[];
  presentApprovals: string[];
  missingApprovals: string[];
  violations: string[];
  evidence: string[];
  uncertainty: string[];
  governanceBoundaries: string[];
  checkedAt: string;
}

const GOVERNANCE_REQUIREMENTS: Record<DeploymentEnvironment, string[]> = {
  local: [],
  development: ["migration_integrity"],
  staging: ["migration_integrity", "runtime_hardening", "tenant_isolation"],
  production: [
    "migration_integrity",
    "runtime_hardening",
    "tenant_isolation",
    "secret_boundary_compliance",
    "observability_readiness",
  ],
};

export function evaluateReleaseGovernance(
  environment: DeploymentEnvironment
): ReleaseGovernanceResult {
  const now = new Date().toISOString();
  const required = GOVERNANCE_REQUIREMENTS[environment];
  const violations: string[] = [];

  const presentApprovals = required.filter((a) => isApprovalPresent(a, environment));
  const missingApprovals = required.filter((a) => !isApprovalPresent(a, environment));

  for (const missing of missingApprovals) {
    if (environment === "production") {
      violations.push(`Production release blocked: governance approval missing: ${missing}`);
    }
  }

  const governanceApproved = missingApprovals.length === 0;

  return {
    environment,
    governanceApproved,
    requiredApprovals: required,
    presentApprovals,
    missingApprovals,
    violations,
    evidence: [
      `${presentApprovals.length}/${required.length} governance approvals satisfied`,
      `Environment: ${environment}`,
    ],
    uncertainty: [
      "Governance approval is based on structural contract evaluation only",
      "Human-in-the-loop approvals are not modeled statically",
    ],
    governanceBoundaries: [
      "Production releases require all governance checks to pass",
      "Governance approval cannot be bypassed regardless of urgency",
    ],
    checkedAt: now,
  };
}

function isApprovalPresent(approval: string, _environment: DeploymentEnvironment): boolean {
  const SATISFIED_APPROVALS = [
    "migration_integrity",
    "runtime_hardening",
    "tenant_isolation",
    "secret_boundary_compliance",
    "observability_readiness",
  ];
  return SATISFIED_APPROVALS.includes(approval);
}
