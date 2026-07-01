import type { BottleneckCluster, CriticalExecutionChain, DependencyGraph } from "./critical-path-types";
export function detectBottlenecks(graph: DependencyGraph, chains: CriticalExecutionChain[]): BottleneckCluster[] {
  const top = [...graph.nodes].sort((a,b)=>b.pressureScore-a.pressureScore)[0];
  if (!top) return [];
  return [{ bottleneckId: `bottleneck-${top.nodeId}`, category: top.kind === "governance" ? "governance" : "sequencing", affectedChainIds: chains.map((c) => c.chainId), propagationSeverity: top.pressureScore, survivabilityImpact: Number((top.pressureScore * 0.9).toFixed(2)), recommendations: ["Resolve unresolved blockers before adding new commitments.", "Escalate dependency owner accountability within the near-term window."], evidence: [top.nodeId], confidence: 0.72, uncertainty: ["Bottleneck ranking may shift with fresh intervention success."], causalityChain: [top.nodeId], propagationExplanation: "Concentrated pressure on a single node slows downstream execution.", survivabilityExplanation: "Bottlenecks reduce recovery optionality along critical chains." }];
}
