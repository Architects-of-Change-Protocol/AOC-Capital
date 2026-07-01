import { detectLearnedExecutionPatterns as detectCanonicalLearnedExecutionPatterns } from "@/lib/operational-patterns/learned-execution-patterns";
import type { LearnedExecutionPatternInput, LearnedExecutionPattern as CanonicalPattern } from "@/lib/operational-patterns/learned-execution-patterns";

export type LearnedExecutionPatternRequest = LearnedExecutionPatternInput;
export type ExecutionPattern = {
  patternId: string;
  patternType: string;
  severity: "low" | "medium" | "high" | "critical";
  recurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  trend: "stable" | "increasing" | "decreasing";
  operationalImpactScore: number;
  explanation: string;
  representativeEvidence: string[];
  relatedStakeholders: string[];
  unresolvedCount: number;
};
export type LearnedExecutionPatternResult = {
  generatedAt: string;
  status: "ok" | "empty" | "degraded";
  patterns: ExecutionPattern[];
  chronicRisks: ExecutionPattern[];
  recurringEscalations: ExecutionPattern[];
  recurringDependencies: ExecutionPattern[];
  stakeholderInstabilityPatterns: ExecutionPattern[];
  operationalHealthScore: number;
  summary: string[];
  degradationReason?: string;
};

const toTrend = (p: CanonicalPattern): ExecutionPattern["trend"] => (p.trendDirection === "worsening" ? "increasing" : p.trendDirection === "improving" ? "decreasing" : "stable");
const impact = (p: CanonicalPattern) => Math.max(0, Math.min(100, Math.round(p.rankingScore)));
const unresolvedCount = (p: CanonicalPattern) => (p.unresolved ? Math.max(1, Math.ceil(p.recurrenceCount * 0.6)) : 0);
const toLegacy = (p: CanonicalPattern): ExecutionPattern => ({
  patternId: p.id,
  patternType: p.patternType,
  severity: p.severity,
  recurrenceCount: p.recurrenceCount,
  firstSeenAt: p.firstObservedAt,
  lastSeenAt: p.lastObservedAt,
  trend: toTrend(p),
  operationalImpactScore: impact(p),
  explanation: p.explanation,
  representativeEvidence: p.evidenceRefs.slice(0, 4),
  relatedStakeholders: p.stakeholders.slice(0, 6),
  unresolvedCount: unresolvedCount(p),
});

const health = (patterns: ExecutionPattern[]) => Math.max(0, Math.min(100, 100 - patterns.reduce((acc, p) => acc + (p.severity === "critical" ? 16 : p.severity === "high" ? 10 : p.severity === "medium" ? 6 : 3), 0)));
const statusMap = (s: "detected" | "none" | "degraded"): LearnedExecutionPatternResult["status"] => (s === "detected" ? "ok" : s === "none" ? "empty" : "degraded");

export async function detectLearnedExecutionPatterns(request: LearnedExecutionPatternRequest): Promise<LearnedExecutionPatternResult> {
  const canonical = await detectCanonicalLearnedExecutionPatterns(request);
  const patterns = canonical.patterns.map(toLegacy);
  return {
    generatedAt: canonical.generatedAt,
    status: statusMap(canonical.status),
    patterns,
    chronicRisks: patterns.filter((p) => ["recurring_blocker", "governance_decay", "delivery_drift", "timeline_pressure_acceleration"].includes(p.patternType)),
    recurringEscalations: patterns.filter((p) => p.patternType === "escalation_loop"),
    recurringDependencies: patterns.filter((p) => p.patternType === "dependency_instability"),
    stakeholderInstabilityPatterns: patterns.filter((p) => p.patternType === "stakeholder_friction"),
    operationalHealthScore: health(patterns),
    summary: canonical.summary,
    degradationReason: canonical.degradationReason,
  };
}
