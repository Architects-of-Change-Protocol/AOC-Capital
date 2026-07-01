import fs from "node:fs";
const files = [
  "src/lib/operational-memory/autonomous-intervention/autonomous-intervention-engine.ts",
  "src/lib/operational-memory/autonomous-intervention/autonomous-intervention-manager.ts",
  "src/lib/operational-memory/autonomous-intervention/autonomous-intervention-governance.ts",
  "src/lib/operational-memory/autonomous-intervention/autonomous-intervention-escalation.ts",
  "src/lib/operational-memory/autonomous-intervention/autonomous-intervention-recovery.ts",
  "src/lib/operational-memory/autonomous-intervention/autonomous-intervention-diagnostics.ts",
  "src/lib/operational-memory/autonomous-intervention/autonomous-intervention-narratives.ts",
  "tests/autonomous-intervention-runtime.test.mjs"
];
for (const file of files) if (!fs.existsSync(file)) throw new Error(`missing_required_file:${file}`);
const manager = fs.readFileSync("src/lib/operational-memory/autonomous-intervention/autonomous-intervention-manager.ts", "utf8");
for (const fn of ["retrieveAutonomousInterventionPlan(","retrieveInterventionCandidates(","retrieveInterventionSequence(","retrieveInterventionUrgency(","retrieveInterventionImpact(","retrieveInterventionSafetyProfile(","retrieveEscalationPaths(","retrieveRecoveryPaths(","retrieveInterventionDiagnostics(","retrieveInterventionNarratives("]) if (!manager.includes(fn)) throw new Error(`missing_api:${fn}`);
console.log("autonomous_intervention_checks_passed");
