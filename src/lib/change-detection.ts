import { buildExecutiveSynthesis } from "@/lib/executive-synthesis";
import { shouldSuppressAlert, type AlertSuppressionState } from "@/lib/alert-fatigue";
import { computeEscalationTransition, type EscalationTransition } from "@/lib/escalation-thresholds";
import { buildOperationalDeltas, type OperationalDelta } from "@/lib/operational-diff";
import { listOperationalMemory } from "@/lib/operational-memory";
import { analyzeTrend, type TrendMovement, type TrendSeverity } from "@/lib/trend-analysis";

export type DeteriorationSignal = { metric: string; severity: TrendSeverity; reason: string; value: number };
export type ImprovementSignal = { metric: string; severity: TrendSeverity; reason: string; value: number };
export type ConfidenceDecay = { domain: string; previous: number; current: number; decay: number; severity: TrendSeverity };
export type GovernanceDrift = { driftScore: number; missingArtifactsDelta: number; severity: TrendSeverity };
export type DeliveryVolatility = { volatility: number; severity: TrendSeverity };
export type StakeholderMovement = { supportDelta: number; direction: "up" | "down" | "stable"; severity: TrendSeverity };
export type PMFatigueProgression = { fatigueDelta: number; severity: TrendSeverity; meetingLoadPressure: number; backlogPressure: number };

export type ChangeDetectionSnapshot = {
  generatedAt: string;
  operationalDeltas: OperationalDelta[];
  trendMovements: TrendMovement[];
  escalationTransitions: EscalationTransition[];
  deteriorationSignals: DeteriorationSignal[];
  improvementSignals: ImprovementSignal[];
  confidenceDecayAlerts: ConfidenceDecay[];
  governanceDrift: GovernanceDrift;
  deliveryVolatility: DeliveryVolatility;
  stakeholderMovement: StakeholderMovement;
  pmFatigueProgression: PMFatigueProgression;
  suppression: AlertSuppressionState[];
};

export async function buildChangeDetectionSnapshot(companyId: string, projectId: string | null): Promise<ChangeDetectionSnapshot> {
  const records = await listOperationalMemory(companyId, projectId);
  const synthesis = await buildExecutiveSynthesis(companyId, projectId);
  const operationalDeltas = buildOperationalDeltas(records);
  const now = new Date().toISOString();

  const trendMovements: TrendMovement[] = [
    analyzeTrend("stakeholder_support", records.filter((r) => r.domain === "stakeholder_intelligence").map((r) => 100 - r.missingFields.length * 9), { businessImpact: 85, executiveVisibility: 88, domainImportance: 82 }),
    analyzeTrend("delivery_confidence", records.filter((r) => r.domain === "delivery_intelligence").map((r) => r.confidenceScore), { businessImpact: 90, executiveVisibility: 90, domainImportance: 92 }),
    analyzeTrend("governance_completeness", records.filter((r) => r.domain === "pmo_governance").map((r) => r.completionScore), { businessImpact: 78, executiveVisibility: 84, domainImportance: 86 }),
    analyzeTrend("pm_fatigue", records.filter((r) => r.domain === "team_health").map((r) => 100 - r.confidenceScore), { businessImpact: 70, executiveVisibility: 72, domainImportance: 74 }),
    analyzeTrend("project_health", synthesis.timeline.map(() => synthesis.health.overall), { businessImpact: 95, executiveVisibility: 95, domainImportance: 95 }),
  ];

  const deteriorationSignals = trendMovements
    .filter((t) => t.direction === "deteriorating" || t.direction === "critical_deterioration")
    .map((t) => ({ metric: t.metric, severity: t.severity, reason: `${t.metric} is deteriorating with rate ${t.rate}/snapshot`, value: t.delta }));
  const improvementSignals = trendMovements
    .filter((t) => t.direction === "improving")
    .map((t) => ({ metric: t.metric, severity: t.severity, reason: `${t.metric} improving by ${t.delta} over observed snapshots`, value: t.delta }));

  const confidenceDecayAlerts: ConfidenceDecay[] = operationalDeltas
    .filter((d) => d.confidenceDelta < -6)
    .map((d) => ({ domain: d.domain, previous: d.previousConfidence, current: d.currentConfidence, decay: d.confidenceDelta, severity: d.severity }));

  const governanceDelta = operationalDeltas.find((d) => d.domain === "pmo_governance");
  const governanceDrift: GovernanceDrift = {
    driftScore: Math.max(0, (100 - synthesis.health.governanceCompleteness) + Math.max(0, governanceDelta?.missingDataDelta ?? 0) * 8),
    missingArtifactsDelta: governanceDelta?.missingDataDelta ?? 0,
    severity: (governanceDelta?.missingDataDelta ?? 0) >= 2 ? "high" : (governanceDelta?.missingDataDelta ?? 0) > 0 ? "medium" : "info",
  };

  const deliveryTrend = trendMovements.find((t) => t.metric === "delivery_confidence");
  const deliveryVolatility: DeliveryVolatility = { volatility: deliveryTrend?.volatility ?? 0, severity: (deliveryTrend?.volatility ?? 0) >= 65 ? "high" : "low" };

  const stakeholderTrend = trendMovements.find((t) => t.metric === "stakeholder_support");
  const stakeholderMovement: StakeholderMovement = { supportDelta: stakeholderTrend?.delta ?? 0, direction: (stakeholderTrend?.delta ?? 0) > 4 ? "up" : (stakeholderTrend?.delta ?? 0) < -4 ? "down" : "stable", severity: stakeholderTrend?.severity ?? "info" };

  const fatigueTrend = trendMovements.find((t) => t.metric === "pm_fatigue");
  const pmFatigueProgression: PMFatigueProgression = {
    fatigueDelta: fatigueTrend?.delta ?? 0,
    severity: fatigueTrend?.severity ?? "info",
    meetingLoadPressure: Math.max(0, (fatigueTrend?.delta ?? 0) + 45),
    backlogPressure: Math.max(0, (deliveryTrend?.delta ?? 0) * -1 + 40),
  };

  const escalationTransition = computeEscalationTransition(
    "escalation_probability",
    Math.max(0, synthesis.escalationRisk.probabilityScore - 12),
    synthesis.escalationRisk.probabilityScore,
    now,
  );

  const suppression = deteriorationSignals.map((signal) => {
    const next = shouldSuppressAlert(null, signal.severity, now);
    return { ...next.nextState, key: signal.metric };
  });

  return {
    generatedAt: now,
    operationalDeltas,
    trendMovements,
    escalationTransitions: escalationTransition ? [escalationTransition] : [],
    deteriorationSignals,
    improvementSignals,
    confidenceDecayAlerts,
    governanceDrift,
    deliveryVolatility,
    stakeholderMovement,
    pmFatigueProgression,
    suppression,
  };
}
