import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const ingestionDir = path.resolve("src/lib/live-federation/ingestion");

function listTsFiles() {
  return readdirSync(ingestionDir).filter((file) => file.endsWith(".ts"));
}

function readIngestionFile(file) {
  return readFileSync(path.join(ingestionDir, file), "utf8");
}

test("all local ingestion imports resolve with extensionless paths", () => {
  for (const file of listTsFiles()) {
    const content = readIngestionFile(file);
    const importMatches = content.matchAll(/from\s+["'](\.[^"']+)["']/g);
    for (const match of importMatches) {
      const importPath = match[1];
      assert.ok(!importPath.endsWith(".js"), `${file} contains .js import drift: ${importPath}`);
      const resolved = path.resolve(ingestionDir, `${importPath}.ts`);
      assert.ok(listTsFiles().includes(path.basename(resolved)), `${file} has unresolved local import: ${importPath}`);
    }
  }
});

test("expected ingestion contract symbols exist", () => {
  const eventNormalizer = readIngestionFile("event-normalizer.ts");
  const replayProtection = readIngestionFile("ingress-replay-protection.ts");
  const signalRouter = readIngestionFile("realtime-signal-router.ts");
  const runtime = readIngestionFile("live-ingestion-runtime.ts");

  assert.match(eventNormalizer, /export function normalizeIngressEvent\s*\(/);
  assert.match(eventNormalizer, /export function normalizeEventBatch\s*\(/);
  assert.match(replayProtection, /export function detectReplayIngress\s*\(/);
  assert.match(replayProtection, /export function buildReplayFingerprint\s*\(/);
  assert.match(signalRouter, /export function routeRealtimeSignal\s*\(/);
  assert.match(signalRouter, /export function classifyRealtimeSignalDomain\s*\(/);
  assert.match(runtime, /export function ingestFederatedEvent\s*\(/);
});

test("live-ingestion-runtime dependencies are fully resolvable", () => {
  const runtime = readIngestionFile("live-ingestion-runtime.ts");
  const importMatches = runtime.matchAll(/from\s+["'](\.[^"']+)["']/g);
  for (const match of importMatches) {
    const importPath = match[1];
    const candidate = path.resolve(ingestionDir, `${importPath}.ts`);
    assert.ok(listTsFiles().includes(path.basename(candidate)), `unresolved runtime dependency: ${importPath}`);
  }
});
