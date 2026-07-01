/**
 * Vault Learned Pattern Layer — public exports.
 *
 * Consumers should import exclusively from this module, not from
 * individual sub-modules.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type {
  LearnedPatternType,
  PatternStatus,
  PatternTrajectory,
  PatternSeverity,
  PatternPromotionReason,
  LearnedPatternEvidence,
  LearnedPatternSignal,
  PatternRecurrenceProfile,
  VaultLearnedPattern,
  PatternContext,
  PatternLearningResult,
  PatternLearningContext,
} from "./types";

// ─── Learning Service (primary API) ──────────────────────────────────────────

export {
  learnPatternsFromDigestion,
  learnPatternsForProject,
  getLearnedPatternContext,
  getTopOperationalPatterns,
  updatePatternFromNutrients,
  getAdaptiveOperationalContext,
  getAdaptiveSeverity,
  getAdaptiveConfidence,
  computeAdaptiveScoringForPattern,
  explainAdaptivePatternScoring,
} from "./learning-service";

// ─── Scoring ──────────────────────────────────────────────────────────────────

export { computePatternScores, computeRecoveryScores } from "./pattern-scoring";
export type { PatternScores } from "./pattern-scoring";

// ─── Detection Internals (for testing and advanced use) ──────────────────────

export { detectRecurringSignalGroups } from "./recurrence-engine";
export type { SignalGroup, SignalGroupMethod } from "./recurrence-engine";

export { evaluatePromotionRules, detectRecoveryPatternCandidates } from "./promotion-rules";
export type { PromotionCandidate } from "./promotion-rules";

// ─── Persistence ─────────────────────────────────────────────────────────────

export { persistLearnedPatterns } from "./persistence";
export type { VaultPatternPersistenceResult } from "./persistence";


export { computeAdaptiveScoring, explainAdaptiveScoring } from "./adaptive-scoring";
export type { AdaptiveScoringResult, SeverityAdjustmentReason, ConfidenceAdjustmentReason, ContradictionProfile, RecoveryProfile, ConfidenceEvolution, SeverityEvolution } from "./adaptive-scoring";

export { detectInterventionsFromPatterns, learnInterventionEfficacy, learnAndPersistInterventionEfficacy } from "./intervention-learning";
export type { VaultIntervention, InterventionType, InterventionOutcome, InterventionFatigueProfile, InterventionEvidence, InterventionLearningOptions, InterventionLearningResult } from "./intervention-learning";

export { persistInterventions, loadInterventionHistory, loadInterventionsForPattern, loadFatiguedInterventions, getInterventionMemoryContext } from "./intervention-persistence";
export type { InterventionPersistenceResult, InterventionHistoryOptions } from "./intervention-persistence";
