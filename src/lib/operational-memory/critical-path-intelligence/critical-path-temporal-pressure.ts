import type { TemporalPressureCluster, DependencyGraph } from "./critical-path-types";
export function buildTemporalPressureClusters(graph: DependencyGraph): TemporalPressureCluster[] {
  const pressureScore = Number((graph.nodes.reduce((s, n) => s + n.pressureScore, 0) / Math.max(1, graph.nodes.length)).toFixed(2));
  return [{ clusterId: "temporal-pressure-primary", band: pressureScore > 0.75 ? "immediate" : "near_term", pressureScore, drivers: graph.nodes.slice(0, 4).map((n) => n.nodeId), evidence: graph.evidence, confidence: 0.71, uncertainty: ["Pressure dampens when intervention evidence is fresh."], causalityChain: graph.causalityChain, propagationExplanation: "Pressure accumulates on unresolved dependency edges.", survivabilityExplanation: "Higher temporal pressure compresses recovery windows." }];
}
