export interface RoutingAuditEvent {
  timestamp: string;
  selectedProvider: string;
  routingMode: string;
  fallbackUsed: boolean;
  finalProvider: string;
  rejectedProviders: Array<{ providerId: string; reason: string }>;
  module?: string;
  workspaceId?: string;
  projectId?: string;
  actorType?: string;
  dataSensitivity?: string;
  requiresAudit?: boolean;
}

export function emitRoutingAudit(event: RoutingAuditEvent): void {
  // Metadata only. Prompts and content are never emitted here.
  console.info("[routing-audit]", JSON.stringify(event));
}

export function emitRoutingFallback(
  fromProvider: string,
  toProvider: string,
  reason: string,
  context: { module?: string; routingMode?: string },
): void {
  console.warn(
    "[routing-fallback]",
    JSON.stringify({
      fromProvider,
      toProvider,
      reason,
      module: context.module,
      routingMode: context.routingMode,
      timestamp: new Date().toISOString(),
    }),
  );
}
