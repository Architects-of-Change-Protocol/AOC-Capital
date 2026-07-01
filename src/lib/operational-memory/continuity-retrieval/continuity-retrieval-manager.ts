import type { OperationalContinuityRequest, OperationalContinuityResult } from "./continuity-retrieval-types";
import { assertContinuityGovernanceScope } from "./continuity-retrieval-governance";
import { buildContinuityContext } from "./continuity-retrieval-context";
import { buildOperationalContinuityResult } from "./continuity-retrieval-engine";

export async function retrieveOperationalContinuity(request: OperationalContinuityRequest): Promise<OperationalContinuityResult> { assertContinuityGovernanceScope(request.scope); const context = await buildContinuityContext(request); return buildOperationalContinuityResult(request, context); }
export async function retrieveOperationalPressure(request: OperationalContinuityRequest) { return (await retrieveOperationalContinuity(request)).unresolvedPressure; }
export async function retrieveOperationalAtmosphere(request: OperationalContinuityRequest) { return (await retrieveOperationalContinuity(request)).atmosphere; }
export async function retrieveOperationalTimeline(request: OperationalContinuityRequest) { return (await retrieveOperationalContinuity(request)).timeline; }
export async function retrieveStakeholderContinuity(request: OperationalContinuityRequest) { return (await retrieveOperationalContinuity(request)).stakeholderContinuity; }
export async function retrieveInterventionContinuity(request: OperationalContinuityRequest) { return (await retrieveOperationalContinuity(request)).interventionContinuity; }
export async function retrieveContinuityLineage(request: OperationalContinuityRequest) { return (await retrieveOperationalContinuity(request)).lineage; }
export async function retrieveCriticalOperationalSignals(request: OperationalContinuityRequest) { return (await retrieveOperationalContinuity(request)).prioritizedOperationalRecords.filter((c)=>c.priority==="highest"); }
export async function retrieveOperationalRiskClusters(request: OperationalContinuityRequest) { return (await retrieveOperationalContinuity(request)).riskClusters; }
