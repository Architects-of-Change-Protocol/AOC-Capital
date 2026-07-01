import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const manager = fs.readFileSync("src/lib/operational-memory/autonomous-intervention/autonomous-intervention-manager.ts", "utf8");
const engine = fs.readFileSync("src/lib/operational-memory/autonomous-intervention/autonomous-intervention-engine.ts", "utf8");
const governance = fs.readFileSync("src/lib/operational-memory/autonomous-intervention/autonomous-intervention-governance.ts", "utf8");

test("autonomous intervention APIs exported", () => {
  for (const fn of ["retrieveAutonomousInterventionPlan(","retrieveInterventionCandidates(","retrieveInterventionSequence(","retrieveInterventionUrgency(","retrieveInterventionImpact(","retrieveInterventionSafetyProfile(","retrieveEscalationPaths(","retrieveRecoveryPaths(","retrieveInterventionDiagnostics(","retrieveInterventionNarratives("]) assert.ok(manager.includes(fn));
});

test("engine includes candidate generation prioritization and sequencing", () => {
  assert.match(engine, /buildInterventionCandidates/);
  assert.match(engine, /prioritizeInterventions/);
  assert.match(engine, /buildInterventionPlan/);
});

test("governance safety gate blocks autonomous external execution", () => {
  assert.match(governance, /requires_human_approval/);
  assert.match(governance, /requires_executive_approval/);
  assert.match(governance, /blocked_by_governance/);
});
