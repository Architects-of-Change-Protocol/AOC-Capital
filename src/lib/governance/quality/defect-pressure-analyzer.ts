import type { DefectPressureSignal, QualityBaseline, QualityGovernanceSeverity, QualitySnapshot } from './quality-governance-types';

const severityFromScore = (score: number): QualityGovernanceSeverity => {
  if (score < 25) return 'healthy';
  if (score < 45) return 'watch';
  if (score < 70) return 'elevated';
  return 'critical';
};

export function analyzeDefectPressure(baseline: QualityBaseline, snapshot: QualitySnapshot): DefectPressureSignal {
  const defectVelocity = snapshot.escapedDefects + snapshot.openCriticalDefects * 1.8 + snapshot.unresolvedRegressionCount * 1.2;
  const regressionRecurrence = Number((snapshot.unresolvedRegressionCount / Math.max(1, snapshot.completedAcceptanceCriteria)).toFixed(3));
  const defectEscapeAmplification = Number((snapshot.escapedDefects / Math.max(0.1, baseline.targetDefectEscapeRate)).toFixed(3));

  const pressureScore = Number(
    Math.min(100, defectVelocity * 2.2 + regressionRecurrence * 35 + Math.max(0, defectEscapeAmplification - 1) * 30 + snapshot.failedValidationCycles * 4).toFixed(2),
  );

  return {
    defectVelocity: Number(defectVelocity.toFixed(2)),
    regressionRecurrence,
    defectEscapeAmplification,
    runawayDefectGenerationDetected: defectVelocity >= 12,
    hiddenInstabilityDetected: snapshot.failedValidationCycles >= 2 && snapshot.unresolvedRegressionCount >= 3,
    lateStageDefectClusteringDetected: snapshot.openCriticalDefects >= 3 || (snapshot.escapedDefects >= 4 && snapshot.validationCoverage < baseline.plannedValidationCoverage * 0.85),
    severity: severityFromScore(pressureScore),
    pressureScore,
  };
}
