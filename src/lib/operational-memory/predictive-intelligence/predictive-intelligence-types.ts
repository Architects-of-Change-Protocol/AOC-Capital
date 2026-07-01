import type { OperationalMemoryScope } from "../runtime-memory-types";
import type { OperationalContinuityResult } from "../continuity-retrieval/continuity-retrieval-types";
import type { CrossDomainCorrelationResult, CrossDomain } from "../cross-domain-correlation/cross-domain-correlation-types";

export type ForecastTimeframeBand = "immediate"|"short_term"|"medium_term"|"long_term";
export type TrajectoryState = "improving"|"stable"|"degrading"|"critical"|"collapse_risk";
export type ConfidenceLabel = "low"|"medium"|"high"|"very_high";
export type ScenarioType = "no_intervention"|"standard_pm_followup"|"targeted_escalation"|"executive_intervention"|"recovery_plan";
export type InterventionCategory = "stakeholder_follow_up"|"executive_escalation"|"procurement_escalation"|"governance_decision_request"|"technical_recovery_session"|"scope_clarification"|"timeline_rebaseline"|"resource_intervention"|"commercial_escalation";

export type PredictiveOperationalRequest = { scope: OperationalMemoryScope; limit?: number; now?: string };
export type PredictionEvidenceBundle = { evidenceId: string; source: "continuity"|"correlation"|"intervention"|"timeline"|"atmosphere"; reference: string; summary: string; confidence: number; domain?: CrossDomain };
export type PredictionConfidenceScore = { score: number; label: ConfidenceLabel; dampers: string[]; rationale: string[] };
export type ForecastUncertainty = { reasons: string[]; dataGaps: string[]; confidenceDampers: string[]; evidenceNeeded: string[] };
export type OperationalTrajectoryForecast = { domain: CrossDomain|"overall"; state: TrajectoryState; rationale: string[]; confidence: PredictionConfidenceScore; uncertainty: ForecastUncertainty };
export type PredictedOperationalOutcome = { outcomeType: string; severity: "low"|"medium"|"high"|"critical"; confidence: PredictionConfidenceScore; evidence: PredictionEvidenceBundle[]; timeframeBand: ForecastTimeframeBand; reversible: boolean; recommendedInterventionType: InterventionCategory };
export type InterventionImpactEstimate = { intervention: InterventionCategory; expectedPressureReduction: number; expectedRecoveryProbabilityIncrease: number; domainsAffected: Array<CrossDomain|"overall">; requiredUrgency: ForecastTimeframeBand; confidence: PredictionConfidenceScore; evidenceBasis: string[] };
export type OperationalScenarioProjection = { scenario: ScenarioType; expectedTrajectory: TrajectoryState; riskChange: number; recoveryProbabilityChange: number; operationalPressureChange: number; interventionUrgency: ForecastTimeframeBand; confidence: PredictionConfidenceScore; narrative: string };
export type PredictiveRiskCluster = { clusterId: string; type: string; contributingSignals: string[]; projectedTrajectory: TrajectoryState; severity: "low"|"medium"|"high"|"critical"; confidence: PredictionConfidenceScore; suggestedInterventionCategory: InterventionCategory; evidenceReferences: string[] };
export type OperationalTrendSignal = { signal: string; direction: "rising"|"falling"|"flat"; strength: number; evidenceReferences: string[] };
export type PredictiveTrajectoryNarrative = { narrative: string; evidenceReferences: string[]; confidence: PredictionConfidenceScore };
export type PredictiveDiagnostic = { summary: string; reasons: string[] };
export type OperationalForesightSummary = { topRisk: string; interventionWindow: ForecastTimeframeBand; explainability: string };
export type PredictiveOperationalResult = { predictedOutcomes: PredictedOperationalOutcome[]; trajectoryForecasts: OperationalTrajectoryForecast[]; scenarioProjections: OperationalScenarioProjection[]; evidenceBundles: PredictionEvidenceBundle[]; confidenceScores: PredictionConfidenceScore[]; uncertaintyNotes: ForecastUncertainty[]; interventionImpactEstimates: InterventionImpactEstimate[]; riskClusters: PredictiveRiskCluster[]; predictiveNarratives: PredictiveTrajectoryNarrative[]; diagnostics: PredictiveDiagnostic[]; trendSignals: OperationalTrendSignal[]; summary: OperationalForesightSummary };
export type PredictiveOperationalContext = { continuity: OperationalContinuityResult; correlation: CrossDomainCorrelationResult; nowMs: number };
