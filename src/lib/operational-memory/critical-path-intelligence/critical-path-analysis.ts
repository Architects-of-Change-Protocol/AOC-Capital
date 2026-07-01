import type { CriticalExecutionChain, DependencyGraph } from "./critical-path-types";
export function detectCriticalExecutionChains(graph: DependencyGraph): CriticalExecutionChain[] {
  const ranked = [...graph.nodes].sort((a, b) => b.pressureScore - a.pressureScore);
  const primary = ranked.slice(0, Math.min(5, ranked.length)).map((n) => n.nodeId);
  return [{ chainId: "primary", nodeIds: primary, criticalityScore: primary.length ? 0.8 : 0, hidden: false, evidence: primary, confidence: 0.75, uncertainty: ["Secondary chain may shift with new interventions."], causalityChain: graph.causalityChain.slice(0, 4), propagationExplanation: "High-pressure lineage nodes define the primary chain.", survivabilityExplanation: "Chain survivability declines as unresolved nodes saturate." }];
}
