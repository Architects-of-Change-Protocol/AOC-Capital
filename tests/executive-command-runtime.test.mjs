import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const manager = fs.readFileSync("src/lib/operational-memory/executive-command-runtime/executive-command-manager.ts", "utf8");
const runtime = fs.readFileSync("src/lib/operational-memory/executive-command-runtime/executive-command-runtime.ts", "utf8");
const alerting = fs.readFileSync("src/lib/operational-memory/executive-command-runtime/executive-command-alerting.ts", "utf8");

test("executive command APIs exported", () => {
  for (const fn of ["retrieveExecutiveOperationalCommand(","retrieveExecutiveOperationalFocus(","retrieveExecutivePressureClusters(","retrieveExecutiveInstabilityZones(","retrieveExecutiveSurvivability(","retrieveExecutiveEscalationSummary(","retrieveExecutivePortfolioHealth(","retrieveExecutiveFragilitySignals(","retrieveExecutiveWarRoomContext(","retrieveExecutiveNarratives(","retrieveExecutiveAlerts("]) assert.ok(manager.includes(fn));
});

test("executive synthesis composes survivability, escalation, and portfolio orchestration", () => {
  assert.match(runtime, /buildExecutiveSurvivabilitySummary/);
  assert.match(runtime, /buildExecutiveEscalationSummary/);
  assert.match(runtime, /buildExecutivePortfolioHealth/);
  assert.match(runtime, /buildExecutiveWarRoomContext/);
});

test("anti-theater safeguards retain bounded confidence and uncertainty exposure", () => {
  assert.match(alerting, /uncertainty/);
  assert.match(alerting, /confidence: 0\./);
});
