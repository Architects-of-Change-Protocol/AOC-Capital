import type {
  AcceptanceReadinessSignal,
  BaselineQualityDriftSignal,
  DefectPressureSignal,
  QualityIntervention,
  TechnicalDebtSignal,
  ValidationConfidenceSignal,
} from './quality-governance-types';

export function prioritizeQualityInterventions(input: {
  baseline: BaselineQualityDriftSignal;
  defectPressure: DefectPressureSignal;
  acceptanceReadiness: AcceptanceReadinessSignal;
  technicalDebt: TechnicalDebtSignal;
  validationConfidence: ValidationConfidenceSignal;
}): QualityIntervention[] {
  const interventions: QualityIntervention[] = [];

  if (input.baseline.severity === 'critical' || input.validationConfidence.severity === 'critical') {
    interventions.push({ recommendation: 'OPEN_QUALITY_ESCALATION', priority: 1, urgencyScore: 94, rationale: 'Critical quality drift or confidence failure threatens release integrity.', recommendedWindowHours: 4 });
  }
  if (input.defectPressure.severity === 'critical' || input.defectPressure.runawayDefectGenerationDetected) {
    interventions.push({ recommendation: 'FORCE_DEFECT_REMEDIATION', priority: 2, urgencyScore: 90, rationale: 'Defect pressure indicates runaway quality regression risk.', recommendedWindowHours: 6 });
  }
  if (input.validationConfidence.confidenceScore < 70 || input.baseline.validationErosionDetected) {
    interventions.push({ recommendation: 'TRIGGER_VALIDATION_SWEEP', priority: 3, urgencyScore: 82, rationale: 'Validation confidence erosion requires deterministic sweep and replay.', recommendedWindowHours: 12 });
  }
  if (input.acceptanceReadiness.blockedAcceptanceDetected || input.acceptanceReadiness.severity === 'critical') {
    interventions.push({ recommendation: 'BLOCK_ACCEPTANCE_PROMOTION', priority: 4, urgencyScore: 78, rationale: 'Acceptance gates are not satisfied for deterministic promotion.', recommendedWindowHours: 12 });
  }
  if (input.technicalDebt.severity === 'critical' || input.technicalDebt.structuralDegradationDetected) {
    interventions.push({ recommendation: 'SURFACE_TECH_DEBT_REBASELINE', priority: 5, urgencyScore: 72, rationale: 'Debt accumulation has exceeded maintainable runtime boundaries.', recommendedWindowHours: 24 });
  }
  if (input.baseline.severity !== 'healthy' || input.defectPressure.severity !== 'healthy' || input.acceptanceReadiness.severity !== 'healthy') {
    interventions.push({ recommendation: 'PROTECT_RELEASE_QUALITY', priority: 6, urgencyScore: 66, rationale: 'Quality posture requires tightened release protection controls.', recommendedWindowHours: 24 });
  }

  return interventions.sort((a, b) => b.urgencyScore - a.urgencyScore || a.priority - b.priority || a.recommendation.localeCompare(b.recommendation));
}
