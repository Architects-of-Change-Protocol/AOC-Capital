import type { OperationalMemoryScope } from "../runtime-memory-types";

export type EvidenceBoundTelemetry = { evidence: string[]; confidence: number; uncertainty: string[]; causalityRationale: string[]; significanceRationale: string[]; governanceBoundaries: string[] };
export type RealtimeTelemetryRequest = { scope: OperationalMemoryScope; signals: OperationalTelemetrySignal[]; previous?: RealtimeTelemetryResult | null; now?: string };
export type OperationalTelemetrySignal = EvidenceBoundTelemetry & { id: string; at: string; stream: "project"|"escalation"|"stakeholder"|"intervention"|"governance"|"dependency"|"milestone"|"pm_coordination"|"pressure"|"organizational_state"; metric: string; value: number; deltaHint?: number };
export type OperationalTelemetryDelta = EvidenceBoundTelemetry & { metric: string; previous: number; current: number; delta: number; direction: "up"|"down"|"flat"; material: boolean };
export type OperationalDriftSignal = EvidenceBoundTelemetry & { domain: "organizational"|"topology"|"survivability"|"governance"|"escalation"|"pm_overload"|"stabilization"; driftScore: number; trend: "improving"|"worsening"|"stable" };
export type EscalationSaturationTelemetry = EvidenceBoundTelemetry & { congestion: number; fatigue: number; amplification: number; overloadRisk: number };
export type PMOverloadTelemetry = EvidenceBoundTelemetry & { coordinationSaturation: number; interventionLoad: number; recoveryFatigue: number; executionExhaustion: number };
export type SurvivabilityDriftSignal = OperationalDriftSignal & { survivability: number; collapseRisk: number; recoveryViability: number };
export type PropagationExpansionSignal = EvidenceBoundTelemetry & { spreadIndex: number; acceleration: number; hotspots: string[] };
export type StabilizationTelemetry = EvidenceBoundTelemetry & { momentum: number; decay: number; containment: number; trajectory: "accelerating"|"plateauing"|"degrading" };
export type OrganizationalPulseState = EvidenceBoundTelemetry & { atmosphere: "stable"|"pressured"|"degrading"|"critical"|"recovering"; pressureAccumulation: number; degradationVelocity: number; recoveryVelocity: number; survivabilityDirection: "up"|"down"|"flat" };
export type OperationalPressureDelta = EvidenceBoundTelemetry & { pressureDelta: number; source: string };
export type TopologyDriftSignal = OperationalDriftSignal & { bottleneckShifts: string[]; fragilityShift: number };
export type OperationalHeartbeat = EvidenceBoundTelemetry & { timestamp: string; cadenceSeconds: number; signalCount: number };
export type RealtimeOperationalNarrative = EvidenceBoundTelemetry & { narrative: string };
export type RealtimeOperationalAlert = EvidenceBoundTelemetry & { level: "monitor"|"elevated_attention"|"stabilization_risk"|"collapse_risk"|"executive_attention"; title: string; summary: string };
export type RealtimeWarRoomTelemetry = EvidenceBoundTelemetry & { instabilityMovement: number; survivabilityMovement: number; escalationSaturation: number; pmOverload: number; topologyShift: number };
export type TelemetrySuppressionResult = EvidenceBoundTelemetry & { suppressedIds: string[]; retainedIds: string[]; reason: string };
export type TelemetryDiagnostic = EvidenceBoundTelemetry & { topic: string; whyChanged: string[] };
export type RealtimeTelemetryResult = {
  heartbeat: OperationalHeartbeat; deltas: OperationalTelemetryDelta[]; driftSignals: OperationalDriftSignal[]; survivability: SurvivabilityDriftSignal; escalation: EscalationSaturationTelemetry; overload: PMOverloadTelemetry; propagation: PropagationExpansionSignal; stabilization: StabilizationTelemetry; topology: TopologyDriftSignal; pulse: OrganizationalPulseState; warRoom: RealtimeWarRoomTelemetry; narratives: RealtimeOperationalNarrative[]; alerts: RealtimeOperationalAlert[]; diagnostics: TelemetryDiagnostic[]; suppression: TelemetrySuppressionResult;
};
