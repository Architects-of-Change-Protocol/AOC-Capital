import type {
  ConnectorSession,
  ConnectorSessionBoundary,
} from "../types/live-federation-types.js";

export function evaluateConnectorSessionBoundary(
  session: ConnectorSession,
  requestingTenantId: string,
  requestingWorkspaceId: string,
): ConnectorSessionBoundary {
  const now = new Date().toISOString();

  const tenantMatch = session.tenantId === requestingTenantId;
  const workspaceMatch = session.workspaceId === requestingWorkspaceId;
  const isolationEnforced = tenantMatch && workspaceMatch;

  const crossTenantLeakRisk = !tenantMatch ? "high" : !workspaceMatch ? "low" : "none";

  return {
    sessionId: session.id,
    connectorId: session.connectorId,
    tenantId: session.tenantId,
    workspaceId: session.workspaceId,
    isolationEnforced,
    replayIsolated: isolationEnforced,
    crossTenantLeakRisk,
    governanceBoundaries: [
      "session boundaries enforce tenant isolation",
      "session replay must be workspace-scoped",
      "cross-tenant session access is prohibited",
    ],
    evidence: [
      `session tenant: ${session.tenantId}`,
      `requesting tenant: ${requestingTenantId}`,
      `tenant match: ${tenantMatch}`,
      `workspace match: ${workspaceMatch}`,
    ],
    uncertainty: [],
    checkedAt: now,
  };
}

export function assertSessionGovernance(session: ConnectorSession): string[] {
  const violations: string[] = [];
  if (session.tokenState.clientSideExposed) {
    violations.push("CRITICAL: token is client-side exposed — governance contract violated");
  }
  if (!session.tokenState.encrypted && session.tokenState.present) {
    violations.push("token is present but not encrypted — encryption governance contract violated");
  }
  if (!session.tenantId || !session.workspaceId) {
    violations.push("session missing tenant or workspace scope — isolation contract violated");
  }
  return violations;
}
