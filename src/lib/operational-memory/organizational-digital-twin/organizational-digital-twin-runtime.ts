import type { OrganizationalDigitalTwinContext } from "./organizational-digital-twin-context";
import type { OrganizationalDigitalTwinResult } from "./organizational-digital-twin-types";
import { buildOrganizationalTopology } from "./organizational-digital-twin-topology";
import { buildOrganizationalState, buildOrganizationalStateTransitions } from "./organizational-digital-twin-state";
import { buildOrganizationalPropagation } from "./organizational-digital-twin-propagation";
import { buildOrganizationalSurvivability } from "./organizational-digital-twin-survivability";
import { buildOrganizationalInterventions } from "./organizational-digital-twin-interventions";
import { buildOrganizationalStabilization } from "./organizational-digital-twin-stabilization";
import { buildOrganizationalFragility } from "./organizational-digital-twin-fragility";
import { buildOrganizationalScenarios } from "./organizational-digital-twin-scenarios";
import { buildOrganizationalEvolution } from "./organizational-digital-twin-evolution";
import { buildOrganizationalWarRoom } from "./organizational-digital-twin-warroom";
import { buildOrganizationalDiagnostics } from "./organizational-digital-twin-diagnostics";
import { buildOrganizationalNarratives } from "./organizational-digital-twin-narratives";

export function buildOrganizationalDigitalTwin(context: OrganizationalDigitalTwinContext): OrganizationalDigitalTwinResult {
  const topology = buildOrganizationalTopology(context);
  const state = buildOrganizationalState(context, topology);
  const propagation = buildOrganizationalPropagation(context, topology, state);
  const survivability = buildOrganizationalSurvivability(context, state, propagation);
  const interventions = buildOrganizationalInterventions(context, state, survivability);
  const stabilization = buildOrganizationalStabilization(context, state, survivability, interventions);
  const fragility = buildOrganizationalFragility(context, topology, state);
  const scenarios = buildOrganizationalScenarios(context, state, stabilization);
  const transitions = buildOrganizationalStateTransitions(context, state, survivability);
  const evolution = buildOrganizationalEvolution(context, state, survivability, stabilization);
  const warRoom = buildOrganizationalWarRoom(context, propagation, survivability, stabilization, fragility, interventions);
  const diagnostics = buildOrganizationalDiagnostics(context, transitions, survivability, stabilization, fragility);
  const narratives = buildOrganizationalNarratives(context, state, survivability, stabilization, scenarios);
  const pressureFlows = propagation.map((p) => ({ ...p, source: p.path[0] ?? "unknown", target: p.path[p.path.length - 1] ?? "unknown", intensity: p.probability, vector: p.propagationType }));
  const collapseRisk = { riskScore: Math.max(0, 100 - survivability.operationalSurvivability), zones: fragility.filter((f) => f.fragilityScore > 70).map((f) => f.signal), evidence: context.evidence, confidence: 0.74, uncertainty: ["bounded by available operational evidence"], causalityRationale: ["collapse risk rises as survivability declines"], survivabilityRationale: ["derived from operational survivability"], governanceBoundaries: context.governanceBoundaries };
  const recovery = { recoveryScore: survivability.recoverySurvivability, blockers: fragility.filter((f) => f.fragilityScore > 65).map((f) => f.signal), enablers: interventions.slice(0, 2).map((i) => i.id), evidence: context.evidence, confidence: 0.71, uncertainty: ["recovery depends on execution timing"], causalityRationale: ["higher intervention containment increases recovery"], survivabilityRationale: ["recoveryScore aligns with recovery survivability"], governanceBoundaries: context.governanceBoundaries };
  return { state, topology, pressureFlows, propagation, survivability, collapseRisk, recovery, stabilization, interventions, scenarios, transitions, fragility, evolution, warRoom, narratives, diagnostics };
}
