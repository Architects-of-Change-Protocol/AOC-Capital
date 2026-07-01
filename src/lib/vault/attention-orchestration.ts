import type { AdaptiveOperationalConfidence } from "@/lib/vault/adaptive-confidence";
import type { ContinuitySignal } from "@/lib/vault/continuity-retrieval";
import type { InterventionEfficacyRecord, StakeholderResponsivenessProfile } from "@/lib/vault/intervention-efficacy";
import type { OperationalInterventionRecord } from "@/lib/vault/intervention-memory";
import type { PrioritizedOperationalMemory } from "@/lib/vault/memory-prioritization";

export const MAX_ATTENTION_SIGNALS = 18;
export const MAX_ROUTING_SUMMARIES = 5;
export const MAX_EXECUTIVE_SIGNALS = 4;

type Domain = "delivery" | "risk" | "governance" | "stakeholder" | "financial" | "timeline" | "general";
type AttentionLevel = "critical" | "high" | "moderate" | "background";
type TargetAudience = "executive" | "pm" | "technical_lead" | "stakeholder" | "operations" | "delivery_team" | "background";
type ExecutionContext = "delivery_recovery" | "escalation_management" | "timeline_stabilization" | "dependency_resolution" | "stakeholder_coordination" | "governance_alignment" | "background_monitoring";

export type OperationalAttentionSignal = { signalId: string; operationalDomain: Domain; attentionPriority: number; attentionLevel: AttentionLevel; targetAudience: TargetAudience; executiveVisibility: number; escalationVisibility: number; deliveryAttention: number; stakeholderAttention: number; governanceAttention: number; operationalPressure: number; urgencyWeight: number; confidenceWeight: number; executionContext: ExecutionContext; surfacedAt: string; };
export type OperationalAttentionProfile = { workspaceId: string; projectId: string | null; criticalSignals: number; executiveSignals: number; deliverySignals: number; governanceSignals: number; stakeholderSignals: number; dominantExecutionContext: ExecutionContext; overallOperationalPressure: number; generatedAt: string; };

export type OperationalAttentionInput = {
  workspaceId: string;
  projectId?: string | null;
  prioritizedMemory: PrioritizedOperationalMemory[];
  adaptiveConfidence?: AdaptiveOperationalConfidence | null;
  efficacy: InterventionEfficacyRecord[];
  stakeholders: StakeholderResponsivenessProfile[];
  continuitySignals: ContinuitySignal[];
  interventionHistory: OperationalInterventionRecord[];
};

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

export async function calculateAttentionPriority(input: { unresolvedPressure: number; operationalSalience: number; criticalPathPressure: number; executionInstability: number; volatility: number; recoveryFailure: number; freshnessScore: number; confidenceWeight: number }): Promise<number> {
  return clamp(Math.round(input.unresolvedPressure * 0.18 + input.operationalSalience * 0.22 + input.criticalPathPressure * 0.17 + input.executionInstability * 0.14 + input.volatility * 0.12 + input.recoveryFailure * 0.10 + input.freshnessScore * 0.04 + input.confidenceWeight * 0.03));
}

export async function calculateExecutiveVisibility(input: { governanceInstability: number; timelineRisk: number; financialPressure: number; escalationRecurrence: number; operationalDrift: number; deliveryRecoveryFailure: number; localizedDeliveryNoise: number; strategicRisk: number }): Promise<number> {
  return clamp(Math.round(input.governanceInstability * 0.24 + input.timelineRisk * 0.17 + input.financialPressure * 0.16 + input.escalationRecurrence * 0.15 + input.operationalDrift * 0.14 + input.deliveryRecoveryFailure * 0.10 + (100 - input.localizedDeliveryNoise) * 0.02 + input.strategicRisk * 0.02));
}
export async function calculateEscalationVisibility(input: { unresolvedEscalations: number; interventionFailureRecurrence: number; stakeholderResponsivenessCollapse: number; governanceFriction: number; executionDegradation: number }): Promise<number> { return clamp(Math.round(input.unresolvedEscalations * 0.29 + input.interventionFailureRecurrence * 0.21 + input.stakeholderResponsivenessCollapse * 0.19 + input.governanceFriction * 0.16 + input.executionDegradation * 0.15)); }
export async function calculateDeliveryAttention(input: { unresolvedBlockers: number; dependencyInstability: number; recoveryFailure: number; timelinePressure: number }): Promise<number> { return clamp(Math.round(input.unresolvedBlockers * 0.32 + input.dependencyInstability * 0.26 + input.recoveryFailure * 0.22 + input.timelinePressure * 0.20)); }
export async function calculateStakeholderAttention(input: { coordinationInstability: number; responsivenessDrop: number; escalationRecurrence: number; unresolvedStakeholderDecisions: number }): Promise<number> { return clamp(Math.round(input.coordinationInstability * 0.34 + input.responsivenessDrop * 0.26 + input.escalationRecurrence * 0.20 + input.unresolvedStakeholderDecisions * 0.20)); }
export async function calculateGovernanceAttention(input: { governanceVolatility: number; approvalsBlocked: number; governanceClarityGap: number; leadershipEscalationInvolvement: number; complianceRisk: number }): Promise<number> { return clamp(Math.round(input.governanceVolatility * 0.27 + input.approvalsBlocked * 0.21 + input.governanceClarityGap * 0.20 + input.leadershipEscalationInvolvement * 0.18 + input.complianceRisk * 0.14)); }
export async function calculateOperationalAttentionPressure(input: { escalationRecurrence: number; unresolvedPressure: number; volatility: number; operationalDrift: number; executionInstability: number; stakeholderInstability: number; governanceInstability: number }): Promise<number> { return clamp(Math.round(input.escalationRecurrence * 0.18 + input.unresolvedPressure * 0.20 + input.volatility * 0.14 + input.operationalDrift * 0.14 + input.executionInstability * 0.14 + input.stakeholderInstability * 0.10 + input.governanceInstability * 0.10)); }

export function classifyAttentionLevel(score: number): AttentionLevel { if (score >= 85) return "critical"; if (score >= 70) return "high"; if (score >= 45) return "moderate"; return "background"; }

export function determineAttentionAudience(input: { operationalDomain: Domain; governanceAttention: number; escalationVisibility: number; deliveryAttention: number; stakeholderAttention: number; dependencySeverity: number }): TargetAudience {
  if (input.governanceAttention >= 75 || input.escalationVisibility >= 80) return "executive";
  if (input.operationalDomain === "governance" && input.governanceAttention >= 60) return "pm";
  if (input.operationalDomain === "stakeholder" && input.stakeholderAttention >= 65) return "stakeholder";
  if (input.deliveryAttention >= 70 && input.dependencySeverity >= 65) return "technical_lead";
  if (input.deliveryAttention >= 60) return "delivery_team";
  if (input.stakeholderAttention >= 55 || input.escalationVisibility >= 60) return "pm";
  if (input.operationalDomain === "general") return "operations";
  return "background";
}

function determineExecutionContext(input: { deliveryAttention: number; escalationVisibility: number; governanceAttention: number; stakeholderAttention: number; timelinePressure: number; dependencySeverity: number; attentionLevel: AttentionLevel }): ExecutionContext {
  if (input.attentionLevel === "background") return "background_monitoring";
  if (input.escalationVisibility >= 78) return "escalation_management";
  if (input.deliveryAttention >= 72) return "delivery_recovery";
  if (input.dependencySeverity >= 70) return "dependency_resolution";
  if (input.timelinePressure >= 70) return "timeline_stabilization";
  if (input.stakeholderAttention >= 66) return "stakeholder_coordination";
  if (input.governanceAttention >= 66) return "governance_alignment";
  return "background_monitoring";
}

export function buildAttentionRoutingSummary(signals: OperationalAttentionSignal[]): string[] {
  const summaries: string[] = [];
  if (signals.some((item) => item.executiveVisibility >= 75 && item.governanceAttention >= 65)) summaries.push("Executive visibility elevated due to governance instability.");
  if (signals.some((item) => item.executionContext === "delivery_recovery" || item.deliveryAttention >= 72)) summaries.push("Delivery recovery pressure requires technical coordination.");
  if (signals.some((item) => item.stakeholderAttention >= 65 && item.escalationVisibility >= 60)) summaries.push("Stakeholder escalation visibility remains operationally relevant.");
  if (signals.some((item) => item.executionContext === "timeline_stabilization")) summaries.push("Timeline stabilization pressure increasing across execution chains.");
  if (signals.some((item) => item.attentionLevel === "background")) summaries.push("Localized operational noise downgraded to background monitoring.");
  if (summaries.length === 0) summaries.push("Operational attention remains stable with bounded PM-level visibility.");
  return summaries.slice(0, MAX_ROUTING_SUMMARIES);
}

export async function orchestrateOperationalAttention(input: OperationalAttentionInput): Promise<{ attentionSignals: OperationalAttentionSignal[]; attentionProfile: OperationalAttentionProfile; routingSummaries: string[] }> {
  try {
    const generatedAt = new Date().toISOString();
    const unresolvedEscalations = input.interventionHistory.filter((item) => item.interventionType === "escalation" || item.outcomeStatus === "escalated").length;
    const unresolvedPressure = clamp(Math.round((input.interventionHistory.filter((item) => item.outcomeStatus !== "resolved").length / Math.max(1, input.interventionHistory.length)) * 100));
    const escalationRecurrence = clamp(Math.round((unresolvedEscalations / Math.max(1, input.interventionHistory.length)) * 100));
    const stakeholderResponsiveness = clamp(Math.round(input.stakeholders.reduce((sum, item) => sum + item.responsivenessScore, 0) / Math.max(1, input.stakeholders.length)));
    const stakeholderInstability = clamp(100 - stakeholderResponsiveness);
    const governanceInstability = clamp(Math.round(input.continuitySignals.filter((item) => item.type.includes("governance") || item.type.includes("approval") || item.type.includes("compliance")).length * 20));
    const volatility = clamp(Math.round((input.efficacy.filter((item) => item.trustClassification === "degrading" || item.trustClassification === "unreliable" || item.trustClassification === "volatile").length / Math.max(1, input.efficacy.length)) * 100));
    const operationalDrift = clamp(Math.round(input.adaptiveConfidence?.operationalDrift ?? 55));
    const executionInstability = clamp(Math.round(100 - (input.adaptiveConfidence?.executionStability ?? 55)));
    const confidenceWeight = clamp(Math.round(input.adaptiveConfidence?.operationalConfidence ?? 50));

    const attentionSignals = (await Promise.all(input.prioritizedMemory.slice(0, MAX_ATTENTION_SIGNALS).map(async (item, index) => {
      const deliveryAttention = await calculateDeliveryAttention({ unresolvedBlockers: item.unresolvedPressure, dependencyInstability: item.dependencySeverity, recoveryFailure: executionInstability, timelinePressure: item.timelinePressure });
      const escalationVisibility = await calculateEscalationVisibility({ unresolvedEscalations: escalationRecurrence, interventionFailureRecurrence: volatility, stakeholderResponsivenessCollapse: stakeholderInstability, governanceFriction: governanceInstability, executionDegradation: executionInstability });
      const stakeholderAttention = await calculateStakeholderAttention({ coordinationInstability: stakeholderInstability, responsivenessDrop: stakeholderInstability, escalationRecurrence, unresolvedStakeholderDecisions: item.operationalDomain === "stakeholder" ? item.unresolvedPressure : clamp(Math.round(item.unresolvedPressure * 0.72)) });
      const governanceAttention = await calculateGovernanceAttention({ governanceVolatility: governanceInstability, approvalsBlocked: item.operationalDomain === "governance" ? item.unresolvedPressure : clamp(Math.round(item.unresolvedPressure * 0.58)), governanceClarityGap: operationalDrift, leadershipEscalationInvolvement: escalationRecurrence, complianceRisk: item.operationalDomain === "financial" ? 68 : 42 });
      const executiveVisibility = await calculateExecutiveVisibility({ governanceInstability, timelineRisk: item.timelinePressure, financialPressure: item.operationalDomain === "financial" ? item.priorityScore : clamp(Math.round(item.priorityScore * 0.58)), escalationRecurrence, operationalDrift, deliveryRecoveryFailure: executionInstability, localizedDeliveryNoise: item.operationalDomain === "delivery" ? 72 : 44, strategicRisk: item.operationalDomain === "governance" || item.operationalDomain === "financial" || item.operationalDomain === "timeline" ? 82 : 46 });
      const operationalPressure = await calculateOperationalAttentionPressure({ escalationRecurrence, unresolvedPressure: item.unresolvedPressure, volatility, operationalDrift, executionInstability, stakeholderInstability, governanceInstability });
      const attentionPriority = await calculateAttentionPriority({ unresolvedPressure: item.unresolvedPressure, operationalSalience: item.operationalSalience, criticalPathPressure: item.criticalPathPressure, executionInstability, volatility, recoveryFailure: clamp(Math.round((100 - item.confidenceWeight) * 0.65 + executionInstability * 0.35)), freshnessScore: item.freshnessScore, confidenceWeight });
      const attentionLevel = classifyAttentionLevel(attentionPriority);
      const targetAudience = determineAttentionAudience({ operationalDomain: item.operationalDomain, governanceAttention, escalationVisibility, deliveryAttention, stakeholderAttention, dependencySeverity: item.dependencySeverity });
      const executionContext = determineExecutionContext({ deliveryAttention, escalationVisibility, governanceAttention, stakeholderAttention, timelinePressure: item.timelinePressure, dependencySeverity: item.dependencySeverity, attentionLevel });
      return { signalId: `${item.memoryId}:${index}`, operationalDomain: item.operationalDomain, attentionPriority, attentionLevel, targetAudience, executiveVisibility, escalationVisibility, deliveryAttention, stakeholderAttention, governanceAttention, operationalPressure, urgencyWeight: item.urgencyWeight, confidenceWeight, executionContext, surfacedAt: generatedAt } satisfies OperationalAttentionSignal;
    }))).sort((a, b) => b.attentionPriority - a.attentionPriority || b.operationalPressure - a.operationalPressure).slice(0, MAX_ATTENTION_SIGNALS);

    const routingSummaries = buildAttentionRoutingSummary(attentionSignals);
    const execSignals = attentionSignals.filter((item) => item.targetAudience === "executive" || item.executiveVisibility >= 75).slice(0, MAX_EXECUTIVE_SIGNALS);
    const dominantExecutionContext = (Object.entries(attentionSignals.reduce<Record<ExecutionContext, number>>((acc, item) => { acc[item.executionContext] += item.attentionPriority; return acc; }, { delivery_recovery: 0, escalation_management: 0, timeline_stabilization: 0, dependency_resolution: 0, stakeholder_coordination: 0, governance_alignment: 0, background_monitoring: 0 })).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "background_monitoring") as ExecutionContext;

    return { attentionSignals: [...execSignals, ...attentionSignals.filter((s) => !execSignals.includes(s))].slice(0, MAX_ATTENTION_SIGNALS), routingSummaries, attentionProfile: { workspaceId: input.workspaceId, projectId: input.projectId ?? null, criticalSignals: attentionSignals.filter((item) => item.attentionLevel === "critical").length, executiveSignals: execSignals.length, deliverySignals: attentionSignals.filter((item) => item.executionContext === "delivery_recovery" || item.targetAudience === "delivery_team" || item.targetAudience === "technical_lead").length, governanceSignals: attentionSignals.filter((item) => item.governanceAttention >= 60).length, stakeholderSignals: attentionSignals.filter((item) => item.stakeholderAttention >= 60).length, dominantExecutionContext, overallOperationalPressure: clamp(Math.round(attentionSignals.reduce((sum, item) => sum + item.operationalPressure, 0) / Math.max(1, attentionSignals.length))), generatedAt } };
  } catch (error) {
    console.warn("[vault] operational_attention_orchestration_failed", { workspaceId: input.workspaceId, projectId: input.projectId ?? null, reason: error instanceof Error ? error.message : String(error) });
    const generatedAt = new Date().toISOString();
    return { attentionSignals: [{ signalId: "degraded:operational_attention", operationalDomain: "general", attentionPriority: 40, attentionLevel: "background", targetAudience: "operations", executiveVisibility: 38, escalationVisibility: 42, deliveryAttention: 44, stakeholderAttention: 43, governanceAttention: 39, operationalPressure: 45, urgencyWeight: 40, confidenceWeight: 45, executionContext: "background_monitoring", surfacedAt: generatedAt }], routingSummaries: ["Operational attention orchestration degraded; defaulting to bounded execution-safe routing."], attentionProfile: { workspaceId: input.workspaceId, projectId: input.projectId ?? null, criticalSignals: 0, executiveSignals: 0, deliverySignals: 0, governanceSignals: 0, stakeholderSignals: 0, dominantExecutionContext: "background_monitoring", overallOperationalPressure: 45, generatedAt } };
  }
}
