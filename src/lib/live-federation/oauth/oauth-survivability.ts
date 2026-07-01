import type { OAuthProvider } from "../types/live-federation-types.js";
import { isProviderRefreshable, getProviderSurvivabilityExpectations } from "./oauth-providers.js";

export interface OAuthSurvivabilityState {
  provider: OAuthProvider;
  connectorId: string;
  survivable: boolean;
  refreshPathAvailable: boolean;
  reauthorizationRequired: boolean;
  survivabilityScore: number;
  expectations: string[];
  recommendations: string[];
  tenantScope: string;
  workspaceScope: string;
  evidence: string[];
  uncertainty: string[];
  checkedAt: string;
}

export function evaluateOAuthSurvivability(
  provider: OAuthProvider,
  connectorId: string,
  tenantId: string,
  workspaceId: string,
  tokenPresent: boolean,
  tokenExpired: boolean,
): OAuthSurvivabilityState {
  const now = new Date().toISOString();
  const refreshable = isProviderRefreshable(provider);
  const expectations = getProviderSurvivabilityExpectations(provider);

  let survivabilityScore = 0;
  const recommendations: string[] = [];

  if (!tokenPresent) {
    recommendations.push("Initiate OAuth authorization flow to establish connector session");
  } else if (tokenExpired && refreshable) {
    survivabilityScore = 0.4;
    recommendations.push("Execute token refresh before session expiry");
  } else if (tokenExpired && !refreshable) {
    recommendations.push("Re-authorization required — provider does not support refresh tokens");
  } else {
    survivabilityScore = 1.0;
  }

  const survivable = survivabilityScore > 0.3;
  const refreshPathAvailable = refreshable && tokenPresent;
  const reauthorizationRequired = !tokenPresent || (tokenExpired && !refreshable);

  return {
    provider,
    connectorId,
    survivable,
    refreshPathAvailable,
    reauthorizationRequired,
    survivabilityScore,
    expectations,
    recommendations,
    tenantScope: tenantId,
    workspaceScope: workspaceId,
    evidence: [
      `token present: ${tokenPresent}`,
      `token expired: ${tokenExpired}`,
      `provider refreshable: ${refreshable}`,
      `survivability score: ${survivabilityScore}`,
    ],
    uncertainty: [
      "survivability reflects structural contracts — live token validation requires persistence layer",
    ],
    checkedAt: now,
  };
}
