import type { OrganizationalDigitalTwinContext } from "./organizational-digital-twin-context";
import type { OrganizationalSurvivabilityState, OrganizationalTopologyGraph, OrganizationalTwinState, OrganizationalStateTransition } from "./organizational-digital-twin-types";

export function buildOrganizationalState(context: OrganizationalDigitalTwinContext, topology: OrganizationalTopologyGraph): OrganizationalTwinState {
  const pressure = Math.round(topology.nodes.reduce((a, n) => a + n.pressureScore, 0) / topology.nodes.length);
  const governanceErosion = Math.round(topology.edges.filter((e) => e.relation === "escalates_to").reduce((a, e) => a + e.weight * 100, 0));
  const pmOverload = topology.nodes.find((n) => n.id === "pm-pool")?.pressureScore ?? 50;
  const criticalPathFragility = Math.round((pressure + pmOverload + governanceErosion) / 3);
  const state = criticalPathFragility >= 75 ? "unstable" : criticalPathFragility >= 65 ? "degraded" : "pressured";
  return { state, pressure, governanceErosion, pmOverload, criticalPathFragility, evidence: context.evidence, confidence: 0.75, uncertainty: ["pressure scores are bounded snapshots"], causalityRationale: ["aggregated pressure and governance erosion drive state"], survivabilityRationale: ["critical path fragility constrains recoverability"], governanceBoundaries: context.governanceBoundaries };
}
export function buildOrganizationalStateTransitions(context: OrganizationalDigitalTwinContext, state: OrganizationalTwinState, survivability: OrganizationalSurvivabilityState): OrganizationalStateTransition[] {
  const to = survivability.stabilizationProbability > 65 ? "recovering" : state.state === "unstable" ? "critical" : "degraded";
  return [{ from: state.state, to, trigger: "survivability_and_escalation_pressure", evidence: context.evidence, confidence: 0.72, uncertainty: ["future interventions can alter transition"], causalityRationale: ["transition selected from deterministic threshold gates"], survivabilityRationale: ["stabilization probability governs recovery transitions"], governanceBoundaries: context.governanceBoundaries }];
}
