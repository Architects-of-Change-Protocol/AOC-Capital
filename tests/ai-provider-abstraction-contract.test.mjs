import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// ── helpers ──────────────────────────────────────────────────────────────────

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

const OPENAI_LEAK_PATTERN = /https:\/\/api\.openai\.com|chat\/completions|OPENAI_API_KEY/;

// ── 1. No direct OpenAI calls in API routes ──────────────────────────────────

test("API routes must not contain direct OpenAI endpoints or API keys", () => {
  const routeDir = path.join("src", "app", "api");
  const files = collectFiles(routeDir);
  const violations = [];
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    if (OPENAI_LEAK_PATTERN.test(src)) {
      violations.push(file);
    }
  }
  assert.deepEqual(
    violations,
    [],
    `These route files contain direct OpenAI coupling:\n${violations.join("\n")}`,
  );
});

// ── 2. OpenAI API key only in provider layer ──────────────────────────────────

test("OPENAI_API_KEY must only appear in the provider layer", () => {
  const allAiFiles = collectFiles(path.join("src", "lib", "ai"));
  const violations = [];
  for (const file of allAiFiles) {
    // Only the openai-provider is allowed to reference the key
    if (file.includes("openai-provider")) continue;
    const src = fs.readFileSync(file, "utf8");
    if (/OPENAI_API_KEY/.test(src)) {
      violations.push(file);
    }
  }
  assert.deepEqual(
    violations,
    [],
    `These lib/ai files reference OPENAI_API_KEY outside the provider adapter:\n${violations.join("\n")}`,
  );
});

// ── 3. OpenAI endpoint URL only in provider adapter ───────────────────────────

test("api.openai.com URL must only appear in the OpenAI provider adapter", () => {
  const allAiFiles = collectFiles(path.join("src", "lib", "ai"));
  const violations = [];
  for (const file of allAiFiles) {
    if (file.includes("openai-provider")) continue;
    const src = fs.readFileSync(file, "utf8");
    if (/https:\/\/api\.openai\.com/.test(src)) {
      violations.push(file);
    }
  }
  assert.deepEqual(
    violations,
    [],
    `These lib/ai files reference api.openai.com outside the provider adapter:\n${violations.join("\n")}`,
  );
});

// ── 4. Provider-neutral InferenceProvider interface is defined ────────────────

test("InferenceProvider interface is exported from inference/types", () => {
  const src = readSrc("lib/ai/inference/types.ts");
  assert.match(src, /export interface InferenceProvider/, "InferenceProvider interface must be exported");
  assert.match(src, /readonly id: string/, "InferenceProvider must declare id");
  assert.match(src, /complete\(request: InferenceRequest\)/, "InferenceProvider must declare complete()");
});

// ── 5. InferenceRequest / InferenceResponse are provider-neutral ──────────────

test("InferenceRequest and InferenceResponse must not reference openai-specific fields", () => {
  const src = readSrc("lib/ai/inference/types.ts");
  assert.match(src, /export interface InferenceRequest/, "InferenceRequest must be exported");
  assert.match(src, /export interface InferenceResponse/, "InferenceResponse must be exported");
  // Must not embed provider-specific shapes
  assert.doesNotMatch(src, /prompt_tokens|completion_tokens|choices\[/, "InferenceResponse must not expose OpenAI-specific field names");
});

// ── 6. InferenceError is defined for typed error propagation ──────────────────

test("InferenceError is exported with errorClass", () => {
  const src = readSrc("lib/ai/inference/types.ts");
  assert.match(src, /export class InferenceError extends Error/, "InferenceError class must be exported");
  assert.match(src, /errorClass/, "InferenceError must carry errorClass");
  assert.match(src, /rate_limited/, "errorClass must include rate_limited");
});

// ── 7. Provider registry/router is the choke-point ───────────────────────────

test("router.ts exports runInference and resolveProvider", () => {
  const src = readSrc("lib/ai/providers/router.ts");
  assert.match(src, /export.*function runInference/, "runInference must be exported");
  assert.match(src, /export.*function resolveProvider/, "resolveProvider must be exported");
  assert.match(src, /registerProvider/, "registerProvider must be available for future adapters");
});

// ── 8. OpenAI is one adapter behind the provider interface ───────────────────

test("openai-provider implements InferenceProvider and isolates the OpenAI URL", () => {
  const src = readSrc("lib/ai/providers/openai-provider.ts");
  assert.match(src, /InferenceProvider/, "openai-provider must reference InferenceProvider");
  assert.match(src, /https:\/\/api\.openai\.com\/v1\/chat\/completions/, "openai-provider must own the endpoint URL");
  assert.match(src, /OPENAI_API_KEY/, "openai-provider must own the API key reference");
  assert.match(src, /InferenceError/, "openai-provider must throw InferenceError on failure");
});

// ── 9. Gateway still distinguishes mock vs live ───────────────────────────────

test("gateway preserves isSimulated / inferenceMode on mock and fallback paths", () => {
  const src = readSrc("lib/ai/gateway/gateway.ts");
  assert.match(src, /isSimulated.*true/, "mock path must set isSimulated: true");
  assert.match(src, /inferenceMode.*mock/, "mock path must set inferenceMode: mock");
  assert.match(src, /inferenceMode.*live/, "live path must set inferenceMode: live");
  assert.match(src, /productionReady.*true/, "live path must set productionReady: true");
});

// ── 10. Gateway does not directly call OpenAI ────────────────────────────────

test("gateway must not directly reference OpenAI endpoints or API keys", () => {
  const src = readSrc("lib/ai/gateway/gateway.ts");
  assert.doesNotMatch(src, /https:\/\/api\.openai\.com/, "gateway must not call OpenAI directly");
  assert.doesNotMatch(src, /OPENAI_API_KEY/, "gateway must not read OPENAI_API_KEY directly");
});

// ── 11. Future provider registration point exists ────────────────────────────

test("router.ts has commented stubs for future Claude / Gemini / local providers", () => {
  const src = readSrc("lib/ai/providers/router.ts");
  assert.match(src, /anthropic|claude/i, "router should stub Anthropic/Claude as a future provider");
});

// ── 12. Routes use runInference, not resilientFetch directly ─────────────────

test("migrated routes import runInference from provider router", () => {
  const routes = [
    "app/api/analyze-ai/route.ts",
    "app/api/copilot/route.ts",
    "app/api/ai/meta-intelligence/route.ts",
  ];
  for (const route of routes) {
    const src = readSrc(route);
    assert.match(
      src,
      /from.*providers\/router/,
      `${route} must import from providers/router`,
    );
    assert.doesNotMatch(
      src,
      /resilientFetch/,
      `${route} must not call resilientFetch directly`,
    );
  }
});

// ── 13. Governance / egress metadata is attached to inference requests ────────

test("routes attach workspaceId, projectId, actorId, moduleId to InferenceRequest", () => {
  const copilotSrc = readSrc("app/api/copilot/route.ts");
  assert.match(copilotSrc, /moduleId.*copilot/, "copilot must set moduleId");
  assert.match(copilotSrc, /actorId/, "copilot must set actorId");
  assert.match(copilotSrc, /actorType/, "copilot must set actorType");

  const metaSrc = readSrc("app/api/ai/meta-intelligence/route.ts");
  assert.match(metaSrc, /moduleId.*meta-intelligence/, "meta-intelligence must set moduleId");

  const analyzeSrc = readSrc("app/api/analyze-ai/route.ts");
  assert.match(analyzeSrc, /moduleId.*scope-analysis/, "analyze-ai must set moduleId");
  assert.match(analyzeSrc, /workspaceId/, "analyze-ai must pass workspaceId");
  assert.match(analyzeSrc, /projectId/, "analyze-ai must pass projectId");
});
