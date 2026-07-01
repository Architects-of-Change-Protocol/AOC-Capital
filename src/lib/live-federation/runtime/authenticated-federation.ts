import type {
  OAuthProvider,
  ConnectorSession,
  AuthenticatedFederationState,
} from "../types/live-federation-types.js";
import { retrieveConnectorSessionHealth } from "../sessions/connector-session-runtime.js";

export interface AuthenticatedIngestionBoundary {
  connectorId: string;
  provider: OAuthProvider;
  ingestionAuthorized: boolean;
  sessionRequired: boolean;
  tokenRequired: boolean;
  governanceBoundaries: string[];
  tenantScope: string;
  workspaceScope: string;
  evidence: string[];
  uncertainty: string[];
  checkedAt: string;
}

export function evaluateAuthenticatedIngestionBoundary(
  session: ConnectorSession,
): AuthenticatedIngestionBoundary {
  const now = new Date().toISOString();
  const health = retrieveConnectorSessionHealth(session);
  const ingestionAuthorized = health.status === "active" && health.tokenFresh;

  return {
    connectorId: session.connectorId,
    provider: session.provider,
    ingestionAuthorized,
    sessionRequired: true,
    tokenRequired: true,
    governanceBoundaries: [
      "ingestion requires an active, authenticated connector session",
      "ingestion must be tenant-scoped",
      "ingestion must not proceed with expired or revoked tokens",
    ],
    tenantScope: session.tenantScope,
    workspaceScope: session.workspaceScope,
    evidence: [
      `session status: ${health.status}`,
      `token fresh: ${health.tokenFresh}`,
      `ingestion authorized: ${ingestionAuthorized}`,
    ],
    uncertainty: [
      "live ingestion requires provider SDK integration",
    ],
    checkedAt: now,
  };
}

export function retrieveAuthenticatedFederationDiagnostics(
  federationState: AuthenticatedFederationState,
): { healthy: boolean; diagnostics: string[]; recommendations: string[] } {
  const diagnostics: string[] = [];
  const recommendations: string[] = [];

  if (federationState.status === "unauthenticated") {
    diagnostics.push("No connectors are authenticated");
    recommendations.push("Initiate OAuth authorization flows for required connectors");
  }

  if (federationState.degradedConnectors.length > 0) {
    diagnostics.push(`Degraded connectors: ${federationState.degradedConnectors.join(", ")}`);
    recommendations.push("Review degraded connector sessions and execute token refresh or re-authorization");
  }

  if (!federationState.replayAuthorizationReady) {
    diagnostics.push("Replay authorization not available — no authenticated connectors");
    recommendations.push("Establish at least one authenticated connector session to enable replay");
  }

  for (const blocker of federationState.blockers) {
    diagnostics.push(`Blocker: ${blocker}`);
  }

  return {
    healthy: federationState.status === "authenticated",
    diagnostics,
    recommendations,
  };
}
