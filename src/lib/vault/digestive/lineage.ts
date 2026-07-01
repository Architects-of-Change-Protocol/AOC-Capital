import type { VaultEvidenceLineage, VaultRawMaterial } from "./types";

/**
 * Build an evidence lineage record for a nutrient.
 *
 * Every nutrient must trace back to at least one piece of source evidence.
 * This is what allows PMFreak to answer "why does it believe this?" and
 * present explainable, auditable cognition.
 */
export function buildEvidenceLineage(input: {
  rawMaterial: VaultRawMaterial;
  excerpt: string;
  confidenceBasis: string;
  extractionMethod: VaultEvidenceLineage["extractionMethod"];
}): VaultEvidenceLineage {
  return {
    sourceArtifactId: input.rawMaterial.id,
    sourceType: input.rawMaterial.type,
    sourceTitle: input.rawMaterial.title,
    // Preserve excerpts only — never store the full document in the lineage record
    excerpt: input.excerpt.slice(0, 500),
    timestamp: input.rawMaterial.submittedAt,
    workspaceId: input.rawMaterial.workspaceId,
    projectId: input.rawMaterial.projectId,
    actorUserId: input.rawMaterial.actorUserId,
    confidenceBasis: input.confidenceBasis,
    extractionMethod: input.extractionMethod,
  };
}
