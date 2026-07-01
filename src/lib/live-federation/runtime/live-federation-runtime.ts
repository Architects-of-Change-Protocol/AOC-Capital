import type {
  OAuthProvider,
  AuthenticatedFederationState,
  ConnectorSession,
} from "../types/live-federation-types.js";
import { retrieveConnectorSessionHealth } from "../sessions/connector-session-runtime.js";

export function initializeAuthenticatedFederation(
  tenantId: string,
  workspaceId: string,
): AuthenticatedFederationState {
  const now = new Date().toISOString();
  return {
    status: "unauthenticated",
    authenticatedConnectors: [],
    unauthenticatedConnectors: [],
    degradedConnectors: [],
    sessionFreshness: "unknown",
    connectorFreshness: "unknown",
    replayAuthorizationReady: false,
    survivabilityScore: 0,
    blockers: [
      "no connector sessions initialized — OAuth authorization required for each connector",
    ],
    warnings: [],
    governanceBoundaries: [
      "authenticated federation requires at least one active connector session",
      "replay authorization requires authenticated federation state",
      "federation state must be tenant and workspace scoped",
    ],
    tenantScope: tenantId,
    workspaceScope: workspaceId,
    evidence: [
      "federation runtime initialized with no active sessions",
    ],
    uncertainty: [
      "federation status will improve as connector OAuth flows are completed",
    ],
    checkedAt: now,
  };
}

export function retrieveAuthenticatedFederationState(
  sessions: ConnectorSession[],
  tenantId: string,
  workspaceId: string,
): AuthenticatedFederationState {
  const now = new Date().toISOString();

  const authenticatedConnectors: string[] = [];
  const unauthenticatedConnectors: string[] = [];
  const degradedConnectors: string[] = [];
  const blockers: string[] = [];
  const warnings: string[] = [];

  for (const session of sessions) {
    const health = retrieveConnectorSessionHealth(session);
    if (health.status === "active" && health.tokenFresh) {
      authenticatedConnectors.push(session.connectorId);
    } else if (health.status === "degraded" || !health.tokenFresh) {
      degradedConnectors.push(session.connectorId);
      warnings.push(`connector ${session.connectorId} (${session.provider}) is degraded`);
    } else {
      unauthenticatedConnectors.push(session.connectorId);
      if (health.blockers.length > 0) {
        blockers.push(...health.blockers.map((b) => `[${session.connectorId}] ${b}`));
      }
    }
  }

  const totalConnectors = sessions.length;
  const survivabilityScore = totalConnectors === 0
    ? 0
    : authenticatedConnectors.length / totalConnectors;

  const replayAuthorizationReady = authenticatedConnectors.length > 0;

  const sessionFreshness =
    authenticatedConnectors.length === totalConnectors && totalConnectors > 0
      ? "fresh"
      : degradedConnectors.length > 0
      ? "stale"
      : "unknown";

  const status =
    authenticatedConnectors.length === totalConnectors && totalConnectors > 0
      ? "authenticated"
      : degradedConnectors.length > 0
      ? "degraded"
      : unauthenticatedConnectors.length > 0
      ? "unauthenticated"
      : "unauthenticated";

  return {
    status,
    authenticatedConnectors,
    unauthenticatedConnectors,
    degradedConnectors,
    sessionFreshness,
    connectorFreshness: sessionFreshness,
    replayAuthorizationReady,
    survivabilityScore,
    blockers,
    warnings,
    governanceBoundaries: [
      "federation state must not expose token details",
      "unauthenticated connectors must not participate in replay",
      "federation state must be tenant-scoped",
    ],
    tenantScope: tenantId,
    workspaceScope: workspaceId,
    evidence: [
      `total connectors: ${totalConnectors}`,
      `authenticated: ${authenticatedConnectors.length}`,
      `degraded: ${degradedConnectors.length}`,
      `unauthenticated: ${unauthenticatedConnectors.length}`,
      `survivability score: ${survivabilityScore}`,
    ],
    uncertainty: [
      "federation freshness reflects session contract — live provider health not validated",
    ],
    checkedAt: now,
  };
}
