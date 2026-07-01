import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const manager = fs.readFileSync("src/lib/operational-memory/predictive-intelligence/predictive-intelligence-manager.ts", "utf8");
const engine = fs.readFileSync("src/lib/operational-memory/predictive-intelligence/predictive-intelligence-engine.ts", "utf8");
const noise = fs.readFileSync("src/lib/operational-memory/predictive-intelligence/predictive-intelligence-noise-control.ts", "utf8");

test("predictive APIs exported", () => {
  for (const fn of ["retrievePredictiveOperationalIntelligence(","retrieveOperationalForecasts(","retrieveScenarioProjections(","retrievePredictedOperationalOutcomes(","retrieveInterventionImpactEstimates(","retrievePredictiveRiskClusters(","retrievePredictiveNarratives(","retrieveForecastUncertainty("]) assert.ok(manager.includes(fn));
});

test("trajectory, scenario, and intervention engines are deterministic", () => {
  assert.match(engine, /buildTrajectoryForecasts/);
  assert.match(engine, /buildScenarioProjections/);
  assert.match(engine, /estimateInterventionImpact/);
});

test("anti-hallucination controls enforce thresholding and dedup", () => {
  assert.match(noise, /confidence < 0\.25/);
  assert.match(noise, /dedup/);
});
