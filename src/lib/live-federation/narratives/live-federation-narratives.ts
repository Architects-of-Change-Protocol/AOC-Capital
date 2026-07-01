import type {
  AuthenticatedFederationState,
  LiveConnectorObservabilitySnapshot,
  ConnectorTokenIsolationResult,
  ConnectorSessionHealth,
  LiveFederationNarrative,
} from "../types/live-federation-types.js";

export function generateLiveFederationNarratives(
  federationState: AuthenticatedFederationState,
  observability: LiveConnectorObservabilitySnapshot[],
  tokenIsolation: ConnectorTokenIsolationResult[],
  sessionHealths: ConnectorSessionHealth[],
): LiveFederationNarrative[] {
  const now = new Date().toISOString();
  const narratives: LiveFederationNarrative[] = [];

  narratives.push(buildFederationReadinessNarrative(federationState, now));
  narratives.push(buildReplayVisibilityNarrative(federationState, now));
  narratives.push(buildCallbackValidationNarrative(observability, now));
  narratives.push(buildFederationFreshnessNarrative(observability, federationState, now));
  narratives.push(buildTokenIsolationNarrative(tokenIsolation, now));
  narratives.push(buildSessionSurvivabilityNarrative(sessionHealths, federationState, now));

  return narratives;
}

function buildFederationReadinessNarrative(
  state: AuthenticatedFederationState,
  now: string,
): LiveFederationNarrative {
  const authenticatedCount = state.authenticatedConnectors.length;
  const totalCount = authenticatedCount + state.unauthenticatedConnectors.length + state.degradedConnectors.length;

  let statement: string;
  let confidence: number;
  const uncertainty: string[] = [];

  if (state.status === "authenticated" && totalCount > 0) {
    statement = `Authenticated federation readiness is confirmed across ${authenticatedCount} connector(s). All sessions are active with governance-safe token handling.`;
    confidence = 0.9;
    uncertainty.push("live provider availability not validated — readiness reflects session contracts");
  } else if (state.status === "degraded") {
    statement = `Authenticated federation readiness is degraded because ${state.degradedConnectors.length} connector(s) have stale or failing sessions. Token refresh survivability may require resolution.`;
    confidence = 0.6;
    uncertainty.push("degraded session recovery requires operator-driven refresh or re-authorization");
  } else if (state.blockers.length > 0) {
    statement = `Authenticated federation readiness is blocked. ${state.blockers.length} blocker(s) prevent active federation: ${state.blockers[0]}.`;
    confidence = 0.3;
    uncertainty.push("blockers may resolve after OAuth authorization is completed");
  } else {
    statement = "Authenticated federation readiness is not established. No connector sessions are active. OAuth authorization is required for all connectors.";
    confidence = 0.1;
    uncertainty.push("federation readiness depends on OAuth flow completion");
  }

  return {
    id: `narrative:federation-readiness:${now}`,
    domain: "authenticated_federation",
    statement,
    status: state.status,
    confidence,
    uncertainty,
    evidence: state.evidence,
    governanceBoundaries: state.governanceBoundaries,
    tenantScope: state.tenantScope,
    workspaceScope: state.workspaceScope,
    checkedAt: now,
  };
}

function buildReplayVisibilityNarrative(
  state: AuthenticatedFederationState,
  now: string,
): LiveFederationNarrative {
  const statement = state.replayAuthorizationReady
    ? "Connector replay visibility is safely constrained within tenant governance boundaries. Authenticated sessions authorize replay access within workspace scope."
    : "Connector replay visibility is restricted. No authenticated connector sessions exist to authorize replay access within tenant governance boundaries.";

  return {
    id: `narrative:replay-visibility:${now}`,
    domain: "authenticated_replay",
    statement,
    status: state.replayAuthorizationReady ? "authorized" : "restricted",
    confidence: state.replayAuthorizationReady ? 0.85 : 0.95,
    uncertainty: [
      "replay authorization is evaluated at session contract layer — live governance enforcement requires runtime integration",
    ],
    evidence: [
      `replay authorization ready: ${state.replayAuthorizationReady}`,
      `authenticated connectors: ${state.authenticatedConnectors.length}`,
    ],
    governanceBoundaries: state.governanceBoundaries,
    tenantScope: state.tenantScope,
    workspaceScope: state.workspaceScope,
    checkedAt: now,
  };
}

function buildCallbackValidationNarrative(
  observability: LiveConnectorObservabilitySnapshot[],
  now: string,
): LiveFederationNarrative {
  const healthyCallbacks = observability.filter((s) => s.callbackSurvivability === "healthy").length;
  const degradedCallbacks = observability.filter((s) => s.callbackSurvivability === "degraded").length;
  const tenantScope = observability[0]?.tenantScope ?? "unknown";
  const workspaceScope = observability[0]?.workspaceScope ?? "unknown";

  const statement =
    degradedCallbacks === 0 && observability.length > 0
      ? `OAuth callback validation remains healthy across ${healthyCallbacks} workspace-scoped federation session(s).`
      : degradedCallbacks > 0
      ? `OAuth callback validation shows degraded survivability in ${degradedCallbacks} of ${observability.length} connector(s). Session reinitiation may be required.`
      : "OAuth callback validation cannot be assessed — no connector observability data available.";

  return {
    id: `narrative:callback-validation:${now}`,
    domain: "oauth_callbacks",
    statement,
    status: degradedCallbacks === 0 ? "healthy" : "degraded",
    confidence: observability.length > 0 ? 0.8 : 0.3,
    uncertainty: [
      "callback survivability reflects session state — not live provider probe",
    ],
    evidence: [
      `total connectors observed: ${observability.length}`,
      `healthy callback sessions: ${healthyCallbacks}`,
      `degraded callback sessions: ${degradedCallbacks}`,
    ],
    governanceBoundaries: [
      "OAuth callbacks must be validated against anti-replay state contracts",
    ],
    tenantScope,
    workspaceScope,
    checkedAt: now,
  };
}

function buildFederationFreshnessNarrative(
  observability: LiveConnectorObservabilitySnapshot[],
  state: AuthenticatedFederationState,
  now: string,
): LiveFederationNarrative {
  const staleCount = observability.filter((s) => s.federationFreshness === "stale").length;
  const freshCount = observability.filter((s) => s.federationFreshness === "fresh").length;

  const statement =
    staleCount > 0
      ? `Live connector observability indicates degraded federation freshness due to ${staleCount} stale authenticated session(s). Token refresh or re-authorization may restore freshness.`
      : freshCount === observability.length && observability.length > 0
      ? "Live connector observability indicates healthy federation freshness across all authenticated sessions."
      : "Live connector observability data is insufficient to assess federation freshness.";

  return {
    id: `narrative:federation-freshness:${now}`,
    domain: "live_connector_observability",
    statement,
    status: staleCount === 0 ? "fresh" : "stale",
    confidence: observability.length > 0 ? 0.75 : 0.2,
    uncertainty: [
      "freshness reflects session contract — live provider connectivity not validated",
    ],
    evidence: [
      `fresh connectors: ${freshCount}`,
      `stale connectors: ${staleCount}`,
      `session freshness: ${state.sessionFreshness}`,
    ],
    governanceBoundaries: state.governanceBoundaries,
    tenantScope: state.tenantScope,
    workspaceScope: state.workspaceScope,
    checkedAt: now,
  };
}

function buildTokenIsolationNarrative(
  tokenIsolation: ConnectorTokenIsolationResult[],
  now: string,
): LiveFederationNarrative {
  const violations = tokenIsolation.flatMap((r) => r.violations);
  const isolatedCount = tokenIsolation.filter((r) => r.isolationStatus === "isolated").length;
  const tenantScope = tokenIsolation[0]?.tenantScope ?? "unknown";
  const workspaceScope = tokenIsolation[0]?.workspaceScope ?? "unknown";

  const statement =
    violations.length === 0 && tokenIsolation.length > 0
      ? `Token isolation is fully enforced across ${isolatedCount} connector(s). Tenant and workspace boundaries are preserved.`
      : violations.length > 0
      ? `Token isolation violations detected: ${violations.length} violation(s) across ${tokenIsolation.length} connector(s). Governance boundary enforcement is required.`
      : "Token isolation cannot be assessed — no token isolation data available.";

  return {
    id: `narrative:token-isolation:${now}`,
    domain: "token_governance",
    statement,
    status: violations.length === 0 ? "compliant" : "violated",
    confidence: tokenIsolation.length > 0 ? 0.9 : 0.2,
    uncertainty: violations.length > 0 ? ["isolation violations require immediate operator investigation"] : [],
    evidence: [
      `total connectors: ${tokenIsolation.length}`,
      `isolated: ${isolatedCount}`,
      `violations: ${violations.length}`,
    ],
    governanceBoundaries: [
      "token isolation must be enforced at tenant and workspace boundaries",
    ],
    tenantScope,
    workspaceScope,
    checkedAt: now,
  };
}

function buildSessionSurvivabilityNarrative(
  sessionHealths: ConnectorSessionHealth[],
  state: AuthenticatedFederationState,
  now: string,
): LiveFederationNarrative {
  const avgSurvivability =
    sessionHealths.length > 0
      ? sessionHealths.reduce((sum, h) => sum + h.survivabilityScore, 0) / sessionHealths.length
      : 0;

  const criticalCount = sessionHealths.filter((h) => h.survivabilityScore < 0.3).length;

  const statement =
    avgSurvivability >= 0.8 && criticalCount === 0
      ? "Connector session survivability is healthy. All sessions are within acceptable thresholds."
      : criticalCount > 0
      ? `Connector session survivability is critically degraded for ${criticalCount} session(s). Connector token refresh survivability may require resolution.`
      : `Connector session survivability score is ${avgSurvivability.toFixed(2)}. Monitoring and proactive refresh are recommended.`;

  return {
    id: `narrative:session-survivability:${now}`,
    domain: "connector_survivability",
    statement,
    status: avgSurvivability >= 0.8 ? "healthy" : avgSurvivability >= 0.5 ? "degraded" : "critical",
    confidence: sessionHealths.length > 0 ? 0.85 : 0.2,
    uncertainty: [
      "survivability reflects session contracts — live provider health not probed",
    ],
    evidence: [
      `sessions evaluated: ${sessionHealths.length}`,
      `average survivability: ${avgSurvivability.toFixed(2)}`,
      `critical sessions: ${criticalCount}`,
    ],
    governanceBoundaries: state.governanceBoundaries,
    tenantScope: state.tenantScope,
    workspaceScope: state.workspaceScope,
    checkedAt: now,
  };
}
