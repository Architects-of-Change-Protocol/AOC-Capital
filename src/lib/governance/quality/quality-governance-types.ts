export type QualityGovernanceSeverity = "healthy" | "watch" | "elevated" | "critical";

export interface QualityBaseline {
  plannedAcceptanceCriteria: number;
  plannedValidationCoverage: number;
  approvedQualityThreshold: number;
  targetDefectEscapeRate: number;
  targetTechnicalDebtRatio: number;
}

export interface QualitySnapshot {
  completedAcceptanceCriteria: number;
  validationCoverage: number;
  escapedDefects: number;
  openCriticalDefects: number;
  unresolvedRegressionCount: number;
  technicalDebtRatio: number;
  codeVolatility: number;
  failedValidationCycles: number;
  confidenceDrift: number;
  acceptanceEvidenceCompleteness: number;
}

export interface BaselineQualityDriftSignal {
  qualityDriftPercentage: number;
  criteriaSlippageDetected: boolean;
  validationErosionDetected: boolean;
  acceptanceDivergenceDetected: boolean;
  severity: QualityGovernanceSeverity;
  rationale: string[];
}

export interface DefectPressureSignal {
  defectVelocity: number;
  regressionRecurrence: number;
  defectEscapeAmplification: number;
  runawayDefectGenerationDetected: boolean;
  hiddenInstabilityDetected: boolean;
  lateStageDefectClusteringDetected: boolean;
  severity: QualityGovernanceSeverity;
  pressureScore: number;
}

export interface AcceptanceReadinessSignal {
  readinessScore: number;
  criteriaCompletionScore: number;
  evidenceCompletenessScore: number;
  validationCycleSuccessScore: number;
  regressionClosureScore: number;
  blockedAcceptanceDetected: boolean;
  evidenceInsufficiencyDetected: boolean;
  validationIncompletenessDetected: boolean;
  severity: QualityGovernanceSeverity;
}

export interface TechnicalDebtSignal {
  debtAccumulationRatio: number;
  volatilityCoupling: number;
  deferredRemediationExposure: number;
  structuralDegradationDetected: boolean;
  compoundingInstabilityDetected: boolean;
  maintainabilityErosionDetected: boolean;
  severity: QualityGovernanceSeverity;
  debtRiskScore: number;
}

export interface ValidationConfidenceSignal {
  confidenceScore: number;
  confidenceDrift: number;
  failedValidationCycles: number;
  severity: QualityGovernanceSeverity;
}

export type QualityInterventionRecommendation =
  | "OPEN_QUALITY_ESCALATION"
  | "TRIGGER_VALIDATION_SWEEP"
  | "BLOCK_ACCEPTANCE_PROMOTION"
  | "FORCE_DEFECT_REMEDIATION"
  | "SURFACE_TECH_DEBT_REBASELINE"
  | "PROTECT_RELEASE_QUALITY";

export interface QualityIntervention {
  recommendation: QualityInterventionRecommendation;
  priority: number;
  urgencyScore: number;
  rationale: string;
  recommendedWindowHours: number;
}

export interface QualityGovernanceAssessment {
  baseline: BaselineQualityDriftSignal;
  defectPressure: DefectPressureSignal;
  acceptanceReadiness: AcceptanceReadinessSignal;
  technicalDebt: TechnicalDebtSignal;
  validationConfidence: ValidationConfidenceSignal;
  overallSeverity: QualityGovernanceSeverity;
  qualityHealthScore: number;
  interventionQueue: QualityIntervention[];
  executiveSummary: string;
}
