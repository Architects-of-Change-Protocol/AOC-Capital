import type {
  RuntimeMigration,
  MigrationIntegrityResult,
} from "../types/production-runtime-types.js";

const RUNTIME_MIGRATIONS: RuntimeMigration[] = [
  {
    id: "m001",
    version: "1.0.0",
    description: "Initialize operational memory runtime contracts",
    domain: "operational_memory",
    status: "applied",
    isReversible: false,
    dependencies: [],
  },
  {
    id: "m002",
    version: "1.1.0",
    description: "Initialize governance runtime contracts",
    domain: "governance",
    status: "applied",
    isReversible: false,
    dependencies: ["m001"],
  },
  {
    id: "m003",
    version: "1.2.0",
    description: "Initialize connector runtime contracts",
    domain: "connectors",
    status: "applied",
    isReversible: true,
    dependencies: ["m001", "m002"],
  },
  {
    id: "m004",
    version: "1.3.0",
    description: "Initialize vault digestive system contracts",
    domain: "vault",
    status: "applied",
    isReversible: true,
    dependencies: ["m001"],
  },
  {
    id: "m005",
    version: "1.4.0",
    description: "Initialize runtime hardening contracts",
    domain: "runtime_hardening",
    status: "applied",
    isReversible: false,
    dependencies: ["m001", "m002"],
  },
  {
    id: "m006",
    version: "1.5.0",
    description: "Initialize enterprise UX and onboarding contracts",
    domain: "enterprise_ux",
    status: "applied",
    isReversible: true,
    dependencies: ["m002"],
  },
  {
    id: "m007",
    version: "2.0.0",
    description: "Initialize production runtime contracts",
    domain: "production_runtime",
    status: "applied",
    isReversible: false,
    dependencies: ["m001", "m002", "m003", "m004", "m005", "m006"],
  },
];

export function buildRuntimeMigrations(): RuntimeMigration[] {
  return [...RUNTIME_MIGRATIONS];
}

export function evaluateMigrationIntegrity(): MigrationIntegrityResult {
  const now = new Date().toISOString();
  const migrations = buildRuntimeMigrations();
  const blockers: string[] = [];
  const warnings: string[] = [];

  const appliedIds = new Set(
    migrations.filter((m) => m.status === "applied").map((m) => m.id)
  );

  for (const migration of migrations) {
    for (const dep of migration.dependencies) {
      if (!appliedIds.has(dep)) {
        if (migration.status === "applied") {
          blockers.push(
            `Migration ${migration.id} is applied but dependency ${dep} is not — integrity violation`
          );
        } else {
          warnings.push(
            `Migration ${migration.id} has unapplied dependency ${dep}`
          );
        }
      }
    }

    if (migration.status === "failed") {
      blockers.push(`Migration ${migration.id} has failed status — requires remediation`);
    }
  }

  const pendingMigrations = migrations.filter((m) => m.status === "pending");
  if (pendingMigrations.length > 0) {
    warnings.push(
      `${pendingMigrations.length} pending migration(s) not yet applied: ${pendingMigrations.map((m) => m.id).join(", ")}`
    );
  }

  const status =
    blockers.length > 0
      ? "integrity_failed"
      : warnings.length > 0
      ? "integrity_warnings"
      : "integrity_confirmed";

  return {
    migrations,
    status,
    blockers,
    warnings,
    evidence: [
      `${migrations.length} runtime migrations defined`,
      `Applied: ${appliedIds.size}, Pending: ${pendingMigrations.length}`,
    ],
    uncertainty: [
      "Migration state is semantic/contractual — no live database migration execution",
      "Runtime migration ordering under concurrent deployments is not verified",
    ],
    governanceBoundaries: [
      "Migration integrity violations must block release readiness",
      "Non-reversible migrations require explicit operator sign-off",
    ],
    checkedAt: now,
  };
}
