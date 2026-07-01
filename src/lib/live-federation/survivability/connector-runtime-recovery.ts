import type {
  OAuthProvider,
  ConnectorSession,
  ConnectorRecoveryRecommendation,
  ConnectorSessionHealth,
  ConnectorTokenState,
} from "../types/live-federation-types.js";

export function generateConnectorRecoveryRecommendations(
  session: ConnectorSession,
  health: ConnectorSessionHealth,
): ConnectorRecoveryRecommendation[] {
  const now = new Date().toISOString();
  const recommendations: ConnectorRecoveryRecommendation[] = [];

  if (!session.tokenState.present) {
    recommendations.push({
      connectorId: session.connectorId,
      provider: session.provider,
      recommendationType: "reauthorize",
      description: "No token present — OAuth authorization required to establish connector session",
      steps: [
        "Initiate OAuth authorization flow for connector",
        "Complete provider consent screen",
        "Validate callback state and exchange code for token",
        "Encrypt token and persist to secure storage",
        "Reinitialize connector session",
      ],
      isAutomated: false,
      urgency: "high",
      governanceBoundaries: [
        "OAuth flow must be initiated server-side",
        "Token must be encrypted before persistence",
      ],
      tenantScope: session.tenantScope,
      workspaceScope: session.workspaceScope,
      evidence: ["token absent in session"],
      uncertainty: [],
      generatedAt: now,
    });
  }

  if (session.status === "expired") {
    const recoveryType = session.tokenState.refreshEligible ? "token_refresh" : "reauthorize";
    recommendations.push({
      connectorId: session.connectorId,
      provider: session.provider,
      recommendationType: recoveryType,
      description: session.tokenState.refreshEligible
        ? "Session expired — token refresh eligible"
        : "Session expired — re-authorization required (provider does not support refresh)",
      steps: session.tokenState.refreshEligible
        ? [
            "Execute server-side token refresh",
            "Re-encrypt refreshed token",
            "Reinitialize connector session with refreshed token",
          ]
        : [
            "Initiate full OAuth authorization flow",
            "Complete provider consent",
            "Exchange new code for token",
            "Encrypt and persist new token",
          ],
      isAutomated: false,
      urgency: "high",
      governanceBoundaries: ["token refresh must be server-side"],
      tenantScope: session.tenantScope,
      workspaceScope: session.workspaceScope,
      evidence: [`session status: expired`, `refresh eligible: ${session.tokenState.refreshEligible}`],
      uncertainty: [],
      generatedAt: now,
    });
  }

  if (session.status === "revoked") {
    recommendations.push({
      connectorId: session.connectorId,
      provider: session.provider,
      recommendationType: "operator_intervention_required",
      description: "Session revoked — operator intervention required before re-authorization",
      steps: [
        "Investigate revocation cause in provider audit log",
        "Confirm revocation was intentional or erroneous",
        "If erroneous, request re-authorization from workspace administrator",
        "Initiate new OAuth flow after operator approval",
      ],
      isAutomated: false,
      urgency: "critical",
      governanceBoundaries: [
        "Revoked sessions must not be re-authorized without operator review",
      ],
      tenantScope: session.tenantScope,
      workspaceScope: session.workspaceScope,
      evidence: ["session status: revoked"],
      uncertainty: ["revocation cause requires provider audit investigation"],
      generatedAt: now,
    });
  }

  if (session.tokenState.clientSideExposed) {
    recommendations.push({
      connectorId: session.connectorId,
      provider: session.provider,
      recommendationType: "operator_intervention_required",
      description: "CRITICAL: Token client-side exposure detected — immediate remediation required",
      steps: [
        "Immediately revoke exposed token via provider console",
        "Audit how token was exposed client-side",
        "Fix server-side token handling to prevent future exposure",
        "Initiate new OAuth authorization flow",
      ],
      isAutomated: false,
      urgency: "critical",
      governanceBoundaries: [
        "Client-side token exposure is a critical governance violation",
        "Exposed tokens must be considered compromised",
      ],
      tenantScope: session.tenantScope,
      workspaceScope: session.workspaceScope,
      evidence: ["clientSideExposed: true"],
      uncertainty: [],
      generatedAt: now,
    });
  }

  if (health.warnings.length > 0 && recommendations.length === 0) {
    recommendations.push({
      connectorId: session.connectorId,
      provider: session.provider,
      recommendationType: "token_refresh",
      description: "Session health warnings detected — proactive token refresh recommended",
      steps: [
        "Monitor token expiry window",
        "Execute proactive token refresh before expiry",
        "Verify refreshed session health",
      ],
      isAutomated: false,
      urgency: "low",
      governanceBoundaries: ["proactive refresh should occur within server-side refresh window"],
      tenantScope: session.tenantScope,
      workspaceScope: session.workspaceScope,
      evidence: health.warnings,
      uncertainty: [],
      generatedAt: now,
    });
  }

  return recommendations;
}

export function generateFederationRecoveryRecommendations(
  sessions: ConnectorSession[],
  healths: ConnectorSessionHealth[],
  tenantId: string,
  workspaceId: string,
): ConnectorRecoveryRecommendation[] {
  return sessions.flatMap((session, i) =>
    generateConnectorRecoveryRecommendations(session, healths[i])
  );
}
