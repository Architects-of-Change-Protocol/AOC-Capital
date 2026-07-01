import type { CorrelationLineageGraph, CrossDomainCluster, CrossDomainSignal } from "./cross-domain-correlation-types";

export function buildCorrelationGraph(signals: CrossDomainSignal[], clusters: CrossDomainCluster[]): CorrelationLineageGraph {
  const nodes = signals.map((s)=>({ id: s.id, type: "signal", domain: s.domain, status: s.unresolved ? "unresolved" : "resolved" }));
  const edges = clusters.flatMap((c)=>c.signalIds.map((id)=>({ from: c.clusterId, to: id, relation: "cluster_contains" })));
  return { nodes: [...nodes, ...clusters.map((c)=>({ id: c.clusterId, type: "cluster", domain: c.domains[0], status: c.escalationTrajectory }))], edges };
}
