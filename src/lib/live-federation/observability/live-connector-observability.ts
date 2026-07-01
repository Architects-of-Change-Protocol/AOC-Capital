import type {
  ConnectorSession,
  LiveConnectorObservabilitySnapshot,
} from "../types/live-federation-types.js";
import { retrieveConnectorSessionHealth } from "../sessions/connector-session-runtime.js";
import { evaluateTokenRefreshEligibility } from "../refresh/connector-token-refresh.js";

export function retrieveLiveConnectorObservability(
  session: ConnectorSession,
): LiveConnectorObservabilitySnapshot {
  const now = new Date().toISOString();
  const health = retrieveConnectorSessionHealth(session);
  const refreshEligibility = evaluateTokenRefreshEligibility(session.tokenState);

  const healthStatus = health.status === "active" && health.tokenFresh
    ? "healthy"
    : health.status === "expired"
    ? "auth_required"
    : health.status === "revoked"
    ? "auth_required"
    : health.status === "degraded"
    ? "degraded"
    : !health.tokenFresh
    ? "stale"
    : "degraded";

  const tokenRefreshReadiness =
    refreshEligibility.refreshStatus === "eligible"
      ? "ready"
      : refreshEligibility.refreshStatus === "ineligible"
      ? "blocked"
      : "degraded";

  const federationFreshness =
    health.sessionFresh && health.tokenFresh ? "fresh" : !health.sessionFresh ? "stale" : "unknown";

  const callbackSurvivability = health.status === "initializing"
    ? "degraded"
    : health.status === "active"
    ? "healthy"
    : "degraded";

  return {
    connectorId: session.connectorId,
    provider: session.provider,
    healthStatus,
    sessionSurvivability: health.survivabilityScore,
    tokenRefreshReadiness,
    federationFreshness,
    callbackSurvivability,
    lastObservedAt: now,
    governanceBoundaries: [
      "observability must not expose token values",
      "observability must not expose tenant secrets",
      "observability access is restricted to authorized operators",
    ],
    tenantScope: session.tenantScope,
    workspaceScope: session.workspaceScope,
    evidence: [
      `session status: ${health.status}`,
      `health status: ${healthStatus}`,
      `token refresh readiness: ${tokenRefreshReadiness}`,
      `federation freshness: ${federationFreshness}`,
      `session survivability: ${health.survivabilityScore}`,
    ],
    uncertainty: [
      "observability reflects session contract — live provider health requires external probe",
    ],
    checkedAt: now,
  };
}

export function aggregateFederationObservability(
  snapshots: LiveConnectorObservabilitySnapshot[],
  tenantId: string,
  workspaceId: string,
): {
  overallHealth: string;
  healthyCount: number;
  degradedCount: number;
  authRequiredCount: number;
  evidence: string[];
  checkedAt: string;
} {
  const now = new Date().toISOString();
  const healthyCount = snapshots.filter((s) => s.healthStatus === "healthy").length;
  const degradedCount = snapshots.filter((s) => s.healthStatus === "degraded" || s.healthStatus === "stale").length;
  const authRequiredCount = snapshots.filter((s) => s.healthStatus === "auth_required" || s.healthStatus === "offline").length;

  const overallHealth =
    authRequiredCount > 0
      ? "auth_required"
      : degradedCount > 0
      ? "degraded"
      : healthyCount === snapshots.length && snapshots.length > 0
      ? "healthy"
      : "unknown";

  return {
    overallHealth,
    healthyCount,
    degradedCount,
    authRequiredCount,
    evidence: [
      `total connectors observed: ${snapshots.length}`,
      `healthy: ${healthyCount}`,
      `degraded: ${degradedCount}`,
      `auth_required: ${authRequiredCount}`,
    ],
    checkedAt: now,
  };
}
