import type { RuntimeMigration } from "../types/production-runtime-types.js";
import { buildRuntimeMigrations } from "./migration-runtime.js";

export interface MigrationIntegrityDiagnostic {
  migrationId: string;
  severity: "critical" | "high" | "medium" | "low";
  message: string;
  evidence: string[];
  isReversible: boolean;
}

export function generateMigrationIntegrityDiagnostics(): MigrationIntegrityDiagnostic[] {
  const migrations = buildRuntimeMigrations();
  const diagnostics: MigrationIntegrityDiagnostic[] = [];
  const appliedIds = new Set(
    migrations.filter((m) => m.status === "applied").map((m) => m.id)
  );

  for (const migration of migrations) {
    if (migration.status === "failed") {
      diagnostics.push({
        migrationId: migration.id,
        severity: "critical",
        message: `Migration ${migration.id} (${migration.domain}) has failed. Requires operator remediation before deployment.`,
        evidence: [`Migration version: ${migration.version}`, `Domain: ${migration.domain}`],
        isReversible: migration.isReversible,
      });
    }

    if (migration.status === "rolled_back" && !migration.isReversible) {
      diagnostics.push({
        migrationId: migration.id,
        severity: "critical",
        message: `Non-reversible migration ${migration.id} has been rolled back — data integrity may be compromised.`,
        evidence: [`Migration version: ${migration.version}`],
        isReversible: false,
      });
    }

    for (const dep of migration.dependencies) {
      if (!appliedIds.has(dep) && migration.status === "applied") {
        diagnostics.push({
          migrationId: migration.id,
          severity: "high",
          message: `Applied migration ${migration.id} has unapplied dependency ${dep} — ordering violation.`,
          evidence: [`Dependency ${dep} not in applied set`],
          isReversible: migration.isReversible,
        });
      }
    }
  }

  return diagnostics;
}

export function computeMigrationOrderingValidity(
  migrations: RuntimeMigration[]
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  const appliedIds = new Set(
    migrations.filter((m) => m.status === "applied").map((m) => m.id)
  );

  for (const m of migrations) {
    if (m.status !== "applied") continue;
    for (const dep of m.dependencies) {
      if (!appliedIds.has(dep)) {
        violations.push(`Migration ${m.id} applied before dependency ${dep}`);
      }
    }
  }

  return { valid: violations.length === 0, violations };
}
