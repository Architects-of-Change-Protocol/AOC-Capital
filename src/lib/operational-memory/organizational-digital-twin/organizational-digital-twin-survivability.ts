import type { OrganizationalDigitalTwinContext } from "./organizational-digital-twin-context";
import type { OrganizationalPropagationPath, OrganizationalSurvivabilityState, OrganizationalTwinState } from "./organizational-digital-twin-types";

export function buildOrganizationalSurvivability(context: OrganizationalDigitalTwinContext, state: OrganizationalTwinState, propagation: OrganizationalPropagationPath[]): OrganizationalSurvivabilityState {
  const avgPropagation = propagation.reduce((a, p) => a + p.probability, 0) / Math.max(1, propagation.length);
  const operationalSurvivability = Math.max(25, Math.round(100 - (state.criticalPathFragility * 0.6 + avgPropagation * 40)));
  return { milestoneSurvivability: Math.max(20, operationalSurvivability - 8), portfolioSurvivability: Math.max(20, operationalSurvivability - 5), pmSurvivability: Math.max(20, 100 - state.pmOverload), operationalSurvivability, recoverySurvivability: Math.max(20, Math.round(operationalSurvivability * 0.9)), stabilizationProbability: Math.max(15, Math.round(operationalSurvivability * 0.85)), evidence: context.evidence, confidence: 0.73, uncertainty: ["survivability is bounded by known instability signals"], causalityRationale: ["fragility and propagation deterministically reduce survivability"], survivabilityRationale: ["recovery and stabilization derive from operational survivability"], governanceBoundaries: context.governanceBoundaries };
}
