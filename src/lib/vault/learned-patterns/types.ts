/**
 * Core types for the Vault Learned Pattern Layer.
 *
 * This layer detects recurring operational patterns across multiple digestion
 * runs. It is deterministic, evidence-backed, and tenant-scoped. No AI/LLMs
 * are used — all promotion decisions are rule-based and explainable.
 */

import type { VaultNutrientType } from "../digestive/types";
import type { AdaptiveScoringResult } from "./adaptive-scoring";

// ─── Pattern Classification ───────────────────────────────────────────────────

export type LearnedPatternType =
  | "recurring_blocker_pattern"
  | "recurring_dependency_pattern"
  | "financial_friction_pattern"
  | "governance_degradation_pattern"
  | "escalation_trajectory_pattern"
  | "stakeholder_pressure_pattern"
  | "delivery_drift_pattern"
  | "ambiguity_accumulation_pattern"
  | "recovery_pattern"
  | "chronic_risk_pattern";

export type PatternStatus =
  | "emerging"
  | "confirmed"
  | "chronic"
  | "recovering"
  | "resolved"
  | "stale";

export type PatternTrajectory =
  | "increasing"
  | "stable"
  | "decreasing"
  | "intermittent"
  | "recovered"
  | "unknown";

export type PatternSeverity = "low" | "medium" | "high" | "critical";

export type PatternPromotionReason =
  | "repeated_blocker_threshold_met"
  | "repeated_dependency_threshold_met"
  | "financial_friction_threshold_met"
  | "governance_gap_accumulation"
  | "escalation_frequency_threshold"
  | "stakeholder_pressure_accumulation"
  | "delivery_drift_accumulation"
  | "ambiguity_accumulation_threshold"
  | "recovery_after_blockers"
  | "chronic_risk_persistence";

// ─── Evidence & Signals ───────────────────────────────────────────────────────

export type LearnedPatternEvidence = {
  id: string;
  patternId: string;
  workspaceId: string;
  /** Nutrient that contributed to this pattern */
  nutrientId: string | null;
  /** Residue item that contributed (if applicable) */
  residueId: string | null;
  /** Original source artifact */
  sourceArtifactId: string | null;
  /** Short excerpt from the source */
  excerpt: string;
  /** When this evidence was originally created */
  evidenceTimestamp: string;
  /** Why this nutrient/residue contributes to the pattern */
  contributionReason: string;
  createdAt: string;
};

export type LearnedPatternSignal = {
  nutrientId: string;
  nutrientType: VaultNutrientType;
  summary: string;
  artifactId: string | null;
  digestionRunId: string;
  createdAt: string;
  severity: PatternSeverity;
  confidence: number;
};

// ─── Recurrence Profile ───────────────────────────────────────────────────────

export type PatternRecurrenceProfile = {
  /** Total signal occurrences across all contributing nutrients */
  totalOccurrences: number;
  /** Number of distinct source artifacts */
  distinctArtifacts: number;
  /** Number of distinct digestion run IDs */
  distinctDigestionRuns: number;
  /** Time span from first to last signal, in days */
  timeSpanDays: number;
  /** Whether signals span more than one calendar date */
  multiDaySpread: boolean;
};

// ─── Learned Pattern ──────────────────────────────────────────────────────────

export type VaultLearnedPattern = {
  id: string;
  workspaceId: string;
  projectId: string | null;
  patternType: LearnedPatternType;
  title: string;
  summary: string;
  firstSeenAt: string;
  lastSeenAt: string;
  recurrenceCount: number;
  involvedNutrientIds: string[];
  involvedResidueIds: string[];
  evidenceReferences: LearnedPatternEvidence[];
  /** Deterministic confidence score 0..1 */
  confidence: number;
  severity: PatternSeverity;
  trajectory: PatternTrajectory;
  status: PatternStatus;
  promotionReason: PatternPromotionReason;
  recurrenceProfile: PatternRecurrenceProfile;
  createdAt: string;
  updatedAt: string;
  adaptiveScoring?: AdaptiveScoringResult;
};

// ─── Context Object ───────────────────────────────────────────────────────────

export type PatternContext = {
  workspaceId: string;
  projectId: string | null;
  generatedAt: string;
  topActivePatterns: VaultLearnedPattern[];
  chronicRisks: VaultLearnedPattern[];
  recurringBlockers: VaultLearnedPattern[];
  recentRecoveries: VaultLearnedPattern[];
  risingEscalations: VaultLearnedPattern[];
  governanceDegradation: VaultLearnedPattern[];
  unresolvedAmbiguity: VaultLearnedPattern[];
  evidenceSummaries: Array<{
    patternId: string;
    patternType: LearnedPatternType;
    topExcerpts: string[];
  }>;
  patternCount: number;
  readinessSignal: "none" | "emerging" | "active" | "critical";
  adaptiveOperationalContext?: {
    activeChronicRisks: number;
    risingEscalations: number;
    recoveringPatterns: number;
    contradictionAccumulation: number;
    averageAdaptiveConfidence: number;
  };
};

// ─── Learning Result ──────────────────────────────────────────────────────────

export type PatternLearningResult = {
  workspaceId: string;
  projectId: string | null;
  patternsDetected: VaultLearnedPattern[];
  patternsPromoted: number;
  patternsUpdated: number;
  nutrientsAnalyzed: number;
  residueAnalyzed: number;
  learnedAt: string;
  detectionMethod: "rule_based";
};

// ─── Service Context ──────────────────────────────────────────────────────────

export type PatternLearningContext = {
  workspaceId: string;
  projectId: string | null;
  actorUserId: string | null;
};
