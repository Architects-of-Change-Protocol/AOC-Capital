import type {
  OAuthProvider,
  ConnectorSession,
  ConnectorSessionHealth,
  ConnectorTokenState,
} from "../types/live-federation-types.js";

function buildEmptyTokenState(
  connectorId: string,
  provider: OAuthProvider,
  tenantId: string,
  workspaceId: string,
): ConnectorTokenState {
  const now = new Date().toISOString();
  return {
    connectorId,
    provider,
    present: false,
    encrypted: false,
    encryptionStatus: "unencrypted",
    clientSideExposed: false,
    refreshable: false,
    refreshEligible: false,
    governanceBoundaries: [
      "token state must never be exposed client-side",
      "token must be encrypted before persistence",
    ],
    tenantScope: tenantId,
    workspaceScope: workspaceId,
    evidence: ["empty token state initialized"],
    uncertainty: ["token presence requires live persistence integration"],
    checkedAt: now,
  };
}

export function initializeConnectorSession(
  connectorId: string,
  provider: OAuthProvider,
  tenantId: string,
  workspaceId: string,
): ConnectorSession {
  const now = new Date().toISOString();
  const sessionId = `session:${provider}:${connectorId}:${Date.now()}`;

  return {
    id: sessionId,
    connectorId,
    provider,
    status: "initializing",
    tenantId,
    workspaceId,
    tokenState: buildEmptyTokenState(connectorId, provider, tenantId, workspaceId),
    initiatedAt: now,
    lastActivityAt: now,
    governanceBoundaries: [
      "connector session must be tenant-scoped",
      "connector session must be workspace-scoped",
      "session must not cross tenant boundaries",
    ],
    tenantScope: tenantId,
    workspaceScope: workspaceId,
    evidence: [
      `session initialized for provider: ${provider}`,
      `connector: ${connectorId}`,
      `tenant: ${tenantId}`,
      `workspace: ${workspaceId}`,
    ],
    uncertainty: [
      "session becomes active after successful token exchange",
      "session expiry depends on provider token lifetime",
    ],
  };
}

export function retrieveConnectorSessionHealth(
  session: ConnectorSession,
): ConnectorSessionHealth {
  const now = new Date().toISOString();
  const tokenFresh = session.tokenState.present && !isTokenExpired(session.tokenState.expiresAt);
  const sessionFresh = session.status === "active";
  const survivabilityScore = computeSessionSurvivability(session);

  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!session.tokenState.present) blockers.push("token absent — OAuth authorization required");
  if (!session.tokenState.encrypted) blockers.push("token not encrypted — governance violation risk");
  if (session.status === "expired") blockers.push("session expired — re-authorization required");
  if (session.status === "revoked") blockers.push("session revoked — operator intervention required");
  if (!tokenFresh && session.tokenState.refreshEligible) warnings.push("token approaching expiry — refresh recommended");
  if (session.tokenState.clientSideExposed) blockers.push("CRITICAL: token client-side exposure detected");

  return {
    sessionId: session.id,
    connectorId: session.connectorId,
    provider: session.provider,
    status: session.status,
    tokenFresh,
    sessionFresh,
    survivabilityScore,
    blockers,
    warnings,
    governanceBoundaries: session.governanceBoundaries,
    tenantScope: session.tenantScope,
    workspaceScope: session.workspaceScope,
    evidence: [
      `session status: ${session.status}`,
      `token present: ${session.tokenState.present}`,
      `token encrypted: ${session.tokenState.encrypted}`,
      `survivability score: ${survivabilityScore}`,
    ],
    uncertainty: [
      "session health reflects structural contracts — live provider validation not performed",
    ],
    checkedAt: now,
  };
}

export function evaluateConnectorSessionSurvivability(
  session: ConnectorSession,
): number {
  return computeSessionSurvivability(session);
}

function computeSessionSurvivability(session: ConnectorSession): number {
  if (session.status === "revoked") return 0;
  if (session.status === "expired") return 0.1;
  if (!session.tokenState.present) return 0;
  if (!session.tokenState.encrypted) return 0.3;
  if (session.status === "degraded") return 0.5;
  if (session.status === "active") return 1.0;
  return 0.2;
}

function isTokenExpired(expiresAt?: string): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}
