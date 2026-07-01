import { createRuntimeLineage, type RuntimeLineage } from "./runtime-lineage";

export type RuntimeExecutionContext = {
  workspaceId: string | null;
  projectId: string | null;
  actor: { actorId: string; actorType: "user" | "ai_agent" };
  runtimeMetadata: Record<string, unknown>;
  trustMetadata: Record<string, unknown>;
  delegationMetadata: Record<string, unknown>;
  executionMetadata: Record<string, unknown>;
  correlationIds: RuntimeLineage;
  runtimeVersion: string;
  tenantIsolation: { tenantId: string | null; trustDomain: string };
};

export function createRuntimeExecutionContext(input: Omit<RuntimeExecutionContext, "correlationIds" | "runtimeVersion"> & { correlationIds?: RuntimeLineage; runtimeVersion?: string }): RuntimeExecutionContext {
  return {
    ...input,
    correlationIds: input.correlationIds ?? createRuntimeLineage(),
    runtimeVersion: input.runtimeVersion ?? process.env.PMFREAK_RUNTIME_VERSION ?? "unknown",
  };
}
