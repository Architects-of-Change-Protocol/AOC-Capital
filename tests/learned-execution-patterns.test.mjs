import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const canonical = fs.readFileSync("src/lib/operational-patterns/learned-execution-patterns.ts", "utf8");
const adapter = fs.readFileSync("src/lib/vault/learned-execution-patterns.ts", "utf8");
const contracts = fs.readFileSync("src/lib/operational-cognition/contracts.ts", "utf8");
const route = fs.readFileSync("src/app/api/copilot/route.ts", "utf8");

test("canonical engine exports deterministic APIs", () => {
  ["detectLearnedExecutionPatterns", "groupOperationalSignals", "computePatternSeverity", "computePatternRecurrence", "computePatternDecay", "buildExecutionPatternSummary"].forEach((token) => assert.match(canonical, new RegExp(token)));
});

test("canonical contracts exist and include stable types", () => {
  ["OperationalCognitionStatus", "OperationalPatternType", "CanonicalOperationalSignal", "CanonicalExecutionPattern", "LearnedExecutionPatternResult"].forEach((token) => assert.match(contracts, new RegExp(token)));
});

test("continuity mapping uses OperationalContinuityItem fields only", () => {
  assert.match(canonical, /evidenceRef: item\.evidenceRef/);
  assert.match(canonical, /domain: typeToDomain\(item\.type\)/);
  assert.doesNotMatch(canonical, /item\.actorUserId|item\.sourceRef|item\.domain/);
});

test("legacy adapter delegates to canonical engine and maps statuses", () => {
  assert.match(adapter, /detectCanonicalLearnedExecutionPatterns/);
  assert.match(adapter, /statusMap/);
  assert.match(adapter, /s === "detected" \? "ok"/);
  assert.match(adapter, /s === "none" \? "empty"/);
});

test("legacy adapter preserves expected legacy fields", () => {
  ["chronicRisks", "recurringEscalations", "recurringDependencies", "stakeholderInstabilityPatterns", "operationalHealthScore"].forEach((token) => assert.match(adapter, new RegExp(token)));
});

test("copilot route intentionally imports legacy adapter path", () => {
  assert.match(route, /from "@\/lib\/vault\/learned-execution-patterns"/);
  assert.doesNotMatch(route, /from "@\/lib\/operational-patterns\/learned-execution-patterns"/);
});

test("no embeddings/vector/semantic clustering references", () => {
  assert.doesNotMatch(canonical + adapter, /embedding|vector|semantic clustering/i);
});
