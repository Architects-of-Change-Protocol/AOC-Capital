import type { VaultDigestionResult } from "./types";

export type VaultPersistenceResult = {
  digestionRunId: string;
  nutrientsPersisted: number;
  residuePersisted: number;
  method: "supabase" | "none";
  error?: string;
};

/**
 * Persist a digestion result to Supabase.
 *
 * Falls back gracefully if the tables do not yet exist or if Supabase
 * is unavailable. This allows the pipeline to function as a pure
 * in-memory system until the migration is applied.
 *
 * All rows are scoped to workspace_id. Project-level scoping is optional.
 *
 * Authorization: callers are responsible for verifying workspace/project
 * access via requireWorkspaceMembership or requireProjectPermission BEFORE
 * calling this function. This matches the pattern used by the rest of the
 * operational memory layer.
 *
 * TODO: Remove the fallback error path once migration 20260520000000 is applied.
 */
export async function persistDigestionResult(
  result: VaultDigestionResult,
): Promise<VaultPersistenceResult> {
  const runId = result.digestivePass.runId;

  try {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = await createSupabaseServerClient();

    // Persist the digestion run record
    const { error: runError } = await supabase.from("vault_digestion_runs").insert({
      id: runId,
      workspace_id: result.digestivePass.workspaceId,
      project_id: result.digestivePass.projectId ?? null,
      actor_user_id: result.digestivePass.actorUserId ?? null,
      raw_material_id: result.digestivePass.rawMaterialId ?? null,
      extraction_method: result.digestivePass.extractionMethod,
      nutrient_count: result.digestivePass.nutrientCount,
      residue_count: result.digestivePass.residueCount,
      entity_count: result.digestivePass.entityCount,
      started_at: result.digestivePass.startedAt,
      completed_at: result.digestivePass.completedAt,
    });

    if (runError) {
      return {
        digestionRunId: runId,
        nutrientsPersisted: 0,
        residuePersisted: 0,
        method: "none",
        error: `vault_digestion_runs insert failed: ${runError.message}`,
      };
    }

    // Persist nutrients
    let nutrientsPersisted = 0;
    if (result.nutrients.length > 0) {
      const { error: nutrientError } = await supabase.from("vault_nutrients").insert(
        result.nutrients.map((n) => ({
          id: n.id,
          digestion_run_id: runId,
          workspace_id: n.workspaceId,
          project_id: n.projectId ?? null,
          nutrient_type: n.nutrientType,
          summary: n.summary,
          entities: n.entities,
          evidence: n.evidence,
          scoring: n.scoring,
          created_at: n.createdAt,
        })),
      );
      if (!nutrientError) nutrientsPersisted = result.nutrients.length;
    }

    // Persist semantic residue
    let residuePersisted = 0;
    if (result.residue.length > 0) {
      const { error: residueError } = await supabase.from("vault_semantic_residue").insert(
        result.residue.map((r) => ({
          id: r.id,
          digestion_run_id: runId,
          workspace_id: r.workspaceId,
          project_id: r.projectId ?? null,
          residue_category: r.residueCategory,
          raw_excerpt: r.rawExcerpt,
          rationale: r.rationale,
          created_at: r.createdAt,
        })),
      );
      if (!residueError) residuePersisted = result.residue.length;
    }

    return { digestionRunId: runId, nutrientsPersisted, residuePersisted, method: "supabase" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return {
      digestionRunId: runId,
      nutrientsPersisted: 0,
      residuePersisted: 0,
      method: "none",
      error: `Supabase persistence unavailable — digestion result is in-memory only. Reason: ${message}`,
    };
  }
}
