import { buildCriticalPathContext } from "./critical-path-context";
import { buildCriticalPathResult } from "./critical-path-engine";
import type { CriticalPathRequest } from "./critical-path-types";
import { assertCriticalPathIsolation } from "./critical-path-governance";

export async function retrieveCriticalPathIntelligence(request: CriticalPathRequest) { assertCriticalPathIsolation(request); return buildCriticalPathResult(await buildCriticalPathContext(request)); }
export async function retrieveDependencyGraph(request: CriticalPathRequest) { return (await retrieveCriticalPathIntelligence(request)).graph; }
export async function retrieveCriticalExecutionChains(request: CriticalPathRequest) { return (await retrieveCriticalPathIntelligence(request)).criticalChains; }
export async function retrieveMilestoneSurvivability(request: CriticalPathRequest) { return (await retrieveCriticalPathIntelligence(request)).milestones; }
export async function retrieveTemporalPressureClusters(request: CriticalPathRequest) { return (await retrieveCriticalPathIntelligence(request)).temporalPressure; }
export async function retrieveExecutionFragility(request: CriticalPathRequest) { return (await retrieveCriticalPathIntelligence(request)).fragility; }
export async function retrieveHiddenDependencies(request: CriticalPathRequest) { return (await retrieveCriticalPathIntelligence(request)).hiddenDependencies; }
export async function retrieveBottleneckAnalysis(request: CriticalPathRequest) { return (await retrieveCriticalPathIntelligence(request)).bottlenecks; }
export async function retrieveExecutionInstability(request: CriticalPathRequest) { return (await retrieveCriticalPathIntelligence(request)).instabilitySignals; }
export async function retrieveDependencyPropagation(request: CriticalPathRequest) { return (await retrieveCriticalPathIntelligence(request)).propagationEvents; }
export async function retrieveCriticalPathNarratives(request: CriticalPathRequest) { return (await retrieveCriticalPathIntelligence(request)).narratives; }
