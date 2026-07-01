import type { OrganizationalDigitalTwinContext } from "./organizational-digital-twin-context";
import type { OrganizationalInterventionSimulation, OrganizationalStabilizationState, OrganizationalSurvivabilityState, OrganizationalTwinState } from "./organizational-digital-twin-types";

export function buildOrganizationalStabilization(context: OrganizationalDigitalTwinContext, state: OrganizationalTwinState, survivability: OrganizationalSurvivabilityState, interventions: OrganizationalInterventionSimulation[]): OrganizationalStabilizationState {
  const projected = survivability.stabilizationProbability + (interventions[0]?.survivabilityImprovement ?? 0);
  const trajectory = projected > 70 ? "improving" : projected > 55 ? "plateauing" : state.state === "critical" ? "collapsing" : "false_stabilization";
  return { trajectory, fatigueRisk: Math.max(10, state.pmOverload - 20), escalationExhaustion: Math.max(10, state.governanceErosion - 15), evidence: context.evidence, confidence: 0.7, uncertainty: ["sustained stabilization requires repeated intervention effectiveness"], causalityRationale: ["trajectory follows bounded uplift vs baseline survivability"], survivabilityRationale: ["fatigue and escalation exhaustion dampen stabilization"], governanceBoundaries: context.governanceBoundaries };
}
