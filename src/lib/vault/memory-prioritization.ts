import type { ContinuitySignal } from "@/lib/vault/continuity-retrieval";
import type { LearnedExecutionPatternResult } from "@/lib/vault/learned-execution-patterns";
import type { InterventionEfficacyRecord, StakeholderResponsivenessProfile } from "@/lib/vault/intervention-efficacy";
import type { AdaptiveOperationalConfidence } from "@/lib/vault/adaptive-confidence";
import type { OperationalInterventionRecord } from "@/lib/vault/intervention-memory";

export const MAX_PRIORITIZED_ITEMS = 24;
export const MAX_PRIORITY_SUMMARIES = 6;
export const MAX_CRITICAL_SIGNALS = 5;

type MemoryType = "blocker_signal" | "risk_signal" | "dependency_signal" | "timeline_signal" | "stakeholder_signal" | "escalation_signal" | "decision_signal" | "execution_signal";
type Domain = "delivery" | "risk" | "governance" | "stakeholder" | "financial" | "timeline" | "general";

type CandidateMemory = {
  memoryId: string;
  memoryType: MemoryType;
  operationalDomain: Domain;
  escalationPressure: number;
  freshnessScore: number;
  unresolvedPressure: number;
};

export type PrioritizedOperationalMemory = {
  memoryId: string;
  memoryType: MemoryType;
  operationalDomain: Domain;
  priorityScore: number;
  operationalPriority: "critical" | "high" | "moderate" | "background";
  urgencyWeight: number;
  executionPressure: number;
  criticalPathPressure: number;
  stakeholderPriority: number;
  dependencySeverity: number;
  timelinePressure: number;
  escalationPressure: number;
  operationalSalience: number;
  freshnessScore: number;
  unresolvedPressure: number;
  confidenceWeight: number;
  generatedAt: string;
};

export type OperationalPrioritizationProfile = {
  workspaceId: string;
  projectId: string | null;
  criticalItems: number;
  highPriorityItems: number;
  moderatePriorityItems: number;
  backgroundItems: number;
  dominantOperationalPressure: Domain;
  overallExecutionPressure: number;
  generatedAt: string;
};

export type PrioritizeOperationalMemoryInput = {
  workspaceId: string;
  projectId?: string | null;
  continuitySignals: ContinuitySignal[];
  interventionHistory: OperationalInterventionRecord[];
  adaptiveConfidence?: AdaptiveOperationalConfidence | null;
  learnedPatterns: LearnedExecutionPatternResult;
  efficacy: InterventionEfficacyRecord[];
  stakeholders: StakeholderResponsivenessProfile[];
};

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const daysSince = (timestamp: string | null | undefined) => {
  if (!timestamp) return 45;
  const ms = Date.now() - new Date(timestamp).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 0;
  return Math.floor(ms / (24 * 60 * 60 * 1000));
};

const toMemoryType = (type: string): MemoryType => {
  if (type.includes("blocker")) return "blocker_signal";
  if (type.includes("dependency")) return "dependency_signal";
  if (type.includes("timeline") || type.includes("drift")) return "timeline_signal";
  if (type.includes("stakeholder")) return "stakeholder_signal";
  if (type.includes("escalation")) return "escalation_signal";
  if (type.includes("decision")) return "decision_signal";
  if (type.includes("execution")) return "execution_signal";
  return "risk_signal";
};

const toDomain = (value: string | null | undefined): Domain => {
  const text = (value ?? "general").toLowerCase();
  if (text.includes("delivery") || text.includes("blocker") || text.includes("execution")) return "delivery";
  if (text.includes("risk")) return "risk";
  if (text.includes("governance")) return "governance";
  if (text.includes("stakeholder")) return "stakeholder";
  if (text.includes("financial")) return "financial";
  if (text.includes("timeline") || text.includes("drift")) return "timeline";
  return "general";
};

export async function calculateUrgencyWeight(input: { unresolvedPressure: number; escalationPressure: number; timelinePressure: number; executionPressure: number; freshnessScore: number }): Promise<number> {
  return clamp(Math.round(input.unresolvedPressure * 0.34 + input.escalationPressure * 0.20 + input.timelinePressure * 0.20 + input.executionPressure * 0.18 + input.freshnessScore * 0.08));
}

export async function calculateCriticalPathPressure(input: { unresolvedPressure: number; dependencySeverity: number; timelinePressure: number; escalationPressure: number; memoryType: MemoryType }): Promise<number> {
  const typeBoost = input.memoryType === "blocker_signal" || input.memoryType === "dependency_signal" || input.memoryType === "decision_signal" ? 12 : 0;
  return clamp(Math.round(input.unresolvedPressure * 0.32 + input.dependencySeverity * 0.30 + input.timelinePressure * 0.20 + input.escalationPressure * 0.18 + typeBoost));
}

export async function calculateExecutionPriority(input: { unresolvedPressure: number; adaptiveConfidence?: AdaptiveOperationalConfidence | null; failedInterventionRate: number; patternDrift: number }): Promise<number> {
  const confidenceDrift = input.adaptiveConfidence ? clamp(100 - input.adaptiveConfidence.executionStability) : 50;
  return clamp(Math.round(input.unresolvedPressure * 0.34 + input.failedInterventionRate * 0.22 + input.patternDrift * 0.20 + confidenceDrift * 0.24));
}

export async function calculateStakeholderPriority(input: { stakeholders: StakeholderResponsivenessProfile[]; escalationPressure: number; unresolvedPressure: number }): Promise<number> {
  const responsiveness = clamp(Math.round(input.stakeholders.reduce((sum, item) => sum + item.responsivenessScore, 0) / Math.max(1, input.stakeholders.length)));
  const coordination = clamp(Math.round(input.stakeholders.reduce((sum, item) => sum + item.coordinationReliability, 0) / Math.max(1, input.stakeholders.length)));
  const instability = clamp(Math.round((100 - responsiveness) * 0.56 + (100 - coordination) * 0.44));
  return clamp(Math.round(instability * 0.56 + input.escalationPressure * 0.24 + input.unresolvedPressure * 0.20));
}

export async function calculateTimelinePressure(input: { unresolvedPressure: number; continuitySignals: ContinuitySignal[]; learnedPatterns: LearnedExecutionPatternResult }): Promise<number> {
  const timelineSignals = input.continuitySignals.filter((item) => item.type.includes("timeline") || item.type.includes("drift")).length;
  const deliveryPatterns = input.learnedPatterns.patterns.filter((item) => item.patternType.includes("timeline") || item.patternType.includes("delivery") || item.patternType.includes("dependency")).length;
  return clamp(Math.round(input.unresolvedPressure * 0.42 + clamp(timelineSignals * 18) * 0.30 + clamp(deliveryPatterns * 14) * 0.28));
}

export async function calculateDependencySeverity(input: { unresolvedPressure: number; learnedPatterns: LearnedExecutionPatternResult; interventionHistory: OperationalInterventionRecord[]; escalationPressure: number }): Promise<number> {
  const recurringDependencies = clamp(input.learnedPatterns.recurringDependencies.length * 16);
  const unresolvedDependencyInterventions = clamp(Math.round((input.interventionHistory.filter((item) => item.interventionType === "dependency_resolution" && item.outcomeStatus !== "resolved").length / Math.max(1, input.interventionHistory.length)) * 100));
  return clamp(Math.round(recurringDependencies * 0.42 + unresolvedDependencyInterventions * 0.32 + input.unresolvedPressure * 0.12 + input.escalationPressure * 0.14));
}

export async function calculateOperationalSalience(input: { unresolvedPressure: number; escalationPressure: number; criticalPathPressure: number; executionPressure: number; stakeholderPriority: number; dependencySeverity: number; freshnessScore: number }): Promise<number> {
  return clamp(Math.round(input.unresolvedPressure * 0.24 + input.escalationPressure * 0.16 + input.criticalPathPressure * 0.18 + input.executionPressure * 0.14 + input.stakeholderPriority * 0.10 + input.dependencySeverity * 0.10 + input.freshnessScore * 0.08));
}

export function computeMemoryPriorityScore(input: { urgency: number; salience: number; criticalPathPressure: number; escalationPressure: number; stakeholderPriority: number; dependencySeverity: number; timelinePressure: number; executionPressure: number; freshness: number; confidence: number }): number {
  return clamp(Math.round(input.urgency * 0.19 + input.salience * 0.19 + input.criticalPathPressure * 0.13 + input.escalationPressure * 0.09 + input.stakeholderPriority * 0.08 + input.dependencySeverity * 0.09 + input.timelinePressure * 0.09 + input.executionPressure * 0.08 + input.freshness * 0.03 + input.confidence * 0.03));
}

export function classifyOperationalPriority(score: number): PrioritizedOperationalMemory["operationalPriority"] {
  if (score >= 85) return "critical";
  if (score >= 70) return "high";
  if (score >= 45) return "moderate";
  return "background";
}

export function buildPrioritizedMemorySummary(items: PrioritizedOperationalMemory[]): string[] {
  const summaries: string[] = [];
  const critical = items.filter((item) => item.operationalPriority === "critical").slice(0, MAX_CRITICAL_SIGNALS);
  if (critical.some((item) => item.memoryType === "dependency_signal" || item.dependencySeverity >= 70)) summaries.push("Dependency escalation pressure is operationally dominant.");
  if (critical.some((item) => item.memoryType === "timeline_signal" || item.timelinePressure >= 70)) summaries.push("Timeline recovery blockers require immediate attention.");
  if (critical.some((item) => item.memoryType === "stakeholder_signal" || item.stakeholderPriority >= 70)) summaries.push("Stakeholder coordination instability remains high priority.");
  if (items.some((item) => item.operationalDomain === "governance" && item.operationalPriority !== "background")) summaries.push("Governance volatility remains operationally relevant.");
  if (items.some((item) => item.freshnessScore <= 25 && item.operationalPriority === "background")) summaries.push("Historical escalation chains downgraded to background relevance.");
  if (summaries.length === 0) summaries.push("Operational pressure is moderate and concentrated on active execution continuity.");
  return summaries.slice(0, MAX_PRIORITY_SUMMARIES);
}

export async function prioritizeOperationalMemory(input: PrioritizeOperationalMemoryInput): Promise<{ prioritized: PrioritizedOperationalMemory[]; summaries: string[]; profile: OperationalPrioritizationProfile }> {
  try {
    const now = new Date().toISOString();
    const unresolvedCount = input.interventionHistory.filter((item) => item.outcomeStatus === "failed" || item.outcomeStatus === "ignored" || item.outcomeStatus === "escalated").length;
    const unresolvedPressure = clamp(Math.round((unresolvedCount / Math.max(1, input.interventionHistory.length)) * 100));
    const escalationPressure = clamp(Math.round((input.interventionHistory.filter((item) => item.interventionType === "escalation" || item.outcomeStatus === "escalated").length / Math.max(1, input.interventionHistory.length)) * 100));
    const failedInterventionRate = clamp(Math.round((input.interventionHistory.filter((item) => item.outcomeStatus === "failed").length / Math.max(1, input.interventionHistory.length)) * 100));
    const patternDrift = clamp(Math.round((input.learnedPatterns.chronicRisks.length + input.learnedPatterns.recurringEscalations.length) * 12));
    const timelinePressure = await calculateTimelinePressure({ unresolvedPressure, continuitySignals: input.continuitySignals, learnedPatterns: input.learnedPatterns });
    const dependencySeverity = await calculateDependencySeverity({ unresolvedPressure, learnedPatterns: input.learnedPatterns, interventionHistory: input.interventionHistory, escalationPressure });
    const executionPressure = await calculateExecutionPriority({ unresolvedPressure, adaptiveConfidence: input.adaptiveConfidence, failedInterventionRate, patternDrift });
    const stakeholderPriority = await calculateStakeholderPriority({ stakeholders: input.stakeholders, escalationPressure, unresolvedPressure });

    const candidates: CandidateMemory[] = input.continuitySignals.map((signal, index) => {
      const ds = daysSince(signal.createdAt ?? null);
      return {
        memoryId: signal.nutrientId || `continuity:${index}`,
        memoryType: toMemoryType(signal.type),
        operationalDomain: toDomain(signal.type),
        escalationPressure,
        freshnessScore: clamp(Math.round(100 - ds * 3), 8, 100),
        unresolvedPressure: signal.unresolved ? unresolvedPressure : clamp(unresolvedPressure - 28),
      };
    }).slice(0, MAX_PRIORITIZED_ITEMS);

    const confidenceWeight = clamp(Math.round(input.adaptiveConfidence?.operationalConfidence ?? 50));
    const prioritized = (await Promise.all(candidates.map(async (candidate) => {
      const urgencyWeight = await calculateUrgencyWeight({ unresolvedPressure: candidate.unresolvedPressure, escalationPressure: candidate.escalationPressure, timelinePressure, executionPressure, freshnessScore: candidate.freshnessScore });
      const criticalPathPressure = await calculateCriticalPathPressure({ unresolvedPressure: candidate.unresolvedPressure, dependencySeverity, timelinePressure, escalationPressure: candidate.escalationPressure, memoryType: candidate.memoryType });
      const operationalSalience = await calculateOperationalSalience({ unresolvedPressure: candidate.unresolvedPressure, escalationPressure: candidate.escalationPressure, criticalPathPressure, executionPressure, stakeholderPriority, dependencySeverity, freshnessScore: candidate.freshnessScore });
      const priorityScore = computeMemoryPriorityScore({ urgency: urgencyWeight, salience: operationalSalience, criticalPathPressure, escalationPressure: candidate.escalationPressure, stakeholderPriority, dependencySeverity, timelinePressure, executionPressure, freshness: candidate.freshnessScore, confidence: confidenceWeight });
      return {
        memoryId: candidate.memoryId,
        memoryType: candidate.memoryType,
        operationalDomain: candidate.operationalDomain,
        priorityScore,
        operationalPriority: classifyOperationalPriority(priorityScore),
        urgencyWeight,
        executionPressure,
        criticalPathPressure,
        stakeholderPriority,
        dependencySeverity,
        timelinePressure,
        escalationPressure: candidate.escalationPressure,
        operationalSalience,
        freshnessScore: candidate.freshnessScore,
        unresolvedPressure: candidate.unresolvedPressure,
        confidenceWeight,
        generatedAt: now,
      } satisfies PrioritizedOperationalMemory;
    }))).sort((a, b) => b.priorityScore - a.priorityScore || b.operationalSalience - a.operationalSalience).slice(0, MAX_PRIORITIZED_ITEMS);

    const summaries = buildPrioritizedMemorySummary(prioritized);
    const domainPressure = prioritized.reduce<Record<Domain, number>>((acc, item) => {
      acc[item.operationalDomain] += item.priorityScore;
      return acc;
    }, { delivery: 0, risk: 0, governance: 0, stakeholder: 0, financial: 0, timeline: 0, general: 0 });
    const dominantOperationalPressure = (Object.entries(domainPressure).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "general") as Domain;

    return {
      prioritized,
      summaries,
      profile: {
        workspaceId: input.workspaceId,
        projectId: input.projectId ?? null,
        criticalItems: prioritized.filter((item) => item.operationalPriority === "critical").length,
        highPriorityItems: prioritized.filter((item) => item.operationalPriority === "high").length,
        moderatePriorityItems: prioritized.filter((item) => item.operationalPriority === "moderate").length,
        backgroundItems: prioritized.filter((item) => item.operationalPriority === "background").length,
        dominantOperationalPressure,
        overallExecutionPressure: executionPressure,
        generatedAt: now,
      },
    };
  } catch (error) {
    console.warn("[vault] operational_memory_prioritization_failed", { workspaceId: input.workspaceId, projectId: input.projectId ?? null, reason: error instanceof Error ? error.message : String(error) });
    const generatedAt = new Date().toISOString();
    const degraded: PrioritizedOperationalMemory = { memoryId: "degraded:operational_priority", memoryType: "risk_signal", operationalDomain: "general", priorityScore: 42, operationalPriority: "background", urgencyWeight: 40, executionPressure: 45, criticalPathPressure: 38, stakeholderPriority: 42, dependencySeverity: 40, timelinePressure: 44, escalationPressure: 42, operationalSalience: 41, freshnessScore: 35, unresolvedPressure: 50, confidenceWeight: 45, generatedAt };
    return { prioritized: [degraded], summaries: ["Operational prioritization degraded; defaulting to bounded execution-safe signals."], profile: { workspaceId: input.workspaceId, projectId: input.projectId ?? null, criticalItems: 0, highPriorityItems: 0, moderatePriorityItems: 0, backgroundItems: 1, dominantOperationalPressure: "general", overallExecutionPressure: 45, generatedAt } };
  }
}
