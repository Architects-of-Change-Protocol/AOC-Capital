import { evaluateAcceptanceReadiness } from './acceptance-readiness-engine';
import { analyzeDefectPressure } from './defect-pressure-analyzer';
import { evaluateQualityBaseline } from './quality-baseline-evaluator';
import { prioritizeQualityInterventions } from './quality-intervention-prioritizer';
import { evaluateTechnicalDebt } from './technical-debt-evaluator';
import type {
  QualityBaseline,
  QualityGovernanceAssessment,
  QualityGovernanceSeverity,
  QualitySnapshot,
  ValidationConfidenceSignal,
} from './quality-governance-types';

const severityRank: Record<QualityGovernanceSeverity, number> = { healthy: 0, watch: 1, elevated: 2, critical: 3 };
const maxSeverity = (values: QualityGovernanceSeverity[]): QualityGovernanceSeverity =>
  values.reduce((acc, current) => (severityRank[current] > severityRank[acc] ? current : acc), 'healthy');

const evaluateValidationConfidence = (baseline: QualityBaseline, snapshot: QualitySnapshot): ValidationConfidenceSignal => {
  const coverageGap = Math.max(0, baseline.plannedValidationCoverage - snapshot.validationCoverage);
  const confidenceScore = Math.max(
    0,
    Math.min(100, Math.round(100 - coverageGap * 0.7 - snapshot.failedValidationCycles * 10 - snapshot.confidenceDrift * 1.4)),
  );
  const severity: QualityGovernanceSeverity = confidenceScore >= 85 ? 'healthy' : confidenceScore >= 70 ? 'watch' : confidenceScore >= 50 ? 'elevated' : 'critical';

  return { confidenceScore, confidenceDrift: snapshot.confidenceDrift, failedValidationCycles: snapshot.failedValidationCycles, severity };
};

export function createQualityGovernanceAssessment(input: { baseline: QualityBaseline; snapshot: QualitySnapshot }): QualityGovernanceAssessment {
  const baseline = evaluateQualityBaseline(input.baseline, input.snapshot);
  const defectPressure = analyzeDefectPressure(input.baseline, input.snapshot);
  const acceptanceReadiness = evaluateAcceptanceReadiness(input.baseline, input.snapshot);
  const technicalDebt = evaluateTechnicalDebt(input.baseline, input.snapshot);
  const validationConfidence = evaluateValidationConfidence(input.baseline, input.snapshot);

  const overallSeverity = maxSeverity([baseline.severity, defectPressure.severity, acceptanceReadiness.severity, technicalDebt.severity, validationConfidence.severity]);
  const interventionQueue = prioritizeQualityInterventions({ baseline, defectPressure, acceptanceReadiness, technicalDebt, validationConfidence });

  const qualityHealthScore = Math.max(
    0,
    Math.min(100, Math.round(100 - baseline.qualityDriftPercentage * 1.1 - defectPressure.pressureScore * 0.35 - (100 - acceptanceReadiness.readinessScore) * 0.45 - technicalDebt.debtRiskScore * 0.35 - (100 - validationConfidence.confidenceScore) * 0.4)),
  );

  const executiveSummary = `Quality posture is ${overallSeverity}. Drift ${baseline.qualityDriftPercentage.toFixed(1)}%, acceptance readiness ${acceptanceReadiness.readinessScore}, defect pressure ${defectPressure.pressureScore}, technical debt ${technicalDebt.debtRiskScore}.`;

  return { baseline, defectPressure, acceptanceReadiness, technicalDebt, validationConfidence, overallSeverity, qualityHealthScore, interventionQueue, executiveSummary };
}
