import type {
  OAuthProvider,
  ConnectorProvisioningState,
} from "../types/live-federation-types.js";
import { getOAuthProviderMetadata } from "../oauth/oauth-providers.js";

export function initializeConnectorProvisioning(
  connectorId: string,
  provider: OAuthProvider,
  tenantId: string,
  workspaceId: string,
): ConnectorProvisioningState {
  const now = new Date().toISOString();
  const meta = getOAuthProviderMetadata(provider);

  return {
    connectorId,
    provider,
    status: "pending",
    tenantBootstrapped: false,
    workspaceBootstrapped: false,
    oauthReadiness: "pending",
    federationReadiness: "pending",
    onboardingReadiness: "pending",
    blockers: [
      "tenant connector bootstrap not complete",
      "workspace connector bootstrap not complete",
      "OAuth authorization not completed",
    ],
    governanceBoundaries: [
      "connector provisioning must be tenant-scoped",
      "connector provisioning must be workspace-scoped",
      `connector provisioning must respect ${meta.displayName} governance constraints`,
    ],
    tenantScope: tenantId,
    workspaceScope: workspaceId,
    evidence: [
      `connector: ${connectorId}`,
      `provider: ${meta.displayName}`,
      `tenant: ${tenantId}`,
      `workspace: ${workspaceId}`,
      "provisioning initialized — bootstrapping required",
    ],
    uncertainty: [
      "provisioning completion requires OAuth authorization and session establishment",
    ],
    checkedAt: now,
  };
}

export function evaluateConnectorProvisioningReadiness(
  state: ConnectorProvisioningState,
): { ready: boolean; blockers: string[]; recommendations: string[] } {
  const blockers: string[] = [];
  const recommendations: string[] = [];

  if (!state.tenantBootstrapped) {
    blockers.push("tenant connector bootstrap incomplete");
    recommendations.push("Complete tenant-level connector bootstrap before provisioning");
  }

  if (!state.workspaceBootstrapped) {
    blockers.push("workspace connector bootstrap incomplete");
    recommendations.push("Complete workspace-level connector bootstrap before provisioning");
  }

  if (state.oauthReadiness !== "ready") {
    blockers.push("OAuth authorization not ready");
    recommendations.push("Initiate OAuth flow for connector");
  }

  if (state.federationReadiness !== "ready") {
    blockers.push("federation readiness pending");
    recommendations.push("Complete federation contract binding after OAuth");
  }

  return {
    ready: blockers.length === 0,
    blockers,
    recommendations,
  };
}

export function bootstrapTenantConnector(
  state: ConnectorProvisioningState,
): ConnectorProvisioningState {
  return {
    ...state,
    tenantBootstrapped: true,
    status: state.workspaceBootstrapped ? "provisioning" : "pending",
    blockers: state.blockers.filter((b) => !b.includes("tenant connector bootstrap")),
    checkedAt: new Date().toISOString(),
  };
}

export function bootstrapWorkspaceConnector(
  state: ConnectorProvisioningState,
): ConnectorProvisioningState {
  return {
    ...state,
    workspaceBootstrapped: true,
    status: state.tenantBootstrapped ? "provisioning" : "pending",
    blockers: state.blockers.filter((b) => !b.includes("workspace connector bootstrap")),
    checkedAt: new Date().toISOString(),
  };
}
