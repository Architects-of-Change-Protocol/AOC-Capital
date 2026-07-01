/**
 * Deterministic scoring for learned patterns.
 *
 * All scoring is rule-based and reproducible. No randomness, no ML.
 * Given the same inputs, the same scores are always produced.
 */

import type { SignalGroup } from "./recurrence-engine";
import type { PatternSeverity, PatternTrajectory } from "./types";

export type PatternScores = {
  /** 0..1 — how strongly the recurrence is established */
  recurrenceStrength: number;
  /** 0..1 — how complete and credible the evidence is */
  evidenceStrength: number;
  /** Overall confidence 0..1 */
  confidence: number;
  severity: PatternSeverity;
  trajectory: PatternTrajectory;
};

// ─── Severity Helpers ─────────────────────────────────────────────────────────

const SEVERITY_RANK: Record<PatternSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

function rankToSeverity(rank: number): PatternSeverity {
  if (rank >= 3.5) return "critical";
  if (rank >= 2.5) return "high";
  if (rank >= 1.5) return "medium";
  return "low";
}

function highestSeverity(severities: PatternSeverity[]): PatternSeverity {
  return severities.reduce(
    (best, s) => (SEVERITY_RANK[s] > SEVERITY_RANK[best] ? s : best),
    "low" as PatternSeverity,
  );
}

function averageSeverity(severities: PatternSeverity[]): PatternSeverity {
  if (severities.length === 0) return "low";
  const avg =
    severities.reduce((sum, s) => sum + SEVERITY_RANK[s], 0) / severities.length;
  return rankToSeverity(avg);
}

// ─── Trajectory (re-exported from promotion-rules for scoring context) ────────

function computeTrajectory(group: SignalGroup): PatternTrajectory {
  const sigs = [...group.signals].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );
  if (sigs.length < 2) return "unknown";

  const mid = Math.ceil(sigs.length / 2);
  const firstHalf = sigs.slice(0, mid);
  const secondHalf = sigs.slice(mid);

  const avgFirst =
    firstHalf.reduce((s, x) => s + (SEVERITY_RANK[x.severity as PatternSeverity] ?? 2), 0) /
    firstHalf.length;
  const avgSecond =
    secondHalf.reduce((s, x) => s + (SEVERITY_RANK[x.severity as PatternSeverity] ?? 2), 0) /
    secondHalf.length;

  if (avgSecond > avgFirst + 0.5) return "increasing";
  if (avgFirst > avgSecond + 0.5) return "decreasing";

  if (sigs.length >= 4) {
    const vals = sigs.map((s) => SEVERITY_RANK[s.severity as PatternSeverity] ?? 2);
    let alts = 0;
    for (let i = 1; i < vals.length; i++) {
      if (Math.abs(vals[i] - vals[i - 1]) >= 1) alts++;
    }
    if (alts >= Math.floor(sigs.length / 2)) return "intermittent";
  }
  return "stable";
}

// ─── Score Computation ────────────────────────────────────────────────────────

/**
 * Computes deterministic scores for a signal group.
 *
 * recurrenceStrength formula:
 *   0.4 × min(1, occurrences/6) + 0.4 × min(1, runs/5) + 0.2 × min(1, timeSpanDays/14)
 *
 * evidenceStrength formula:
 *   0.6 × avg(nutrient_confidence) + 0.4 × min(1, distinctArtifacts/5)
 *
 * confidence = 0.6 × recurrenceStrength + 0.4 × evidenceStrength
 *
 * severity = highest severity across contributing signals (conservative)
 */
export function computePatternScores(group: SignalGroup): PatternScores {
  const { totalOccurrences, distinctArtifacts, distinctDigestionRuns, timeSpanDays } =
    group.recurrenceProfile;

  // recurrenceStrength: how well the recurrence is established
  const occurrencesFactor = Math.min(1, totalOccurrences / 6);
  const runsFactor = Math.min(1, distinctDigestionRuns / 5);
  const timeFactor = Math.min(1, timeSpanDays / 14);
  const recurrenceStrength = 0.4 * occurrencesFactor + 0.4 * runsFactor + 0.2 * timeFactor;

  // evidenceStrength: how credible and diverse the underlying evidence is
  const avgConfidence =
    group.signals.reduce((s, x) => s + x.confidence, 0) / Math.max(1, group.signals.length);
  const artifactDiversityFactor = Math.min(1, distinctArtifacts / 5);
  const evidenceStrength = 0.6 * avgConfidence + 0.4 * artifactDiversityFactor;

  // confidence: combined
  const confidence = Math.round((0.6 * recurrenceStrength + 0.4 * evidenceStrength) * 100) / 100;

  // severity: use highest to be conservative (worst-case reporting)
  const severities = group.signals.map((s) => s.severity as PatternSeverity);
  const severity = highestSeverity(severities);

  const trajectory = computeTrajectory(group);

  return {
    recurrenceStrength: Math.round(recurrenceStrength * 100) / 100,
    evidenceStrength: Math.round(evidenceStrength * 100) / 100,
    confidence,
    severity,
    trajectory,
  };
}

/**
 * Computes scores for a recovery pattern candidate.
 * Uses a simplified model since recovery involves cross-type evidence.
 */
export function computeRecoveryScores(
  recoveryCount: number,
  antecedentCount: number,
  avgRecoveryConfidence: number,
): PatternScores {
  const recurrenceStrength = Math.min(1, recoveryCount / 3);
  const evidenceStrength = Math.min(1, (avgRecoveryConfidence + Math.min(1, antecedentCount / 4)) / 2);
  const confidence = Math.round((0.6 * recurrenceStrength + 0.4 * evidenceStrength) * 100) / 100;
  return {
    recurrenceStrength: Math.round(recurrenceStrength * 100) / 100,
    evidenceStrength: Math.round(evidenceStrength * 100) / 100,
    confidence,
    severity: "low",
    trajectory: "decreasing",
  };
}
