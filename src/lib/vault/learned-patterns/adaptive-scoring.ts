import type { VaultLearnedPattern, PatternSeverity, PatternTrajectory } from "./types";

export type SeverityAdjustmentReason =
  | "recurrence_increase"
  | "escalation_trajectory_increase"
  | "recovery_absent"
  | "dependency_clustering"
  | "chronic_pattern"
  | "governance_degradation"
  | "recovery_detected"
  | "contradiction_accumulation"
  | "recurrence_stopped"
  | "delivery_stabilized"
  | "fresh_contradictory_evidence"
  | "decay_relevance_drop";

export type ConfidenceAdjustmentReason =
  | "evidence_consistency"
  | "cross_artifact_recurrence"
  | "strong_lineage"
  | "pattern_confirmation"
  | "correlated_signals"
  | "contradictory_evidence"
  | "weak_evidence"
  | "noise_indicator"
  | "decay_dominance";

export type ContradictionProfile = { contradictionCount: number; contradictionRatio: number };
export type RecoveryProfile = { recoveryCount: number; unresolvedDays: number; recoveryPresent: boolean };
export type ConfidenceEvolution = { base: number; adjusted: number; history: number[]; reasons: ConfidenceAdjustmentReason[] };
export type SeverityEvolution = { base: PatternSeverity; adjusted: PatternSeverity; history: PatternSeverity[]; reasons: SeverityAdjustmentReason[] };

export type AdaptiveScoringResult = {
  adaptiveSeverity: PatternSeverity;
  adaptiveConfidence: number;
  operationalUrgency: number;
  relevance: number;
  escalationLikelihood: number;
  confidenceEvolution: ConfidenceEvolution;
  severityEvolution: SeverityEvolution;
  contradictionProfile: ContradictionProfile;
  recoveryProfile: RecoveryProfile;
};

const S_RANK: Record<PatternSeverity, number> = { low: 1, medium: 2, high: 3, critical: 4 };
const rankToSeverity = (r: number): PatternSeverity => (r >= 3.5 ? "critical" : r >= 2.5 ? "high" : r >= 1.5 ? "medium" : "low");

export function computeAdaptiveScoring(pattern: VaultLearnedPattern, peerPatterns: VaultLearnedPattern[]): AdaptiveScoringResult {
  let sevRank = S_RANK[pattern.severity];
  let conf = pattern.confidence;
  const sevReasons: SeverityAdjustmentReason[] = [];
  const confReasons: ConfidenceAdjustmentReason[] = [];

  const contradictions = pattern.evidenceReferences.filter((e) => /resolved|stabilized|completed|responded/i.test(e.excerpt)).length;
  const recoveries = peerPatterns.filter((p) => p.patternType === "recovery_pattern").length;
  const unresolvedDays = Math.max(0, (Date.parse(pattern.lastSeenAt) - Date.parse(pattern.firstSeenAt)) / 86_400_000);

  if (pattern.recurrenceCount >= 4) { sevRank += 0.45; conf += 0.08; sevReasons.push("recurrence_increase"); confReasons.push("cross_artifact_recurrence"); }
  if (pattern.trajectory === "increasing") { sevRank += 0.4; conf += 0.05; sevReasons.push("escalation_trajectory_increase"); confReasons.push("correlated_signals"); }
  if (pattern.status === "chronic") { sevRank += 0.35; conf += 0.05; sevReasons.push("chronic_pattern"); confReasons.push("pattern_confirmation"); }
  if (unresolvedDays > 10 && recoveries === 0) { sevRank += 0.3; sevReasons.push("recovery_absent"); }
  if (pattern.patternType === "governance_degradation_pattern") { sevRank += 0.2; sevReasons.push("governance_degradation"); }
  if (pattern.patternType === "recurring_dependency_pattern" && pattern.recurrenceProfile.distinctArtifacts >= 3) { sevRank += 0.2; sevReasons.push("dependency_clustering"); }

  if (recoveries > 0) { sevRank -= Math.min(0.5, recoveries * 0.18); conf -= 0.06; sevReasons.push("recovery_detected"); confReasons.push("contradictory_evidence"); }
  if (contradictions > 0) { conf -= Math.min(0.24, contradictions * 0.08); sevRank -= 0.2; confReasons.push("contradictory_evidence"); sevReasons.push("contradiction_accumulation"); }
  if (pattern.trajectory === "decreasing" || pattern.trajectory === "recovered") { sevRank -= 0.25; conf -= 0.04; sevReasons.push("delivery_stabilized"); }
  if (pattern.recurrenceProfile.timeSpanDays > 21 && pattern.recurrenceCount < 3) { conf -= 0.05; confReasons.push("decay_dominance"); sevReasons.push("decay_relevance_drop"); }

  if (pattern.evidenceReferences.length >= 3) confReasons.push("strong_lineage");
  confReasons.push("evidence_consistency");

  conf = Math.max(0.05, Math.min(0.99, Math.round(conf * 100) / 100));
  sevRank = Math.max(1, Math.min(4, sevRank));
  const adaptiveSeverity = rankToSeverity(sevRank);
  const operationalUrgency = Math.round(((sevRank / 4) * 0.7 + conf * 0.3) * 100);
  const relevance = Math.round((Math.min(1, (pattern.recurrenceProfile.timeSpanDays + 1) / 30) * 0.4 + conf * 0.6) * 100);
  const escalationLikelihood = Math.round((Math.min(1, pattern.recurrenceCount / 6) * 0.5 + (pattern.trajectory === "increasing" ? 0.35 : 0.1) + (pattern.status === "chronic" ? 0.15 : 0.05)) * 100);

  return {
    adaptiveSeverity,
    adaptiveConfidence: conf,
    operationalUrgency,
    relevance,
    escalationLikelihood: Math.min(100, escalationLikelihood),
    confidenceEvolution: { base: pattern.confidence, adjusted: conf, history: [pattern.confidence, conf], reasons: [...new Set(confReasons)] },
    severityEvolution: { base: pattern.severity, adjusted: adaptiveSeverity, history: [pattern.severity, adaptiveSeverity], reasons: [...new Set(sevReasons)] },
    contradictionProfile: { contradictionCount: contradictions, contradictionRatio: pattern.evidenceReferences.length ? Math.round((contradictions / pattern.evidenceReferences.length) * 100) / 100 : 0 },
    recoveryProfile: { recoveryCount: recoveries, unresolvedDays: Math.round(unresolvedDays), recoveryPresent: recoveries > 0 },
  };
}

export function explainAdaptiveScoring(result: AdaptiveScoringResult): string[] {
  return [
    `Severity ${result.severityEvolution.base} -> ${result.severityEvolution.adjusted} due to ${result.severityEvolution.reasons.join(", ") || "no modifiers"}`,
    `Confidence ${result.confidenceEvolution.base.toFixed(2)} -> ${result.confidenceEvolution.adjusted.toFixed(2)} due to ${result.confidenceEvolution.reasons.join(", ") || "no modifiers"}`,
    `Urgency=${result.operationalUrgency}, Relevance=${result.relevance}, Escalation Likelihood=${result.escalationLikelihood}`,
  ];
}
