import type { OperationalMemoryScope, OperationalMemoryRecord, OperationalInterventionRecord } from "../runtime-memory-types";

export type CrossDomain = "financial"|"technical"|"stakeholder"|"delivery"|"governance"|"procurement";
export type CrossDomainCorrelationRequest = { scope: OperationalMemoryScope; limit?: number; now?: string };
export type CrossDomainSignal = { id: string; domain: CrossDomain; sourceType: "memory"|"continuity"|"intervention"|"atmosphere"|"escalation"|"nutrient"; severity: number; confidence: number; unresolved: boolean; pressureContribution: number; recurrence: number; stakeholderReferences: string[]; timelineImpact: number; deliveryImpact: number; governanceImpact: number; observedAt: string; summary: string; lineageReference?: string };
export type CrossDomainWeight = { domain: CrossDomain; weight: number; rationale: string };
export type CrossDomainConvergencePattern = { id: string; domains: CrossDomain[]; convergenceScore: number; reinforcingDegradation: boolean; correlatedInstability: boolean; deliveryCollapseTrajectory: boolean; hiddenCausality: string };
export type CorrelatedEscalationChain = { id: string; signalIds: string[]; propagationPath: CrossDomain[]; escalationDensity: number; atmosphereImpact: number };
export type CrossDomainRiskPropagation = { fromDomain: CrossDomain; toDomain: CrossDomain; pressureTransfer: number; causalNarrative: string };
export type CrossDomainCluster = { clusterId: string; label: string; domains: CrossDomain[]; signalIds: string[]; pressureScore: number; convergenceScore: number; escalationTrajectory: "stable"|"degrading"|"critical"; atmosphereImpact: number; operationalNarrative: string };
export type OperationalInstabilityIndicator = { type: string; severity: "low"|"medium"|"high"|"critical"; score: number; rationale: string };
export type CorrelatedPressureSummary = { totalPressure: number; unresolvedSignals: number; recurrenceDensity: number; propagationSeverity: number };
export type CorrelatedAtmosphereSummary = { convergenceDensity: number; propagationSeverity: number; systemicInstability: number; correlatedEscalation: number; operationalFragility: number; recoveryProbability: number; interventionExhaustion: number; governanceErosion: number; deliverySurvivability: number; trajectory: "improving"|"stable"|"degrading"; collapseProbability: number };
export type CorrelationDiagnostic = { summary: string; reasons: string[] };
export type CorrelationLineageGraph = { nodes: Array<{id:string; type:string; domain:CrossDomain; status:string}>; edges: Array<{from:string; to:string; relation:string}> };
export type CorrelatedOperationalNarrative = { narrative: string; signalIds: string[]; explainability: string; causalityChain: string[] };
export type CorrelationConfidenceScore = { overall: number; byDomain: Record<CrossDomain, number> };
export type CrossDomainCorrelationResult = { normalizedSignals: CrossDomainSignal[]; clusters: CrossDomainCluster[]; convergencePatterns: CrossDomainConvergencePattern[]; instabilityIndicators: OperationalInstabilityIndicator[]; pressureSummary: CorrelatedPressureSummary; atmosphere: CorrelatedAtmosphereSummary; propagation: CrossDomainRiskPropagation[]; escalationChains: CorrelatedEscalationChain[]; diagnostics: CorrelationDiagnostic[]; confidence: CorrelationConfidenceScore; lineage: CorrelationLineageGraph; narratives: CorrelatedOperationalNarrative[] };
export type CrossDomainCorrelationContext = { records: OperationalMemoryRecord[]; interventions: OperationalInterventionRecord[]; nowMs: number };
