import { randomUUID } from "node:crypto";

export type RuntimeLineage = {
  lineageId: string;
  correlationId: string;
  executionTraceId: string;
  delegationLineage: string[];
  decisionLineage: string[];
};

const mkId = (prefix: string) => `${prefix}_${randomUUID()}`;

export function createRuntimeLineage(seed?: Partial<RuntimeLineage>): RuntimeLineage {
  return {
    lineageId: seed?.lineageId ?? mkId("lin"),
    correlationId: seed?.correlationId ?? mkId("corr"),
    executionTraceId: seed?.executionTraceId ?? mkId("exec"),
    delegationLineage: seed?.delegationLineage ?? [],
    decisionLineage: seed?.decisionLineage ?? [],
  };
}

export function appendDecisionLineage(lineage: RuntimeLineage, decisionId: string): RuntimeLineage {
  return { ...lineage, decisionLineage: [...lineage.decisionLineage, decisionId] };
}
