import { buildEnterpriseRuntimeRequest, type PMFreakRuntimeContextInput } from "@/lib/aoc/pmfreak-runtime-consumer";
import { bootstrapRuntimeConsumer } from "./runtime-bootstrap";
import { normalizeRuntimeDecision } from "./runtime-decision";
import { createRuntimeExecutionContext } from "./runtime-context";
import { RuntimeDependencyUnavailableError } from "./runtime-errors";
import { authorizeRuntimeAction, enforceRuntimeAuthorization } from "./runtime-authorization";

export class RuntimeConsumerClient {
  async authorizeAction(input: PMFreakRuntimeContextInput) {
    bootstrapRuntimeConsumer();
    try {
      const decision = await authorizeRuntimeAction(buildEnterpriseRuntimeRequest(input));
      const context = createRuntimeExecutionContext({ workspaceId: input.workspaceId ?? null, projectId: input.projectId ?? null, actor: { actorId: input.user.id, actorType: input.actorAgentId ? "ai_agent" : "user" }, runtimeMetadata: { routeId: input.routeId }, trustMetadata: {}, delegationMetadata: {}, executionMetadata: {}, tenantIsolation: { tenantId: input.workspaceId ?? null, trustDomain: "pmfreak" } });
      return normalizeRuntimeDecision({ decisionId: decision.decisionId, actorId: input.user.id, actorType: input.actorAgentId ? "ai_agent" : "user", allowed: decision.allowed, reason: decision.reason, lineage: context.correlationIds, audit: decision.runtimeMetadata });
    } catch (error) {
      throw new RuntimeDependencyUnavailableError("Authorization dependency failed; deny by fail-closed semantics.", { error: error instanceof Error ? error.message : String(error) });
    }
  }

  async evaluateCapability(input: PMFreakRuntimeContextInput) { return this.authorizeAction(input); }
  async verifyTrust(input: Parameters<typeof enforceRuntimeAuthorization>[0]) { return enforceRuntimeAuthorization(input); }
  async recordRuntimeEvent(eventType: string, metadata: Record<string, unknown>) { return { eventType, metadata, emittedAt: new Date().toISOString() }; }
}

export const runtimeConsumerClient = new RuntimeConsumerClient();
