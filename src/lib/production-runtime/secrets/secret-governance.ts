import type { DeploymentEnvironment } from "../types/production-runtime-types.js";

export interface SecretGovernanceResult {
  environment: DeploymentEnvironment;
  status: "compliant" | "warning" | "violation";
  violations: string[];
  warnings: string[];
  requiredSecrets: string[];
  presentSecrets: string[];
  missingSecrets: string[];
  evidence: string[];
  uncertainty: string[];
  governanceBoundaries: string[];
  checkedAt: string;
}

export interface SecretRequirement {
  key: string;
  environments: DeploymentEnvironment[];
  isClientSide: boolean;
  description: string;
}

const SECRET_REQUIREMENTS: SecretRequirement[] = [
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    environments: ["development", "staging", "production"],
    isClientSide: true,
    description: "Supabase project URL for client and server connectivity",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    environments: ["development", "staging", "production"],
    isClientSide: true,
    description: "Supabase anonymous key for client-side access",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    environments: ["staging", "production"],
    isClientSide: false,
    description: "Supabase service role key — must never be exposed to clients",
  },
  {
    key: "STRIPE_SECRET_KEY",
    environments: ["staging", "production"],
    isClientSide: false,
    description: "Stripe secret key for billing operations — server-side only",
  },
  {
    key: "STRIPE_WEBHOOK_SECRET",
    environments: ["staging", "production"],
    isClientSide: false,
    description: "Stripe webhook secret for event verification",
  },
  {
    key: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    environments: ["staging", "production"],
    isClientSide: true,
    description: "Stripe publishable key for client-side billing initialization",
  },
  {
    key: "NEXT_PUBLIC_SITE_URL",
    environments: ["staging", "production"],
    isClientSide: true,
    description: "Site URL for auth redirect and canonical link generation",
  },
];

export function evaluateSecretGovernance(
  environment: DeploymentEnvironment
): SecretGovernanceResult {
  const now = new Date().toISOString();
  const violations: string[] = [];
  const warnings: string[] = [];
  const requiredForEnv = SECRET_REQUIREMENTS.filter((s) =>
    s.environments.includes(environment)
  );

  const requiredSecrets = requiredForEnv.map((s) => s.key);
  const presentSecrets: string[] = [];
  const missingSecrets: string[] = [];

  for (const req of requiredForEnv) {
    const present = !!process.env[req.key];
    if (present) {
      presentSecrets.push(req.key);
    } else {
      missingSecrets.push(req.key);
      if (environment === "production" || environment === "staging") {
        violations.push(`Required secret missing in ${environment}: ${req.key} — ${req.description}`);
      } else {
        warnings.push(`Secret ${req.key} is missing in ${environment} — may limit functionality`);
      }
    }
  }

  const status =
    violations.length > 0 ? "violation" : warnings.length > 0 ? "warning" : "compliant";

  return {
    environment,
    status,
    violations,
    warnings,
    requiredSecrets,
    presentSecrets,
    missingSecrets,
    evidence: [
      `${requiredSecrets.length} secrets required for ${environment}`,
      `${presentSecrets.length} present, ${missingSecrets.length} missing`,
    ],
    uncertainty: [
      "Secret presence does not validate secret value correctness or rotation status",
      "Secret rotation schedules are not evaluated statically",
    ],
    governanceBoundaries: [
      "Server-side secrets must never be exposed in client bundles",
      "Secret values must not appear in logs, traces, or error messages",
      "Secrets are never hardcoded — environment-sourced only",
    ],
    checkedAt: now,
  };
}

export function retrieveSecretRequirements(
  environment: DeploymentEnvironment
): SecretRequirement[] {
  return SECRET_REQUIREMENTS.filter((s) => s.environments.includes(environment));
}
