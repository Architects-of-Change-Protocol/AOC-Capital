import type { OrganizationalDigitalTwinContext } from "./organizational-digital-twin-context";
import type { OrganizationalFragilitySignal, OrganizationalTopologyGraph, OrganizationalTwinState } from "./organizational-digital-twin-types";

export function buildOrganizationalFragility(context: OrganizationalDigitalTwinContext, topology: OrganizationalTopologyGraph, state: OrganizationalTwinState): OrganizationalFragilitySignal[] {
  return [
    { signal: "pm_overload_fragility", category: "pm_overload", fragilityScore: state.pmOverload, evidence: context.evidence, confidence: 0.77, uncertainty: ["pm load may rebalance quickly"], causalityRationale: ["pm pressure remains above healthy threshold"], survivabilityRationale: ["pm saturation reduces intervention throughput"], governanceBoundaries: context.governanceBoundaries },
    { signal: "dependency_concentration", category: "dependency", fragilityScore: topology.bottlenecks.length * 30, evidence: context.evidence, confidence: 0.72, uncertainty: ["new dependency shocks may emerge"], causalityRationale: ["bottlenecks concentrate delay risk"], survivabilityRationale: ["dependency concentration degrades milestones"], governanceBoundaries: context.governanceBoundaries }
  ];
}
