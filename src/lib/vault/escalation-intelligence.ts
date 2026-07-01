import type { AdaptiveOperationalConfidence } from "@/lib/vault/adaptive-confidence";
import type { OperationalAttentionSignal } from "@/lib/vault/attention-orchestration";
import type { OperationalCoordinationSignal } from "@/lib/vault/coordination-intelligence";
import type { ContinuitySignal } from "@/lib/vault/continuity-retrieval";
import type { OperationalInterventionRecord } from "@/lib/vault/intervention-memory";
import type { StakeholderResponsivenessProfile } from "@/lib/vault/intervention-efficacy";
import type { LearnedExecutionPatternResult } from "@/lib/vault/learned-execution-patterns";
import type { PrioritizedOperationalMemory } from "@/lib/vault/memory-prioritization";

export const MAX_ESCALATION_SIGNALS = 12;
export const MAX_ESCALATION_SUMMARIES = 5;
export const MAX_ESCALATION_EVIDENCE = 3;

type Domain = "delivery" | "risk" | "governance" | "stakeholder" | "financial" | "timeline" | "general";
type EscalationType = "delivery" | "governance" | "stakeholder" | "technical" | "timeline" | "financial" | "dependency" | "approval";

export type OperationalEscalationSignal = { escalationId: string; escalationType: EscalationType; lifecycleStage: "emerging" | "active" | "stabilizing" | "resolved" | "chronic" | "fatigued"; escalationSeverity: "critical" | "high" | "moderate" | "low"; escalationPressure: number; escalationEffectiveness: number; escalationFatigue: number; governancePressure: number; executionBreakdownRisk: number; recoveryImpact: number; recurrenceCount: number; unresolvedPressure: number; affectedDomains: Domain[]; representativeEvidence: string[]; generatedAt: string; };
export type OperationalEscalationProfile = { workspaceId: string; projectId: string | null; criticalEscalations: number; chronicEscalations: number; fatiguedEscalations: number; dominantEscalationType: EscalationType; overallEscalationHealth: number; escalationVolatility: number; generatedAt: string; };
export type OperationalEscalationInput = { workspaceId: string; projectId?: string | null; continuitySignals: ContinuitySignal[]; learnedPatterns: LearnedExecutionPatternResult; interventionHistory: OperationalInterventionRecord[]; prioritizedMemory: PrioritizedOperationalMemory[]; attentionSignals: OperationalAttentionSignal[]; coordinationSignals: OperationalCoordinationSignal[]; adaptiveConfidence?: AdaptiveOperationalConfidence | null; stakeholders: StakeholderResponsivenessProfile[]; maxSignals?: number; };

const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));
const avg = (vals: number[]) => (vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0);
const norm = (s: string) => (s || "").toLowerCase();

const determineEscalationType = (text: string): EscalationType => {
  if (/approval/.test(text)) return "approval";
  if (/governance|executive|steerco/.test(text)) return "governance";
  if (/dependenc|vendor/.test(text)) return "dependency";
  if (/technical|infra|system/.test(text)) return "technical";
  if (/timeline|delay|drift/.test(text)) return "timeline";
  if (/finance|budget|cost/.test(text)) return "financial";
  if (/stakeholder|sponsor|client/.test(text)) return "stakeholder";
  return "delivery";
};

export async function calculateEscalationPressure(input: { recurrenceCount: number; unresolvedPressure: number; governancePressure: number; failedRecoveries: number; deliveryInstability: number; coordinationPressure: number; }): Promise<number> {
  return clamp(Math.round(input.recurrenceCount * 8 + input.unresolvedPressure * 0.26 + input.governancePressure * 0.22 + input.failedRecoveries * 7 + input.deliveryInstability * 0.22 + input.coordinationPressure * 0.20));
}
export async function calculateEscalationEffectiveness(input: { resolvedEscalations: number; approvalsAccelerated: number; recoverySuccesses: number; executionStability: number; recurrenceCount: number; unresolvedPressure: number; governancePressure: number; stakeholderResponsiveness: number; }): Promise<number> {
  return clamp(Math.round(42 + input.resolvedEscalations * 8 + input.approvalsAccelerated * 5 + input.recoverySuccesses * 6 + input.executionStability * 0.22 - input.recurrenceCount * 6 - input.unresolvedPressure * 0.20 - input.governancePressure * 0.16 - (100 - input.stakeholderResponsiveness) * 0.20));
}
export async function calculateEscalationFatigue(input: { recurrenceCount: number; repeatedDomainPressure: number; repeatedStakeholderPressure: number; unresolvedChains: number; escalationEffectiveness: number; stabilizationMomentum: number; }): Promise<number> {
  return clamp(Math.round(input.recurrenceCount * 9 + input.repeatedDomainPressure * 0.22 + input.repeatedStakeholderPressure * 0.22 + input.unresolvedChains * 7 + (100 - input.escalationEffectiveness) * 0.26 - input.stabilizationMomentum * 0.10));
}
export async function calculateGovernancePressure(input: { delayedApprovals: number; governanceChains: number; executiveVisibilityPressure: number; unresolvedGovernanceBlockers: number; }): Promise<number> {
  return clamp(Math.round(input.delayedApprovals * 12 + input.governanceChains * 10 + input.executiveVisibilityPressure * 0.36 + input.unresolvedGovernanceBlockers * 9));
}
export async function calculateExecutionBreakdownRisk(input: { escalationPressure: number; dependencyRecoveryFailure: number; unresolvedCoordinationBottlenecks: number; operationalDrift: number; executionFlowStability: number; }): Promise<number> {
  return clamp(Math.round(input.escalationPressure * 0.30 + input.dependencyRecoveryFailure * 0.22 + input.unresolvedCoordinationBottlenecks * 0.20 + input.operationalDrift * 0.18 + (100 - input.executionFlowStability) * 0.24));
}
export async function calculateEscalationRecoveryImpact(input: { executionFlowImprovement: number; coordinationStability: number; dependencyPressureReduction: number; recoveryMomentum: number; escalationVolatility: number; escalationFatigue: number; governancePressure: number; }): Promise<number> {
  return clamp(Math.round(38 + input.executionFlowImprovement * 0.24 + input.coordinationStability * 0.18 + input.dependencyPressureReduction * 0.20 + input.recoveryMomentum * 0.18 - input.escalationVolatility * 0.20 - input.escalationFatigue * 0.18 - input.governancePressure * 0.12));
}

export function classifyEscalationSeverity(score: number): OperationalEscalationSignal["escalationSeverity"] { if (score >= 85) return "critical"; if (score >= 70) return "high"; if (score >= 45) return "moderate"; return "low"; }
export function determineEscalationLifecycleStage(input: { recurrenceCount: number; unresolvedPressure: number; escalationEffectiveness: number; recoveryImpact: number; resolved: boolean; }): OperationalEscalationSignal["lifecycleStage"] {
  if (input.resolved) return "resolved";
  if (input.recurrenceCount >= 3 && input.unresolvedPressure >= 65 && input.escalationEffectiveness < 50) return "fatigued";
  if (input.recurrenceCount >= 3 && input.unresolvedPressure >= 60) return "chronic";
  if (input.recoveryImpact >= 60 && input.escalationEffectiveness >= 55) return "stabilizing";
  if (input.unresolvedPressure >= 55) return "active";
  return "emerging";
}

export function buildEscalationIntelligenceSummary(signals: OperationalEscalationSignal[]): string[] {
  const summaries: string[] = [];
  if (signals.some((s) => s.escalationType === "governance" && s.governancePressure >= 65)) summaries.push("Governance escalation pressure is destabilizing delivery recovery.");
  if (signals.some((s) => s.escalationType === "technical" && s.recoveryImpact >= 60)) summaries.push("Technical escalation improved dependency resolution stability.");
  if (signals.some((s) => s.escalationFatigue >= 65 || s.lifecycleStage === "fatigued")) summaries.push("Escalation fatigue is emerging across stakeholder coordination.");
  if (signals.some((s) => s.escalationType === "approval" && s.unresolvedPressure >= 60)) summaries.push("Repeated unresolved approval escalations remain operationally dominant.");
  if (signals.some((s) => s.escalationType === "delivery" && ["chronic", "fatigued"].includes(s.lifecycleStage))) summaries.push("Delivery escalation chains are degrading execution confidence.");
  if (!summaries.length) summaries.push("Escalation lifecycle remains bounded with controlled operational pressure.");
  return summaries.slice(0, MAX_ESCALATION_SUMMARIES);
}

export async function analyzeOperationalEscalation(input: OperationalEscalationInput): Promise<{ signals: OperationalEscalationSignal[]; profile: OperationalEscalationProfile; summaries: string[] }> {
  const generatedAt = new Date().toISOString();
  try {
    const maxSignals = Math.min(MAX_ESCALATION_SIGNALS, input.maxSignals ?? MAX_ESCALATION_SIGNALS);
    const stakeholderResponsiveness = clamp(Math.round(avg(input.stakeholders.map((s) => s.responsivenessScore))));
    const unresolvedContinuity = input.continuitySignals.filter((s) => s.unresolved);
    const failedRecoveries = input.interventionHistory.filter((i) => i.outcomeStatus !== "resolved").length;
    const resolvedEscalations = input.interventionHistory.filter((i) => i.interventionType === "escalation" && i.outcomeStatus === "resolved").length;
    const approvalsAccelerated = input.interventionHistory.filter((i) => /approval/i.test(i.interventionText) && i.outcomeStatus === "resolved").length;
    const governanceChains = input.continuitySignals.filter((s) => /governance|approval|executive/i.test(`${s.type} ${s.evidenceExcerpt}`)).length;
    const delayedApprovals = input.continuitySignals.filter((s) => /approval|decision/i.test(`${s.type} ${s.evidenceExcerpt}`) && /delay|stalled|blocked/i.test(s.evidenceExcerpt)).length;
    const executiveVisibilityPressure = clamp(Math.round(input.attentionSignals.filter((s) => s.targetAudience === "executive").length * 24));
    const unresolvedGovernanceBlockers = input.coordinationSignals.filter((s) => s.coordinationContext === "approval_bottleneck" || s.coordinationContext === "governance_flow").length;
    const governancePressure = await calculateGovernancePressure({ delayedApprovals, governanceChains, executiveVisibilityPressure, unresolvedGovernanceBlockers });
    const coordinationPressure = clamp(Math.round(avg(input.coordinationSignals.map((s) => s.recoveryPressure))));
    const deliveryInstability = clamp(Math.round(100 - avg(input.coordinationSignals.map((s) => s.executionFlowStability))));
    const operationalDrift = clamp(Math.round(avg(input.attentionSignals.map((s) => s.operationalPressure))));
    const executionFlowStability = clamp(Math.round(input.adaptiveConfidence?.executionStability ?? 55));
    const recurrenceByType = new Map<EscalationType, number>();

    const seedEvidence = [
      ...unresolvedContinuity.map((s) => s.evidenceExcerpt),
      ...input.interventionHistory.map((i) => i.interventionText),
      ...input.learnedPatterns.patterns.map((p) => p.explanation),
    ];

    const signals: OperationalEscalationSignal[] = [];
    for (const signal of unresolvedContinuity.slice(0, maxSignals)) {
      const text = norm(`${signal.type} ${signal.evidenceExcerpt}`);
      const escalationType = determineEscalationType(text);
      recurrenceByType.set(escalationType, (recurrenceByType.get(escalationType) ?? 0) + 1);
      const recurrenceCount = recurrenceByType.get(escalationType) ?? 1;
      const unresolvedPressure = clamp(Math.round(45 + recurrenceCount * 10 + (signal.urgency === "critical" ? 20 : signal.urgency === "high" ? 12 : 6)));
      const escalationPressure = await calculateEscalationPressure({ recurrenceCount, unresolvedPressure, governancePressure, failedRecoveries, deliveryInstability, coordinationPressure });
      const escalationEffectiveness = await calculateEscalationEffectiveness({ resolvedEscalations, approvalsAccelerated, recoverySuccesses: resolvedEscalations, executionStability: executionFlowStability, recurrenceCount, unresolvedPressure, governancePressure, stakeholderResponsiveness });
      const escalationFatigue = await calculateEscalationFatigue({ recurrenceCount, repeatedDomainPressure: recurrenceCount * 20, repeatedStakeholderPressure: 100 - stakeholderResponsiveness, unresolvedChains: failedRecoveries, escalationEffectiveness, stabilizationMomentum: input.adaptiveConfidence?.recoveryMomentum ?? 42 });
      const executionBreakdownRisk = await calculateExecutionBreakdownRisk({ escalationPressure, dependencyRecoveryFailure: clamp(Math.round(deliveryInstability * 0.7)), unresolvedCoordinationBottlenecks: coordinationPressure, operationalDrift, executionFlowStability });
      const recoveryImpact = await calculateEscalationRecoveryImpact({ executionFlowImprovement: executionFlowStability, coordinationStability: 100 - coordinationPressure, dependencyPressureReduction: 100 - deliveryInstability, recoveryMomentum: input.adaptiveConfidence?.recoveryMomentum ?? 40, escalationVolatility: Math.abs(escalationPressure - escalationEffectiveness), escalationFatigue, governancePressure });
      const lifecycleStage = determineEscalationLifecycleStage({ recurrenceCount, unresolvedPressure, escalationEffectiveness, recoveryImpact, resolved: false });
      const evidence = seedEvidence.filter((line) => norm(line).includes(escalationType) || norm(line).includes("escalat") || norm(line).includes(signal.type.replaceAll("_", " "))).slice(0, MAX_ESCALATION_EVIDENCE);
      const affectedDomains: Domain[] = escalationType === "governance" || escalationType === "approval" ? ["governance", "delivery"] : escalationType === "stakeholder" ? ["stakeholder", "delivery"] : escalationType === "financial" ? ["financial", "risk"] : escalationType === "timeline" ? ["timeline", "delivery"] : ["delivery", "general"];
      signals.push({ escalationId: `${escalationType}:${signal.nutrientId}`, escalationType, lifecycleStage, escalationSeverity: classifyEscalationSeverity(escalationPressure), escalationPressure, escalationEffectiveness, escalationFatigue, governancePressure, executionBreakdownRisk, recoveryImpact, recurrenceCount, unresolvedPressure, affectedDomains, representativeEvidence: evidence.length ? evidence : [signal.evidenceExcerpt.slice(0, 180)], generatedAt });
    }

    if (!signals.length) {
      signals.push({ escalationId: "background:escalation", escalationType: "delivery", lifecycleStage: "resolved", escalationSeverity: "low", escalationPressure: 28, escalationEffectiveness: 58, escalationFatigue: 24, governancePressure: 32, executionBreakdownRisk: 34, recoveryImpact: 56, recurrenceCount: 0, unresolvedPressure: 20, affectedDomains: ["general"], representativeEvidence: ["no unresolved escalation chain detected; bounded baseline signal emitted"], generatedAt });
    }

    const dominantEscalationType = (Object.entries(signals.reduce<Record<EscalationType, number>>((acc, item) => { acc[item.escalationType] += item.escalationPressure; return acc; }, { delivery: 0, governance: 0, stakeholder: 0, technical: 0, timeline: 0, financial: 0, dependency: 0, approval: 0 })).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "delivery") as EscalationType;
    const profile: OperationalEscalationProfile = {
      workspaceId: input.workspaceId,
      projectId: input.projectId ?? null,
      criticalEscalations: signals.filter((s) => s.escalationSeverity === "critical").length,
      chronicEscalations: signals.filter((s) => s.lifecycleStage === "chronic").length,
      fatiguedEscalations: signals.filter((s) => s.lifecycleStage === "fatigued").length,
      dominantEscalationType,
      overallEscalationHealth: clamp(Math.round(100 - avg(signals.map((s) => s.escalationPressure * 0.4 + s.escalationFatigue * 0.3 + s.executionBreakdownRisk * 0.3)))),
      escalationVolatility: clamp(Math.round(avg(signals.map((s) => Math.abs(s.escalationPressure - s.escalationEffectiveness))))),
      generatedAt,
    };
    return { signals: signals.slice(0, maxSignals), profile, summaries: buildEscalationIntelligenceSummary(signals) };
  } catch (error) {
    console.warn("[vault] operational_escalation_intelligence_failed", { workspaceId: input.workspaceId, projectId: input.projectId ?? null, reason: error instanceof Error ? error.message : String(error) });
    const degraded: OperationalEscalationSignal = { escalationId: "degraded:escalation", escalationType: "delivery", lifecycleStage: "active", escalationSeverity: "moderate", escalationPressure: 52, escalationEffectiveness: 46, escalationFatigue: 50, governancePressure: 48, executionBreakdownRisk: 54, recoveryImpact: 44, recurrenceCount: 1, unresolvedPressure: 52, affectedDomains: ["general"], representativeEvidence: ["escalation analysis degraded; bounded fail-soft fallback engaged"], generatedAt };
    return { signals: [degraded], profile: { workspaceId: input.workspaceId, projectId: input.projectId ?? null, criticalEscalations: 0, chronicEscalations: 0, fatiguedEscalations: 0, dominantEscalationType: "delivery", overallEscalationHealth: 48, escalationVolatility: 16, generatedAt }, summaries: ["Operational escalation intelligence degraded; bounded escalation defaults applied."] };
  }
}
