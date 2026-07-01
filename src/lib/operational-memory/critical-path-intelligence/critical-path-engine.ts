import type { CriticalPathContext, CriticalPathResult, ScheduleCompressionSignal, TemporalDegradationSignal } from "./critical-path-types";
import { buildDependencyGraph } from "./critical-path-graph";
import { detectCriticalExecutionChains } from "./critical-path-analysis";
import { buildDependencyPropagation } from "./critical-path-propagation";
import { buildMilestoneSurvivability } from "./critical-path-milestones";
import { buildTemporalPressureClusters } from "./critical-path-temporal-pressure";
import { detectHiddenDependencies } from "./critical-path-hidden-dependencies";
import { detectBottlenecks } from "./critical-path-bottlenecks";
import { computeExecutionFragility } from "./critical-path-fragility";
import { detectExecutionInstability } from "./critical-path-instability";
import { buildExecutionSurvivabilityForecast } from "./critical-path-survivability";
import { buildCriticalPathNarratives } from "./critical-path-narratives";
import { buildCriticalPathDiagnostics } from "./critical-path-diagnostics";

export function buildCriticalPathResult(context: CriticalPathContext): CriticalPathResult {
  const graph = buildDependencyGraph(context);
  const criticalChains = detectCriticalExecutionChains(graph);
  const propagationEvents = buildDependencyPropagation(graph);
  const milestones = buildMilestoneSurvivability(graph);
  const temporalPressure = buildTemporalPressureClusters(graph);
  const hiddenDependencies = detectHiddenDependencies(graph);
  const bottlenecks = detectBottlenecks(graph, criticalChains);
  const fragility = computeExecutionFragility(graph);
  const instabilitySignals = detectExecutionInstability(graph);
  const survivability = buildExecutionSurvivabilityForecast(milestones, fragility, temporalPressure);
  const narratives = buildCriticalPathNarratives(survivability, hiddenDependencies, bottlenecks);
  const scheduleCompression: ScheduleCompressionSignal[] = [{ signalId: "compression-primary", severity: temporalPressure[0]?.pressureScore ?? 0.5, band: temporalPressure[0]?.band ?? "near_term", evidence: graph.evidence }];
  const temporalDegradation: TemporalDegradationSignal[] = [{ signalId: "degradation-primary", level: Number((1 - survivability.survivabilityScore).toFixed(2)), band: survivability.expectedDegradationBand, evidence: survivability.evidence }];
  const result: CriticalPathResult = { graph, criticalChains, milestones, temporalPressure, fragility, hiddenDependencies, bottlenecks, instabilitySignals, propagationEvents, survivability, narratives, diagnostics: [], scheduleCompression, temporalDegradation };
  result.diagnostics = buildCriticalPathDiagnostics(result);
  return result;
}
