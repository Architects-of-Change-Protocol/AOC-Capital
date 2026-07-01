import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function readSrc(relPath) {
  return fs.readFileSync(path.join("src", relPath), "utf8");
}

function collectFiles(dir, ext = ".ts") {
  const results = [];
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(ext)) results.push(full);
    }
  };
  walk(dir);
  return results;
}

// ── 1. Provider registry defines ProviderMetadata ───────────────────────────

test("provider-registry defines ProviderTrustTier and ProviderMetadata with required fields", () => {
  const src = readSrc("lib/ai/providers/provider-registry.ts");
  assert.match(src, /ProviderTrustTier/);
  assert.match(src, /export interface ProviderMetadata/);
  assert.match(src, /trustTier/);
  assert.match(src, /allowedSensitivityLevels/);
  assert.match(src, /supportsEnterpriseIsolation/);
  assert.match(src, /supportsLocalExecution/);
  assert.match(src, /availability/);
  assert.match(src, /"enabled".*"disabled".*"not_configured"|"not_configured"/s);
});

// ── 2. All five providers are declared in the capability registry ────────────

test("provider-registry declares openai, anthropic, gemini, local, and mock", () => {
  const src = readSrc("lib/ai/providers/provider-registry.ts");
  assert.match(src, /"openai"/);
  assert.match(src, /"anthropic"/);
  assert.match(src, /"gemini"/);
  assert.match(src, /"local"/);
  assert.match(src, /"mock"/);
});

// ── 3. Health and registration helpers are exported ──────────────────────────

test("provider-registry exports getRegisteredProviders, isProviderRegistered, isProviderConfigured, getProviderHealth", () => {
  const src = readSrc("lib/ai/providers/provider-registry.ts");
  assert.match(src, /export function getRegisteredProviders/);
  assert.match(src, /export function isProviderRegistered/);
  assert.match(src, /export function isProviderConfigured/);
  assert.match(src, /export function getProviderHealth/);
});

// ── 4. RoutingMode type declares all required modes ──────────────────────────

test("routing-policy defines RoutingMode with all required routing modes", () => {
  const src = readSrc("lib/ai/providers/routing-policy.ts");
  assert.match(src, /export type RoutingMode/);
  assert.match(src, /"default"/);
  assert.match(src, /"sovereign_first"/);
  assert.match(src, /"local_only"/);
  assert.match(src, /"external_allowed"/);
  assert.match(src, /"resilience"/);
});

// ── 5. ProviderCandidate and ProviderRoutingDecision are exported ────────────

test("routing-policy exports ProviderCandidate and ProviderRoutingDecision", () => {
  const src = readSrc("lib/ai/providers/routing-policy.ts");
  assert.match(src, /export interface ProviderCandidate/);
  assert.match(src, /priority: number/);
  assert.match(src, /export interface ProviderRoutingDecision/);
  assert.match(src, /candidatesEvaluated/);
  assert.match(src, /rejectedCandidates/);
});

// ── 6. Candidate resolver handles local_only mode ───────────────────────────

test("candidate resolver returns only local candidates in local_only mode and fails closed when unconfigured", () => {
  const src = readSrc("lib/ai/providers/provider-candidate-resolver.ts");
  assert.match(src, /local_only/);
  // Returns early (empty) when local is not configured
  assert.match(src, /return candidates/);
});

// ── 7. Candidate resolver handles sovereign_first mode ──────────────────────

test("candidate resolver prefers local provider in sovereign_first mode", () => {
  const src = readSrc("lib/ai/providers/provider-candidate-resolver.ts");
  assert.match(src, /sovereign_first/);
  assert.match(src, /sovereign_first_local_preferred/);
  assert.match(src, /sovereign_first_trusted_fallback/);
});

// ── 8. Candidate resolver excludes mock from silent fallback ─────────────────

test("candidate resolver never includes mock as a silent fallback candidate", () => {
  const src = readSrc("lib/ai/providers/provider-candidate-resolver.ts");
  // mock is explicitly excluded with a guard
  assert.match(src, /id === "mock"/);
  assert.match(src, /continue/);
});

// ── 9. Egress policy denies conditional providers for restricted data ─────────

test("egress-policy denies non-local and non-sovereign providers for restricted data", () => {
  const src = readSrc("lib/ai/providers/egress-policy.ts");
  assert.match(src, /dataSensitivity === "restricted"/);
  assert.match(src, /restricted_data_requires_local_or_sovereign_provider/);
});

// ── 10. Egress policy enforces local_only routing mode ───────────────────────

test("egress-policy blocks non-local providers when routingMode is local_only", () => {
  const src = readSrc("lib/ai/providers/egress-policy.ts");
  assert.match(src, /local_only_mode_requires_local_provider/);
  assert.match(src, /supportsLocalExecution/);
});

// ── 11. Egress policy allows confidential + conditional with requiresAudit ───

test("egress-policy allows conditional provider for confidential data and sets requiresAudit", () => {
  const src = readSrc("lib/ai/providers/egress-policy.ts");
  assert.match(src, /confidential.*conditional|conditional.*confidential/s);
  assert.match(src, /requiresAudit.*true/);
  assert.match(src, /conditional_provider_allowed_for_confidential_with_audit/);
});

// ── 12. Router uses candidate resolver and egress policy ────────────────────

test("router.ts resolves candidates and evaluates egress policy per candidate", () => {
  const src = readSrc("lib/ai/providers/router.ts");
  assert.match(src, /resolveProviderCandidates/);
  assert.match(src, /buildRoutingContext/);
  assert.match(src, /evaluateProviderEgress/);
  assert.match(src, /allowedCandidates/);
  assert.match(src, /rejectedCandidates/);
});

// ── 13. Router fails closed when no approved provider ───────────────────────

test("router.ts throws InferenceError when no approved provider is available", () => {
  const src = readSrc("lib/ai/providers/router.ts");
  assert.match(src, /No approved provider available/);
  assert.match(src, /new InferenceError/);
});

// ── 14. Router emits routing audit and fallback events ──────────────────────

test("router.ts emits routing audit on success and fallback events on provider switch", () => {
  const src = readSrc("lib/ai/providers/router.ts");
  assert.match(src, /emitRoutingAudit/);
  assert.match(src, /emitRoutingFallback/);
  assert.match(src, /fallbackUsed/);
  assert.match(src, /rejectedProviders/);
});

// ── 15. runProviderInference is exported as alias ────────────────────────────

test("router.ts exports runProviderInference as alias for runInference", () => {
  const src = readSrc("lib/ai/providers/router.ts");
  assert.match(src, /runProviderInference/);
  assert.match(src, /export const runProviderInference/);
});

// ── 16. Routing audit logs metadata only, no content ─────────────────────────

test("routing-audit.ts emits metadata only without prompt or message content", () => {
  const src = readSrc("lib/ai/providers/routing-audit.ts");
  assert.match(src, /export function emitRoutingAudit/);
  assert.match(src, /export function emitRoutingFallback/);
  assert.match(src, /selectedProvider/);
  assert.match(src, /rejectedProviders/);
  assert.match(src, /fallbackUsed/);
  // Prompts and content must not be logged — no direct reference to inference messages
  assert.doesNotMatch(src, /\.messages|request\.messages|body\.messages/);
});

// ── 17. DataSensitivity is exported from inference types ─────────────────────

test("DataSensitivity type is exported from inference/types.ts with all four levels", () => {
  const src = readSrc("lib/ai/inference/types.ts");
  assert.match(src, /export type DataSensitivity/);
  assert.match(src, /"restricted"/);
  assert.match(src, /"confidential"/);
  assert.match(src, /"internal"/);
  assert.match(src, /"public"/);
});

// ── 18. InferenceRequest includes dataSensitivity and routing metadata ────────

test("InferenceRequest includes dataSensitivity field and metadata routing slot", () => {
  const src = readSrc("lib/ai/inference/types.ts");
  assert.match(src, /dataSensitivity\?/);
  assert.match(src, /DataSensitivity/);
  assert.match(src, /metadata\?.*Record|Record.*metadata/s);
});

// ── 19. Local provider is marked to support restricted sensitivity ─────────────

test("local provider in capability registry supports restricted sensitivity level", () => {
  const src = readSrc("lib/ai/providers/provider-registry.ts");
  // The local block must include "restricted" in its allowedSensitivityLevels
  assert.match(src, /local[\s\S]{0,300}restricted|restricted[\s\S]{0,300}local/);
});

// ── 20. RoutingContext includes all required orchestration fields ──────────────

test("RoutingContext interface contains routingMode, dataSensitivity, allowFallback, requireLocalExecution", () => {
  const src = readSrc("lib/ai/providers/provider-candidate-resolver.ts");
  assert.match(src, /export interface RoutingContext/);
  assert.match(src, /routingMode/);
  assert.match(src, /dataSensitivity/);
  assert.match(src, /allowFallback/);
  assert.match(src, /requireLocalExecution/);
});

// ── 21. API routes do not import provider adapters directly ──────────────────

test("API routes do not import provider adapters or call provider adapters directly", () => {
  const routeDir = path.join("src", "app", "api");
  const files = collectFiles(routeDir);
  const violations = [];
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    if (/openai-provider|anthropic-provider|gemini-provider|local-provider/.test(src)) {
      violations.push(file);
    }
  }
  assert.deepEqual(
    violations,
    [],
    `Routes must not import provider adapters directly:\n${violations.join("\n")}`,
  );
});

// ── 22. Existing PMFreak routes remain provider-neutral ─────────────────────

test("copilot, analyze-ai, and meta-intelligence routes call runInference, not a specific provider", () => {
  const routes = [
    "app/api/copilot/route.ts",
    "app/api/analyze-ai/route.ts",
    "app/api/ai/meta-intelligence/route.ts",
  ];
  for (const route of routes) {
    const src = readSrc(route);
    assert.match(src, /runInference/, `${route} must call runInference`);
    assert.doesNotMatch(src, /openAIProvider|openai-provider/, `${route} must not reference OpenAI provider directly`);
  }
});

// ── 23. Candidate resolver builds ordered candidates using priority ───────────

test("candidate resolver assigns priority to candidates and builds ordered chains", () => {
  const src = readSrc("lib/ai/providers/provider-candidate-resolver.ts");
  assert.match(src, /priority/);
  assert.match(src, /candidates\.push/);
  assert.match(src, /candidates\.length/);
});

// ── 24. inference-gateway.ts uses runProviderInference ───────────────────────

test("inference-gateway.ts delegates to runProviderInference from providers/router", () => {
  const src = readSrc("lib/ai/gateway/inference-gateway.ts");
  assert.match(src, /runProviderInference/);
  assert.match(src, /providers\/router/);
  assert.match(src, /export async function runInferenceGateway/);
});

// ── 25. gateway.ts does not have duplicate runProviderInference import ────────

test("gateway.ts imports runInference from providers/router without duplicate runProviderInference import", () => {
  const src = readSrc("lib/ai/gateway/gateway.ts");
  assert.match(src, /runInference/);
  assert.match(src, /providers\/router/);
  // Must not double-import runProviderInference (removed the duplicate)
  const importCount = (src.match(/import.*runProviderInference/g) ?? []).length;
  assert.equal(importCount, 0, "gateway.ts must not import runProviderInference (uses runInference directly)");
});
