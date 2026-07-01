import { buildContinuityContext, type ContinuitySignal } from "@/lib/vault/continuity-retrieval";
import type { LearnedExecutionPatternResult } from "@/lib/vault/learned-execution-patterns";
import type { InterventionEfficacyRecord, StakeholderResponsivenessProfile } from "@/lib/vault/intervention-efficacy";
import type { OperationalInterventionRecord } from "@/lib/vault/intervention-memory";

export const MAX_ADAPTIVE_SUMMARIES = 5;
export const MAX_CONFIDENCE_HISTORY = 24;
export const MAX_VOLATILITY_SIGNALS = 12;

type ConfidenceTrajectory = "improving" | "stable" | "fragile" | "degrading" | "critical";

export type AdaptiveOperationalConfidence = {
  workspaceId: string;
  projectId: string | null;
  operationalConfidence: number;
  previousConfidence: number;
  confidenceDelta: number;
  confidenceTrajectory: ConfidenceTrajectory;
  executionStability: number;
  escalationVolatility: number;
  stakeholderStability: number;
  interventionReliability: number;
  unresolvedPressure: number;
  continuityScore: number;
  operationalDrift: number;
  volatilityTrend: number;
  recoveryMomentum: number;
  generatedAt: string;
};

export type ConfidenceEvolutionRecord = {
  evaluationTimestamp: string;
  operationalConfidence: number;
  executionStability: number;
  escalationVolatility: number;
  unresolvedPressure: number;
  operationalDrift: number;
  volatilityTrend: number;
  recoveryMomentum: number;
  trajectory: ConfidenceTrajectory;
};

export type BuildAdaptiveOperationalConfidenceInput = {
  workspaceId: string;
  projectId?: string | null;
  previousConfidence?: number;
  interventionHistory: OperationalInterventionRecord[];
  efficacy: InterventionEfficacyRecord[];
  stakeholders: StakeholderResponsivenessProfile[];
  learnedPatterns: LearnedExecutionPatternResult;
  continuitySignals: ContinuitySignal[];
  confidenceHistory?: ConfidenceEvolutionRecord[];
};

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

export async function calculateExecutionStability(input: BuildAdaptiveOperationalConfidenceInput): Promise<number> {
  const total = input.interventionHistory.length;
  if (total === 0) return 50;
  const resolved = input.interventionHistory.filter((item) => item.outcomeStatus === "resolved" || item.outcomeStatus === "partially_resolved").length;
  const unresolved = input.interventionHistory.filter((item) => item.outcomeStatus === "failed" || item.outcomeStatus === "ignored" || item.outcomeStatus === "escalated").length;
  const escalationChains = input.interventionHistory.filter((item) => item.interventionType === "escalation" || item.outcomeStatus === "escalated").length;
  const continuityScore = buildContinuityContext(input.continuitySignals, 8).continuityScore;
  const stakeholderStability = clamp(Math.round(input.stakeholders.reduce((sum, item) => sum + item.coordinationReliability, 0) / Math.max(1, input.stakeholders.length)));
  const recoverySignals = input.interventionHistory.filter((item) => item.interventionType === "dependency_resolution" || item.interventionType === "timeline_recovery").length;

  return clamp(Math.round(
    (resolved / total) * 45 +
    (continuityScore / 100) * 20 +
    ((total - escalationChains) / total) * 12 +
    (stakeholderStability / 100) * 13 +
    (recoverySignals / total) * 10 -
    (unresolved / total) * 18,
  ));
}

export async function calculateOperationalDrift(input: BuildAdaptiveOperationalConfidenceInput): Promise<number> {
  const efficacyMean = clamp(Math.round(input.efficacy.reduce((sum, item) => sum + item.operationalConfidence, 0) / Math.max(1, input.efficacy.length)));
  const unresolvedPressure = clamp(Math.round((input.interventionHistory.filter((item) => item.outcomeStatus === "failed" || item.outcomeStatus === "ignored" || item.outcomeStatus === "escalated").length / Math.max(1, input.interventionHistory.length)) * 100));
  const escalationRecurrence = clamp(Math.round((input.interventionHistory.filter((item) => item.interventionType === "escalation").length / Math.max(1, input.interventionHistory.length)) * 100));
  const patternPressure = clamp(Math.round((input.learnedPatterns.chronicRisks.length + input.learnedPatterns.recurringEscalations.length) * 12));
  const continuityScore = buildContinuityContext(input.continuitySignals, 8).continuityScore;
  const stakeholderInstability = clamp(100 - Math.round(input.stakeholders.reduce((sum, item) => sum + item.responsivenessScore, 0) / Math.max(1, input.stakeholders.length)));
  const recoveryMomentum = computeConfidenceRecovery({ unresolvedPressure, continuityScore, escalationVolatility: escalationRecurrence, stakeholderStability: 100 - stakeholderInstability, interventionReliability: efficacyMean, executionStability: 100 - unresolvedPressure });

  return clamp(Math.round(
    unresolvedPressure * 0.30 +
    escalationRecurrence * 0.20 +
    (100 - efficacyMean) * 0.20 +
    (100 - continuityScore) * 0.12 +
    patternPressure * 0.10 +
    stakeholderInstability * 0.08 -
    recoveryMomentum * 0.10,
  ));
}

export async function calculateVolatilityTrajectory(input: BuildAdaptiveOperationalConfidenceInput): Promise<number> {
  const total = Math.max(1, input.interventionHistory.length);
  const escalationRecurrence = (input.interventionHistory.filter((item) => item.interventionType === "escalation" || item.outcomeStatus === "escalated").length / total) * 100;
  const unresolvedPressure = (input.interventionHistory.filter((item) => item.outcomeStatus === "failed" || item.outcomeStatus === "ignored" || item.outcomeStatus === "escalated").length / total) * 100;
  const stakeholderInstability = 100 - (input.stakeholders.reduce((sum, item) => sum + item.responsivenessScore, 0) / Math.max(1, input.stakeholders.length));
  const failedInterventions = (input.interventionHistory.filter((item) => item.outcomeStatus === "failed").length / total) * 100;
  const continuityDegradation = 100 - buildContinuityContext(input.continuitySignals, 8).continuityScore;
  const deliveryDisruptions = clamp(Math.round(input.learnedPatterns.recurringDependencies.length * 15 + input.learnedPatterns.recurringEscalations.length * 10));

  return clamp(Math.round(escalationRecurrence * 0.26 + unresolvedPressure * 0.22 + stakeholderInstability * 0.14 + deliveryDisruptions * 0.14 + continuityDegradation * 0.12 + failedInterventions * 0.12));
}

export function computeConfidenceAdjustment(input: { executionStability: number; operationalDrift: number; volatilityTrend: number; recoveryMomentum: number; interventionReliability: number; unresolvedPressure: number; continuityScore: number; stakeholderStability: number }): number {
  const positive = input.interventionReliability * 0.24 + input.recoveryMomentum * 0.18 + input.executionStability * 0.20 + (100 - input.unresolvedPressure) * 0.12 + input.continuityScore * 0.14 + input.stakeholderStability * 0.12;
  const negative = input.volatilityTrend * 0.24 + input.operationalDrift * 0.32 + input.unresolvedPressure * 0.20 + (100 - input.stakeholderStability) * 0.14 + (100 - input.interventionReliability) * 0.10;
  return clamp(Math.round((positive - negative) / 18), -12, 8);
}

export function computeConfidenceDecay(input: { unresolvedPressure: number; continuityScore: number; staleEvidenceDays?: number; stagnationIndex?: number }): number {
  const staleFactor = clamp(input.staleEvidenceDays ?? 0, 0, 60) / 60;
  const stagnation = clamp(input.stagnationIndex ?? 0, 0, 100) / 100;
  const baseDecay = input.unresolvedPressure >= 70 ? 2 : 3;
  return clamp(Math.round(baseDecay + staleFactor * 3 + (100 - input.continuityScore) * 0.02 + stagnation * 2), 1, 9);
}

export function computeConfidenceRecovery(input: { unresolvedPressure: number; continuityScore: number; escalationVolatility: number; stakeholderStability: number; interventionReliability: number; executionStability: number }): number {
  const recovery =
    (100 - input.unresolvedPressure) * 0.18 +
    input.continuityScore * 0.20 +
    (100 - input.escalationVolatility) * 0.16 +
    input.stakeholderStability * 0.14 +
    input.interventionReliability * 0.16 +
    input.executionStability * 0.16;
  return clamp(Math.round(recovery * 0.35));
}

export function classifyConfidenceTrajectory(confidence: number): ConfidenceTrajectory {
  if (confidence >= 85) return "improving";
  if (confidence >= 70) return "stable";
  if (confidence >= 50) return "fragile";
  if (confidence >= 30) return "degrading";
  return "critical";
}

export function buildAdaptiveConfidenceSummary(input: AdaptiveOperationalConfidence): string[] {
  const lines: string[] = [];
  lines.push(`confidence trajectory ${input.confidenceTrajectory}`);
  if (input.operationalDrift >= 65) lines.push("operational drift elevated");
  if (input.escalationVolatility >= 60 || input.volatilityTrend >= 60) lines.push("escalation volatility increasing");
  if (input.recoveryMomentum >= 55) lines.push("recovery momentum improving slowly");
  if (input.executionStability < 55) lines.push("execution stability remains fragile under unresolved pressure");
  if (input.continuityScore >= 65) lines.push("continuity persistence is stabilizing delivery confidence");
  return lines.slice(0, MAX_ADAPTIVE_SUMMARIES);
}

export async function calculateConfidenceEvolution(input: BuildAdaptiveOperationalConfidenceInput): Promise<{ adaptive: AdaptiveOperationalConfidence; history: ConfidenceEvolutionRecord[]; summaries: string[] }> {
  const previousConfidence = clamp(Math.round(input.previousConfidence ?? 60));
  const interventionReliability = clamp(Math.round(input.efficacy.reduce((sum, item) => sum + item.operationalConfidence, 0) / Math.max(1, input.efficacy.length)));
  const stakeholderStability = clamp(Math.round(input.stakeholders.reduce((sum, item) => sum + item.coordinationReliability, 0) / Math.max(1, input.stakeholders.length)));
  const unresolvedPressure = clamp(Math.round((input.interventionHistory.filter((item) => item.outcomeStatus === "failed" || item.outcomeStatus === "ignored" || item.outcomeStatus === "escalated").length / Math.max(1, input.interventionHistory.length)) * 100));
  const continuityScore = buildContinuityContext(input.continuitySignals.slice(0, MAX_VOLATILITY_SIGNALS), 8).continuityScore;
  const executionStability = await calculateExecutionStability(input);
  const escalationVolatility = clamp(Math.round(input.efficacy.reduce((sum, item) => sum + item.escalationInstability, 0) / Math.max(1, input.efficacy.length)));
  const volatilityTrend = await calculateVolatilityTrajectory(input);
  const operationalDrift = await calculateOperationalDrift(input);
  const recoveryMomentum = computeConfidenceRecovery({ unresolvedPressure, continuityScore, escalationVolatility, stakeholderStability, interventionReliability, executionStability });
  const adjustment = computeConfidenceAdjustment({ executionStability, operationalDrift, volatilityTrend, recoveryMomentum, interventionReliability, unresolvedPressure, continuityScore, stakeholderStability });
  const decay = computeConfidenceDecay({ unresolvedPressure, continuityScore, staleEvidenceDays: 7, stagnationIndex: input.learnedPatterns.patterns.length * 8 });
  const recovery = clamp(Math.round(recoveryMomentum / 22), 0, 4);
  const operationalConfidence = clamp(Math.round(previousConfidence + adjustment - decay + recovery));
  const confidenceTrajectory = classifyConfidenceTrajectory(operationalConfidence);
  const generatedAt = new Date().toISOString();

  const adaptive: AdaptiveOperationalConfidence = {
    workspaceId: input.workspaceId,
    projectId: input.projectId ?? null,
    operationalConfidence,
    previousConfidence,
    confidenceDelta: clamp(operationalConfidence - previousConfidence, -20, 20),
    confidenceTrajectory,
    executionStability,
    escalationVolatility,
    stakeholderStability,
    interventionReliability,
    unresolvedPressure,
    continuityScore,
    operationalDrift,
    volatilityTrend,
    recoveryMomentum,
    generatedAt,
  };

  const evolution: ConfidenceEvolutionRecord = {
    evaluationTimestamp: generatedAt,
    operationalConfidence,
    executionStability,
    escalationVolatility,
    unresolvedPressure,
    operationalDrift,
    volatilityTrend,
    recoveryMomentum,
    trajectory: confidenceTrajectory,
  };

  const history = [...(input.confidenceHistory ?? []).slice(-(MAX_CONFIDENCE_HISTORY - 1)), evolution];
  const summaries = buildAdaptiveConfidenceSummary(adaptive);
  return { adaptive, history, summaries };
}

export async function buildAdaptiveOperationalConfidence(input: BuildAdaptiveOperationalConfidenceInput): Promise<{ adaptive: AdaptiveOperationalConfidence; history: ConfidenceEvolutionRecord[]; summaries: string[] }> {
  try {
    return await calculateConfidenceEvolution(input);
  } catch (error) {
    console.warn("[vault] adaptive_confidence_failed", {
      workspaceId: input.workspaceId,
      projectId: input.projectId ?? null,
      reason: error instanceof Error ? error.message : String(error),
    });
    const generatedAt = new Date().toISOString();
    const degraded: AdaptiveOperationalConfidence = {
      workspaceId: input.workspaceId,
      projectId: input.projectId ?? null,
      operationalConfidence: 35,
      previousConfidence: clamp(Math.round(input.previousConfidence ?? 50)),
      confidenceDelta: -5,
      confidenceTrajectory: "degrading",
      executionStability: 40,
      escalationVolatility: 60,
      stakeholderStability: 45,
      interventionReliability: 40,
      unresolvedPressure: 65,
      continuityScore: 45,
      operationalDrift: 60,
      volatilityTrend: 62,
      recoveryMomentum: 28,
      generatedAt,
    };
    return {
      adaptive: degraded,
      history: [{ evaluationTimestamp: generatedAt, operationalConfidence: degraded.operationalConfidence, executionStability: degraded.executionStability, escalationVolatility: degraded.escalationVolatility, unresolvedPressure: degraded.unresolvedPressure, operationalDrift: degraded.operationalDrift, volatilityTrend: degraded.volatilityTrend, recoveryMomentum: degraded.recoveryMomentum, trajectory: degraded.confidenceTrajectory }],
      summaries: ["confidence trajectory degrading", "operational drift elevated", "escalation volatility increasing", "recovery momentum improving slowly"].slice(0, MAX_ADAPTIVE_SUMMARIES),
    };
  }
}
