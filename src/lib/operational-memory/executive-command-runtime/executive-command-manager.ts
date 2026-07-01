import type { ExecutiveCommandRequest } from "./executive-command-types";
import { assertExecutiveCommandScope } from "./executive-command-governance";
import { buildExecutiveCommandContext } from "./executive-command-context";
import { buildExecutiveOperationalCommand } from "./executive-command-runtime";
import { retrieveWarRoomTwinState } from "../organizational-digital-twin";

export async function retrieveExecutiveOperationalCommand(request: ExecutiveCommandRequest) { assertExecutiveCommandScope(request); return buildExecutiveOperationalCommand(buildExecutiveCommandContext(request)); }
export async function retrieveExecutiveOperationalFocus(request: ExecutiveCommandRequest) { return (await retrieveExecutiveOperationalCommand(request)).focus; }
export async function retrieveExecutivePressureClusters(request: ExecutiveCommandRequest) { return (await retrieveExecutiveOperationalCommand(request)).pressureClusters; }
export async function retrieveExecutiveInstabilityZones(request: ExecutiveCommandRequest) { return (await retrieveExecutiveOperationalCommand(request)).instabilityZones; }
export async function retrieveExecutiveSurvivability(request: ExecutiveCommandRequest) { return (await retrieveExecutiveOperationalCommand(request)).survivability; }
export async function retrieveExecutiveEscalationSummary(request: ExecutiveCommandRequest) { return (await retrieveExecutiveOperationalCommand(request)).escalation; }
export async function retrieveExecutivePortfolioHealth(request: ExecutiveCommandRequest) { return (await retrieveExecutiveOperationalCommand(request)).portfolio; }
export async function retrieveExecutiveFragilitySignals(request: ExecutiveCommandRequest) { return (await retrieveExecutiveOperationalCommand(request)).fragilitySignals; }
export async function retrieveExecutiveWarRoomContext(request: ExecutiveCommandRequest) { return (await retrieveExecutiveOperationalCommand(request)).warRoom; }
export async function retrieveExecutiveNarratives(request: ExecutiveCommandRequest) { return (await retrieveExecutiveOperationalCommand(request)).narratives; }
export async function retrieveExecutiveAlerts(request: ExecutiveCommandRequest) { return (await retrieveExecutiveOperationalCommand(request)).alerts; }

export async function retrieveExecutiveWarRoomTwinContext(request: ExecutiveCommandRequest) { return retrieveWarRoomTwinState({ scope: request.scope, now: request.now, limit: request.limit }); }
