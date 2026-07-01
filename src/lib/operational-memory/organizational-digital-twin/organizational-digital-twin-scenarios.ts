import type { OrganizationalDigitalTwinContext } from "./organizational-digital-twin-context";
import type { OrganizationalScenarioProjection, OrganizationalStabilizationState, OrganizationalTwinState } from "./organizational-digital-twin-types";

export function buildOrganizationalScenarios(context: OrganizationalDigitalTwinContext, state: OrganizationalTwinState, stabilization: OrganizationalStabilizationState): OrganizationalScenarioProjection[] {
  return [{ scenario: "procurement_escalation_unresolved", likelyFutureState: state.state === "unstable" ? "critical" : "degraded", probabilityShift: 0.22, evidence: context.evidence, confidence: 0.69, uncertainty: ["depends on escalation response latency"], causalityRationale: ["unresolved escalation drives further pressure spread"], survivabilityRationale: ["deeper pressure lowers stabilization odds"], governanceBoundaries: context.governanceBoundaries },
  { scenario: "targeted_intervention_succeeds", likelyFutureState: stabilization.trajectory === "improving" ? "recovering" : "pressured", probabilityShift: 0.17, evidence: context.evidence, confidence: 0.68, uncertainty: ["outcome bounded by intervention sequencing"], causalityRationale: ["containment lowers propagation"], survivabilityRationale: ["survivability improves under containment"], governanceBoundaries: context.governanceBoundaries }];
}
