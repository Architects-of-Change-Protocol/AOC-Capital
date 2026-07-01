import type { QualityBaseline, QualityGovernanceSeverity, QualitySnapshot, TechnicalDebtSignal } from './quality-governance-types';

const severityFromDebt = (score: number): QualityGovernanceSeverity => {
  if (score < 25) return 'healthy';
  if (score < 45) return 'watch';
  if (score < 70) return 'elevated';
  return 'critical';
};

export function evaluateTechnicalDebt(baseline: QualityBaseline, snapshot: QualitySnapshot): TechnicalDebtSignal {
  const debtAccumulationRatio = Number((snapshot.technicalDebtRatio / Math.max(0.01, baseline.targetTechnicalDebtRatio)).toFixed(3));
  const volatilityCoupling = Number((snapshot.codeVolatility * snapshot.technicalDebtRatio).toFixed(3));
  const deferredRemediationExposure = Number((snapshot.unresolvedRegressionCount * 0.6 + snapshot.failedValidationCycles * 0.8 + snapshot.openCriticalDefects * 0.9).toFixed(2));

  const debtRiskScore = Number(
    Math.min(100, (Math.max(0, debtAccumulationRatio - 1) * 45 + volatilityCoupling * 22 + deferredRemediationExposure * 6)).toFixed(2),
  );

  return {
    debtAccumulationRatio,
    volatilityCoupling,
    deferredRemediationExposure,
    structuralDegradationDetected: debtAccumulationRatio >= 1.25,
    compoundingInstabilityDetected: volatilityCoupling >= 0.6,
    maintainabilityErosionDetected: deferredRemediationExposure >= 6,
    severity: severityFromDebt(debtRiskScore),
    debtRiskScore,
  };
}
