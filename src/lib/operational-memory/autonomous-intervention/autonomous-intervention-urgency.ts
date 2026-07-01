import type { AutonomousInterventionContext, InterventionUrgency } from "./autonomous-intervention-types";
export function classifyInterventionUrgency(context: AutonomousInterventionContext): InterventionUrgency {
  const pressure = context.criticalPathCollapseRisk + context.unresolvedPressure + context.bottleneckSeverity;
  if (pressure >= 2.2 || context.milestoneSurvivability < 0.35) return "immediate";
  if (pressure >= 1.5 || context.recoveryProbability < 0.45) return "urgent";
  if (pressure >= 0.8 || context.stakeholderSilenceLevel > 0.35) return "next_cycle";
  return "monitor";
}
