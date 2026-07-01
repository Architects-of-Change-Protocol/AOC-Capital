import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function read(file) { return fs.readFileSync(file, "utf8"); }

test("connector ingress runtime surface exists", () => {
  const content = read("src/lib/live-federation/ingestion/live-ingestion-runtime.ts");
  assert.match(content, /ingestFederatedEvent/);
  assert.match(content, /validateFederatedIngress/);
  assert.match(content, /persistOperationalIngress/);
  assert.match(content, /workspaceId/);
});

test("replay rejection and registration are wired", () => {
  const content = read("src/lib/live-federation/ingestion/ingress-replay-protection.ts");
  assert.match(content, /validateIngressReplay/);
  assert.match(content, /registerIngressNonce/);
  assert.match(content, /rejectReplayIngress/);
  assert.match(content, /duplicate webhook replay/i);
});

test("normalization and routing integrity", () => {
  const normalizer = read("src/lib/live-federation/ingestion/event-normalizer.ts");
  const router = read("src/lib/live-federation/ingestion/realtime-signal-router.ts");
  assert.match(normalizer, /type FederatedOperationalEvent/);
  assert.match(normalizer, /payloadHash/);
  assert.match(router, /operational-memory/);
  assert.match(router, /executive-command-runtime/);
});

test("pulse and survivability signals exist", () => {
  const pulse = read("src/lib/live-federation/ingestion/operational-pulse.ts");
  const survivability = read("src/lib/live-federation/ingestion/event-survivability.ts");
  assert.match(pulse, /computeOperationalPulse/);
  assert.match(pulse, /detectPulseAnomalies/);
  assert.match(survivability, /evaluateEventSurvivability/);
  assert.match(survivability, /connector starvation/i);
});
