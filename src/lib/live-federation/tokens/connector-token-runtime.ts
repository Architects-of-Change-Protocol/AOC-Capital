import type {
  OAuthProvider,
  ConnectorTokenState,
} from "../types/live-federation-types.js";

export function buildConnectorTokenState(
  connectorId: string,
  provider: OAuthProvider,
  tenantId: string,
  workspaceId: string,
  options: {
    present?: boolean;
    encrypted?: boolean;
    expiresAt?: string;
    refreshable?: boolean;
    refreshEligible?: boolean;
  } = {},
): ConnectorTokenState {
  const now = new Date().toISOString();
  const {
    present = false,
    encrypted = false,
    expiresAt,
    refreshable = false,
    refreshEligible = false,
  } = options;

  return {
    connectorId,
    provider,
    present,
    encrypted,
    encryptionStatus: present ? (encrypted ? "encrypted" : "unencrypted") : "encryption_pending",
    clientSideExposed: false,
    expiresAt,
    refreshable,
    refreshEligible,
    governanceBoundaries: [
      "tokens must never be exposed client-side",
      "tokens must be encrypted before persistence",
      "token expiry must be monitored by refresh runtime",
      "tokens must be tenant and workspace scoped",
    ],
    tenantScope: tenantId,
    workspaceScope: workspaceId,
    evidence: [
      `token present: ${present}`,
      `token encrypted: ${encrypted}`,
      `refreshable: ${refreshable}`,
    ],
    uncertainty: [
      present
        ? "token validity requires live provider verification"
        : "token absent — OAuth authorization required before further operations",
    ],
    checkedAt: now,
  };
}

export function assertTokenNotClientSideExposed(token: ConnectorTokenState): void {
  if (token.clientSideExposed) {
    throw new Error(
      `GOVERNANCE VIOLATION: token for connector ${token.connectorId} (${token.provider}) is client-side exposed`
    );
  }
}

export function isTokenExpiredByState(token: ConnectorTokenState): boolean {
  if (!token.expiresAt) return false;
  return new Date(token.expiresAt).getTime() < Date.now();
}

export function isTokenRefreshEligible(token: ConnectorTokenState): boolean {
  return token.present && token.refreshable && !token.clientSideExposed;
}
