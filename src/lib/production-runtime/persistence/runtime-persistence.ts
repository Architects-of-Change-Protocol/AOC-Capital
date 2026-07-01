import type { DeploymentEnvironment } from "../types/production-runtime-types.js";

export type PersistenceBoundaryStatus = "present" | "partial" | "absent";

export interface PersistenceBoundary {
  id: string;
  domain: string;
  description: string;
  status: PersistenceBoundaryStatus;
  requiredEnvironments: DeploymentEnvironment[];
  evidence: string[];
  uncertainty: string[];
}

export interface RuntimePersistenceSnapshot {
  environment: DeploymentEnvironment;
  boundaries: PersistenceBoundary[];
  totalPresent: number;
  totalPartial: number;
  totalAbsent: number;
  evidence: string[];
  uncertainty: string[];
  governanceBoundaries: string[];
  checkedAt: string;
}

const PERSISTENCE_BOUNDARIES: Array<Omit<PersistenceBoundary, "status">> = [
  {
    id: "persistence:operational_memory",
    domain: "operational_memory",
    description: "Operational memory persistence via Supabase tables",
    requiredEnvironments: ["development", "staging", "production"],
    evidence: ["supabase/migrations present", "operational_memory_runtime tables defined"],
    uncertainty: ["Live Supabase connectivity is not validated statically"],
  },
  {
    id: "persistence:replay",
    domain: "replay",
    description: "Replay event storage for connector replay guarantees",
    requiredEnvironments: ["staging", "production"],
    evidence: ["replay-integrity.ts contracts present"],
    uncertainty: ["Durable replay storage depends on Supabase schema correctness"],
  },
  {
    id: "persistence:observability",
    domain: "observability",
    description: "Observability event persistence for audit and diagnostics",
    requiredEnvironments: ["production"],
    evidence: ["governance_audit_events migration present"],
    uncertainty: ["Observability persistence volume is not estimated statically"],
  },
  {
    id: "persistence:onboarding",
    domain: "onboarding",
    description: "Onboarding progress and state persistence",
    requiredEnvironments: ["development", "staging", "production"],
    evidence: ["onboarding_analyses migration present"],
    uncertainty: ["Onboarding persistence schema may require future extensions"],
  },
  {
    id: "persistence:migration_state",
    domain: "migrations",
    description: "Semantic runtime migration state persistence",
    requiredEnvironments: ["development", "staging", "production"],
    evidence: ["Runtime migration contracts defined in production-runtime domain"],
    uncertainty: [
      "Semantic migrations do not correspond 1:1 with Supabase DB migrations",
    ],
  },
];

export function retrieveRuntimePersistenceSnapshot(
  environment: DeploymentEnvironment
): RuntimePersistenceSnapshot {
  const now = new Date().toISOString();
  const boundaries: PersistenceBoundary[] = [];

  for (const boundary of PERSISTENCE_BOUNDARIES) {
    const required = boundary.requiredEnvironments.includes(environment);
    const status: PersistenceBoundaryStatus = required ? "present" : "absent";
    boundaries.push({ ...boundary, status });
  }

  const totalPresent = boundaries.filter((b) => b.status === "present").length;
  const totalPartial = boundaries.filter((b) => b.status === "partial").length;
  const totalAbsent = boundaries.filter((b) => b.status === "absent").length;

  return {
    environment,
    boundaries,
    totalPresent,
    totalPartial,
    totalAbsent,
    evidence: [
      `${totalPresent} persistence boundaries present for ${environment}`,
      `${totalAbsent} boundaries not required for this environment`,
    ],
    uncertainty: [
      "Persistence boundaries are structural contracts — actual DB availability is not verified",
      "Persistence capacity and latency under production load are not assessed",
    ],
    governanceBoundaries: [
      "Persistence boundaries must respect tenant and workspace isolation",
      "Operational memory persistence must not cross tenant boundaries",
    ],
    checkedAt: now,
  };
}
