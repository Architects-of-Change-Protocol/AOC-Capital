import type {
  OAuthProvider,
  OAuthCallbackState,
} from "../types/live-federation-types.js";
import { validateOAuthState } from "../oauth/oauth-state-validation.js";

export type CallbackValidationStatus =
  | "valid"
  | "invalid_state"
  | "provider_error"
  | "missing_code"
  | "governance_violation";

export interface OAuthCallbackValidationResult {
  status: CallbackValidationStatus;
  connectorId: string;
  provider: OAuthProvider;
  sessionCreationEligible: boolean;
  failureClassification?: string;
  diagnostics: string[];
  isAutomated: false;
  governanceBoundaries: string[];
  tenantScope: string;
  workspaceScope: string;
  evidence: string[];
  uncertainty: string[];
  checkedAt: string;
}

export interface OAuthCallbackExchangeContract {
  connectorId: string;
  provider: OAuthProvider;
  exchangeRequired: boolean;
  exchangeEndpoint: string;
  redirectUri: string;
  codePresent: boolean;
  governanceBoundaries: string[];
  tenantScope: string;
  workspaceScope: string;
  evidence: string[];
  uncertainty: string[];
}

export function validateOAuthCallback(
  callback: OAuthCallbackState,
  tenantId: string,
  workspaceId: string,
): OAuthCallbackValidationResult {
  const now = new Date().toISOString();

  if (callback.error) {
    return {
      status: "provider_error",
      connectorId: "unknown",
      provider: callback.provider,
      sessionCreationEligible: false,
      failureClassification: `provider_error:${callback.error}`,
      diagnostics: [
        `Provider returned error: ${callback.error}`,
        callback.errorDescription ? `Error description: ${callback.errorDescription}` : "No error description provided",
        "OAuth flow cannot proceed — provider denied authorization",
      ],
      isAutomated: false,
      governanceBoundaries: [
        "Provider errors must be logged for governance audit",
        "Callback errors must not leak token or session state",
      ],
      tenantScope: tenantId,
      workspaceScope: workspaceId,
      evidence: [`provider error: ${callback.error}`],
      uncertainty: ["provider error classification may not be exhaustive"],
      checkedAt: now,
    };
  }

  if (!callback.code) {
    return {
      status: "missing_code",
      connectorId: "unknown",
      provider: callback.provider,
      sessionCreationEligible: false,
      failureClassification: "missing_authorization_code",
      diagnostics: [
        "Authorization code absent from callback",
        "OAuth flow cannot proceed — no code to exchange",
      ],
      isAutomated: false,
      governanceBoundaries: [
        "Missing code callbacks must be rejected before state validation",
      ],
      tenantScope: tenantId,
      workspaceScope: workspaceId,
      evidence: ["callback received without authorization code"],
      uncertainty: [],
      checkedAt: now,
    };
  }

  const stateValidation = validateOAuthState(callback.state, tenantId, workspaceId);

  if (!stateValidation.valid) {
    return {
      status: "invalid_state",
      connectorId: stateValidation.connectorId,
      provider: callback.provider,
      sessionCreationEligible: false,
      failureClassification: stateValidation.rejectionReasons[0] ?? "invalid_state",
      diagnostics: [
        "OAuth state validation failed",
        ...stateValidation.rejectionReasons,
        `Replay risk: ${stateValidation.replayRisk}`,
      ],
      isAutomated: false,
      governanceBoundaries: [
        "Invalid state callbacks are rejected at governance boundary",
        "Potential CSRF or replay attacks must be reported",
        ...stateValidation.governanceBoundaries,
      ],
      tenantScope: tenantId,
      workspaceScope: workspaceId,
      evidence: stateValidation.evidence,
      uncertainty: stateValidation.uncertainty,
      checkedAt: now,
    };
  }

  return {
    status: "valid",
    connectorId: stateValidation.connectorId,
    provider: callback.provider,
    sessionCreationEligible: true,
    diagnostics: [
      "OAuth callback validated successfully",
      "State validated — anti-replay enforced",
      "Authorization code present — exchange contract ready",
      "No live token exchange executed — contract layer only",
    ],
    isAutomated: false,
    governanceBoundaries: [
      "Token exchange must be executed server-side",
      "Authorization code must not be logged",
      "Resulting token must be encrypted before persistence",
      ...stateValidation.governanceBoundaries,
    ],
    tenantScope: tenantId,
    workspaceScope: workspaceId,
    evidence: [
      "callback state validated",
      "authorization code present",
      "tenant and workspace verified",
    ],
    uncertainty: [
      "token exchange requires live provider SDK integration",
      "token exchange success not guaranteed at contract layer",
    ],
    checkedAt: now,
  };
}

export function buildCallbackExchangeContract(
  connectorId: string,
  provider: OAuthProvider,
  code: string,
  redirectUri: string,
  tenantId: string,
  workspaceId: string,
): OAuthCallbackExchangeContract {
  return {
    connectorId,
    provider,
    exchangeRequired: true,
    exchangeEndpoint: `token_exchange_contract:${provider}`,
    redirectUri,
    codePresent: code.length > 0,
    governanceBoundaries: [
      "token exchange must not log the authorization code",
      "resulting tokens must be encrypted immediately after exchange",
      "exchange must be performed server-side only",
    ],
    tenantScope: tenantId,
    workspaceScope: workspaceId,
    evidence: [
      `connector: ${connectorId}`,
      `provider: ${provider}`,
      `redirect URI provided`,
      `code present: ${code.length > 0}`,
    ],
    uncertainty: [
      "live exchange requires provider SDK — contract layer only",
    ],
  };
}
