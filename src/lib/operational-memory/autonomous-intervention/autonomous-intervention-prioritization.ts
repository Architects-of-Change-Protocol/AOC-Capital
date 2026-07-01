import type { InterventionCandidate } from "./autonomous-intervention-types";
const urgencyWeight = { monitor: 1, next_cycle: 2, urgent: 3, immediate: 4 } as const;
export function prioritizeInterventions(candidates: InterventionCandidate[]) {
  return [...candidates].sort((a, b) => (urgencyWeight[b.urgency] * b.expectedImpact.expectedPressureReduction + b.confidence) - (urgencyWeight[a.urgency] * a.expectedImpact.expectedPressureReduction + a.confidence));
}
