export type OAuthProvider =
  | "jira"
  | "slack"
  | "github"
  | "gitlab"
  | "notion"
  | "linear"
  | "google"
  | "microsoft";

export type OAuthFlowStatus =
  | "not_started"
  | "authorization_pending"
  | "callback_received"
  | "token_exchanged"
  | "active"
  | "refresh_required"
  | "revoked"
  | "expired"
  | "error";

export type ConnectorSessionStatus =
  | "initializing"
  | "active"
  | "degraded"
  | "expired"
  | "revoked"
  | "error";

export type TokenEncryptionStatus =
  | "encrypted"
  | "unencrypted"
  | "encryption_pending"
  | "encryption_failed";

export type ConnectorIsolationStatus =
  | "isolated"
  | "partial"
  | "missing"
  | "violated";

export type FederationAuthStatus =
  | "authenticated"
  | "unauthenticated"
  | "degraded"
  | "recovering";

export type ConnectorHealthStatus =
  | "healthy"
  | "degraded"
  | "stale"
  | "offline"
  | "auth_required";

export type LiveFederationHeartbeatStatus = "fresh" | "stale" | "missing";

export type ConnectorProvisioningStatus =
  | "pending"
  | "provisioning"
  | "active"
  | "failed"
  | "deprovisioned";

export type RecoveryRecommendationType =
  | "token_refresh"
  | "reauthorize"
  | "session_reinitialize"
  | "federation_reconnect"
  | "callback_retry"
  | "operator_intervention_required";

export interface OAuthProviderMetadata {
  provider: OAuthProvider;
  displayName: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  scopes: string[];
  refreshable: boolean;
  pkceRequired: boolean;
  stateRequired: boolean;
  governanceConstraints: string[];
  survivabilityExpectations: string[];
}

export interface OAuthAuthorizationRequest {
  provider: OAuthProvider;
  tenantId: string;
  workspaceId: string;
  connectorId: string;
  state: string;
  scopes: string[];
  redirectUri: string;
  pkceCodeChallenge?: string;
  expiresAt: string;
  governanceBoundaries: string[];
  evidence: string[];
  uncertainty: string[];
  createdAt: string;
}

export interface OAuthAuthorizationResult {
  provider: OAuthProvider;
  connectorId: string;
  status: OAuthFlowStatus;
  authorizationUrl?: string;
  diagnostics: string[];
  governanceBoundaries: string[];
  tenantScope: string;
  workspaceScope: string;
  evidence: string[];
  uncertainty: string[];
  checkedAt: string;
}

export interface OAuthConnectorState {
  provider: OAuthProvider;
  connectorId: string;
  status: OAuthFlowStatus;
  tokenPresent: boolean;
  tokenEncrypted: boolean;
  sessionActive: boolean;
  lastAuthorizedAt?: string;
  expiresAt?: string;
  governanceBoundaries: string[];
  tenantScope: string;
  workspaceScope: string;
  evidence: string[];
  uncertainty: string[];
  checkedAt: string;
}

export interface OAuthCallbackState {
  provider: OAuthProvider;
  connectorId: string;
  code?: string;
  state: string;
  error?: string;
  errorDescription?: string;
  receivedAt: string;
  tenantScope: string;
  workspaceScope: string;
  governanceBoundaries: string[];
  evidence: string[];
  uncertainty: string[];
}

export interface OAuthStateValidationResult {
  valid: boolean;
  connectorId: string;
  provider: OAuthProvider;
  tenantScope: string;
  workspaceScope: string;
  expirationStatus: "valid" | "expired" | "unknown";
  replayRisk: "none" | "low" | "high";
  rejectionReasons: string[];
  governanceBoundaries: string[];
  evidence: string[];
  uncertainty: string[];
  checkedAt: string;
}

export interface ConnectorSession {
  id: string;
  connectorId: string;
  provider: OAuthProvider;
  status: ConnectorSessionStatus;
  tenantId: string;
  workspaceId: string;
  tokenState: ConnectorTokenState;
  initiatedAt: string;
  expiresAt?: string;
  lastActivityAt: string;
  governanceBoundaries: string[];
  tenantScope: string;
  workspaceScope: string;
  evidence: string[];
  uncertainty: string[];
}

export interface ConnectorSessionHealth {
  sessionId: string;
  connectorId: string;
  provider: OAuthProvider;
  status: ConnectorSessionStatus;
  tokenFresh: boolean;
  sessionFresh: boolean;
  survivabilityScore: number;
  blockers: string[];
  warnings: string[];
  governanceBoundaries: string[];
  tenantScope: string;
  workspaceScope: string;
  evidence: string[];
  uncertainty: string[];
  checkedAt: string;
}

export interface ConnectorSessionBoundary {
  sessionId: string;
  connectorId: string;
  tenantId: string;
  workspaceId: string;
  isolationEnforced: boolean;
  replayIsolated: boolean;
  crossTenantLeakRisk: "none" | "low" | "high";
  governanceBoundaries: string[];
  evidence: string[];
  uncertainty: string[];
  checkedAt: string;
}

export interface ConnectorTokenState {
  connectorId: string;
  provider: OAuthProvider;
  present: boolean;
  encrypted: boolean;
  encryptionStatus: TokenEncryptionStatus;
  clientSideExposed: false;
  expiresAt?: string;
  refreshable: boolean;
  refreshEligible: boolean;
  governanceBoundaries: string[];
  tenantScope: string;
  workspaceScope: string;
  evidence: string[];
  uncertainty: string[];
  checkedAt: string;
}

export interface ConnectorTokenRefreshResult {
  connectorId: string;
  provider: OAuthProvider;
  eligible: boolean;
  refreshStatus: "eligible" | "ineligible" | "not_applicable" | "error";
  blockers: string[];
  recommendations: string[];
  isAutomated: false;
  governanceBoundaries: string[];
  tenantScope: string;
  workspaceScope: string;
  evidence: string[];
  uncertainty: string[];
  checkedAt: string;
}

export interface ConnectorTokenPersistenceResult {
  connectorId: string;
  provider: OAuthProvider;
  persistenceStatus: "persisted" | "pending" | "failed" | "not_applicable";
  encryptedAtRest: boolean;
  replaySafe: boolean;
  survivabilitySafe: boolean;
  governanceSafe: boolean;
  governanceBoundaries: string[];
  tenantScope: string;
  workspaceScope: string;
  evidence: string[];
  uncertainty: string[];
  checkedAt: string;
}

export interface ConnectorTokenIsolationResult {
  connectorId: string;
  provider: OAuthProvider;
  tenantIsolated: boolean;
  workspaceIsolated: boolean;
  providerIsolated: boolean;
  replayIsolated: boolean;
  sessionIsolated: boolean;
  isolationStatus: ConnectorIsolationStatus;
  violations: string[];
  governanceBoundaries: string[];
  tenantScope: string;
  workspaceScope: string;
  evidence: string[];
  uncertainty: string[];
  checkedAt: string;
}

export interface AuthenticatedFederationState {
  status: FederationAuthStatus;
  authenticatedConnectors: string[];
  unauthenticatedConnectors: string[];
  degradedConnectors: string[];
  sessionFreshness: "fresh" | "stale" | "unknown";
  connectorFreshness: "fresh" | "stale" | "unknown";
  replayAuthorizationReady: boolean;
  survivabilityScore: number;
  blockers: string[];
  warnings: string[];
  governanceBoundaries: string[];
  tenantScope: string;
  workspaceScope: string;
  evidence: string[];
  uncertainty: string[];
  checkedAt: string;
}

export interface AuthenticatedReplayBoundary {
  connectorId: string;
  provider: OAuthProvider;
  replayAuthorized: boolean;
  replayScope: "tenant_scoped" | "workspace_scoped" | "unauthorized";
  tenantIsolated: boolean;
  governanceSafe: boolean;
  visibility: "authorized" | "restricted" | "redacted";
  governanceBoundaries: string[];
  tenantScope: string;
  workspaceScope: string;
  evidence: string[];
  uncertainty: string[];
  checkedAt: string;
}

export interface LiveConnectorObservabilitySnapshot {
  connectorId: string;
  provider: OAuthProvider;
  healthStatus: ConnectorHealthStatus;
  sessionSurvivability: number;
  tokenRefreshReadiness: "ready" | "degraded" | "blocked";
  federationFreshness: "fresh" | "stale" | "unknown";
  callbackSurvivability: "healthy" | "degraded" | "unknown";
  lastObservedAt: string;
  governanceBoundaries: string[];
  tenantScope: string;
  workspaceScope: string;
  evidence: string[];
  uncertainty: string[];
  checkedAt: string;
}

export interface LiveConnectorHeartbeat {
  connectorId: string;
  provider: OAuthProvider;
  providerFreshness: LiveFederationHeartbeatStatus;
  connectorFreshness: LiveFederationHeartbeatStatus;
  replayFreshness: LiveFederationHeartbeatStatus;
  sessionFreshness: LiveFederationHeartbeatStatus;
  refreshFreshness: LiveFederationHeartbeatStatus;
  lastSeenAt?: string;
  governanceBoundaries: string[];
  tenantScope: string;
  workspaceScope: string;
  evidence: string[];
  uncertainty: string[];
  checkedAt: string;
}

export interface LiveConnectorNode {
  id: string;
  connectorId: string;
  provider: OAuthProvider;
  authStatus: FederationAuthStatus;
  sessionStatus: ConnectorSessionStatus;
  tokenEncrypted: boolean;
  replayAuthorized: boolean;
  evidence: string[];
  uncertainty: string[];
}

export interface LiveConnectorEdge {
  fromNodeId: string;
  toNodeId: string;
  dependencyType: "required" | "optional" | "fallback";
  authRequired: boolean;
  evidence: string[];
}

export interface LiveConnectorTopology {
  nodes: LiveConnectorNode[];
  edges: LiveConnectorEdge[];
  authenticatedCount: number;
  degradedCount: number;
  unauthenticatedCount: number;
  governanceBoundaries: string[];
  tenantScope: string;
  workspaceScope: string;
  evidence: string[];
  uncertainty: string[];
  checkedAt: string;
}

export interface ConnectorProvisioningState {
  connectorId: string;
  provider: OAuthProvider;
  status: ConnectorProvisioningStatus;
  tenantBootstrapped: boolean;
  workspaceBootstrapped: boolean;
  oauthReadiness: "ready" | "pending" | "blocked";
  federationReadiness: "ready" | "pending" | "blocked";
  onboardingReadiness: "ready" | "pending" | "blocked";
  blockers: string[];
  governanceBoundaries: string[];
  tenantScope: string;
  workspaceScope: string;
  evidence: string[];
  uncertainty: string[];
  checkedAt: string;
}

export interface ConnectorAuthBoundaryResult {
  connectorId: string;
  provider: OAuthProvider;
  callbackIsolated: boolean;
  tokenIsolated: boolean;
  replayIsolated: boolean;
  tenantSessionIsolated: boolean;
  workspaceSessionIsolated: boolean;
  governanceVisible: boolean;
  violations: string[];
  governanceBoundaries: string[];
  tenantScope: string;
  workspaceScope: string;
  evidence: string[];
  uncertainty: string[];
  checkedAt: string;
}

export interface ConnectorRecoveryRecommendation {
  connectorId: string;
  provider: OAuthProvider;
  recommendationType: RecoveryRecommendationType;
  description: string;
  steps: string[];
  isAutomated: false;
  urgency: "low" | "medium" | "high" | "critical";
  governanceBoundaries: string[];
  tenantScope: string;
  workspaceScope: string;
  evidence: string[];
  uncertainty: string[];
  generatedAt: string;
}

export interface LiveFederationNarrative {
  id: string;
  domain: string;
  statement: string;
  status: string;
  confidence: number;
  uncertainty: string[];
  evidence: string[];
  governanceBoundaries: string[];
  tenantScope: string;
  workspaceScope: string;
  checkedAt: string;
}

export interface LiveFederationSnapshot {
  federationStatus: FederationAuthStatus;
  oauthDiagnostics: OAuthAuthorizationResult[];
  connectorSessions: ConnectorSessionHealth[];
  tokenIsolation: ConnectorTokenIsolationResult[];
  observability: LiveConnectorObservabilitySnapshot[];
  heartbeats: LiveConnectorHeartbeat[];
  topology: LiveConnectorTopology;
  provisioning: ConnectorProvisioningState[];
  recoveryRecommendations: ConnectorRecoveryRecommendation[];
  narratives: LiveFederationNarrative[];
  governanceBoundaries: string[];
  tenantScope: string;
  workspaceScope: string;
  evidence: string[];
  uncertainty: string[];
  checkedAt: string;
}
