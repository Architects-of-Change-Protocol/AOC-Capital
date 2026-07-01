import fs from "node:fs";

const files = [
  "src/lib/operational-memory/continuity-retrieval/continuity-retrieval-manager.ts",
  "src/lib/operational-memory/continuity-retrieval/continuity-retrieval-weighting.ts",
  "src/lib/operational-memory/continuity-retrieval/continuity-retrieval-atmosphere.ts",
  "src/lib/operational-memory/continuity-retrieval/continuity-retrieval-lineage.ts",
  "src/lib/operational-memory/continuity-retrieval/continuity-retrieval-diagnostics.ts",
  "src/lib/operational-memory/continuity-retrieval/continuity-retrieval-noise-control.ts",
  "tests/operational-continuity-cognition.test.mjs",
];
for (const file of files) if (!fs.existsSync(file)) throw new Error(`missing_required_continuity_file:${file}`);
const manager = fs.readFileSync(files[0], "utf8");
for (const fn of ["retrieveOperationalContinuity(","retrieveOperationalPressure(","retrieveOperationalAtmosphere(","retrieveOperationalTimeline(","retrieveStakeholderContinuity(","retrieveInterventionContinuity(","retrieveContinuityLineage(","retrieveCriticalOperationalSignals(","retrieveOperationalRiskClusters("]) {
  if (!manager.includes(fn)) throw new Error(`missing_api:${fn}`);
}
console.log("continuity_retrieval_checks_passed");
