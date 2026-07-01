import type { AcceptanceReadinessSignal, QualityBaseline, QualityGovernanceSeverity, QualitySnapshot } from './quality-governance-types';

const severityFromReadiness = (score: number): QualityGovernanceSeverity => {
  if (score >= 85) return 'healthy';
  if (score >= 70) return 'watch';
  if (score >= 50) return 'elevated';
  return 'critical';
};

export function evaluateAcceptanceReadiness(baseline: QualityBaseline, snapshot: QualitySnapshot): AcceptanceReadinessSignal {
  const criteriaCompletionScore = Math.max(0, Math.min(100, (snapshot.completedAcceptanceCriteria / Math.max(1, baseline.plannedAcceptanceCriteria)) * 100));
  const evidenceCompletenessScore = Math.max(0, Math.min(100, snapshot.acceptanceEvidenceCompleteness));
  const validationCycleSuccessScore = Math.max(0, Math.min(100, 100 - snapshot.failedValidationCycles * 14));
  const regressionClosureScore = Math.max(0, Math.min(100, 100 - snapshot.unresolvedRegressionCount * 10));

  const readinessScore = Math.round(
    criteriaCompletionScore * 0.35 + evidenceCompletenessScore * 0.25 + validationCycleSuccessScore * 0.2 + regressionClosureScore * 0.2,
  );

  return {
    readinessScore,
    criteriaCompletionScore: Math.round(criteriaCompletionScore),
    evidenceCompletenessScore: Math.round(evidenceCompletenessScore),
    validationCycleSuccessScore: Math.round(validationCycleSuccessScore),
    regressionClosureScore: Math.round(regressionClosureScore),
    blockedAcceptanceDetected: criteriaCompletionScore < 80 || regressionClosureScore < 70,
    evidenceInsufficiencyDetected: evidenceCompletenessScore < baseline.approvedQualityThreshold,
    validationIncompletenessDetected: validationCycleSuccessScore < 75 || snapshot.validationCoverage < baseline.plannedValidationCoverage * 0.85,
    severity: severityFromReadiness(readinessScore),
  };
}
