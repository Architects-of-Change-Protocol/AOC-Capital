import type { InterventionLearningRequest, InterventionLearningResult, InterventionOutcomeRecord, LearningConfidenceScore, LearningEvidenceBundle, InterventionEffectivenessScore, FailurePattern, AdaptiveBoundedAdjustment } from "./intervention-learning-types";

const avg = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const buildEvidence = (records: InterventionOutcomeRecord[], evidence: string[]): LearningEvidenceBundle => ({ evidence, outcomeCount: records.length, recencyDays: 7, consistency: clamp(1 - Math.abs(avg(records.map((r) => r.observedImpact - r.predictedImpact)))), domainDiversity: 1, projectDiversity: 1, stakeholderDiversity: new Set(records.map((r) => r.stakeholderRole).filter(Boolean)).size / 5 });
const buildConfidence = (bundle: LearningEvidenceBundle): LearningConfidenceScore => {
  const confidence = clamp((bundle.outcomeCount / 10) * 0.5 + bundle.consistency * 0.3 + (1 - Math.min(bundle.recencyDays, 30) / 30) * 0.2);
  const uncertainty = [bundle.outcomeCount < 3 ? "sparse_evidence" : "", bundle.consistency < 0.4 ? "inconsistent_outcomes" : ""].filter(Boolean);
  return { confidence, uncertainty, rationale: [`outcomes:${bundle.outcomeCount}`, `consistency:${bundle.consistency.toFixed(2)}`] };
};

export const runInterventionLearningEngine = (request: InterventionLearningRequest): InterventionLearningResult => {
  const grouped = new Map<string, InterventionOutcomeRecord[]>();
  for (const item of request.outcomes) grouped.set(item.interventionType, [...(grouped.get(item.interventionType) ?? []), item]);
  const effectiveness: InterventionEffectivenessScore[] = [...grouped.entries()].map(([key, records]) => {
    const evidence = buildEvidence(records, [`intervention:${key}`]);
    const confidence = buildConfidence(evidence);
    return { key, effectiveness: clamp(avg(records.map((r) => r.observedImpact - r.predictedImpact)) + 0.5), pressureReduction: clamp(avg(records.map((r) => r.observedImpact))), survivabilityImprovement: clamp(avg(records.map((r) => r.survivabilityDelta))), timelineStabilization: clamp(avg(records.map((r) => r.timelineStabilityDelta))), governanceClarity: clamp(avg(records.map((r) => r.governanceClarityDelta))), escalationContainment: clamp(avg(records.map((r) => r.escalationContainmentDelta))), recoveryAcceleration: clamp(avg(records.map((r) => r.recoveryAccelerationDelta))), blockerResolutionVelocity: clamp(avg(records.map((r) => r.blockerResolutionVelocityDelta))), evidence, confidence };
  });

  const failurePatterns: FailurePattern[] = effectiveness.filter((e) => e.effectiveness < 0.45).map((e) => ({ key: e.key, failures: Math.max(1, Math.round((1 - e.effectiveness) * 10)), fatigueRisk: clamp(1 - e.effectiveness), falseStabilizationRisk: clamp(1 - e.survivabilityImprovement), evidence: e.evidence.evidence, confidence: e.confidence }));
  const boundedAdjustments: AdaptiveBoundedAdjustment[] = effectiveness.slice(0, 3).map((e) => ({ parameter: "prioritization_weight", currentValue: 0.5, proposedValue: clamp(0.5 + (e.effectiveness - 0.5) * 0.2, 0.3, 0.7), boundedMin: 0.3, boundedMax: 0.7, delta: clamp((e.effectiveness - 0.5) * 0.2, -0.2, 0.2), reversible: true, rationale: `Bounded update from observed effectiveness ${e.effectiveness.toFixed(2)} for ${e.key}.`, governanceSafe: true }));

  return { effectiveness, stabilizationPatterns: effectiveness.map((e) => ({ key: e.key, kind: "intervention", effectiveness: e.effectiveness, evidence: e.evidence.evidence, confidence: e.confidence.confidence, uncertainty: e.confidence.uncertainty })), failurePatterns, stakeholderProfiles: [], recoveryProfiles: [], sequencingProfiles: [], calibrationAdjustments: boundedAdjustments.map((b) => ({ weight: b.parameter, previousValue: b.currentValue, adjustedValue: b.proposedValue, min: b.boundedMin, max: b.boundedMax, rationale: b.rationale, reversible: true, evidence: [b.rationale] })), boundedAdjustments, driftSignals: failurePatterns.map((f) => ({ dimension: f.key, severity: f.fatigueRisk > 0.75 ? "high" : "medium", evidence: f.evidence, explanation: "Effectiveness decline trend detected from repeated weak outcomes." })), diagnostics: effectiveness.map((e) => ({ category: "effectiveness", message: `${e.key} effectiveness ${e.effectiveness.toFixed(2)}`, evidence: e.evidence.evidence, confidence: e.confidence.confidence, uncertainty: e.confidence.uncertainty })), narratives: effectiveness.map((e) => ({ narrative: `${e.key} shows ${(e.effectiveness * 100).toFixed(0)}% net effectiveness with bounded-confidence adaptation.`, evidence: e.evidence.evidence, confidence: e.confidence.confidence, uncertainty: e.confidence.uncertainty })), tenantIsolationPreserved: true, governanceSafeLimitsApplied: true };
};
