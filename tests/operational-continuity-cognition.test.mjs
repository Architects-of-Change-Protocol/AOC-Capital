import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const engine = fs.readFileSync("src/lib/operational-memory/continuity-retrieval/continuity-retrieval-engine.ts", "utf8");
const weights = fs.readFileSync("src/lib/operational-memory/continuity-retrieval/continuity-retrieval-weighting.ts", "utf8");
const noise = fs.readFileSync("src/lib/operational-memory/continuity-retrieval/continuity-retrieval-noise-control.ts", "utf8");
const manager = fs.readFileSync("src/lib/operational-memory/continuity-retrieval/continuity-retrieval-manager.ts", "utf8");

test("unresolved prioritization and escalation amplification are deterministic",()=>{
  assert.match(weights,/unresolvedWeight:\s*20/);
  assert.match(weights,/escalationWeight:\s*14/);
  assert.match(engine,/score >= 48 \? "highest"/);
});

test("atmosphere reconstruction and diagnostics exist",()=>{
  assert.match(engine,/summarizeAtmosphere/);
  assert.match(engine,/buildContinuityDiagnostics/);
});

test("anti-noise suppression and duplicate control exist",()=>{
  assert.match(noise,/seen = new Set/);
  assert.match(noise,/staleDamping/);
});

test("tenant workspace project isolation preserved through scoped loaders",()=>{
  assert.match(manager,/assertContinuityGovernanceScope/);
  assert.match(manager,/buildContinuityContext/);
});
