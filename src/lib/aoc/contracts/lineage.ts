export type RuntimeLineage = {
  decisionId: string;
  runtimeDecisionId: string;
  traceId?: string;
  governanceEventId?: string;
  requestId?: string;
  actorLineage?: { actorUserId?: string | null; actorAgentId?: string | null; actorType?: string };
  delegationLineage?: { delegationId?: string | null; delegatedByUserId?: string | null };
  capabilityLineage?: { capabilityId?: string | null; capabilityGrantId?: string | null };
  timestamps: { decidedAt: string; auditedAt?: string; requestedAt?: string };
};

export function toRuntimeLineage(input: {
  decisionId: string;
  traceId?: string;
  requestId?: string;
  actorUserId?: string | null;
  actorAgentId?: string | null;
  actorType?: string;
  decidedAt: string;
}): RuntimeLineage {
  return {
    decisionId: input.decisionId,
    runtimeDecisionId: input.decisionId,
    traceId: input.traceId,
    requestId: input.requestId,
    actorLineage: {
      actorUserId: input.actorUserId ?? null,
      actorAgentId: input.actorAgentId ?? null,
      actorType: input.actorType,
    },
    timestamps: { decidedAt: input.decidedAt },
  };
}
