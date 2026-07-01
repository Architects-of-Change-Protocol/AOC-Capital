import type { DependencyGraph, ExecutionFragility } from "./critical-path-types";
export function computeExecutionFragility(graph: DependencyGraph): ExecutionFragility {
  const unresolved = graph.nodes.filter((n) => n.resolutionStatus !== "resolved");
  const fragilityScore = Number((unresolved.reduce((s, n) => s + n.pressureScore, 0) / Math.max(1, graph.nodes.length)).toFixed(2));
  return { fragilityScore, brittleDependencies: unresolved.slice(0, 5).map((n) => n.nodeId), evidence: unresolved.slice(0, 3).map((n) => n.nodeId), confidence: 0.73, uncertainty: ["Single-owner dependencies may be under-represented in raw memory records."], causalityChain: unresolved.slice(0,3).map((n)=>n.nodeId), propagationExplanation: "Unresolved dependencies propagate fragility across execution sequences.", survivabilityExplanation: "Rising fragility reduces chain recoverability." };
}
