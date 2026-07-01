import fs from "node:fs";

const files = [
  "src/lib/operational-memory/cross-domain-correlation/cross-domain-correlation-engine.ts",
  "src/lib/operational-memory/cross-domain-correlation/cross-domain-correlation-risk-propagation.ts",
  "src/lib/operational-memory/cross-domain-correlation/cross-domain-correlation-clusters.ts",
  "src/lib/operational-memory/cross-domain-correlation/cross-domain-correlation-atmosphere.ts",
  "src/lib/operational-memory/cross-domain-correlation/cross-domain-correlation-diagnostics.ts",
  "src/lib/operational-memory/cross-domain-correlation/cross-domain-correlation-noise-control.ts",
  "src/lib/operational-memory/cross-domain-correlation/cross-domain-correlation-graph.ts",
  "src/lib/operational-memory/cross-domain-correlation/cross-domain-correlation-manager.ts",
  "tests/cross-domain-correlation-engine.test.mjs",
];
for (const file of files) if (!fs.existsSync(file)) throw new Error(`missing_required_cross_domain_file:${file}`);
const manager = fs.readFileSync("src/lib/operational-memory/cross-domain-correlation/cross-domain-correlation-manager.ts", "utf8");
for (const fn of ["retrieveCrossDomainCorrelation(","retrieveOperationalConvergence(","retrieveSystemicInstability(","retrievePropagationChains(","retrieveCorrelationClusters(","retrieveOperationalFragility(","retrieveRecoveryProbability(","retrieveCollapseIndicators(","retrieveCorrelatedOperationalNarratives("]) if (!manager.includes(fn)) throw new Error(`missing_api:${fn}`);
console.log("cross_domain_correlation_checks_passed");
