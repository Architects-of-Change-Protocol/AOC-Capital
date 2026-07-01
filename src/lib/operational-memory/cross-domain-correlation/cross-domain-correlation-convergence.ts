import type { CrossDomainConvergencePattern } from "./cross-domain-correlation-types";

export function detectSystemicInstability(patterns: CrossDomainConvergencePattern[]) {
  const score = patterns.reduce((sum, p) => sum + p.convergenceScore, 0) / Math.max(1, patterns.length);
  return {
    score,
    severity: score > 0.75 ? "critical" : score > 0.55 ? "high" : score > 0.35 ? "medium" : "low",
  } as const;
}
