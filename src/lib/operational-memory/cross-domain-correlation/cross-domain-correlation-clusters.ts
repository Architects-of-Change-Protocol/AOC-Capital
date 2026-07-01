import type { CrossDomainCluster, CrossDomainConvergencePattern, CrossDomainSignal } from "./cross-domain-correlation-types";

export function buildCorrelationClusters(signals: CrossDomainSignal[], patterns: CrossDomainConvergencePattern[]): CrossDomainCluster[] {
  return patterns.map((pattern) => {
    const related = signals.filter((s)=>pattern.domains.includes(s.domain));
    const pressureScore = related.reduce((sum,s)=>sum+s.pressureContribution,0);
    return {
      clusterId: pattern.id,
      label: `${pattern.domains.map((d)=>d[0].toUpperCase()+d.slice(1)).join("-")} Convergence Cluster`,
      domains: pattern.domains,
      signalIds: related.map((s)=>s.id),
      pressureScore,
      convergenceScore: pattern.convergenceScore,
      escalationTrajectory: pattern.convergenceScore > 0.7 ? "critical" : pattern.convergenceScore > 0.45 ? "degrading" : "stable",
      atmosphereImpact: Math.min(1, pattern.convergenceScore * 1.1),
      operationalNarrative: pattern.hiddenCausality,
    };
  });
}
