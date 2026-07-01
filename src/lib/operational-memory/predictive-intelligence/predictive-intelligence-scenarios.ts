import type { OperationalScenarioProjection, PredictiveOperationalContext, ScenarioType } from "./predictive-intelligence-types";
import { buildPredictionConfidence } from "./predictive-intelligence-confidence";
const scenarios: ScenarioType[] = ["no_intervention","standard_pm_followup","targeted_escalation","executive_intervention","recovery_plan"];
export function buildScenarioProjections(context: PredictiveOperationalContext): OperationalScenarioProjection[] {
  const baseRisk = context.correlation.atmosphere.collapseProbability;
  return scenarios.map((scenario, idx) => {
    const delta = idx === 0 ? 0.18 : idx === 1 ? 0.06 : idx === 2 ? -0.08 : idx === 3 ? -0.13 : -0.2;
    const trajectory = baseRisk + delta > 0.8 ? "collapse_risk" : baseRisk + delta > 0.65 ? "critical" : baseRisk + delta > 0.45 ? "degrading" : "stable";
    return { scenario, expectedTrajectory: trajectory, riskChange: Number(delta.toFixed(2)), recoveryProbabilityChange: Number((-delta * 0.7).toFixed(2)), operationalPressureChange: Number((delta * 0.9).toFixed(2)), interventionUrgency: idx < 2 ? "immediate" : "short_term", confidence: buildPredictionConfidence(0.62 + (idx > 1 ? 0.08 : 0), ["Scenario deltas are deterministic and intervention-sensitive"], idx === 0 ? ["No intervention uncertainty rises over time"] : []), narrative: `${scenario}: trajectory ${trajectory} from base collapse pressure ${baseRisk.toFixed(2)}.` };
  });
}
