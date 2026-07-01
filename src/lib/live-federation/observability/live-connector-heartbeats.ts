import type {
  ConnectorSession,
  LiveConnectorHeartbeat,
  LiveFederationHeartbeatStatus,
} from "../types/live-federation-types.js";

const FRESHNESS_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function computeFreshnessStatus(lastSeenAt: string | undefined): LiveFederationHeartbeatStatus {
  if (!lastSeenAt) return "missing";
  const age = Date.now() - new Date(lastSeenAt).getTime();
  return age < FRESHNESS_WINDOW_MS ? "fresh" : "stale";
}

export function retrieveLiveConnectorHeartbeat(
  session: ConnectorSession,
): LiveConnectorHeartbeat {
  const now = new Date().toISOString();

  const sessionActive = session.status === "active";
  const tokenPresent = session.tokenState.present;

  const sessionFreshness: LiveFederationHeartbeatStatus = sessionActive
    ? computeFreshnessStatus(session.lastActivityAt)
    : "stale";

  const connectorFreshness: LiveFederationHeartbeatStatus = sessionActive && tokenPresent
    ? sessionFreshness
    : "stale";

  const providerFreshness: LiveFederationHeartbeatStatus = sessionActive
    ? "stale"
    : "missing";

  const replayFreshness: LiveFederationHeartbeatStatus = sessionActive && tokenPresent
    ? sessionFreshness
    : "stale";

  const refreshFreshness: LiveFederationHeartbeatStatus = session.tokenState.refreshEligible
    ? sessionFreshness
    : "missing";

  return {
    connectorId: session.connectorId,
    provider: session.provider,
    providerFreshness,
    connectorFreshness,
    replayFreshness,
    sessionFreshness,
    refreshFreshness,
    lastSeenAt: session.lastActivityAt,
    governanceBoundaries: [
      "heartbeat data must not expose token values",
      "heartbeat freshness reflects session state — not live provider probe",
    ],
    tenantScope: session.tenantScope,
    workspaceScope: session.workspaceScope,
    evidence: [
      `session active: ${sessionActive}`,
      `token present: ${tokenPresent}`,
      `last activity: ${session.lastActivityAt}`,
    ],
    uncertainty: [
      "provider freshness requires live HTTP probe — not performed at contract layer",
      "heartbeat freshness reflects session contract state only",
    ],
    checkedAt: now,
  };
}

export function retrieveLiveConnectorHeartbeats(
  sessions: ConnectorSession[],
  tenantId: string,
  workspaceId: string,
): LiveConnectorHeartbeat[] {
  return sessions
    .filter((s) => s.tenantId === tenantId && s.workspaceId === workspaceId)
    .map(retrieveLiveConnectorHeartbeat);
}
