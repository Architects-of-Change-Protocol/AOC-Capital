import type {
  OAuthProvider,
  ConnectorTokenState,
  ConnectorTokenRefreshResult,
} from "../types/live-federation-types.js";
import { isProviderRefreshable } from "../oauth/oauth-providers.js";

const REFRESH_WINDOW_MS = 5 * 60 * 1000; // refresh 5 minutes before expiry

export function evaluateTokenRefreshEligibility(
  token: ConnectorTokenState,
): ConnectorTokenRefreshResult {
  const now = new Date().toISOString();
  const blockers: string[] = [];
  const recommendations: string[] = [];

  if (!token.present) {
    blockers.push("token absent — OAuth authorization required before refresh is possible");
  }

  if (!isProviderRefreshable(token.provider)) {
    return {
      connectorId: token.connectorId,
      provider: token.provider,
      eligible: false,
      refreshStatus: "not_applicable",
      blockers: [`provider ${token.provider} does not support token refresh`],
      recommendations: ["re-authorization required for non-refreshable providers"],
      isAutomated: false,
      governanceBoundaries: [
        "non-refreshable providers require full re-authorization on expiry",
      ],
      tenantScope: token.tenantScope,
      workspaceScope: token.workspaceScope,
      evidence: [`provider ${token.provider} is not refreshable`],
      uncertainty: [],
      checkedAt: now,
    };
  }

  if (token.clientSideExposed) {
    blockers.push("CRITICAL: token client-side exposed — refresh blocked until governance resolved");
  }

  if (!token.refreshable) {
    blockers.push("token marked as non-refreshable — re-authorization required");
  }

  const approachingExpiry = token.expiresAt
    ? new Date(token.expiresAt).getTime() - Date.now() < REFRESH_WINDOW_MS
    : false;

  const expired = token.expiresAt
    ? new Date(token.expiresAt).getTime() < Date.now()
    : false;

  if (expired) {
    recommendations.push("token expired — execute refresh immediately or re-authorize if refresh fails");
  } else if (approachingExpiry) {
    recommendations.push(`token expiring within ${REFRESH_WINDOW_MS / 60000} minutes — proactive refresh recommended`);
  }

  const eligible = token.present && token.refreshable && !token.clientSideExposed && blockers.length === 0;
  const refreshStatus = eligible
    ? "eligible"
    : blockers.length > 0
    ? "ineligible"
    : "not_applicable";

  return {
    connectorId: token.connectorId,
    provider: token.provider,
    eligible,
    refreshStatus,
    blockers,
    recommendations,
    isAutomated: false,
    governanceBoundaries: [
      "token refresh must be executed server-side",
      "refreshed token must be re-encrypted before persistence",
      "refresh failure must trigger re-authorization recommendations",
    ],
    tenantScope: token.tenantScope,
    workspaceScope: token.workspaceScope,
    evidence: [
      `token present: ${token.present}`,
      `refreshable: ${token.refreshable}`,
      `approaching expiry: ${approachingExpiry}`,
      `expired: ${expired}`,
    ],
    uncertainty: [
      "live refresh requires provider SDK integration",
      "refresh success not guaranteed at contract layer",
    ],
    checkedAt: now,
  };
}

export function retrieveTokenRefreshDiagnostics(
  token: ConnectorTokenState,
): { status: string; message: string; isAutomated: false; evidence: string[] } {
  const eligibility = evaluateTokenRefreshEligibility(token);
  return {
    status: eligibility.refreshStatus,
    message: eligibility.eligible
      ? "Token refresh eligible — execute server-side refresh"
      : `Token refresh ineligible: ${eligibility.blockers.join("; ")}`,
    isAutomated: false,
    evidence: eligibility.evidence,
  };
}
