import type {
  OAuthProvider,
  ConnectorTokenState,
  ConnectorTokenIsolationResult,
} from "../types/live-federation-types.js";

export function evaluateConnectorTokenIsolation(
  token: ConnectorTokenState,
  requestingTenantId: string,
  requestingWorkspaceId: string,
  requestingProvider: OAuthProvider,
): ConnectorTokenIsolationResult {
  const now = new Date().toISOString();
  const violations: string[] = [];

  const tenantIsolated = token.tenantScope === requestingTenantId;
  const workspaceIsolated = token.workspaceScope === requestingWorkspaceId;
  const providerIsolated = token.provider === requestingProvider;
  const replayIsolated = tenantIsolated && workspaceIsolated;
  const sessionIsolated = tenantIsolated && workspaceIsolated && providerIsolated;

  if (!tenantIsolated) {
    violations.push(`tenant isolation violated: token tenant ${token.tenantScope} !== requesting tenant ${requestingTenantId}`);
  }

  if (!workspaceIsolated) {
    violations.push(`workspace isolation violated: token workspace ${token.workspaceScope} !== requesting workspace ${requestingWorkspaceId}`);
  }

  if (!providerIsolated) {
    violations.push(`provider isolation violated: token provider ${token.provider} !== requesting provider ${requestingProvider}`);
  }

  if (token.clientSideExposed) {
    violations.push("CRITICAL: token client-side exposure breaks all isolation guarantees");
  }

  const isolationStatus = violations.length === 0
    ? "isolated"
    : violations.length <= 1
    ? "partial"
    : "violated";

  return {
    connectorId: token.connectorId,
    provider: token.provider,
    tenantIsolated,
    workspaceIsolated,
    providerIsolated,
    replayIsolated,
    sessionIsolated,
    isolationStatus,
    violations,
    governanceBoundaries: [
      "token access must be tenant-scoped",
      "token access must be workspace-scoped",
      "token access must be provider-scoped",
      "cross-tenant token access is prohibited",
      "replay access must respect tenant isolation",
    ],
    tenantScope: token.tenantScope,
    workspaceScope: token.workspaceScope,
    evidence: [
      `token tenant: ${token.tenantScope}`,
      `requesting tenant: ${requestingTenantId}`,
      `tenant isolated: ${tenantIsolated}`,
      `workspace isolated: ${workspaceIsolated}`,
      `provider isolated: ${providerIsolated}`,
      `isolation status: ${isolationStatus}`,
    ],
    uncertainty: [],
    checkedAt: now,
  };
}
