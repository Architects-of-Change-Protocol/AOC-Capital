import type { RuntimeLineage } from "./runtime-lineage";

export type RuntimeDecisionEnvelope = {
  decisionId: string;
  authority: string;
  runtimeVersion: string;
  trustDomain: string;
  evaluationTimestamp: string;
  actorId: string;
  actorType: "user" | "ai_agent";
  allowed: boolean;
  reason: string;
  lineage: RuntimeLineage;
  audit: Record<string, unknown>;
};

export function normalizeRuntimeDecision(input: Partial<RuntimeDecisionEnvelope> & Pick<RuntimeDecisionEnvelope, "decisionId" | "actorId" | "actorType" | "allowed" | "reason" | "lineage">): RuntimeDecisionEnvelope {
  return {
    decisionId: input.decisionId,
    authority: input.authority ?? "aoc-enterprise-runtime",
    runtimeVersion: input.runtimeVersion ?? process.env.PMFREAK_RUNTIME_VERSION ?? "unknown",
    trustDomain: input.trustDomain ?? "pmfreak",
    evaluationTimestamp: input.evaluationTimestamp ?? new Date().toISOString(),
    actorId: input.actorId,
    actorType: input.actorType,
    allowed: input.allowed,
    reason: input.reason,
    lineage: input.lineage,
    audit: input.audit ?? {},
  };
}
