import type { CrossDomainConvergencePattern, CrossDomainSignal } from "./cross-domain-correlation-types";

export function detectConvergencePatterns(signals: CrossDomainSignal[]): CrossDomainConvergencePattern[] {
  const patterns: CrossDomainConvergencePattern[] = [];
  const byDomain = new Map(signals.map((s) => [s.domain, signals.filter((x) => x.domain === s.domain)]));
  const define = (id: string, domains: CrossDomainConvergencePattern["domains"], hiddenCausality: string) => {
    const selected = domains.flatMap((d)=>byDomain.get(d) ?? []);
    if (selected.length < 2) return;
    const convergenceScore = selected.reduce((sum,s)=>sum+s.severity*s.confidence,0) / selected.length;
    if (convergenceScore < 0.35) return;
    patterns.push({ id, domains, convergenceScore, reinforcingDegradation: convergenceScore > 0.55, correlatedInstability: convergenceScore > 0.5, deliveryCollapseTrajectory: domains.includes("delivery") && convergenceScore > 0.6, hiddenCausality });
  };
  define("procurement-stakeholder", ["procurement", "stakeholder"], "Procurement friction persists while stakeholder silence suppresses resolution velocity.");
  define("financial-technical", ["financial", "technical"], "Financial blockers delay remediation, amplifying technical instability.");
  define("governance-delivery", ["governance", "delivery"], "Governance ambiguity compresses delivery timelines and increases blocker density.");
  return patterns;
}
