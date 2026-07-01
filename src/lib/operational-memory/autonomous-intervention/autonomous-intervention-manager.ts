import type { AutonomousInterventionRequest } from "./autonomous-intervention-types";
import { buildAutonomousInterventionContext } from "./autonomous-intervention-context";
import { buildAutonomousInterventionResult } from "./autonomous-intervention-engine";

export async function retrieveAutonomousInterventionPlan(request: AutonomousInterventionRequest) { return (await retrieveAutonomousInterventionRuntime(request)).plan; }
export async function retrieveInterventionCandidates(request: AutonomousInterventionRequest) { return (await retrieveAutonomousInterventionRuntime(request)).plan.candidates; }
export async function retrieveInterventionSequence(request: AutonomousInterventionRequest) { return (await retrieveAutonomousInterventionRuntime(request)).plan.sequence; }
export async function retrieveInterventionUrgency(request: AutonomousInterventionRequest) { return (await retrieveInterventionCandidates(request)).map((x) => ({ interventionId: x.interventionId, urgency: x.urgency })); }
export async function retrieveInterventionImpact(request: AutonomousInterventionRequest) { return (await retrieveInterventionCandidates(request)).map((x) => ({ interventionId: x.interventionId, impact: x.expectedImpact })); }
export async function retrieveInterventionSafetyProfile(request: AutonomousInterventionRequest) { return (await retrieveInterventionCandidates(request)).map((x) => ({ interventionId: x.interventionId, safety: x.safety })); }
export async function retrieveEscalationPaths(request: AutonomousInterventionRequest) { return (await retrieveAutonomousInterventionRuntime(request)).escalationPaths; }
export async function retrieveRecoveryPaths(request: AutonomousInterventionRequest) { return (await retrieveAutonomousInterventionRuntime(request)).recoveryPaths; }
export async function retrieveInterventionDiagnostics(request: AutonomousInterventionRequest) { return (await retrieveAutonomousInterventionRuntime(request)).diagnostics; }
export async function retrieveInterventionNarratives(request: AutonomousInterventionRequest) { return (await retrieveAutonomousInterventionRuntime(request)).narratives; }
export async function retrieveAutonomousInterventionRuntime(request: AutonomousInterventionRequest) { return buildAutonomousInterventionResult(await buildAutonomousInterventionContext(request)); }
