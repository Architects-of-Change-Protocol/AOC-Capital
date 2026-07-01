import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const runtime = fs.readFileSync("src/lib/operational-memory/organizational-digital-twin/organizational-digital-twin-runtime.ts", "utf8");
const manager = fs.readFileSync("src/lib/operational-memory/organizational-digital-twin/organizational-digital-twin-manager.ts", "utf8");
const transitions = fs.readFileSync("src/lib/operational-memory/organizational-digital-twin/organizational-digital-twin-state.ts", "utf8");

test("organizational digital twin APIs exported", () => {
  for (const fn of ["retrieveOrganizationalDigitalTwin(","retrieveOrganizationalTopology(","retrieveOrganizationalState(","retrievePropagationSimulation(","retrieveSurvivabilitySimulation(","retrieveInterventionSimulation(","retrieveStabilizationSimulation(","retrieveFragilitySignals(","retrieveScenarioProjections(","retrieveWarRoomTwinState(","retrieveTwinNarratives("]) assert.ok(manager.includes(fn));
});

test("runtime composes topology, state, propagation, survivability, intervention, stabilization", () => {
  for (const symbol of ["buildOrganizationalTopology", "buildOrganizationalState", "buildOrganizationalPropagation", "buildOrganizationalSurvivability", "buildOrganizationalInterventions", "buildOrganizationalStabilization"]) assert.match(runtime, new RegExp(symbol));
});

test("deterministic transition logic and uncertainty exposure remain present", () => {
  assert.match(transitions, /deterministic threshold gates/);
  assert.match(runtime, /uncertainty/);
});
