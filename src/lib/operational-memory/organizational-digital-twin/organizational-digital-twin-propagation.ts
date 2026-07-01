import type { OrganizationalDigitalTwinContext } from "./organizational-digital-twin-context";
import type { OrganizationalPropagationPath, OrganizationalTopologyGraph, OrganizationalTwinState } from "./organizational-digital-twin-types";

export function buildOrganizationalPropagation(context: OrganizationalDigitalTwinContext, topology: OrganizationalTopologyGraph, state: OrganizationalTwinState): OrganizationalPropagationPath[] {
  return topology.edges.map((edge, idx) => ({ id: `prop-${idx + 1}`, path: [edge.from, edge.to], propagationType: edge.relation, probability: Math.min(0.95, (edge.weight + state.pressure / 100) / 2), containmentLevers: ["targeted_escalation", "governance_clarification"], evidence: context.evidence, confidence: 0.7, uncertainty: ["propagation varies with intervention latency"], causalityRationale: ["higher edge weight and pressure increases propagation"], survivabilityRationale: ["containment levers reduce survivability erosion"], governanceBoundaries: context.governanceBoundaries }));
}
