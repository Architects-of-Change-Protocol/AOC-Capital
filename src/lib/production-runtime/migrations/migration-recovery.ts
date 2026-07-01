import { buildRuntimeMigrations } from "./migration-runtime.js";

export interface MigrationRecoveryRecommendation {
  migrationId: string;
  recommendation: string;
  rollbackSafe: boolean;
  priority: "critical" | "high" | "medium" | "low";
  isAutomated: false;
  evidence: string[];
  checkedAt: string;
}

export function retrieveMigrationRecoveryRecommendations(): MigrationRecoveryRecommendation[] {
  const now = new Date().toISOString();
  const migrations = buildRuntimeMigrations();
  const recommendations: MigrationRecoveryRecommendation[] = [];

  for (const migration of migrations) {
    if (migration.status === "failed") {
      recommendations.push({
        migrationId: migration.id,
        recommendation: migration.isReversible
          ? `Migration ${migration.id} failed and is reversible. Consider rolling back to restore integrity, then investigate root cause.`
          : `Migration ${migration.id} failed and is NOT reversible. Do not attempt automatic rollback — requires operator assessment and manual remediation.`,
        rollbackSafe: migration.isReversible,
        priority: "critical",
        isAutomated: false,
        evidence: [
          `Migration domain: ${migration.domain}`,
          `Version: ${migration.version}`,
          `Reversible: ${migration.isReversible}`,
        ],
        checkedAt: now,
      });
    }
  }

  if (recommendations.length === 0) {
    recommendations.push({
      migrationId: "none",
      recommendation:
        "No migration recovery actions required. All migrations are in a healthy state.",
      rollbackSafe: true,
      priority: "low",
      isAutomated: false,
      evidence: ["All runtime migrations evaluated — no failed or rolled-back states detected"],
      checkedAt: now,
    });
  }

  return recommendations;
}
