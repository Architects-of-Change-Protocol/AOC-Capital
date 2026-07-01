import type { ExecutionInstabilitySignal, DependencyGraph } from "./critical-path-types";
export function detectExecutionInstability(graph: DependencyGraph): ExecutionInstabilitySignal[] {
  const volatility = graph.edges.filter((e) => e.relation === "blocks").length / Math.max(1, graph.edges.length);
  return [{ signalId: "instability-sequence", type: "sequence_instability", severity: Number(volatility.toFixed(2)), evidence: graph.causalityChain.slice(0, 4), confidence: 0.69, uncertainty: ["Sequence instability is dampened when blockers are quickly resolved."], causalityChain: graph.causalityChain, propagationExplanation: "High blocker ratio indicates unstable execution ordering.", survivabilityExplanation: "Instability increases milestone miss probability." }];
}
