import fs from "node:fs";
const files = [
  "src/lib/operational-memory/predictive-intelligence/predictive-intelligence-engine.ts",
  "src/lib/operational-memory/predictive-intelligence/predictive-intelligence-trajectories.ts",
  "src/lib/operational-memory/predictive-intelligence/predictive-intelligence-scenarios.ts",
  "src/lib/operational-memory/predictive-intelligence/predictive-intelligence-intervention-impact.ts",
  "src/lib/operational-memory/predictive-intelligence/predictive-intelligence-confidence.ts",
  "src/lib/operational-memory/predictive-intelligence/predictive-intelligence-diagnostics.ts",
  "src/lib/operational-memory/predictive-intelligence/predictive-intelligence-noise-control.ts",
  "src/lib/operational-memory/predictive-intelligence/predictive-intelligence-manager.ts",
  "tests/predictive-operational-intelligence.test.mjs",
];
for (const file of files) if (!fs.existsSync(file)) throw new Error(`missing_required_predictive_file:${file}`);
const manager = fs.readFileSync("src/lib/operational-memory/predictive-intelligence/predictive-intelligence-manager.ts", "utf8");
for (const fn of ["retrievePredictiveOperationalIntelligence(","retrieveOperationalForecasts(","retrieveScenarioProjections(","retrievePredictedOperationalOutcomes(","retrieveInterventionImpactEstimates(","retrievePredictiveRiskClusters(","retrievePredictiveNarratives(","retrieveForecastUncertainty("]) if (!manager.includes(fn)) throw new Error(`missing_api:${fn}`);
console.log("predictive_intelligence_checks_passed");
