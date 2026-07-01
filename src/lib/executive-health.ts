import type { OperationalMemoryRecord } from "@/lib/operational-memory";
import { detectOperationalContradictions } from "@/lib/cross-signal-reasoning";

export type EscalationLevel = "low" | "medium" | "high" | "critical";

export type ProjectHealthScore = {
  overall: number;
  completion: number;
  confidence: number;
  governanceCompleteness: number;
  stakeholderSupport: number;
  deliveryConfidence: number;
  riskDensity: number;
  pmFatigue: number;
};

export type OperationalCoherenceScore = {
  overall: number;
  conflictingSignals: number;
  missingTraceability: number;
  incompleteDomains: number;
  staleMemory: number;
  contradictionCount: number;
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const avg = (items: number[]) => (items.length ? items.reduce((a, b) => a + b, 0) / items.length : 0);

export function computeProjectHealth(records: OperationalMemoryRecord[]): ProjectHealthScore {
  const completion = avg(records.map((r) => r.completionScore));
  const confidence = avg(records.map((r) => r.confidenceScore));
  const governanceRecords = records.filter((r) => r.domain === "pmo_governance");
  const governanceCompleteness = governanceRecords.length ? avg(governanceRecords.map((r) => r.completionScore)) : 0;

  const stakeholder = records.filter((r) => r.domain === "stakeholder_intelligence");
  const stakeholderSupport = 100 - avg(stakeholder.map((r) => Math.min(100, r.missingFields.length * 9)));

  const delivery = records.filter((r) => r.domain === "delivery_intelligence");
  const deliveryConfidence = delivery.length ? avg(delivery.map((r) => r.confidenceScore)) : 0;

  const risk = records.filter((r) => r.domain === "risk_intelligence");
  const riskDensity = clamp(risk.length * 15 + avg(risk.map((r) => r.missingFields.length * 3)));

  const teamHealth = records.filter((r) => r.domain === "team_health");
  const pmFatigue = clamp(avg(teamHealth.map((r) => r.missingFields.length * 8 + (100 - r.confidenceScore) * 0.5)));

  const overall = clamp(
    completion * 0.24 +
      confidence * 0.2 +
      governanceCompleteness * 0.14 +
      stakeholderSupport * 0.12 +
      deliveryConfidence * 0.14 +
      (100 - riskDensity) * 0.1 +
      (100 - pmFatigue) * 0.06,
  );

  return { overall, completion: clamp(completion), confidence: clamp(confidence), governanceCompleteness: clamp(governanceCompleteness), stakeholderSupport: clamp(stakeholderSupport), deliveryConfidence: clamp(deliveryConfidence), riskDensity, pmFatigue };
}

export function computeOperationalCoherence(records: OperationalMemoryRecord[]): OperationalCoherenceScore {
  const now = Date.now();
  const staleCount = records.filter((record) => now - Date.parse(record.updatedAt) > 1000 * 60 * 60 * 24 * 5).length;
  const missingTraceability = records.filter((record) => record.sourceTrace.length === 0).length;
  const conflictingSignals = records.filter((record) => record.confidenceScore < 45 && record.completionScore > 75).length;
  const incompleteDomains = records.filter((record) => record.completionScore < 40).length;

  // Operational contradictions: cross-domain narrative incoherence reduces overall confidence.
  // Contradictions are qualitatively different from signal gaps — they indicate the system is
  // reasoning over internally inconsistent data, which makes executive conclusions less trustworthy.
  const contradictions = detectOperationalContradictions(records);
  const contradictionCount = contradictions.length;
  const contradictionPenalty = contradictions.reduce((sum, c) => sum + c.confidencePenalty, 0);

  const penalties = clamp(staleCount * 10 + missingTraceability * 15 + conflictingSignals * 8 + incompleteDomains * 10 + contradictionPenalty);
  return {
    overall: clamp(100 - penalties),
    conflictingSignals,
    missingTraceability,
    incompleteDomains,
    staleMemory: staleCount,
    contradictionCount,
  };
}

export function computeEscalationLevel(input: {
  health: ProjectHealthScore;
  coherence: OperationalCoherenceScore;
  hasGovernanceGap: boolean;
  stakeholderPressure: number;
  deliveryRisk: number;
  compoundSeverityBoost?: number;
}): EscalationLevel {
  // Contradictions increase escalation probability: incoherent operational narratives are
  // themselves a governance concern that warrants elevated executive caution.
  const contradictionBoost = input.coherence.contradictionCount * 8;
  const probability = clamp(
    (100 - input.health.overall) * 0.35 +
    (100 - input.coherence.overall) * 0.2 +
    input.stakeholderPressure * 0.2 +
    input.deliveryRisk * 0.2 +
    (input.hasGovernanceGap ? 12 : 0) +
    contradictionBoost +
    (input.compoundSeverityBoost ?? 0),
  );
  if (probability >= 85) return "critical";
  if (probability >= 65) return "high";
  if (probability >= 40) return "medium";
  return "low";
}
