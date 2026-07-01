import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const lf = (...parts) => path.join(repoRoot, "src/lib/live-federation", ...parts);
const r = (...parts) => path.join(repoRoot, ...parts);

// ── domain existence ──────────────────────────────────────────────────────────

test("live-federation domain directory exists", () => {
  assert.equal(existsSync(lf()), true);
});

// ── required files existence ──────────────────────────────────────────────────

const REQUIRED_FILES = [
  "types/live-federation-types.ts",
  "oauth/oauth-runtime.ts",
  "oauth/oauth-providers.ts",
  "oauth/oauth-state-validation.ts",
  "oauth/oauth-survivability.ts",
  "callbacks/oauth-callback-runtime.ts",
  "sessions/connector-session-runtime.ts",
  "governance/connector-session-governance.ts",
  "diagnostics/connector-session-diagnostics.ts",
  "tokens/connector-token-runtime.ts",
  "governance/connector-token-governance.ts",
  "encryption/connector-token-encryption.ts",
  "refresh/connector-token-refresh.ts",
  "isolation/connector-token-isolation.ts",
  "persistence/connector-token-persistence.ts",
  "runtime/live-federation-runtime.ts",
  "runtime/authenticated-federation.ts",
  "replay/authenticated-replay.ts",
  "observability/live-connector-observability.ts",
  "observability/live-connector-heartbeats.ts",
  "topology/live-connector-topology.ts",
  "provisioning/connector-provisioning.ts",
  "governance/connector-auth-boundaries.ts",
  "survivability/connector-runtime-recovery.ts",
  "narratives/live-federation-narratives.ts",
  "live-federation-manager.ts",
  "index.ts",
];

for (const file of REQUIRED_FILES) {
  test(`live-federation/${file} exists`, () => {
    assert.equal(existsSync(lf(file)), true, `Missing required file: ${file}`);
  });
}

// ── types ─────────────────────────────────────────────────────────────────────

test("live-federation-types.ts defines all required types", () => {
  const content = readFileSync(lf("types/live-federation-types.ts"), "utf8");
  const requiredTypes = [
    "OAuthProvider",
    "OAuthConnectorState",
    "OAuthCallbackState",
    "OAuthAuthorizationRequest",
    "OAuthAuthorizationResult",
    "ConnectorSession",
    "ConnectorSessionHealth",
    "ConnectorSessionBoundary",
    "ConnectorTokenState",
    "ConnectorTokenRefreshResult",
    "ConnectorTokenPersistenceResult",
    "ConnectorTokenIsolationResult",
    "AuthenticatedFederationState",
    "AuthenticatedReplayBoundary",
    "LiveConnectorObservabilitySnapshot",
    "LiveConnectorHeartbeat",
    "LiveConnectorTopology",
    "LiveConnectorNode",
    "LiveConnectorEdge",
    "ConnectorProvisioningState",
    "ConnectorAuthBoundaryResult",
    "ConnectorRecoveryRecommendation",
    "LiveFederationNarrative",
    "LiveFederationSnapshot",
  ];
  for (const t of requiredTypes) {
    assert.match(content, new RegExp(`\\b${t}\\b`), `Missing type: ${t}`);
  }
});

test("live-federation-types.ts supports all required providers", () => {
  const content = readFileSync(lf("types/live-federation-types.ts"), "utf8");
  for (const provider of ["jira", "slack", "github", "gitlab", "notion", "linear", "google", "microsoft"]) {
    assert.match(content, new RegExp(`"${provider}"`), `Missing provider: ${provider}`);
  }
});

test("live-federation-types.ts includes tenantScope, workspaceScope, governanceBoundaries, evidence, uncertainty, checkedAt", () => {
  const content = readFileSync(lf("types/live-federation-types.ts"), "utf8");
  assert.match(content, /tenantScope/);
  assert.match(content, /workspaceScope/);
  assert.match(content, /governanceBoundaries/);
  assert.match(content, /evidence/);
  assert.match(content, /uncertainty/);
  assert.match(content, /checkedAt/);
});

test("live-federation-types.ts enforces clientSideExposed: false", () => {
  const content = readFileSync(lf("types/live-federation-types.ts"), "utf8");
  assert.match(content, /clientSideExposed: false/);
});

test("live-federation-types.ts enforces isAutomated: false on recovery", () => {
  const content = readFileSync(lf("types/live-federation-types.ts"), "utf8");
  assert.match(content, /isAutomated: false/);
});

// ── OAuth runtime ─────────────────────────────────────────────────────────────

test("oauth-runtime.ts exports required functions", () => {
  const content = readFileSync(lf("oauth/oauth-runtime.ts"), "utf8");
  assert.match(content, /buildOAuthAuthorizationRequest/);
  assert.match(content, /evaluateOAuthReadiness/);
  assert.match(content, /retrieveOAuthDiagnostics/);
});

test("oauth-runtime.ts does not hardcode redirect URLs", () => {
  const content = readFileSync(lf("oauth/oauth-runtime.ts"), "utf8");
  assert.doesNotMatch(content, /https:\/\/pmfreak\.(com|app|io)/);
  assert.doesNotMatch(content, /localhost:3000\/api\/auth/);
});

test("oauth-runtime.ts does not hardcode secrets", () => {
  const content = readFileSync(lf("oauth/oauth-runtime.ts"), "utf8");
  assert.doesNotMatch(content, /client_secret\s*=\s*["'][a-zA-Z0-9]{10,}/);
  assert.doesNotMatch(content, /sk_live_[a-zA-Z0-9]{10,}/);
});

// ── OAuth providers ───────────────────────────────────────────────────────────

test("oauth-providers.ts defines all required providers", () => {
  const content = readFileSync(lf("oauth/oauth-providers.ts"), "utf8");
  for (const provider of ["jira", "slack", "github", "gitlab", "notion", "linear", "google", "microsoft"]) {
    assert.match(content, new RegExp(`["']${provider}["']`), `Missing provider: ${provider}`);
  }
});

test("oauth-providers.ts exports getOAuthProviderMetadata and listSupportedProviders", () => {
  const content = readFileSync(lf("oauth/oauth-providers.ts"), "utf8");
  assert.match(content, /getOAuthProviderMetadata/);
  assert.match(content, /listSupportedProviders/);
});

test("oauth-providers.ts includes governance constraints for all providers", () => {
  const content = readFileSync(lf("oauth/oauth-providers.ts"), "utf8");
  assert.match(content, /governanceConstraints/);
  assert.match(content, /survivabilityExpectations/);
});

// ── OAuth state validation ────────────────────────────────────────────────────

test("oauth-state-validation.ts exports validateOAuthState", () => {
  const content = readFileSync(lf("oauth/oauth-state-validation.ts"), "utf8");
  assert.match(content, /validateOAuthState/);
});

test("oauth-state-validation.ts implements anti-replay protection", () => {
  const content = readFileSync(lf("oauth/oauth-state-validation.ts"), "utf8");
  assert.match(content, /used/);
  assert.match(content, /replay/i);
});

test("oauth-state-validation.ts implements tenant-bound validation", () => {
  const content = readFileSync(lf("oauth/oauth-state-validation.ts"), "utf8");
  assert.match(content, /tenantId/);
  assert.match(content, /cross-tenant/i);
});

test("oauth-state-validation.ts implements expiration-aware validation", () => {
  const content = readFileSync(lf("oauth/oauth-state-validation.ts"), "utf8");
  assert.match(content, /STATE_EXPIRY_MS|expiry|expired/i);
});

// ── token governance ──────────────────────────────────────────────────────────

test("connector-token-governance.ts exports evaluateTokenGovernance", () => {
  const content = readFileSync(lf("governance/connector-token-governance.ts"), "utf8");
  assert.match(content, /evaluateTokenGovernance/);
});

test("connector-token-governance.ts enforces no client-side token exposure", () => {
  const content = readFileSync(lf("governance/connector-token-governance.ts"), "utf8");
  assert.match(content, /clientSideExposed/);
  assert.match(content, /CRITICAL/);
});

test("connector-token-governance.ts enforces encryption requirement", () => {
  const content = readFileSync(lf("governance/connector-token-governance.ts"), "utf8");
  assert.match(content, /encrypted/);
  assert.match(content, /encryption-at-rest|encrypt/i);
});

test("connector-token-governance.ts requires tenant and workspace scope", () => {
  const content = readFileSync(lf("governance/connector-token-governance.ts"), "utf8");
  assert.match(content, /tenantScope/);
  assert.match(content, /workspaceScope/);
});

// ── token isolation ───────────────────────────────────────────────────────────

test("connector-token-isolation.ts exports evaluateConnectorTokenIsolation", () => {
  const content = readFileSync(lf("isolation/connector-token-isolation.ts"), "utf8");
  assert.match(content, /evaluateConnectorTokenIsolation/);
});

test("connector-token-isolation.ts validates tenant, workspace, provider, replay, session isolation", () => {
  const content = readFileSync(lf("isolation/connector-token-isolation.ts"), "utf8");
  assert.match(content, /tenantIsolated/);
  assert.match(content, /workspaceIsolated/);
  assert.match(content, /providerIsolated/);
  assert.match(content, /replayIsolated/);
  assert.match(content, /sessionIsolated/);
});

test("connector-token-isolation.ts detects cross-tenant violations", () => {
  const content = readFileSync(lf("isolation/connector-token-isolation.ts"), "utf8");
  assert.match(content, /cross-tenant|isolation violated/i);
});

// ── authenticated federation ──────────────────────────────────────────────────

test("live-federation-runtime.ts exports initializeAuthenticatedFederation and retrieveAuthenticatedFederationState", () => {
  const content = readFileSync(lf("runtime/live-federation-runtime.ts"), "utf8");
  assert.match(content, /initializeAuthenticatedFederation/);
  assert.match(content, /retrieveAuthenticatedFederationState/);
});

test("live-federation-runtime.ts tracks authenticated, degraded, and unauthenticated connectors", () => {
  const content = readFileSync(lf("runtime/live-federation-runtime.ts"), "utf8");
  assert.match(content, /authenticatedConnectors/);
  assert.match(content, /degradedConnectors/);
  assert.match(content, /unauthenticatedConnectors/);
});

test("live-federation-runtime.ts includes survivability score", () => {
  const content = readFileSync(lf("runtime/live-federation-runtime.ts"), "utf8");
  assert.match(content, /survivabilityScore/);
});

// ── authenticated replay ──────────────────────────────────────────────────────

test("authenticated-replay.ts exports buildAuthenticatedReplayBoundary and validateReplayAuthorization", () => {
  const content = readFileSync(lf("replay/authenticated-replay.ts"), "utf8");
  assert.match(content, /buildAuthenticatedReplayBoundary/);
  assert.match(content, /validateReplayAuthorization/);
});

test("authenticated-replay.ts enforces tenant isolation on replay", () => {
  const content = readFileSync(lf("replay/authenticated-replay.ts"), "utf8");
  assert.match(content, /tenantIsolated/);
  assert.match(content, /cross-tenant/i);
});

test("authenticated-replay.ts classifies replay scope correctly", () => {
  const content = readFileSync(lf("replay/authenticated-replay.ts"), "utf8");
  assert.match(content, /workspace_scoped/);
  assert.match(content, /tenant_scoped/);
  assert.match(content, /unauthorized/);
});

// ── observability ─────────────────────────────────────────────────────────────

test("live-connector-observability.ts exports retrieveLiveConnectorObservability", () => {
  const content = readFileSync(lf("observability/live-connector-observability.ts"), "utf8");
  assert.match(content, /retrieveLiveConnectorObservability/);
});

test("live-connector-observability.ts tracks required observability fields", () => {
  const content = readFileSync(lf("observability/live-connector-observability.ts"), "utf8");
  assert.match(content, /healthStatus/);
  assert.match(content, /sessionSurvivability/);
  assert.match(content, /tokenRefreshReadiness/);
  assert.match(content, /federationFreshness/);
  assert.match(content, /callbackSurvivability/);
});

test("live-connector-observability.ts does not fabricate fake uptime metrics", () => {
  const content = readFileSync(lf("observability/live-connector-observability.ts"), "utf8");
  assert.doesNotMatch(content, /uptime.*100|fakeUptime|mockUptime/i);
  assert.match(content, /uncertainty/);
  assert.match(content, /live provider health requires external probe|contract/i);
});

// ── topology ──────────────────────────────────────────────────────────────────

test("live-connector-topology.ts exports buildLiveConnectorTopology", () => {
  const content = readFileSync(lf("topology/live-connector-topology.ts"), "utf8");
  assert.match(content, /buildLiveConnectorTopology/);
});

test("live-connector-topology.ts tracks authenticated, degraded, unauthenticated counts", () => {
  const content = readFileSync(lf("topology/live-connector-topology.ts"), "utf8");
  assert.match(content, /authenticatedCount/);
  assert.match(content, /degradedCount/);
  assert.match(content, /unauthenticatedCount/);
});

// ── deterministic narratives ──────────────────────────────────────────────────

test("live-federation-narratives.ts exports generateLiveFederationNarratives", () => {
  const content = readFileSync(lf("narratives/live-federation-narratives.ts"), "utf8");
  assert.match(content, /generateLiveFederationNarratives/);
});

test("live-federation-narratives.ts generates federation readiness narrative", () => {
  const content = readFileSync(lf("narratives/live-federation-narratives.ts"), "utf8");
  assert.match(content, /Authenticated federation readiness/i);
});

test("live-federation-narratives.ts generates replay visibility narrative", () => {
  const content = readFileSync(lf("narratives/live-federation-narratives.ts"), "utf8");
  assert.match(content, /replay visibility/i);
  assert.match(content, /tenant governance boundaries/i);
});

test("live-federation-narratives.ts generates callback validation narrative", () => {
  const content = readFileSync(lf("narratives/live-federation-narratives.ts"), "utf8");
  assert.match(content, /OAuth callback validation/i);
});

test("live-federation-narratives.ts generates federation freshness narrative", () => {
  const content = readFileSync(lf("narratives/live-federation-narratives.ts"), "utf8");
  assert.match(content, /federation freshness/i);
});

test("live-federation-narratives.ts includes confidence and uncertainty in all narratives", () => {
  const content = readFileSync(lf("narratives/live-federation-narratives.ts"), "utf8");
  assert.match(content, /confidence/);
  assert.match(content, /uncertainty/);
});

test("live-federation-narratives.ts does not claim fake OAuth success", () => {
  const content = readFileSync(lf("narratives/live-federation-narratives.ts"), "utf8");
  assert.doesNotMatch(content, /OAuth.*successfully authenticated.*all providers/i);
  assert.doesNotMatch(content, /tokens.*verified.*live/i);
});

// ── manager ───────────────────────────────────────────────────────────────────

test("live-federation-manager.ts exports all required APIs", () => {
  const content = readFileSync(lf("live-federation-manager.ts"), "utf8");
  const requiredApis = [
    "retrieveOAuthDiagnosticsForConnector",
    "retrieveConnectorSessionHealthSnapshot",
    "retrieveAuthenticatedFederationSnapshot",
    "retrieveConnectorTokenIsolation",
    "retrieveLiveConnectorObservabilitySnapshot",
    "retrieveLiveConnectorHeartbeatsForSessions",
    "retrieveLiveConnectorTopologySnapshot",
    "retrieveConnectorProvisioning",
    "retrieveConnectorRecoveryRecommendations",
    "retrieveLiveFederationSnapshot",
  ];
  for (const api of requiredApis) {
    assert.match(content, new RegExp(`\\b${api}\\b`), `Manager missing: ${api}`);
  }
});

// ── tenant isolation ──────────────────────────────────────────────────────────

test("token isolation enforces tenant boundary", () => {
  const content = readFileSync(lf("isolation/connector-token-isolation.ts"), "utf8");
  assert.match(content, /tenantScope.*!==|!==.*tenantId|tenantId.*!==|requestingTenantId/);
  assert.match(content, /tenant isolation violated/i);
});

test("session governance enforces tenant boundary", () => {
  const content = readFileSync(lf("governance/connector-session-governance.ts"), "utf8");
  assert.match(content, /tenantId/);
  assert.match(content, /cross-tenant/i);
});

test("auth boundaries enforce tenant session isolation", () => {
  const content = readFileSync(lf("governance/connector-auth-boundaries.ts"), "utf8");
  assert.match(content, /tenantSessionIsolated/);
  assert.match(content, /cross-tenant.*detected|tenantId.*!==|!==.*tenantId/);
});

// ── replay isolation ──────────────────────────────────────────────────────────

test("authenticated-replay.ts enforces replay isolation boundaries", () => {
  const content = readFileSync(lf("replay/authenticated-replay.ts"), "utf8");
  assert.match(content, /replayIsolated|replayAuthorized/);
  assert.match(content, /tenant.*isolation|cross-tenant.*replay/i);
});

test("token isolation includes replay isolation check", () => {
  const content = readFileSync(lf("isolation/connector-token-isolation.ts"), "utf8");
  assert.match(content, /replayIsolated/);
});

// ── no hardcoded secrets ──────────────────────────────────────────────────────

test("live-federation domain contains no hardcoded secrets", () => {
  const secretPatterns = [
    /sk_live_[a-zA-Z0-9]{20,}/,
    /sk_test_[a-zA-Z0-9]{20,}/,
    /client_secret\s*[:=]\s*["'][a-zA-Z0-9]{10,}/,
    /service_role_[a-zA-Z0-9._-]{20,}/,
    /eyJ[a-zA-Z0-9._-]{50,}/,
  ];
  for (const file of REQUIRED_FILES) {
    const filePath = lf(file);
    if (!existsSync(filePath)) continue;
    const content = readFileSync(filePath, "utf8");
    for (const pattern of secretPatterns) {
      assert.doesNotMatch(content, pattern, `Potential hardcoded secret in ${file}`);
    }
  }
});

// ── encryption contract ───────────────────────────────────────────────────────

test("connector-token-encryption.ts defines AES-256-GCM expectation", () => {
  const content = readFileSync(lf("encryption/connector-token-encryption.ts"), "utf8");
  assert.match(content, /AES-256-GCM/);
});

test("connector-token-encryption.ts is contract-layer only (no live KMS)", () => {
  const content = readFileSync(lf("encryption/connector-token-encryption.ts"), "utf8");
  assert.match(content, /contract.*layer|semantic.*layer|no.*KMS|KMS.*contract/i);
  assert.doesNotMatch(content, /aws-sdk|@aws-sdk\/client-kms|google-cloud-kms/);
});

// ── recovery is recommendations-only ─────────────────────────────────────────

test("connector-runtime-recovery.ts is recommendations-only (no automated fixes)", () => {
  const content = readFileSync(lf("survivability/connector-runtime-recovery.ts"), "utf8");
  assert.match(content, /isAutomated: false/);
  assert.doesNotMatch(content, /execSync|spawnSync|writeFileSync/);
});

// ── hooks ─────────────────────────────────────────────────────────────────────

test("use-live-federation.ts hook file exists", () => {
  assert.equal(existsSync(r("src/hooks/use-live-federation.ts")), true);
});

test("use-live-federation.ts exports required hooks", () => {
  const content = readFileSync(r("src/hooks/use-live-federation.ts"), "utf8");
  assert.match(content, /useOAuthRuntime/);
  assert.match(content, /useConnectorSession/);
  assert.match(content, /useAuthenticatedFederation/);
  assert.match(content, /useLiveConnectorObservability/);
  assert.match(content, /useConnectorProvisioning/);
});

// ── docs ──────────────────────────────────────────────────────────────────────

test("docs/architecture/live-oauth-secure-federation-runtime.md exists", () => {
  assert.equal(
    existsSync(r("docs/architecture/live-oauth-secure-federation-runtime.md")),
    true,
  );
});

test("docs/architecture/CURRENT_STATE_LIVE_FEDERATION_RUNTIME.md exists", () => {
  assert.equal(
    existsSync(r("docs/architecture/CURRENT_STATE_LIVE_FEDERATION_RUNTIME.md")),
    true,
  );
});

// ── validation script ─────────────────────────────────────────────────────────

test("scripts/check-live-federation-runtime.mjs exists", () => {
  assert.equal(existsSync(r("scripts/check-live-federation-runtime.mjs")), true);
});

// ── index exports ─────────────────────────────────────────────────────────────

test("index.ts re-exports all major types and functions", () => {
  const content = readFileSync(lf("index.ts"), "utf8");
  assert.match(content, /OAuthProvider/);
  assert.match(content, /ConnectorSession/);
  assert.match(content, /AuthenticatedFederationState/);
  assert.match(content, /LiveFederationSnapshot/);
  assert.match(content, /retrieveLiveFederationSnapshot/);
  assert.match(content, /generateLiveFederationNarratives/);
});
