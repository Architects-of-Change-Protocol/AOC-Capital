/**
 * Persistence layer for vault learned patterns.
 *
 * Follows the same graceful-fallback pattern as digestive/persistence.ts:
 * - Attempts to persist to Supabase
 * - Falls back to in-memory (no-op) if tables don't exist or Supabase is unavailable
 * - This allows the pattern layer to function as a pure in-memory system
 *   until migration 20260520010000 is applied
 *
 * Authorization: callers are responsible for verifying workspace/project
 * access before calling this function.
 */

import type { VaultLearnedPattern, LearnedPatternEvidence } from "./types";

export type VaultPatternPersistenceResult = {
  patternsPersisted: number;
  evidencePersisted: number;
  method: "supabase" | "none";
  error?: string;
};

export async function persistLearnedPatterns(
  patterns: VaultLearnedPattern[],
): Promise<VaultPatternPersistenceResult> {
  if (patterns.length === 0) {
    return { patternsPersisted: 0, evidencePersisted: 0, method: "none" };
  }

  try {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = await createSupabaseServerClient();

    const { error: patternError } = await supabase
      .from("vault_learned_patterns")
      .upsert(
        patterns.map((p) => ({
          id: p.id,
          workspace_id: p.workspaceId,
          project_id: p.projectId ?? null,
          pattern_type: p.patternType,
          title: p.title,
          summary: p.summary,
          status: p.status,
          trajectory: p.trajectory,
          recurrence_count: p.recurrenceCount,
          confidence: p.confidence,
          severity: p.severity,
          first_seen_at: p.firstSeenAt,
          last_seen_at: p.lastSeenAt,
          promotion_reason: p.promotionReason,
          metadata: {
            recurrenceProfile: p.recurrenceProfile,
            involvedNutrientIds: p.involvedNutrientIds,
            involvedResidueIds: p.involvedResidueIds,
            adaptiveSeverity: p.adaptiveScoring?.adaptiveSeverity ?? null,
            adaptiveConfidence: p.adaptiveScoring?.adaptiveConfidence ?? null,
            severityHistory: p.adaptiveScoring?.severityEvolution.history ?? [],
            confidenceHistory: p.adaptiveScoring?.confidenceEvolution.history ?? [],
            contradictionCount: p.adaptiveScoring?.contradictionProfile.contradictionCount ?? 0,
            recoveryCount: p.adaptiveScoring?.recoveryProfile.recoveryCount ?? 0,
            trajectoryStrength: p.adaptiveScoring?.escalationLikelihood ?? null,
            adaptiveScoring: p.adaptiveScoring ?? null,
          },
          created_at: p.createdAt,
          updated_at: p.updatedAt,
        })),
        { onConflict: "id" },
      );

    if (patternError) {
      return {
        patternsPersisted: 0,
        evidencePersisted: 0,
        method: "none",
        error: `vault_learned_patterns upsert failed: ${patternError.message}`,
      };
    }

    // Persist evidence references
    const allEvidence: LearnedPatternEvidence[] = patterns.flatMap(
      (p) => p.evidenceReferences,
    );
    let evidencePersisted = 0;

    if (allEvidence.length > 0) {
      const { error: evidenceError } = await supabase
        .from("vault_learned_pattern_evidence")
        .upsert(
          allEvidence.map((e) => ({
            id: e.id,
            pattern_id: e.patternId,
            workspace_id: e.workspaceId,
            nutrient_id: e.nutrientId ?? null,
            residue_id: e.residueId ?? null,
            source_id: e.sourceArtifactId ?? null,
            excerpt: e.excerpt,
            evidence_timestamp: e.evidenceTimestamp,
            contribution_reason: e.contributionReason,
            created_at: e.createdAt,
          })),
          { onConflict: "id" },
        );
      if (!evidenceError) evidencePersisted = allEvidence.length;
    }

    return {
      patternsPersisted: patterns.length,
      evidencePersisted,
      method: "supabase",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return {
      patternsPersisted: 0,
      evidencePersisted: 0,
      method: "none",
      error: `Supabase persistence unavailable — patterns are in-memory only. Reason: ${message}`,
    };
  }
}
