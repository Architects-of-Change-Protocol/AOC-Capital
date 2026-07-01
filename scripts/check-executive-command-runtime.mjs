import fs from "node:fs";
const files = [
  "src/lib/operational-memory/executive-command-runtime/executive-command-runtime.ts",
  "src/lib/operational-memory/executive-command-runtime/executive-command-portfolio.ts",
  "src/lib/operational-memory/executive-command-runtime/executive-command-pressure.ts",
  "src/lib/operational-memory/executive-command-runtime/executive-command-survivability.ts",
  "src/lib/operational-memory/executive-command-runtime/executive-command-narratives.ts",
  "src/lib/operational-memory/executive-command-runtime/executive-command-alerting.ts",
  "src/lib/operational-memory/executive-command-runtime/executive-command-governance.ts",
  "src/lib/operational-memory/executive-command-runtime/executive-command-manager.ts",
  "tests/executive-command-runtime.test.mjs"
];
for (const file of files) if (!fs.existsSync(file)) throw new Error(`missing_required_executive_file:${file}`);
const manager = fs.readFileSync("src/lib/operational-memory/executive-command-runtime/executive-command-manager.ts", "utf8");
for (const fn of ["retrieveExecutiveOperationalCommand(","retrieveExecutiveOperationalFocus(","retrieveExecutivePressureClusters(","retrieveExecutiveInstabilityZones(","retrieveExecutiveSurvivability(","retrieveExecutiveEscalationSummary(","retrieveExecutivePortfolioHealth(","retrieveExecutiveFragilitySignals(","retrieveExecutiveWarRoomContext(","retrieveExecutiveNarratives(","retrieveExecutiveAlerts("]) if (!manager.includes(fn)) throw new Error(`missing_api:${fn}`);
console.log("executive_command_runtime_checks_passed");
