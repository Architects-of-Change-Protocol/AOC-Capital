import crypto from "node:crypto";
import type { VaultRawMaterial, VaultDigestionResult, VaultDigestiveContext } from "./types";
import { runDigestivePipeline } from "./pipeline";
import { persistDigestionResult } from "./persistence";

// Re-export all public types so consumers only need one import path
export type {
  VaultRawMaterial,
  VaultRawMaterialType,
  VaultDigestiveContext,
  VaultDigestionResult,
  VaultDigestivePass,
  VaultNutrient,
  VaultNutrientType,
  VaultNutrientScoring,
  VaultExtractedEntity,
  VaultExtractedEntityType,
  VaultEvidenceLineage,
  VaultSemanticResidue,
} from "./types";

export { computeDecayedFreshness, computeCurrentRelevance } from "./decay";
export type { DecayInput } from "./decay";

export type { NutrientCandidate } from "./nutrient-extractor";
export type { NormalizedInput } from "./normalizer";
export type { ScoringInputs } from "./scoring";
export type { VaultPersistenceResult } from "./persistence";
export type { DeduplicatedCandidate } from "./deduplicator";
export { SIGNIFICANCE_THRESHOLD, STAKEHOLDER_PRESSURE_PATTERNS, evaluateSignificance } from "./significance";

export type DigestVaultMaterialOptions = {
  /** Set to false to skip Supabase persistence (e.g. for dry-run/testing). Default: true */
  persist?: boolean;
};

export type DigestVaultMaterialResult = VaultDigestionResult & {
  persisted: boolean;
  persistError?: string;
};

/**
 * Primary integration surface for the Vault Digestive System.
 *
 * Call this function from any ingestion flow (upload, copilot, input-hub, etc.)
 * after verifying workspace/project access via requireWorkspaceMembership or
 * requireProjectPermission. This function does not perform its own auth check —
 * that responsibility belongs to the API route layer, consistent with the rest
 * of the codebase.
 *
 * @example
 * // In an API route:
 * await requireProjectPermission(projectId, "write_memory");
 * const result = await digestVaultMaterial(
 *   { workspaceId, projectId, actorUserId: user.id },
 *   { id: uploadId, type: "uploaded_text", content: text, ... },
 * );
 */
export async function digestVaultMaterial(
  context: Omit<VaultDigestiveContext, "traceId" | "digestedAt">,
  rawMaterial: VaultRawMaterial,
  options: DigestVaultMaterialOptions = {},
): Promise<DigestVaultMaterialResult> {
  const digestiveContext: VaultDigestiveContext = {
    ...context,
    traceId: crypto.randomUUID(),
    digestedAt: new Date().toISOString(),
  };

  const result = runDigestivePipeline(rawMaterial, digestiveContext);

  const shouldPersist = options.persist !== false;
  if (shouldPersist) {
    const persistResult = await persistDigestionResult(result);
    return {
      ...result,
      persisted: persistResult.method === "supabase",
      persistError: persistResult.error,
    };
  }

  return { ...result, persisted: false };
}
