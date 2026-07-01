import crypto from "node:crypto";
import type {
  VaultRawMaterial,
  VaultDigestiveContext,
  VaultNutrient,
  VaultDigestionResult,
  VaultDigestivePass,
} from "./types";
import { normalizeRawMaterial } from "./normalizer";
import { extractEntities } from "./entity-extractor";
import { extractNutrientCandidates } from "./nutrient-extractor";
import { deduplicateCandidates } from "./deduplicator";
import { scoreNutrient } from "./scoring";
import { extractSemanticResidue } from "./residue";
import { buildEvidenceLineage } from "./lineage";

/**
 * The deterministic digestive pipeline.
 *
 * This function is pure and synchronous — it never calls AI services.
 * Persistence is handled by the caller (see persistence.ts).
 *
 * Pipeline stages:
 *   A. Input normalization
 *   B. Entity extraction (rule-based)
 *   C. Nutrient candidate extraction (pattern-based)
 *   D. Significance filtering & deduplication
 *   E. Evidence lineage construction
 *   F. Nutrient scoring
 *   G. Semantic residue extraction
 */
export function runDigestivePipeline(
  rawMaterial: VaultRawMaterial,
  context: VaultDigestiveContext,
): VaultDigestionResult {
  const runId = context.traceId;
  const startedAt = context.digestedAt;

  // A. Normalize
  const normalized = normalizeRawMaterial(rawMaterial);

  // B. Extract entities
  const entities = extractEntities(normalized.lines);

  // C. Extract nutrient candidates (all, including suppressed)
  const allCandidates = extractNutrientCandidates(normalized.lines);

  // D. Filter suppressed candidates and deduplicate active ones
  const suppressedCandidateCount = allCandidates.filter((c) => c.suppressed).length;
  const activeCandidates = allCandidates.filter((c) => !c.suppressed);
  const deduplicatedCandidates = deduplicateCandidates(activeCandidates);

  // E + F. Build nutrients with lineage and scoring
  const nutrients: VaultNutrient[] = deduplicatedCandidates.map((candidate) => {
    const evidence = buildEvidenceLineage({
      rawMaterial,
      excerpt: candidate.excerpt,
      confidenceBasis: `Pattern matched: ${candidate.matchedPattern}. Rule-based line-level extraction.`,
      extractionMethod: "rule_based",
    });

    const scoring = scoreNutrient({
      nutrientType: candidate.nutrientType,
      confidence: candidate.confidence,
      significanceScore: candidate.significanceScore,
    });

    // Include entities whose excerpt overlaps with this nutrient's line
    const relatedEntities = entities.filter((e) =>
      candidate.excerpt.slice(0, 80).includes(e.excerpt.slice(0, 40)),
    );

    return {
      id: crypto.randomUUID(),
      nutrientType: candidate.nutrientType,
      summary: candidate.summary,
      entities: relatedEntities,
      evidence: [evidence],
      scoring,
      duplicateMergeCount: candidate.duplicateMergeCount,
      workspaceId: context.workspaceId,
      projectId: context.projectId,
      digestionRunId: runId,
      createdAt: context.digestedAt,
    };
  });

  // G. Semantic residue
  const residue = extractSemanticResidue(
    normalized.lines,
    context.workspaceId,
    context.projectId,
    runId,
  );

  const completedAt = new Date().toISOString();

  const digestivePass: VaultDigestivePass = {
    runId,
    rawMaterialId: rawMaterial.id,
    workspaceId: context.workspaceId,
    projectId: context.projectId,
    actorUserId: context.actorUserId,
    startedAt,
    completedAt,
    extractionMethod: "rule_based",
    nutrientCount: nutrients.length,
    residueCount: residue.length,
    entityCount: entities.length,
    suppressedCandidateCount,
  };

  return { digestivePass, nutrients, residue, entities };
}
