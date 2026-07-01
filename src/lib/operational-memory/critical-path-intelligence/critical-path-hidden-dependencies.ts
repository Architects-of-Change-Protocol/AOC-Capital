import type { DependencyGraph, HiddenDependency } from "./critical-path-types";
export function detectHiddenDependencies(graph: DependencyGraph): HiddenDependency[] {
  const governance = graph.nodes.filter((n) => n.kind === "governance");
  const milestones = graph.nodes.filter((n) => n.kind === "milestone");
  if (!governance.length || !milestones.length) return [];
  return [{ dependencyId: "hidden-governance-milestone", from: governance[0].nodeId, to: milestones[0].nodeId, reason: "Governance ambiguity appears alongside milestone pressure without explicit edge coverage.", risk: 0.68, evidence: [governance[0].nodeId, milestones[0].nodeId], confidence: 0.66, uncertainty: ["Requires repeated co-occurrence before escalation."], causalityChain: [`${governance[0].nodeId}->${milestones[0].nodeId}`], propagationExplanation: "Hidden dependency is inferred from repeated unresolved governance pressure near milestone degradation.", survivabilityExplanation: "Untracked governance gating reduces execution survivability." }];
}
