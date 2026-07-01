/**
 * Validation script: check-live-federation-runtime
 *
 * Verifies that the live-federation domain exists, all required files are present,
 * tests exist, docs exist, and package.json includes the check:live-federation-runtime script.
 *
 * Run via: node scripts/check-live-federation-runtime.mjs
 * Wired into package.json as "check:live-federation-runtime".
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const p = (...parts) => path.join(root, ...parts);

const errors = [];
const warnings = [];

function error(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

// ── required live-federation files ───────────────────────────────────────────

const REQUIRED_FILES = [
  "src/lib/live-federation/types/live-federation-types.ts",
  "src/lib/live-federation/oauth/oauth-runtime.ts",
  "src/lib/live-federation/oauth/oauth-providers.ts",
  "src/lib/live-federation/oauth/oauth-state-validation.ts",
  "src/lib/live-federation/oauth/oauth-survivability.ts",
  "src/lib/live-federation/callbacks/oauth-callback-runtime.ts",
  "src/lib/live-federation/sessions/connector-session-runtime.ts",
  "src/lib/live-federation/governance/connector-session-governance.ts",
  "src/lib/live-federation/diagnostics/connector-session-diagnostics.ts",
  "src/lib/live-federation/tokens/connector-token-runtime.ts",
  "src/lib/live-federation/governance/connector-token-governance.ts",
  "src/lib/live-federation/encryption/connector-token-encryption.ts",
  "src/lib/live-federation/refresh/connector-token-refresh.ts",
  "src/lib/live-federation/isolation/connector-token-isolation.ts",
  "src/lib/live-federation/persistence/connector-token-persistence.ts",
  "src/lib/live-federation/runtime/live-federation-runtime.ts",
  "src/lib/live-federation/runtime/authenticated-federation.ts",
  "src/lib/live-federation/replay/authenticated-replay.ts",
  "src/lib/live-federation/observability/live-connector-observability.ts",
  "src/lib/live-federation/observability/live-connector-heartbeats.ts",
  "src/lib/live-federation/topology/live-connector-topology.ts",
  "src/lib/live-federation/provisioning/connector-provisioning.ts",
  "src/lib/live-federation/governance/connector-auth-boundaries.ts",
  "src/lib/live-federation/survivability/connector-runtime-recovery.ts",
  "src/lib/live-federation/narratives/live-federation-narratives.ts",
  "src/lib/live-federation/live-federation-manager.ts",
  "src/lib/live-federation/index.ts",
];

for (const file of REQUIRED_FILES) {
  if (!fs.existsSync(p(file))) {
    error(`Missing required file: ${file}`);
  }
}

// ── OAuth runtime checks ──────────────────────────────────────────────────────

const oauthRuntimePath = p("src/lib/live-federation/oauth/oauth-runtime.ts");
if (fs.existsSync(oauthRuntimePath)) {
  const content = fs.readFileSync(oauthRuntimePath, "utf8");
  if (!content.includes("buildOAuthAuthorizationRequest")) {
    error("oauth-runtime.ts missing buildOAuthAuthorizationRequest");
  }
  if (!content.includes("evaluateOAuthReadiness")) {
    error("oauth-runtime.ts missing evaluateOAuthReadiness");
  }
  if (!content.includes("retrieveOAuthDiagnostics")) {
    error("oauth-runtime.ts missing retrieveOAuthDiagnostics");
  }
  if (/client_secret\s*[:=]\s*["'][a-zA-Z0-9]{10,}/.test(content)) {
    error("oauth-runtime.ts contains what appears to be a hardcoded client secret");
  }
  if (/sk_live_[a-zA-Z0-9]{10,}/.test(content)) {
    error("oauth-runtime.ts contains a hardcoded live secret");
  }
}

// ── OAuth state validation checks ─────────────────────────────────────────────

const stateValidationPath = p("src/lib/live-federation/oauth/oauth-state-validation.ts");
if (fs.existsSync(stateValidationPath)) {
  const content = fs.readFileSync(stateValidationPath, "utf8");
  if (!content.includes("validateOAuthState")) {
    error("oauth-state-validation.ts missing validateOAuthState");
  }
  if (!/replay/i.test(content)) {
    error("oauth-state-validation.ts missing anti-replay semantics");
  }
  if (!/tenantId/.test(content)) {
    error("oauth-state-validation.ts missing tenant-bound validation");
  }
  if (!/STATE_EXPIRY_MS|expiry|expired/i.test(content)) {
    error("oauth-state-validation.ts missing expiration-aware validation");
  }
}

// ── token governance checks ───────────────────────────────────────────────────

const tokenGovPath = p("src/lib/live-federation/governance/connector-token-governance.ts");
if (fs.existsSync(tokenGovPath)) {
  const content = fs.readFileSync(tokenGovPath, "utf8");
  if (!content.includes("evaluateTokenGovernance")) {
    error("connector-token-governance.ts missing evaluateTokenGovernance");
  }
  if (!content.includes("clientSideExposed")) {
    error("connector-token-governance.ts missing clientSideExposed check");
  }
  if (!/CRITICAL/.test(content)) {
    warn("connector-token-governance.ts does not mark client-side exposure as CRITICAL");
  }
}

// ── token isolation checks ────────────────────────────────────────────────────

const isolationPath = p("src/lib/live-federation/isolation/connector-token-isolation.ts");
if (fs.existsSync(isolationPath)) {
  const content = fs.readFileSync(isolationPath, "utf8");
  if (!content.includes("evaluateConnectorTokenIsolation")) {
    error("connector-token-isolation.ts missing evaluateConnectorTokenIsolation");
  }
  if (!content.includes("tenantIsolated")) {
    error("connector-token-isolation.ts missing tenantIsolated check");
  }
  if (!content.includes("workspaceIsolated")) {
    error("connector-token-isolation.ts missing workspaceIsolated check");
  }
  if (!content.includes("replayIsolated")) {
    error("connector-token-isolation.ts missing replayIsolated check");
  }
}

// ── authenticated federation checks ──────────────────────────────────────────

const fedRuntimePath = p("src/lib/live-federation/runtime/live-federation-runtime.ts");
if (fs.existsSync(fedRuntimePath)) {
  const content = fs.readFileSync(fedRuntimePath, "utf8");
  if (!content.includes("initializeAuthenticatedFederation")) {
    error("live-federation-runtime.ts missing initializeAuthenticatedFederation");
  }
  if (!content.includes("retrieveAuthenticatedFederationState")) {
    error("live-federation-runtime.ts missing retrieveAuthenticatedFederationState");
  }
  if (!content.includes("survivabilityScore")) {
    error("live-federation-runtime.ts missing survivabilityScore");
  }
}

// ── authenticated replay checks ───────────────────────────────────────────────

const replayPath = p("src/lib/live-federation/replay/authenticated-replay.ts");
if (fs.existsSync(replayPath)) {
  const content = fs.readFileSync(replayPath, "utf8");
  if (!content.includes("buildAuthenticatedReplayBoundary")) {
    error("authenticated-replay.ts missing buildAuthenticatedReplayBoundary");
  }
  if (!content.includes("validateReplayAuthorization")) {
    error("authenticated-replay.ts missing validateReplayAuthorization");
  }
  if (!/cross-tenant/i.test(content)) {
    error("authenticated-replay.ts missing cross-tenant replay protection");
  }
}

// ── observability checks ──────────────────────────────────────────────────────

const observabilityPath = p("src/lib/live-federation/observability/live-connector-observability.ts");
if (fs.existsSync(observabilityPath)) {
  const content = fs.readFileSync(observabilityPath, "utf8");
  if (!content.includes("retrieveLiveConnectorObservability")) {
    error("live-connector-observability.ts missing retrieveLiveConnectorObservability");
  }
  if (!content.includes("uncertainty")) {
    error("live-connector-observability.ts missing uncertainty field");
  }
}

// ── manager API surface ───────────────────────────────────────────────────────

const managerPath = p("src/lib/live-federation/live-federation-manager.ts");
if (fs.existsSync(managerPath)) {
  const content = fs.readFileSync(managerPath, "utf8");
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
  ];
  for (const api of requiredApis) {
    if (!content.includes(api)) {
      error(`live-federation-manager.ts missing required API: ${api}`);
    }
  }
}

// ── recovery is recommendations-only ─────────────────────────────────────────

const recoveryPath = p("src/lib/live-federation/survivability/connector-runtime-recovery.ts");
if (fs.existsSync(recoveryPath)) {
  const content = fs.readFileSync(recoveryPath, "utf8");
  if (/execSync|spawnSync|writeFileSync/.test(content)) {
    error("connector-runtime-recovery.ts must not automate fixes (no execSync/spawnSync/writeFileSync)");
  }
  if (!content.includes("isAutomated: false")) {
    error("connector-runtime-recovery.ts must explicitly mark isAutomated: false");
  }
}

// ── encryption is contract-layer only ────────────────────────────────────────

const encryptionPath = p("src/lib/live-federation/encryption/connector-token-encryption.ts");
if (fs.existsSync(encryptionPath)) {
  const content = fs.readFileSync(encryptionPath, "utf8");
  if (!content.includes("AES-256-GCM")) {
    error("connector-token-encryption.ts missing AES-256-GCM expectation");
  }
  if (/@aws-sdk\/client-kms|google-cloud-kms/.test(content)) {
    error("connector-token-encryption.ts must not import live KMS SDKs at contract layer");
  }
}

// ── no hardcoded secrets across domain ───────────────────────────────────────

const secretPatterns = [
  /sk_live_[a-zA-Z0-9]{20,}/,
  /sk_test_[a-zA-Z0-9]{20,}/,
  /client_secret\s*[:=]\s*["'][a-zA-Z0-9]{10,}/,
  /service_role_[a-zA-Z0-9._-]{20,}/,
];

for (const file of REQUIRED_FILES) {
  const filePath = p(file);
  if (!fs.existsSync(filePath)) continue;
  const content = fs.readFileSync(filePath, "utf8");
  for (const pattern of secretPatterns) {
    if (pattern.test(content)) {
      error(`Potential hardcoded secret in ${file}`);
    }
  }
}

// ── test file ─────────────────────────────────────────────────────────────────

if (!fs.existsSync(p("tests/live-federation-runtime.test.mjs"))) {
  error("Missing test file: tests/live-federation-runtime.test.mjs");
}

// ── architecture docs ─────────────────────────────────────────────────────────

if (!fs.existsSync(p("docs/architecture/live-oauth-secure-federation-runtime.md"))) {
  error("Missing architecture doc: docs/architecture/live-oauth-secure-federation-runtime.md");
}

if (!fs.existsSync(p("docs/architecture/CURRENT_STATE_LIVE_FEDERATION_RUNTIME.md"))) {
  error("Missing architecture doc: docs/architecture/CURRENT_STATE_LIVE_FEDERATION_RUNTIME.md");
}

// ── package.json includes check:live-federation-runtime ──────────────────────

const pkgPath = p("package.json");
if (!fs.existsSync(pkgPath)) {
  error("package.json not found");
} else {
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  } catch {
    error("package.json is not valid JSON");
  }
  if (pkg && !pkg.scripts?.["check:live-federation-runtime"]) {
    error("package.json is missing script: check:live-federation-runtime");
  }
}

// ── report ────────────────────────────────────────────────────────────────────

if (warnings.length > 0) {
  console.log(`WARNINGS (${warnings.length}):`);
  for (const w of warnings) console.log(`  WARN  ${w}`);
  console.log();
}

if (errors.length > 0) {
  console.log(`ERRORS (${errors.length}):`);
  for (const e of errors) console.log(`  ERROR ${e}`);
  console.log();
  console.log("check-live-federation-runtime: FAILED");
  process.exit(1);
}

console.log("check-live-federation-runtime: PASSED — live federation runtime domain is complete.");
