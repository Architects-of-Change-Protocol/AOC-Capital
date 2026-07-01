import type { CrossDomainSignal, CrossDomainWeight } from "./cross-domain-correlation-types";

export function buildCrossDomainWeights(signals: CrossDomainSignal[]): CrossDomainWeight[] {
  const domains = ["financial","technical","stakeholder","delivery","governance","procurement"] as const;
  return domains.map((domain) => {
    const ds = signals.filter((s)=>s.domain===domain);
    const unresolvedFactor = ds.filter((s)=>s.unresolved).length / Math.max(1, ds.length);
    const weight = Math.min(1, ds.reduce((sum,s)=>sum+s.pressureContribution,0) / Math.max(1, ds.length) + unresolvedFactor * 0.25);
    return { domain, weight, rationale: `${domain} weight derived from unresolved pressure and signal confidence.` };
  });
}
