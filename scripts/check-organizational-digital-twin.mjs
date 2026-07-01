import fs from "node:fs";
const files = [
  "src/lib/operational-memory/organizational-digital-twin/organizational-digital-twin-runtime.ts",
  "src/lib/operational-memory/organizational-digital-twin/organizational-digital-twin-topology.ts",
  "src/lib/operational-memory/organizational-digital-twin/organizational-digital-twin-state.ts",
  "src/lib/operational-memory/organizational-digital-twin/organizational-digital-twin-propagation.ts",
  "src/lib/operational-memory/organizational-digital-twin/organizational-digital-twin-survivability.ts",
  "src/lib/operational-memory/organizational-digital-twin/organizational-digital-twin-interventions.ts",
  "src/lib/operational-memory/organizational-digital-twin/organizational-digital-twin-stabilization.ts",
  "src/lib/operational-memory/organizational-digital-twin/organizational-digital-twin-diagnostics.ts",
  "src/lib/operational-memory/organizational-digital-twin/organizational-digital-twin-narratives.ts",
  "src/lib/operational-memory/organizational-digital-twin/organizational-digital-twin-manager.ts",
  "tests/organizational-digital-twin.test.mjs"
];
for (const file of files) if (!fs.existsSync(file)) throw new Error(`missing_required_twin_file:${file}`);
const manager = fs.readFileSync("src/lib/operational-memory/organizational-digital-twin/organizational-digital-twin-manager.ts", "utf8");
for (const fn of ["retrieveOrganizationalDigitalTwin(","retrieveOrganizationalTopology(","retrieveOrganizationalState(","retrievePropagationSimulation(","retrieveSurvivabilitySimulation(","retrieveInterventionSimulation(","retrieveStabilizationSimulation(","retrieveFragilitySignals(","retrieveScenarioProjections(","retrieveWarRoomTwinState(","retrieveTwinNarratives("]) if (!manager.includes(fn)) throw new Error(`missing_api:${fn}`);
console.log("organizational_digital_twin_checks_passed");
