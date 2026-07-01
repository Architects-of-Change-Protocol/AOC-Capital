import type {
  DeploymentEnvironment,
  SecretBoundaryResult,
} from "../types/production-runtime-types.js";
import { evaluateSecretGovernance } from "./secret-governance.js";

export function evaluateSecretBoundaries(
  environment: DeploymentEnvironment
): SecretBoundaryResult {
  const now = new Date().toISOString();
  const governance = evaluateSecretGovernance(environment);
  const exposureRisks: string[] = [];

  const serverOnlyPatterns = [
    "SUPABASE_SERVICE_ROLE_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
  ];

  for (const secret of serverOnlyPatterns) {
    if (governance.presentSecrets.includes(secret)) {
      exposureRisks.push(
        `${secret} must be verified as server-only — never included in client bundles or API responses`
      );
    }
  }

  if (governance.status === "violation") {
    exposureRisks.push(
      "Secret governance violations detected — boundary enforcement may be compromised"
    );
  }

  const status =
    governance.status === "violation"
      ? "violation"
      : exposureRisks.length > 0
      ? "warning"
      : "compliant";

  return {
    status,
    environment,
    requiredSecrets: governance.requiredSecrets,
    missingSecrets: governance.missingSecrets,
    exposureRisks,
    evidence: [
      `Secret boundary evaluation for ${environment}`,
      `Governance status: ${governance.status}`,
      `Exposure risks identified: ${exposureRisks.length}`,
    ],
    uncertainty: [
      "Client bundle contents are not statically verified here",
      "Runtime secret serialization is not validated by this boundary check",
    ],
    governanceBoundaries: [
      "Secret boundary violations must block deployment",
      "Server-side secret exposure to clients is a critical security violation",
      "No hardcoded secrets permitted anywhere in codebase",
    ],
    checkedAt: now,
  };
}

export function assertNoHardcodedSecrets(content: string): {
  safe: boolean;
  violations: string[];
} {
  const violations: string[] = [];
  const HARDCODED_PATTERNS = [
    /sk_live_[a-zA-Z0-9]{20,}/,
    /sk_test_[a-zA-Z0-9]{20,}/,
    /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/,
    /service_role_[a-zA-Z0-9._-]{20,}/,
  ];

  for (const pattern of HARDCODED_PATTERNS) {
    if (pattern.test(content)) {
      violations.push(`Potential hardcoded secret detected matching pattern: ${pattern.source}`);
    }
  }

  return { safe: violations.length === 0, violations };
}
