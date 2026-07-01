import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const engine = fs.readFileSync("src/lib/operational-memory/critical-path-intelligence/critical-path-engine.ts", "utf8");
const manager = fs.readFileSync("src/lib/operational-memory/critical-path-intelligence/critical-path-manager.ts", "utf8");

test("critical path runtime exposes deterministic engine assembly", () => {
  for (const symbol of ["buildDependencyGraph", "detectCriticalExecutionChains", "buildDependencyPropagation", "buildExecutionSurvivabilityForecast", "buildCriticalPathNarratives"]) {
    assert.ok(engine.includes(symbol));
  }
});

test("critical path manager exposes required API surface", () => {
  for (const fn of ["retrieveCriticalPathIntelligence(", "retrieveDependencyGraph(", "retrieveCriticalExecutionChains(", "retrieveMilestoneSurvivability(", "retrieveTemporalPressureClusters(", "retrieveExecutionFragility(", "retrieveHiddenDependencies(", "retrieveBottleneckAnalysis(", "retrieveExecutionInstability(", "retrieveDependencyPropagation(", "retrieveCriticalPathNarratives("]) {
    assert.ok(manager.includes(fn));
  }
});
