import type { CorrelationDiagnostic, CrossDomainCluster, CrossDomainConvergencePattern, CrossDomainRiskPropagation } from "./cross-domain-correlation-types";

export function buildCorrelationDiagnostics(patterns: CrossDomainConvergencePattern[], clusters: CrossDomainCluster[], propagation: CrossDomainRiskPropagation[]): CorrelationDiagnostic[] {
  return [
    { summary: `Detected ${patterns.length} convergence patterns from deterministic domain pairing.`, reasons: patterns.map((p)=>`${p.id}:${p.convergenceScore.toFixed(2)}`) },
    { summary: `Built ${clusters.length} correlated clusters using pressure and convergence weighting.`, reasons: clusters.map((c)=>`${c.clusterId}:${c.pressureScore.toFixed(2)}`) },
    { summary: `Modeled ${propagation.length} risk propagation links across operational domains.`, reasons: propagation.map((p)=>`${p.fromDomain}->${p.toDomain}:${p.pressureTransfer.toFixed(2)}`) },
  ];
}
