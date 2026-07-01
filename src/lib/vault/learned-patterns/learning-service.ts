/**
 * Learning Service — public API for the Vault Learned Pattern Layer.
 *
 * Primary function: getLearnedPatternContext()
 * Returns a deterministic, ranked context object suitable for injection into
 * Copilot, executive synthesis, intervention engines, and project dashboards.
 *
 * All functions are pure and deterministic when given the same inputs.
 * No AI/LLMs. No embeddings. No global state.
 *
 * Authorization: callers must verify workspace/project access before calling
 * any function in this module.
 */

import crypto from "node:crypto";
import type { VaultNutrient, VaultSemanticResidue, VaultDigestionResult } from "../digestive/types";
import { detectRecurringSignalGroups } from "./recurrence-engine";
import { evaluatePromotionRules, detectRecoveryPatternCandidates } from "./promotion-rules";
import { computePatternScores, computeRecoveryScores } from "./pattern-scoring";
import { persistLearnedPatterns } from "./persistence";
import { computeAdaptiveScoring, explainAdaptiveScoring } from "./adaptive-scoring";
import type {
  VaultLearnedPattern,
  LearnedPatternEvidence,
  PatternContext,
  PatternLearningResult,
  PatternLearningContext,
  LearnedPatternType,
} from "./types";

// ─── Internal Helpers ─────────────────────────────────────────────────────────

function nowIso(): string {
  return new Date().toISOString();
}

function buildEvidenceReferences(
  patternId: string,
  workspaceId: string,
  nutrients: VaultNutrient[],
  involvedNutrientIds: string[],
): LearnedPatternEvidence[] {
  const involvedSet = new Set(involvedNutrientIds);
  const involved = nutrients.filter((n) => involvedSet.has(n.id));
  const now = nowIso();

  return involved.slice(0, 10).map((n) => ({
    id: crypto.randomUUID(),
    patternId,
    workspaceId,
    nutrientId: n.id,
    residueId: null,
    sourceArtifactId: n.evidence[0]?.sourceArtifactId ?? null,
    excerpt: (n.evidence[0]?.excerpt ?? n.summary).slice(0, 500),
    evidenceTimestamp: n.evidence[0]?.timestamp ?? n.createdAt,
    contributionReason: `${n.nutrientType} matched with confidence ${n.scoring.confidence.toFixed(2)}`,
    createdAt: now,
  }));
}

// ─── Core Pattern Construction ────────────────────────────────────────────────

function buildPatternsFromNutrients(
  nutrients: VaultNutrient[],
  residue: VaultSemanticResidue[],
): VaultLearnedPattern[] {
  const now = nowIso();
  const signalGroups = detectRecurringSignalGroups(nutrients);
  const patterns: VaultLearnedPattern[] = [];

  for (const group of signalGroups) {
    const candidate = evaluatePromotionRules(group);
    if (candidate === null) continue;

    const scores = computePatternScores(group);
    const patternId = crypto.randomUUID();

    const sortedSignals = [...group.signals].sort(
      (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
    );
    const firstSeenAt = sortedSignals[0]?.createdAt ?? now;
    const lastSeenAt = sortedSignals[sortedSignals.length - 1]?.createdAt ?? now;

    const evidenceReferences = buildEvidenceReferences(
      patternId,
      group.workspaceId,
      nutrients,
      group.involvedNutrientIds,
    );

    patterns.push({
      id: patternId,
      workspaceId: group.workspaceId,
      projectId: group.projectId,
      patternType: candidate.patternType,
      title: candidate.title,
      summary: candidate.summary,
      firstSeenAt,
      lastSeenAt,
      recurrenceCount: group.recurrenceProfile.totalOccurrences,
      involvedNutrientIds: group.involvedNutrientIds,
      involvedResidueIds: [],
      evidenceReferences,
      confidence: scores.confidence,
      severity: scores.severity,
      trajectory: scores.trajectory,
      status: candidate.status,
      promotionReason: candidate.promotionReason,
      recurrenceProfile: group.recurrenceProfile,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Recovery patterns (cross-type detection)
  const recoveryCandidates = detectRecoveryPatternCandidates(nutrients, residue);
  for (const rc of recoveryCandidates) {
    const patternId = crypto.randomUUID();
    const recoveryNutrients = nutrients.filter(
      (n) =>
        n.nutrientType === "recovery_signal" &&
        n.workspaceId === rc.workspaceId &&
        (n.projectId ?? "") === (rc.projectId ?? ""),
    );
    const antecedents = nutrients.filter(
      (n) =>
        ["blocker_signal", "risk_signal", "dependency_signal"].includes(n.nutrientType) &&
        n.workspaceId === rc.workspaceId &&
        (n.projectId ?? "") === (rc.projectId ?? ""),
    );

    const avgConf =
      recoveryNutrients.reduce((s, n) => s + n.scoring.confidence, 0) /
      Math.max(1, recoveryNutrients.length);
    const scores = computeRecoveryScores(
      recoveryNutrients.length,
      antecedents.length,
      avgConf,
    );

    const sortedByDate = [...recoveryNutrients, ...antecedents].sort(
      (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
    );
    const firstSeenAt = sortedByDate[0]?.createdAt ?? now;
    const lastSeenAt = sortedByDate[sortedByDate.length - 1]?.createdAt ?? now;

    const evidenceReferences = buildEvidenceReferences(
      patternId,
      rc.workspaceId,
      nutrients,
      rc.involvedNutrientIds,
    );

    patterns.push({
      id: patternId,
      workspaceId: rc.workspaceId,
      projectId: rc.projectId,
      patternType: "recovery_pattern",
      title: rc.title,
      summary: rc.summary,
      firstSeenAt,
      lastSeenAt,
      recurrenceCount: recoveryNutrients.length,
      involvedNutrientIds: rc.involvedNutrientIds,
      involvedResidueIds: rc.involvedResidueIds,
      evidenceReferences,
      confidence: scores.confidence,
      severity: scores.severity,
      trajectory: scores.trajectory,
      status: rc.status,
      promotionReason: rc.promotionReason,
      recurrenceProfile: {
        totalOccurrences: recoveryNutrients.length,
        distinctArtifacts: new Set(recoveryNutrients.map((n) => n.evidence[0]?.sourceArtifactId).filter(Boolean)).size,
        distinctDigestionRuns: new Set(recoveryNutrients.map((n) => n.digestionRunId)).size,
        timeSpanDays: 0,
        multiDaySpread: false,
      },
      createdAt: now,
      updatedAt: now,
    });
  }

  const enriched = patterns.map((pattern) => ({
    ...pattern,
    adaptiveScoring: computeAdaptiveScoring(pattern, patterns),
  }));

  return enriched;
}



export function getAdaptiveSeverity(pattern: VaultLearnedPattern, patterns: VaultLearnedPattern[]) {
  return computeAdaptiveScoring(pattern, patterns).adaptiveSeverity;
}

export function getAdaptiveConfidence(pattern: VaultLearnedPattern, patterns: VaultLearnedPattern[]) {
  return computeAdaptiveScoring(pattern, patterns).adaptiveConfidence;
}

export function computeAdaptiveScoringForPattern(pattern: VaultLearnedPattern, patterns: VaultLearnedPattern[]) {
  return computeAdaptiveScoring(pattern, patterns);
}

export function getAdaptiveOperationalContext(patterns: VaultLearnedPattern[]) {
  const enriched = patterns.map((p) => computeAdaptiveScoring(p, patterns));
  return {
    activeChronicRisks: patterns.filter((p) => p.status === "chronic").length,
    risingEscalations: patterns.filter((p) => p.trajectory === "increasing").length,
    recoveringPatterns: patterns.filter((p) => p.status === "recovering" || p.trajectory === "recovered").length,
    contradictionAccumulation: enriched.reduce((s, x) => s + x.contradictionProfile.contradictionCount, 0),
    averageAdaptiveConfidence: enriched.length ? Math.round((enriched.reduce((s, x) => s + x.adaptiveConfidence, 0) / enriched.length) * 100) / 100 : 0,
  };
}

export function explainAdaptivePatternScoring(pattern: VaultLearnedPattern, patterns: VaultLearnedPattern[]) {
  return explainAdaptiveScoring(computeAdaptiveScoring(pattern, patterns));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Analyzes a new digestion result alongside prior nutrients to detect patterns.
 *
 * The `priorNutrients` parameter allows incremental learning: pass all
 * previously digested nutrients for the same workspace+project to enable
 * cross-run recurrence detection.
 *
 * When `persist` is true, attempts to save patterns to Supabase.
 */
export async function learnPatternsFromDigestion(
  _context: PatternLearningContext,
  digestionResult: VaultDigestionResult,
  priorNutrients: VaultNutrient[] = [],
  options: { persist?: boolean } = {},
): Promise<PatternLearningResult> {
  const allNutrients = [...priorNutrients, ...digestionResult.nutrients];
  const allResidue = digestionResult.residue;

  const patterns = buildPatternsFromNutrients(allNutrients, allResidue);

  const shouldPersist = options.persist !== false;
  if (shouldPersist && patterns.length > 0) {
    await persistLearnedPatterns(patterns);
  }

  return {
    workspaceId: digestionResult.digestivePass.workspaceId,
    projectId: digestionResult.digestivePass.projectId,
    patternsDetected: patterns,
    patternsPromoted: patterns.length,
    patternsUpdated: 0,
    nutrientsAnalyzed: allNutrients.length,
    residueAnalyzed: allResidue.length,
    learnedAt: nowIso(),
    detectionMethod: "rule_based",
  };
}

/**
 * Analyzes all provided nutrients for a workspace/project and returns patterns.
 *
 * This is the batch variant — pass all available nutrients for comprehensive
 * pattern detection. In production, these would come from Supabase queries.
 */
export function updatePatternFromNutrients(
  _context: PatternLearningContext,
  nutrients: VaultNutrient[],
  residue: VaultSemanticResidue[],
): PatternLearningResult {
  const patterns = buildPatternsFromNutrients(nutrients, residue);

  const scopeKey = `${_context.workspaceId}:${_context.projectId ?? ""}`;
  const scopedPatterns = patterns.filter(
    (p) =>
      p.workspaceId === _context.workspaceId &&
      (p.projectId ?? "") === (_context.projectId ?? ""),
  );

  return {
    workspaceId: _context.workspaceId,
    projectId: _context.projectId,
    patternsDetected: scopedPatterns,
    patternsPromoted: scopedPatterns.length,
    patternsUpdated: 0,
    nutrientsAnalyzed: nutrients.length,
    residueAnalyzed: residue.length,
    learnedAt: nowIso(),
    detectionMethod: "rule_based",
  };
}

/**
 * Builds a deterministic context object from a set of learned patterns.
 *
 * The returned PatternContext is suitable for injection into Copilot,
 * executive synthesis, intervention engines, and project dashboards.
 *
 * Patterns are ranked by (severity × confidence × recurrenceCount).
 */
export function getLearnedPatternContext(
  _context: PatternLearningContext,
  patterns: VaultLearnedPattern[],
): PatternContext {
  const scopedPatterns = patterns.filter(
    (p) =>
      p.workspaceId === _context.workspaceId &&
      (p.projectId ?? "") === (_context.projectId ?? ""),
  );

  const severityRank: Record<string, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };

  const ranked = [...scopedPatterns].sort((a, b) => {
    const scoreA = severityRank[a.severity] * a.confidence * a.recurrenceCount;
    const scoreB = severityRank[b.severity] * b.confidence * b.recurrenceCount;
    return scoreB - scoreA;
  });

  const activeStatuses = new Set<string>(["emerging", "confirmed", "chronic"]);

  const readinessSignal: PatternContext["readinessSignal"] =
    scopedPatterns.some(
      (p) => p.severity === "critical" || (p.severity === "high" && p.status === "chronic"),
    )
      ? "critical"
      : scopedPatterns.some(
            (p) => p.severity === "high" || p.status === "confirmed",
          )
        ? "active"
        : scopedPatterns.length > 0
          ? "emerging"
          : "none";

  return {
    workspaceId: _context.workspaceId,
    projectId: _context.projectId,
    generatedAt: nowIso(),
    topActivePatterns: ranked.filter((p) => activeStatuses.has(p.status)).slice(0, 5),
    chronicRisks: ranked.filter(
      (p) =>
        p.status === "chronic" ||
        p.patternType === "chronic_risk_pattern",
    ),
    recurringBlockers: ranked.filter(
      (p) => p.patternType === "recurring_blocker_pattern",
    ),
    recentRecoveries: ranked.filter((p) => p.patternType === "recovery_pattern"),
    risingEscalations: ranked.filter(
      (p) =>
        p.patternType === "escalation_trajectory_pattern" &&
        p.trajectory === "increasing",
    ),
    governanceDegradation: ranked.filter(
      (p) => p.patternType === "governance_degradation_pattern",
    ),
    unresolvedAmbiguity: ranked.filter(
      (p) => p.patternType === "ambiguity_accumulation_pattern",
    ),
    evidenceSummaries: ranked.slice(0, 8).map((p) => ({
      patternId: p.id,
      patternType: p.patternType,
      topExcerpts: p.evidenceReferences.slice(0, 3).map((e) => e.excerpt.slice(0, 200)),
    })),
    patternCount: scopedPatterns.length,
    readinessSignal,
    adaptiveOperationalContext: getAdaptiveOperationalContext(scopedPatterns),
  };
}

/**
 * Returns the top operational patterns for a workspace/project,
 * ranked by operational significance.
 */
export function getTopOperationalPatterns(
  _context: PatternLearningContext,
  patterns: VaultLearnedPattern[],
  options: {
    limit?: number;
    onlyActive?: boolean;
    patternTypes?: LearnedPatternType[];
  } = {},
): VaultLearnedPattern[] {
  const { limit = 10, onlyActive = true, patternTypes } = options;

  let filtered = patterns.filter(
    (p) =>
      p.workspaceId === _context.workspaceId &&
      (p.projectId ?? "") === (_context.projectId ?? ""),
  );

  if (onlyActive) {
    filtered = filtered.filter((p) => !["resolved", "stale"].includes(p.status));
  }

  if (patternTypes && patternTypes.length > 0) {
    filtered = filtered.filter((p) => patternTypes.includes(p.patternType));
  }

  const severityRank: Record<string, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };

  return filtered
    .sort((a, b) => {
      const scoreA = severityRank[a.severity] * a.confidence * a.recurrenceCount;
      const scoreB = severityRank[b.severity] * b.confidence * b.recurrenceCount;
      return scoreB - scoreA;
    })
    .slice(0, limit);
}

/**
 * Analyzes all nutrients across all workspaces/projects in a batch.
 * Returns patterns grouped by workspace+project scope.
 *
 * NOTE: This function strictly enforces workspace isolation — patterns
 * are never derived from nutrients across different workspaceIds.
 */
export function learnPatternsForProject(
  workspaceId: string,
  projectId: string | null,
  nutrients: VaultNutrient[],
  residue: VaultSemanticResidue[],
): PatternLearningResult {
  // Strict workspace+project scoping — never mix nutrients across workspaces
  const scopedNutrients = nutrients.filter(
    (n) =>
      n.workspaceId === workspaceId &&
      (n.projectId ?? null) === projectId,
  );
  const scopedResidue = residue.filter(
    (r) =>
      r.workspaceId === workspaceId &&
      (r.projectId ?? null) === projectId,
  );

  const patterns = buildPatternsFromNutrients(scopedNutrients, scopedResidue);

  return {
    workspaceId,
    projectId,
    patternsDetected: patterns,
    patternsPromoted: patterns.length,
    patternsUpdated: 0,
    nutrientsAnalyzed: scopedNutrients.length,
    residueAnalyzed: scopedResidue.length,
    learnedAt: nowIso(),
    detectionMethod: "rule_based",
  };
}
