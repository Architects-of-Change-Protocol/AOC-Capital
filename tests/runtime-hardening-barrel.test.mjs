import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const hardeningDir = path.join(repoRoot, "src/lib/runtime-hardening");
const indexFile = path.join(hardeningDir, "index.ts");
const routeFile = path.join(repoRoot, "src/app/api/runtime/hardening/route.ts");

const indexContent = fs.readFileSync(indexFile, "utf8");

const exportFromMatches = [...indexContent.matchAll(/from\s+["'](\.[^"']+)["']/g)].map((m) => m[1]);

const expectedMissingList = [
  "startup-assertions",
  "runtime-invariants",
  "cognition-contracts",
  "runtime-boundary-validation",
  "replay-integrity",
  "synchronization-integrity",
  "anti-corruption-layer",
  "degraded-mode",
  "runtime-survivability",
  "runtime-health",
  "runtime-slo",
  "runtime-readiness",
  "runtime-launch-gates",
  "runtime-recovery",
  "runtime-failure-classification",
  "runtime-governance",
  "runtime-isolation",
  "runtime-integrity-diagnostics",
  "runtime-hardening-narratives",
  "runtime-hardening-manager",
];

test("index barrel has no .js runtime-hardening export paths", () => {
  assert.equal(indexContent.includes('.js"'), false);
  assert.equal(indexContent.includes(".js'"), false);
});

test("index barrel export targets resolve to existing local TypeScript modules", () => {
  for (const relTarget of exportFromMatches) {
    const absTarget = path.resolve(path.dirname(indexFile), `${relTarget}.ts`);
    assert.equal(fs.existsSync(absTarget), true, `Missing export target: ${relTarget}`);
  }
});

test("build-critical missing-module list now resolves", () => {
  for (const entry of expectedMissingList) {
    const absTarget = path.join(hardeningDir, `${entry}.ts`);
    assert.equal(fs.existsSync(absTarget), true, `Expected module missing: ${entry}`);
  }
});

test("runtime hardening route imports expected aggregate symbols", () => {
  const routeContent = fs.readFileSync(routeFile, "utf8");
  const requiredSymbols = [
    "retrieveRuntimeHealth",
    "evaluateLaunchReadiness",
    "classifyDegradedMode",
    "generateRuntimeDiagnostics",
    "generateRuntimeNarratives",
    "evaluateStartupAssertions",
    "evaluateRuntimeInvariants",
    "evaluateReplayIntegrity",
  ];

  for (const symbol of requiredSymbols) {
    assert.match(routeContent, new RegExp(`\\b${symbol}\\b`), `Route missing symbol: ${symbol}`);
  }
});
