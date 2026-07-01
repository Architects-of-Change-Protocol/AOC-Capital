import type { AutonomousInterventionContext, InterventionExpectedImpact } from "./autonomous-intervention-types";
export function estimateInterventionImpact(context: AutonomousInterventionContext, multiplier = 1): InterventionExpectedImpact {
  const bounded = (n: number) => Math.max(0, Math.min(1, n));
  const base = bounded((context.unresolvedPressure + context.bottleneckSeverity + context.systemicInstability) / 3);
  return { expectedPressureReduction: bounded(base * 0.45 * multiplier), expectedRecoveryProbabilityIncrease: bounded((1 - context.recoveryProbability) * 0.35 * multiplier), expectedSurvivabilityImprovement: bounded((1 - context.milestoneSurvivability) * 0.4 * multiplier), expectedTimelinePressureReduction: bounded(base * 0.3 * multiplier), expectedEscalationReduction: bounded((context.governanceErosion + context.stakeholderSilenceLevel) * 0.2 * multiplier), expectedGovernanceClarityImprovement: bounded(context.governanceErosion * 0.35 * multiplier), confidence: bounded(0.55 + (context.evidence.length / 20)), uncertainty: context.evidence.length < 4 ? ["limited_evidence_density"] : [] };
}
