import type {
  OAuthProvider,
  OAuthAuthorizationRequest,
  OAuthAuthorizationResult,
  OAuthConnectorState,
} from "../types/live-federation-types.js";
import { getOAuthProviderMetadata, requiresProviderPKCE } from "./oauth-providers.js";
import { registerOAuthState } from "./oauth-state-validation.js";

function generateOpaqueState(): string {
  const bytes = new Uint8Array(32);
  if (typeof globalThis.crypto !== "undefined") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function buildOAuthAuthorizationRequest(
  provider: OAuthProvider,
  connectorId: string,
  tenantId: string,
  workspaceId: string,
  redirectUri: string,
  scopes?: string[],
): OAuthAuthorizationRequest {
  const now = new Date().toISOString();
  const meta = getOAuthProviderMetadata(provider);
  const state = generateOpaqueState();
  const resolvedScopes = scopes ?? meta.scopes;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  registerOAuthState(state, connectorId, provider, tenantId, workspaceId);

  return {
    provider,
    tenantId,
    workspaceId,
    connectorId,
    state,
    scopes: resolvedScopes,
    redirectUri,
    pkceCodeChallenge: requiresProviderPKCE(provider) ? "pkce_required_generate_at_request_time" : undefined,
    expiresAt,
    governanceBoundaries: [
      "redirect URI must match registered provider callback",
      "state token must be validated on callback",
      "tenant and workspace must be verified on callback",
      ...meta.governanceConstraints,
    ],
    evidence: [
      `provider: ${provider}`,
      `connector: ${connectorId}`,
      `tenant: ${tenantId}`,
      `workspace: ${workspaceId}`,
      `state registered with expiry: ${expiresAt}`,
    ],
    uncertainty: [
      "authorization URL is a governance contract — actual redirect requires runtime environment",
      requiresProviderPKCE(provider) ? "PKCE code challenge must be generated at runtime with verifier" : "PKCE not required for this provider",
    ],
    createdAt: now,
  };
}

export function evaluateOAuthReadiness(
  provider: OAuthProvider,
  connectorId: string,
  tenantId: string,
  workspaceId: string,
): OAuthAuthorizationResult {
  const now = new Date().toISOString();
  const meta = getOAuthProviderMetadata(provider);

  return {
    provider,
    connectorId,
    status: "authorization_pending",
    diagnostics: [
      `OAuth readiness evaluated for ${meta.displayName}`,
      `Required scopes: ${meta.scopes.join(", ")}`,
      `PKCE required: ${meta.pkceRequired}`,
      `Refreshable: ${meta.refreshable}`,
      "No live provider call executed — contract layer only",
    ],
    governanceBoundaries: [
      "OAuth authorization must be initiated server-side",
      "Redirect URI must never be client-supplied without validation",
      ...meta.governanceConstraints,
    ],
    tenantScope: tenantId,
    workspaceScope: workspaceId,
    evidence: [
      `provider metadata loaded for: ${provider}`,
      `connector readiness evaluated`,
    ],
    uncertainty: [
      "readiness reflects structural contracts — live provider availability not validated",
      "token exchange availability depends on runtime credentials",
    ],
    checkedAt: now,
  };
}

export function retrieveOAuthConnectorState(
  provider: OAuthProvider,
  connectorId: string,
  tenantId: string,
  workspaceId: string,
): OAuthConnectorState {
  const now = new Date().toISOString();

  return {
    provider,
    connectorId,
    status: "not_started",
    tokenPresent: false,
    tokenEncrypted: false,
    sessionActive: false,
    governanceBoundaries: [
      "connector state must be retrieved server-side only",
      "token presence must not be exposed client-side",
    ],
    tenantScope: tenantId,
    workspaceScope: workspaceId,
    evidence: [
      "connector state reflects structural runtime — no live token checked",
    ],
    uncertainty: [
      "live token presence requires encrypted persistence layer integration",
      "session state requires connector session runtime integration",
    ],
    checkedAt: now,
  };
}

export function retrieveOAuthDiagnostics(
  provider: OAuthProvider,
  connectorId: string,
  tenantId: string,
  workspaceId: string,
): OAuthAuthorizationResult {
  return evaluateOAuthReadiness(provider, connectorId, tenantId, workspaceId);
}
