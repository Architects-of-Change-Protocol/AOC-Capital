import fs from "node:fs";
const files = [
  "src/lib/operational-memory/critical-path-intelligence/critical-path-engine.ts",
  "src/lib/operational-memory/critical-path-intelligence/critical-path-graph.ts",
  "src/lib/operational-memory/critical-path-intelligence/critical-path-propagation.ts",
  "src/lib/operational-memory/critical-path-intelligence/critical-path-survivability.ts",
  "src/lib/operational-memory/critical-path-intelligence/critical-path-bottlenecks.ts",
  "src/lib/operational-memory/critical-path-intelligence/critical-path-hidden-dependencies.ts",
  "src/lib/operational-memory/critical-path-intelligence/critical-path-diagnostics.ts",
  "src/lib/operational-memory/critical-path-intelligence/critical-path-narratives.ts",
  "src/lib/operational-memory/critical-path-intelligence/critical-path-manager.ts",
  "tests/critical-path-intelligence.test.mjs"
];
for (const file of files) if (!fs.existsSync(file)) throw new Error(`missing_required_critical_path_file:${file}`);
const manager = fs.readFileSync("src/lib/operational-memory/critical-path-intelligence/critical-path-manager.ts", "utf8");
for (const fn of ["retrieveCriticalPathIntelligence(","retrieveDependencyGraph(","retrieveCriticalExecutionChains(","retrieveMilestoneSurvivability(","retrieveTemporalPressureClusters(","retrieveExecutionFragility(","retrieveHiddenDependencies(","retrieveBottleneckAnalysis(","retrieveExecutionInstability(","retrieveDependencyPropagation(","retrieveCriticalPathNarratives("]) if (!manager.includes(fn)) throw new Error(`missing_api:${fn}`);
console.log("critical_path_intelligence_checks_passed");
