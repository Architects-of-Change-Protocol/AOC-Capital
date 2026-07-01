import type { BaselineQualityDriftSignal, QualityBaseline, QualityGovernanceSeverity, QualitySnapshot } from './quality-governance-types';

const severityFromDrift = (drift: number): QualityGovernanceSeverity => {
  if (drift < 5) return 'healthy';
  if (drift < 12) return 'watch';
  if (drift < 20) return 'elevated';
  return 'critical';
};

export function evaluateQualityBaseline(baseline: QualityBaseline, snapshot: QualitySnapshot): BaselineQualityDriftSignal {
  const plannedCriteria = Math.max(1, baseline.plannedAcceptanceCriteria);
  const criteriaCompletionRatio = snapshot.completedAcceptanceCriteria / plannedCriteria;
  const criteriaSlippage = Math.max(0, (1 - criteriaCompletionRatio) * 100);

  const plannedCoverage = Math.max(1, baseline.plannedValidationCoverage);
  const validationErosion = Math.max(0, ((plannedCoverage - snapshot.validationCoverage) / plannedCoverage) * 100);

  const evidenceGap = Math.max(0, baseline.approvedQualityThreshold - snapshot.acceptanceEvidenceCompleteness);
  const acceptanceDivergence = Math.max(0, evidenceGap + snapshot.confidenceDrift * 0.5);

  const qualityDriftPercentage = Number((criteriaSlippage * 0.4 + validationErosion * 0.35 + acceptanceDivergence * 0.25).toFixed(2));
  const severity = severityFromDrift(qualityDriftPercentage);

  const rationale: string[] = [];
  if (criteriaSlippage > 0) rationale.push('criteria slippage detected');
  if (validationErosion > 0) rationale.push('validation erosion detected');
  if (acceptanceDivergence > 0) rationale.push('acceptance divergence detected');

  return {
    qualityDriftPercentage,
    criteriaSlippageDetected: criteriaSlippage > 3,
    validationErosionDetected: validationErosion > 3,
    acceptanceDivergenceDetected: acceptanceDivergence > 4,
    severity,
    rationale,
  };
}
