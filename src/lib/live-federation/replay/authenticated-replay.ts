import type {
  OAuthProvider,
  ConnectorSession,
  AuthenticatedReplayBoundary,
} from "../types/live-federation-types.js";

export function buildAuthenticatedReplayBoundary(
  session: ConnectorSession,
  requestingTenantId: string,
  requestingWorkspaceId: string,
): AuthenticatedReplayBoundary {
  const now = new Date().toISOString();

  const tenantIsolated = session.tenantId === requestingTenantId;
  const workspaceScoped = session.workspaceId === requestingWorkspaceId;
  const sessionActive = session.status === "active";
  const tokenPresent = session.tokenState.present;
  const tokenEncrypted = session.tokenState.encrypted;

  const replayAuthorized = tenantIsolated && workspaceScoped && sessionActive && tokenPresent;

  const replayScope = tenantIsolated && workspaceScoped
    ? "workspace_scoped"
    : tenantIsolated
    ? "tenant_scoped"
    : "unauthorized";

  const governanceSafe = tenantIsolated && workspaceScoped && !session.tokenState.clientSideExposed;

  const visibility = replayAuthorized
    ? "authorized"
    : tenantIsolated
    ? "restricted"
    : "redacted";

  return {
    connectorId: session.connectorId,
    provider: session.provider,
    replayAuthorized,
    replayScope,
    tenantIsolated,
    governanceSafe,
    visibility,
    governanceBoundaries: [
      "replay must be tenant-scoped and workspace-scoped",
      "replay authorization requires active session",
      "replay must not expose cross-tenant signals",
      "replay visibility is restricted to authorized governance consumers",
    ],
    tenantScope: requestingTenantId,
    workspaceScope: requestingWorkspaceId,
    evidence: [
      `session tenant: ${session.tenantId}`,
      `requesting tenant: ${requestingTenantId}`,
      `tenant isolated: ${tenantIsolated}`,
      `workspace scoped: ${workspaceScoped}`,
      `session active: ${sessionActive}`,
      `token present: ${tokenPresent}`,
      `token encrypted: ${tokenEncrypted}`,
    ],
    uncertainty: [
      "replay authorization reflects session contract — live signal authorization requires governance layer",
    ],
    checkedAt: now,
  };
}

export function validateReplayAuthorization(
  session: ConnectorSession,
  requestingTenantId: string,
  requestingWorkspaceId: string,
): { authorized: boolean; reason: string } {
  const boundary = buildAuthenticatedReplayBoundary(session, requestingTenantId, requestingWorkspaceId);

  if (!boundary.tenantIsolated) {
    return { authorized: false, reason: "cross-tenant replay access denied" };
  }

  if (boundary.replayScope === "unauthorized") {
    return { authorized: false, reason: "replay scope not authorized" };
  }

  if (!boundary.replayAuthorized) {
    return { authorized: false, reason: "session not active or token absent" };
  }

  return { authorized: true, reason: "replay authorized within tenant and workspace boundaries" };
}
