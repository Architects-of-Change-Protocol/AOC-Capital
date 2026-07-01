import type { DependencyGraph, DependencyPropagationEvent } from "./critical-path-types";
export function buildDependencyPropagation(graph: DependencyGraph): DependencyPropagationEvent[] {
  return graph.edges.map((e, idx) => ({ eventId: `prop-${idx}`, fromNodeId: e.fromNodeId, toNodeId: e.toNodeId, band: e.propagationBand, delayContribution: Number((e.survivabilityImpact * 0.4).toFixed(2)), evidence: e.evidence }));
}
