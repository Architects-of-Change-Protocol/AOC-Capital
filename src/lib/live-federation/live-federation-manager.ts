import type {
  OAuthProvider,
  OAuthAuthorizationResult,
  ConnectorSession,
  ConnectorSessionHealth,
  AuthenticatedFederationState,
  ConnectorTokenIsolationResult,
  LiveConnectorObservabilitySnapshot,
  LiveConnectorHeartbeat,
  LiveConnectorTopology,
  ConnectorProvisioningState,
  ConnectorRecoveryRecommendation,
  LiveFederationSnapshot,
  LiveFederationNarrative,
} from "./types/live-federation-types.js";
import { retrieveOAuthDiagnostics } from "./oauth/oauth-runtime.js";
import { retrieveConnectorSessionHealth } from "./sessions/connector-session-runtime.js";
import { retrieveAuthenticatedFederationState } from "./runtime/live-federation-runtime.js";
import { evaluateConnectorTokenIsolation } from "./isolation/connector-token-isolation.js";
import { retrieveLiveConnectorObservability } from "./observability/live-connector-observability.js";
import { retrieveLiveConnectorHeartbeat } from "./observability/live-connector-heartbeats.js";
import { buildLiveConnectorTopology } from "./topology/live-connector-topology.js";
import { initializeConnectorProvisioning } from "./provisioning/connector-provisioning.js";
import { generateConnectorRecoveryRecommendations } from "./survivability/connector-runtime-recovery.js";
import { generateLiveFederationNarratives } from "./narratives/live-federation-narratives.js";

export function retrieveOAuthDiagnosticsForConnector(
  provider: OAuthProvider,
  connectorId: string,
  tenantId: string,
  workspaceId: string,
): OAuthAuthorizationResult {
  return retrieveOAuthDiagnostics(provider, connectorId, tenantId, workspaceId);
}

export function retrieveConnectorSessionHealthSnapshot(
  session: ConnectorSession,
): ConnectorSessionHealth {
  return retrieveConnectorSessionHealth(session);
}

export function retrieveAuthenticatedFederationSnapshot(
  sessions: ConnectorSession[],
  tenantId: string,
  workspaceId: string,
): AuthenticatedFederationState {
  return retrieveAuthenticatedFederationState(sessions, tenantId, workspaceId);
}

export function retrieveConnectorTokenIsolation(
  session: ConnectorSession,
  requestingTenantId: string,
  requestingWorkspaceId: string,
): ConnectorTokenIsolationResult {
  return evaluateConnectorTokenIsolation(
    session.tokenState,
    requestingTenantId,
    requestingWorkspaceId,
    session.provider,
  );
}

export function retrieveLiveConnectorObservabilitySnapshot(
  session: ConnectorSession,
): LiveConnectorObservabilitySnapshot {
  return retrieveLiveConnectorObservability(session);
}

export function retrieveLiveConnectorHeartbeatsForSessions(
  sessions: ConnectorSession[],
  tenantId: string,
  workspaceId: string,
): LiveConnectorHeartbeat[] {
  return sessions
    .filter((s) => s.tenantId === tenantId && s.workspaceId === workspaceId)
    .map(retrieveLiveConnectorHeartbeat);
}

export function retrieveLiveConnectorTopologySnapshot(
  sessions: ConnectorSession[],
  tenantId: string,
  workspaceId: string,
): LiveConnectorTopology {
  return buildLiveConnectorTopology(sessions, tenantId, workspaceId);
}

export function retrieveConnectorProvisioning(
  connectorId: string,
  provider: OAuthProvider,
  tenantId: string,
  workspaceId: string,
): ConnectorProvisioningState {
  return initializeConnectorProvisioning(connectorId, provider, tenantId, workspaceId);
}

export function retrieveConnectorRecoveryRecommendations(
  session: ConnectorSession,
): ConnectorRecoveryRecommendation[] {
  const health = retrieveConnectorSessionHealth(session);
  return generateConnectorRecoveryRecommendations(session, health);
}

export function retrieveLiveFederationSnapshot(
  sessions: ConnectorSession[],
  tenantId: string,
  workspaceId: string,
): LiveFederationSnapshot {
  const now = new Date().toISOString();

  const federationState = retrieveAuthenticatedFederationState(sessions, tenantId, workspaceId);
  const sessionHealths = sessions.map(retrieveConnectorSessionHealth);
  const observability = sessions.map(retrieveLiveConnectorObservability);
  const heartbeats = sessions.map(retrieveLiveConnectorHeartbeat);
  const topology = buildLiveConnectorTopology(sessions, tenantId, workspaceId);

  const tokenIsolation = sessions.map((s) =>
    evaluateConnectorTokenIsolation(s.tokenState, tenantId, workspaceId, s.provider)
  );

  const oauthDiagnostics = sessions.map((s) =>
    retrieveOAuthDiagnostics(s.provider, s.connectorId, tenantId, workspaceId)
  );

  const provisioning = sessions.map((s) =>
    initializeConnectorProvisioning(s.connectorId, s.provider, tenantId, workspaceId)
  );

  const recoveryRecommendations = sessions.flatMap((s, i) =>
    generateConnectorRecoveryRecommendations(s, sessionHealths[i])
  );

  const narratives: LiveFederationNarrative[] = generateLiveFederationNarratives(
    federationState,
    observability,
    tokenIsolation,
    sessionHealths,
  );

  return {
    federationStatus: federationState.status,
    oauthDiagnostics,
    connectorSessions: sessionHealths,
    tokenIsolation,
    observability,
    heartbeats,
    topology,
    provisioning,
    recoveryRecommendations,
    narratives,
    governanceBoundaries: [
      "live federation snapshot must not expose token values",
      "snapshot visibility is restricted to authorized operators",
      "snapshot must be tenant and workspace scoped",
    ],
    tenantScope: tenantId,
    workspaceScope: workspaceId,
    evidence: [
      `sessions evaluated: ${sessions.length}`,
      `federation status: ${federationState.status}`,
      `narratives generated: ${narratives.length}`,
    ],
    uncertainty: [
      "snapshot reflects session contracts — live provider availability not validated",
    ],
    checkedAt: now,
  };
}
