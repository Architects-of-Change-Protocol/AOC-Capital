import type { CorrelatedAtmosphereSummary, CrossDomainCluster, CrossDomainRiskPropagation } from "./cross-domain-correlation-types";

export function buildCorrelatedAtmosphere(clusters: CrossDomainCluster[], propagation: CrossDomainRiskPropagation[]): CorrelatedAtmosphereSummary {
  const convergenceDensity = clusters.reduce((sum,c)=>sum+c.convergenceScore,0) / Math.max(1, clusters.length);
  const propagationSeverity = propagation.reduce((sum,p)=>sum+p.pressureTransfer,0) / Math.max(1, propagation.length);
  const systemicInstability = Math.min(1, convergenceDensity * 0.6 + propagationSeverity * 0.4);
  const correlatedEscalation = Math.min(1, clusters.filter((c)=>c.escalationTrajectory !== "stable").length / Math.max(1, clusters.length));
  const operationalFragility = Math.min(1, (systemicInstability + correlatedEscalation) / 2);
  const recoveryProbability = Math.max(0, 1 - operationalFragility);
  return { convergenceDensity, propagationSeverity, systemicInstability, correlatedEscalation, operationalFragility, recoveryProbability, interventionExhaustion: operationalFragility, governanceErosion: systemicInstability, deliverySurvivability: recoveryProbability, trajectory: systemicInstability > 0.55 ? "degrading" : "stable", collapseProbability: operationalFragility };
}
