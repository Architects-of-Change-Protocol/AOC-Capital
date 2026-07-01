import type { InterventionImpactEstimate, PredictiveOperationalContext } from "./predictive-intelligence-types";
import { buildPredictionConfidence } from "./predictive-intelligence-confidence";

const interventions = ["stakeholder_follow_up","executive_escalation","procurement_escalation","governance_decision_request","technical_recovery_session","scope_clarification","timeline_rebaseline","resource_intervention","commercial_escalation"] as const;
export function estimateInterventionImpact(context: PredictiveOperationalContext): InterventionImpactEstimate[] {
  const severity = context.correlation.atmosphere.systemicInstability;
  return interventions.map((intervention, i) => ({ intervention, expectedPressureReduction: Number(Math.max(0.05, 0.35 - i * 0.02 + severity * 0.08).toFixed(2)), expectedRecoveryProbabilityIncrease: Number(Math.max(0.03, 0.25 - i * 0.015 + (1 - context.correlation.atmosphere.recoveryProbability) * 0.1).toFixed(2)), domainsAffected: i % 2 ? ["delivery", "governance", "overall"] : ["stakeholder", "procurement", "overall"], requiredUrgency: severity > 0.7 ? "immediate" : "short_term", confidence: buildPredictionConfidence(0.55 + Math.max(0, 0.2 - i * 0.015), ["Deterministic mapping from instability and intervention history"], []), evidenceBasis: ["intervention continuity trend", "cross-domain propagation pressure"] }));
}
