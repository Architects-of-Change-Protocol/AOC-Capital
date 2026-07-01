import type {
  OAuthProvider,
  ConnectorSession,
  ConnectorAuthBoundaryResult,
} from "../types/live-federation-types.js";

export function evaluateConnectorAuthBoundaries(
  session: ConnectorSession,
  requestingTenantId: string,
  requestingWorkspaceId: string,
): ConnectorAuthBoundaryResult {
  const now = new Date().toISOString();
  const violations: string[] = [];

  const callbackIsolated = session.tenantId === requestingTenantId && session.workspaceId === requestingWorkspaceId;
  const tokenIsolated = !session.tokenState.clientSideExposed && session.tokenState.encrypted;
  const replayIsolated = callbackIsolated && session.status !== "revoked";
  const tenantSessionIsolated = session.tenantId === requestingTenantId;
  const workspaceSessionIsolated = session.workspaceId === requestingWorkspaceId;
  const governanceVisible = tenantSessionIsolated && workspaceSessionIsolated;

  if (!callbackIsolated) {
    violations.push("callback isolation violated — session does not match requesting tenant/workspace");
  }

  if (!tokenIsolated) {
    if (session.tokenState.clientSideExposed) {
      violations.push("CRITICAL: token client-side exposure detected");
    }
    if (!session.tokenState.encrypted && session.tokenState.present) {
      violations.push("token encryption boundary violated — unencrypted token present");
    }
  }

  if (!tenantSessionIsolated) {
    violations.push("cross-tenant session access detected");
  }

  if (!workspaceSessionIsolated) {
    violations.push("cross-workspace session access detected");
  }

  return {
    connectorId: session.connectorId,
    provider: session.provider,
    callbackIsolated,
    tokenIsolated,
    replayIsolated,
    tenantSessionIsolated,
    workspaceSessionIsolated,
    governanceVisible,
    violations,
    governanceBoundaries: [
      "OAuth callbacks must be tenant and workspace isolated",
      "tokens must not be client-side exposed",
      "tokens must be encrypted",
      "session access must be tenant-scoped",
      "replay access must be workspace-scoped",
      "connector governance must be visible only to authorized parties",
    ],
    tenantScope: requestingTenantId,
    workspaceScope: requestingWorkspaceId,
    evidence: [
      `session tenant: ${session.tenantId}`,
      `requesting tenant: ${requestingTenantId}`,
      `callback isolated: ${callbackIsolated}`,
      `token isolated: ${tokenIsolated}`,
      `replay isolated: ${replayIsolated}`,
    ],
    uncertainty: [],
    checkedAt: now,
  };
}
