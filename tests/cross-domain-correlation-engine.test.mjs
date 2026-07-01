import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const manager = fs.readFileSync("src/lib/operational-memory/cross-domain-correlation/cross-domain-correlation-manager.ts", "utf8");
const engine = fs.readFileSync("src/lib/operational-memory/cross-domain-correlation/cross-domain-correlation-engine.ts", "utf8");
const noise = fs.readFileSync("src/lib/operational-memory/cross-domain-correlation/cross-domain-correlation-noise-control.ts", "utf8");

test("cross-domain retrieval APIs exported", () => {
  for (const fn of ["retrieveCrossDomainCorrelation(","retrieveOperationalConvergence(","retrieveSystemicInstability(","retrievePropagationChains(","retrieveCorrelationClusters(","retrieveOperationalFragility(","retrieveRecoveryProbability(","retrieveCollapseIndicators(","retrieveCorrelatedOperationalNarratives("]) assert.ok(manager.includes(fn));
});

test("convergence and propagation models are deterministic", () => {
  assert.match(engine, /detectConvergencePatterns/);
  assert.match(engine, /modelRiskPropagation/);
  assert.match(engine, /detectSystemicInstability/);
  assert.match(engine, /Cluster .* deterministic domain mapping/);
});

test("anti-noise and stale damping controls exist", () => {
  assert.match(noise, /confidence < 0\.25/);
  assert.match(noise, /ageDays > 45 \? 0\.6 : 1/);
  assert.match(noise, /dedup/);
});
