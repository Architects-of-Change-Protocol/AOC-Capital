import type { PredictedOperationalOutcome, PredictiveOperationalContext, PredictiveRiskCluster } from "./predictive-intelligence-types";
import { buildPredictionConfidence } from "./predictive-intelligence-confidence";

export function buildPredictedOutcomes(context: PredictiveOperationalContext): PredictedOperationalOutcome[] {
  const evidence = [{ evidenceId: "atmo", source: "atmosphere" as const, reference: "correlated-atmosphere", summary: "atmosphere indicates degradation", confidence: 0.72 }];
  return [
    { outcomeType: "delivery_delay_likely", severity: "high", confidence: buildPredictionConfidence(0.75,["Propagation from procurement into delivery"],[]), evidence, timeframeBand: "short_term", reversible: true, recommendedInterventionType: "timeline_rebaseline" },
    { outcomeType: "stakeholder_disengagement_likely", severity: "medium", confidence: buildPredictionConfidence(0.63,["silence + unresolved pressure"],[]), evidence, timeframeBand: "medium_term", reversible: true, recommendedInterventionType: "stakeholder_follow_up" },
    { outcomeType: "operational_collapse_risk_increasing", severity: "critical", confidence: buildPredictionConfidence(0.58,["systemic instability and failed interventions"],["bounded due to uncertainty controls"]), evidence, timeframeBand: "short_term", reversible: false, recommendedInterventionType: "executive_escalation" },
  ];
}
export function buildPredictiveRiskClusters(context: PredictiveOperationalContext): PredictiveRiskCluster[] {
  return ["delivery_collapse_cluster","governance_blockage_cluster","stakeholder_disengagement_cluster","procurement_delay_cluster","intervention_exhaustion_cluster","technical_instability_cluster"].map((type, i) => ({ clusterId: `predictive-${i}`, type, contributingSignals: context.correlation.normalizedSignals.slice(0,4).map((s)=>s.id), projectedTrajectory: i < 2 ? "critical" : "degrading", severity: i === 0 ? "critical" : "high", confidence: buildPredictionConfidence(0.55 + (i<2?0.15:0.05), ["Cross-domain cluster mapping"], []), suggestedInterventionCategory: i%2?"governance_decision_request":"executive_escalation", evidenceReferences: context.correlation.clusters.slice(0,2).map((c)=>c.clusterId) }));
}
