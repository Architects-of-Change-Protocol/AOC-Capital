import type { OperationalMemoryRecord, OperationalMemoryScope, OperationalInterventionRecord } from "../runtime-memory-types";

export type OperationalContinuityRequest = { scope: OperationalMemoryScope; limit?: number; now?: string };
export type ContinuityRetrievalPriority = "highest" | "medium" | "lower";
export type ContinuityRetrievalReason = { code: string; detail: string; weight: number };
export type ContinuityDegradationIndicator = { type: string; severity: "low"|"medium"|"high"|"critical"; summary: string };
export type ContinuityRetrievalCandidate = { record: OperationalMemoryRecord; unresolvedAgeDays: number; recurrenceCount: number; duplicateCount: number; score: number; priority: ContinuityRetrievalPriority; reasons: ContinuityRetrievalReason[] };
export type ContinuityPressureSummary = { unresolvedCount: number; recurringEscalations: number; criticalPathBlockers: number; procurementPressureCount: number; governanceGapCount: number };
export type OperationalAtmosphereScore = { score: number; trajectory: "improving"|"stable"|"degrading"; pressureAccumulation: number; escalationDensity: number; interventionExhaustion: number };
export type ContinuityAtmosphereSummary = OperationalAtmosphereScore & { degradationIndicators: ContinuityDegradationIndicator[] };
export type ContinuityStakeholderSummary = { stakeholder: string; silence: boolean; escalationParticipation: number; unresolvedOwnedCount: number; pressureScore: number };
export type ContinuityInterventionSummary = { memoryRecordId: string; totalAttempts: number; failedAttempts: number; pendingAttempts: number; outcomeTrend: "improving"|"flat"|"degrading" };
export type ContinuityTimelineSegment = { startAt: string; endAt: string; narrative: string; recordIds: string[] };
export type ContinuityLineageGraph = { nodes: Array<{id:string; type:string; status:string}>; edges: Array<{from:string; to:string; relation:string}> };
export type ContinuityRiskCluster = { clusterId: string; label: string; recordIds: string[]; pressureScore: number };
export type ContinuityDiagnosticExplanation = { summary: string; reasons: ContinuityRetrievalReason[] };
export type OperationalContinuitySummary = { prioritizedOperationalRecords: ContinuityRetrievalCandidate[]; unresolvedPressure: ContinuityPressureSummary; atmosphere: ContinuityAtmosphereSummary; stakeholderContinuity: ContinuityStakeholderSummary[]; interventionContinuity: ContinuityInterventionSummary[]; timeline: ContinuityTimelineSegment[]; lineage: ContinuityLineageGraph; riskClusters: ContinuityRiskCluster[]; continuityGaps: string[]; degradationIndicators: ContinuityDegradationIndicator[]; diagnostics: ContinuityDiagnosticExplanation[] };
export type OperationalContinuityContext = { records: OperationalMemoryRecord[]; interventions: OperationalInterventionRecord[]; nowMs: number };
export type OperationalContinuityResult = OperationalContinuitySummary;
