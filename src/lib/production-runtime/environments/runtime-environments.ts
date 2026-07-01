import type {
  DeploymentEnvironment,
  DeploymentReadiness,
} from "../types/production-runtime-types.js";

export function retrieveRuntimeEnvironment(): DeploymentEnvironment {
  const envVar = process.env.NODE_ENV ?? "development";
  const appEnv = process.env.APP_ENV;

  if (appEnv === "production") return "production";
  if (appEnv === "staging") return "staging";
  if (appEnv === "development") return "development";
  if (envVar === "production") return "production";
  if (envVar === "test") return "development";
  return "local";
}

export interface EnvironmentReadinessResult {
  environment: DeploymentEnvironment;
  status: "ready" | "ready_with_warnings" | "blocked";
  missingVariables: string[];
  warnings: string[];
  evidence: string[];
  uncertainty: string[];
  governanceBoundaries: string[];
  checkedAt: string;
}

export function evaluateEnvironmentReadiness(
  environment: DeploymentEnvironment
): EnvironmentReadinessResult {
  const now = new Date().toISOString();
  const required = getRequiredEnvVars(environment);
  const missingVariables = required.filter((v) => !process.env[v]);
  const warnings: string[] = [];

  if (environment === "production" && process.env.NODE_ENV !== "production") {
    warnings.push("NODE_ENV is not 'production' in production environment");
  }

  if (environment !== "local" && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    warnings.push("Supabase URL is not configured — persistence layer will be unavailable");
  }

  const status =
    missingVariables.length > 0
      ? "blocked"
      : warnings.length > 0
      ? "ready_with_warnings"
      : "ready";

  return {
    environment,
    status,
    missingVariables,
    warnings,
    evidence: [
      `Environment: ${environment}`,
      `Required variables checked: ${required.length}`,
      `Missing variables: ${missingVariables.length}`,
    ],
    uncertainty: [
      "Variable presence does not guarantee valid values",
      "Runtime secret resolution is not validated statically",
    ],
    governanceBoundaries: [
      "Environment variables must not be logged or exposed to clients",
      "Production secrets require vault-governed access",
    ],
    checkedAt: now,
  };
}

function getRequiredEnvVars(environment: DeploymentEnvironment): string[] {
  const base = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];

  if (environment === "production" || environment === "staging") {
    return [
      ...base,
      "SUPABASE_SERVICE_ROLE_KEY",
      "NEXT_PUBLIC_SITE_URL",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
    ];
  }

  return base;
}

export function classifyEnvironmentFromReadiness(
  readiness: DeploymentReadiness
): DeploymentEnvironment {
  return readiness.environment;
}
