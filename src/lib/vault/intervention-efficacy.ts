import { retrieveInterventionHistory, type OperationalInterventionRecord } from "@/lib/vault/intervention-memory";

const MAX_EFFICACY_RECORDS = 16;
const MAX_STAKEHOLDER_PROFILES = 10;
const MAX_SUMMARIES = 5;

type OperationalDomain = "delivery" | "risk" | "governance" | "stakeholder" | "financial" | "timeline" | "general";

type InterventionTrustClassification = "trusted" | "stable" | "volatile" | "degrading" | "unreliable";
type StakeholderTrustClassification = "responsive" | "stable" | "volatile" | "unresponsive";

export type InterventionEfficacyRecord = {
  interventionType: string;
  operationalDomain: OperationalDomain;
  totalInterventions: number;
  successfulInterventions: number;
  failedInterventions: number;
  ignoredInterventions: number;
  escalatedInterventions: number;
  partiallyResolvedInterventions: number;
  averageFreshness: number;
  successRate: number;
  failureRate: number;
  escalationInstability: number;
  recoveryStability: number;
  operationalConfidence: number;
  trustClassification: InterventionTrustClassification;
  scoringWindowDays: number;
  evaluatedAt: string;
};

export type StakeholderResponsivenessProfile = {
  stakeholder: string;
  totalInterventions: number;
  acceptedCount: number;
  ignoredCount: number;
  resolvedCount: number;
  escalationCount: number;
  responsivenessScore: number;
  coordinationReliability: number;
  escalationVolatility: number;
  trustClassification: StakeholderTrustClassification;
  evaluatedAt: string;
};

export type OperationalConfidenceProfile = {
  workspaceId: string;
  projectId: string | null;
  operationalConfidence: number;
  interventionReliability: number;
  stakeholderResponsiveness: number;
  escalationInstability: number;
  recoveryStability: number;
  operationalTrust: "high" | "moderate" | "fragile" | "degrading";
  generatedAt: string;
};

const round = (n: number, d = 4) => Number(n.toFixed(d));
const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));

export function computeInterventionSuccessRate(input: { total: number; resolved: number; partiallyResolved?: number }): number {
  if (input.total <= 0) return 0;
  return round((input.resolved + (input.partiallyResolved ?? 0) * 0.5) / input.total);
}

export function computeInterventionFailureRate(input: { total: number; failed: number; ignored: number }): number {
  if (input.total <= 0) return 0;
  return round((input.failed + input.ignored) / input.total);
}

export function computeEscalationInstability(input: { total: number; escalated: number; failedEscalations: number; ignoredEscalations: number; repeatedEscalationChains: number }): number {
  if (input.total <= 0) return 0;
  const escalationRate = input.escalated / input.total;
  const failedRate = input.failedEscalations / Math.max(1, input.escalated);
  const ignoredRate = input.ignoredEscalations / Math.max(1, input.escalated);
  const repeatedRate = input.repeatedEscalationChains / Math.max(1, input.total);
  return clamp(Math.round((escalationRate * 40 + failedRate * 30 + ignoredRate * 20 + repeatedRate * 10) * 100));
}

export function computeRecoveryStability(input: { total: number; resolved: number; partiallyResolved: number; avgFreshness: number; dependencyRecoverySuccesses: number; timelineRecoverySuccesses: number }): number {
  if (input.total <= 0) return 0;
  const weightedRecovery = (input.resolved + input.partiallyResolved * 0.5) / input.total;
  const freshnessFactor = clamp(input.avgFreshness, 0, 100) / 100;
  const dependencyFactor = input.dependencyRecoverySuccesses / Math.max(1, input.total);
  const timelineFactor = input.timelineRecoverySuccesses / Math.max(1, input.total);
  return clamp(Math.round((weightedRecovery * 50 + freshnessFactor * 20 + dependencyFactor * 15 + timelineFactor * 15) * 100));
}

export function computeOperationalConfidence(input: { successRate: number; failureRate: number; escalationInstability: number; recoveryStability: number; freshness: number; recurrencePenalty: number }): number {
  const score =
    input.successRate * 45 -
    input.failureRate * 30 +
    (input.recoveryStability / 100) * 20 -
    (input.escalationInstability / 100) * 20 +
    (clamp(input.freshness, 0, 100) / 100) * 10 -
    Math.max(0, input.recurrencePenalty) * 5;
  return clamp(Math.round(score));
}

export function classifyOperationalTrust(confidence: number): InterventionTrustClassification {
  if (confidence >= 85) return "trusted";
  if (confidence >= 70) return "stable";
  if (confidence >= 50) return "volatile";
  if (confidence >= 30) return "degrading";
  return "unreliable";
}

const stakeholderTrust = (score: number): StakeholderTrustClassification => {
  if (score >= 75) return "responsive";
  if (score >= 55) return "stable";
  if (score >= 35) return "volatile";
  return "unresponsive";
};

export async function calculateInterventionEfficacy(request: { workspaceId: string; projectId?: string | null; operationalDomain?: OperationalDomain[]; interventionType?: string[]; scoringWindowDays?: number; recentOnly?: boolean; limit?: number; }): Promise<InterventionEfficacyRecord[]> {
  const nowIso = new Date().toISOString();
  const records = await retrieveInterventionHistory({
    workspaceId: request.workspaceId,
    projectId: request.projectId ?? null,
    operationalDomain: request.operationalDomain,
    recentOnlyDays: request.recentOnly ? request.scoringWindowDays ?? 30 : undefined,
    limit: Math.max(1, Math.min(request.limit ?? 50, 80)),
  });
  const scoped = request.interventionType?.length ? records.filter((r) => request.interventionType?.includes(r.interventionType)) : records;
  const grouped = new Map<string, OperationalInterventionRecord[]>();
  for (const item of scoped) {
    const key = `${item.interventionType}::${item.operationalDomain}`;
    const list = grouped.get(key) ?? [];
    list.push(item);
    grouped.set(key, list);
  }

  return Array.from(grouped.entries()).map(([key, items]) => {
    const [interventionType, operationalDomain] = key.split("::") as [string, OperationalDomain];
    const totalInterventions = items.length;
    const successfulInterventions = items.filter((i) => i.outcomeStatus === "resolved").length;
    const partiallyResolvedInterventions = items.filter((i) => i.outcomeStatus === "partially_resolved").length;
    const failedInterventions = items.filter((i) => i.outcomeStatus === "failed").length;
    const ignoredInterventions = items.filter((i) => i.outcomeStatus === "ignored").length;
    const escalatedInterventions = items.filter((i) => i.outcomeStatus === "escalated").length;
    const failedEscalations = items.filter((i) => i.outcomeStatus === "failed" && i.interventionType === "escalation").length;
    const ignoredEscalations = items.filter((i) => i.outcomeStatus === "ignored" && i.interventionType === "escalation").length;
    const repeatedEscalationChains = Math.max(0, escalatedInterventions - 1);
    const averageFreshness = round(items.reduce((sum, i) => sum + i.freshnessScore, 0) / Math.max(1, totalInterventions), 2);
    const successRate = computeInterventionSuccessRate({ total: totalInterventions, resolved: successfulInterventions, partiallyResolved: partiallyResolvedInterventions });
    const failureRate = computeInterventionFailureRate({ total: totalInterventions, failed: failedInterventions, ignored: ignoredInterventions });
    const escalationInstability = computeEscalationInstability({ total: totalInterventions, escalated: escalatedInterventions, failedEscalations, ignoredEscalations, repeatedEscalationChains });
    const recoveryStability = computeRecoveryStability({ total: totalInterventions, resolved: successfulInterventions, partiallyResolved: partiallyResolvedInterventions, avgFreshness: averageFreshness, dependencyRecoverySuccesses: items.filter((i) => i.interventionType === "dependency_resolution" && i.outcomeStatus === "resolved").length, timelineRecoverySuccesses: items.filter((i) => i.interventionType === "timeline_recovery" && i.outcomeStatus === "resolved").length });
    const operationalConfidence = computeOperationalConfidence({ successRate, failureRate, escalationInstability, recoveryStability, freshness: averageFreshness, recurrencePenalty: ignoredInterventions + Math.max(0, escalatedInterventions - successfulInterventions) });

    return {
      interventionType,
      operationalDomain,
      totalInterventions,
      successfulInterventions,
      failedInterventions,
      ignoredInterventions,
      escalatedInterventions,
      partiallyResolvedInterventions,
      averageFreshness,
      successRate,
      failureRate,
      escalationInstability,
      recoveryStability,
      operationalConfidence,
      trustClassification: classifyOperationalTrust(operationalConfidence),
      scoringWindowDays: request.scoringWindowDays ?? 30,
      evaluatedAt: nowIso,
    };
  }).sort((a, b) => b.operationalConfidence - a.operationalConfidence).slice(0, MAX_EFFICACY_RECORDS);
}

export async function calculateStakeholderResponsiveness(request: { workspaceId: string; projectId?: string | null; scoringWindowDays?: number; limit?: number; }): Promise<StakeholderResponsivenessProfile[]> {
  const nowIso = new Date().toISOString();
  const records = await retrieveInterventionHistory({ workspaceId: request.workspaceId, projectId: request.projectId ?? null, recentOnlyDays: request.scoringWindowDays ?? 30, limit: Math.max(1, Math.min(request.limit ?? 80, 120)) });
  const buckets = new Map<string, OperationalInterventionRecord[]>();
  for (const record of records) {
    const stakeholders = record.targetStakeholders.length ? record.targetStakeholders : ["unattributed"];
    for (const stakeholder of stakeholders) {
      const list = buckets.get(stakeholder) ?? [];
      list.push(record);
      buckets.set(stakeholder, list);
    }
  }

  return Array.from(buckets.entries()).map(([stakeholder, items]) => {
    const totalInterventions = items.length;
    const acceptedCount = items.filter((i) => i.outcomeStatus === "accepted").length;
    const ignoredCount = items.filter((i) => i.outcomeStatus === "ignored").length;
    const resolvedCount = items.filter((i) => i.outcomeStatus === "resolved" || i.outcomeStatus === "partially_resolved").length;
    const escalationCount = items.filter((i) => i.outcomeStatus === "escalated" || i.interventionType === "escalation").length;
    const coordinationReliability = clamp(Math.round(((acceptedCount + resolvedCount) / Math.max(1, totalInterventions)) * 100 - (ignoredCount / Math.max(1, totalInterventions)) * 20));
    const escalationVolatility = clamp(Math.round((escalationCount / Math.max(1, totalInterventions)) * 100));
    const responsivenessScore = clamp(Math.round(coordinationReliability - escalationVolatility * 0.3));
    return {
      stakeholder,
      totalInterventions,
      acceptedCount,
      ignoredCount,
      resolvedCount,
      escalationCount,
      responsivenessScore,
      coordinationReliability,
      escalationVolatility,
      trustClassification: stakeholderTrust(responsivenessScore),
      evaluatedAt: nowIso,
    };
  }).sort((a, b) => b.responsivenessScore - a.responsivenessScore).slice(0, MAX_STAKEHOLDER_PROFILES);
}

export async function buildOperationalConfidenceProfile(request: { workspaceId: string; projectId?: string | null; scoringWindowDays?: number; }): Promise<OperationalConfidenceProfile> {
  const [efficacy, stakeholders] = await Promise.all([
    calculateInterventionEfficacy({ workspaceId: request.workspaceId, projectId: request.projectId ?? null, scoringWindowDays: request.scoringWindowDays ?? 30, recentOnly: true, limit: 80 }),
    calculateStakeholderResponsiveness({ workspaceId: request.workspaceId, projectId: request.projectId ?? null, scoringWindowDays: request.scoringWindowDays ?? 30, limit: 80 }),
  ]);
  const interventionReliability = clamp(Math.round(efficacy.reduce((s, item) => s + item.operationalConfidence, 0) / Math.max(1, efficacy.length)));
  const stakeholderResponsiveness = clamp(Math.round(stakeholders.reduce((s, item) => s + item.responsivenessScore, 0) / Math.max(1, stakeholders.length)));
  const escalationInstability = clamp(Math.round(efficacy.reduce((s, item) => s + item.escalationInstability, 0) / Math.max(1, efficacy.length)));
  const recoveryStability = clamp(Math.round(efficacy.reduce((s, item) => s + item.recoveryStability, 0) / Math.max(1, efficacy.length)));
  const operationalConfidence = clamp(Math.round(interventionReliability * 0.45 + stakeholderResponsiveness * 0.25 + recoveryStability * 0.2 - escalationInstability * 0.1));
  const operationalTrust = operationalConfidence >= 75 ? "high" : operationalConfidence >= 55 ? "moderate" : operationalConfidence >= 35 ? "fragile" : "degrading";

  return { workspaceId: request.workspaceId, projectId: request.projectId ?? null, operationalConfidence, interventionReliability, stakeholderResponsiveness, escalationInstability, recoveryStability, operationalTrust, generatedAt: new Date().toISOString() };
}

export function buildInterventionEfficacySummary(input: { efficacy: InterventionEfficacyRecord[]; stakeholders: StakeholderResponsivenessProfile[]; confidence: OperationalConfidenceProfile; }): string[] {
  const summaries: string[] = [];
  const governanceVolatile = input.efficacy.find((i) => i.operationalDomain === "governance" && i.escalationInstability >= 60);
  if (governanceVolatile) summaries.push("Governance escalations remain operationally volatile.");
  const dependencyStable = input.efficacy.find((i) => i.interventionType === "dependency_resolution" && i.recoveryStability >= 60);
  if (dependencyStable) summaries.push("Dependency interventions show stable recovery behavior.");
  const timelineImproving = input.efficacy.find((i) => i.interventionType === "timeline_recovery" && i.successRate >= 0.6);
  if (timelineImproving) summaries.push("Timeline recovery interventions improve execution stability.");
  if (input.stakeholders.some((s) => s.responsivenessScore < 40)) summaries.push("Stakeholder coordination interventions demonstrate low responsiveness.");
  if (input.efficacy.some((i) => i.ignoredInterventions >= 2 && i.escalationInstability >= 50)) summaries.push("Repeated ignored escalations reduce operational confidence.");
  if (!summaries.length) summaries.push("Intervention outcomes are currently mixed with moderate operational confidence.");
  return summaries.slice(0, MAX_SUMMARIES);
}
