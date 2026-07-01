import { buildOrganizationalDigitalTwinContext } from "./organizational-digital-twin-context";
import { buildOrganizationalDigitalTwin } from "./organizational-digital-twin-runtime";
import type { OrganizationalDigitalTwinRequest } from "./organizational-digital-twin-types";

export function retrieveOrganizationalDigitalTwin(request: OrganizationalDigitalTwinRequest) { return buildOrganizationalDigitalTwin(buildOrganizationalDigitalTwinContext(request)); }
export function retrieveOrganizationalTopology(request: OrganizationalDigitalTwinRequest) { return retrieveOrganizationalDigitalTwin(request).topology; }
export function retrieveOrganizationalState(request: OrganizationalDigitalTwinRequest) { return retrieveOrganizationalDigitalTwin(request).state; }
export function retrievePropagationSimulation(request: OrganizationalDigitalTwinRequest) { return retrieveOrganizationalDigitalTwin(request).propagation; }
export function retrieveSurvivabilitySimulation(request: OrganizationalDigitalTwinRequest) { return retrieveOrganizationalDigitalTwin(request).survivability; }
export function retrieveInterventionSimulation(request: OrganizationalDigitalTwinRequest) { return retrieveOrganizationalDigitalTwin(request).interventions; }
export function retrieveStabilizationSimulation(request: OrganizationalDigitalTwinRequest) { return retrieveOrganizationalDigitalTwin(request).stabilization; }
export function retrieveFragilitySignals(request: OrganizationalDigitalTwinRequest) { return retrieveOrganizationalDigitalTwin(request).fragility; }
export function retrieveScenarioProjections(request: OrganizationalDigitalTwinRequest) { return retrieveOrganizationalDigitalTwin(request).scenarios; }
export function retrieveWarRoomTwinState(request: OrganizationalDigitalTwinRequest) { return retrieveOrganizationalDigitalTwin(request).warRoom; }
export function retrieveTwinNarratives(request: OrganizationalDigitalTwinRequest) { return retrieveOrganizationalDigitalTwin(request).narratives; }
