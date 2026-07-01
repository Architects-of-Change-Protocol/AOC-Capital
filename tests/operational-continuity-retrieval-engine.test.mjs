import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const engine = fs.readFileSync("src/lib/operational-continuity/retrieval-engine.ts", "utf8");
const copilotRoute = fs.readFileSync("src/app/api/copilot/route.ts", "utf8");

test("engine exports required retrieval functions and types", () => {
  for (const token of [
    "export async function retrieveOperationalContinuity",
    "export function rankContinuityItems",
    "export function groupContinuityByDomain",
    "export function buildContinuityBrief",
    "export type OperationalContinuityRetrievalInput",
    "export type OperationalContinuityRetrievalResult",
    "export type OperationalContinuityItem",
    "export type OperationalContinuityBrief",
  ]) assert.match(engine, new RegExp(token));
});

test("ranking includes recency severity domain and session continuity boosts", () => {
  assert.match(engine, /const recencyScore=Math\.max\(0,30-ageDays\)/);
  assert.match(engine, /const base=nutrientBase\[item\.type\]\?\?10/);
  assert.match(engine, /domainBoosts\[activeDomain\]\?\.includes\(item\.type\)\?8:0/);
  assert.match(engine, /const sessionScore=input\.sessionKey && item\.sessionKey===input\.sessionKey\?4:0/);
});

test("dedup and recurrence count are deterministic and project-scoped", () => {
  assert.match(engine, /\$\{normalize\(item\.excerpt\)\.slice\(0,120\)\}\|\$\{item\.type\}\|\$\{item\.projectId\?\?"none"\}/);
  assert.match(engine, /found\.recurrenceCount=\(found\.recurrenceCount\?\?1\)\+1/);
});

test("vault query enforces company workspace and project isolation", () => {
  assert.match(engine, /\.eq\("company_id",input\.companyId\)/);
  assert.match(engine, /\.eq\("workspace_id",input\.workspaceId\)/);
  assert.match(engine, /if \(input\.projectId\) query=query\.eq\("project_id",input\.projectId\)/);
  assert.match(engine, /if \(!input\.projectId\) query=query\.is\("project_id",null\)/);
  assert.doesNotMatch(engine, /\.eq\("session_key"/);
});

test("copilot route imports and invokes continuity retrieval engine with fail-soft metadata", () => {
  assert.match(copilotRoute, /retrieveOperationalContinuity as retrieveOperationalContinuityEngine/);
  assert.match(copilotRoute, /await retrieveOperationalContinuityEngine\(/);
  assert.match(copilotRoute, /operational_continuity_retrieval_failed/);
  assert.match(copilotRoute, /continuityRetrieval:\s*\{ status: continuityRetrievalStatus, itemCount: continuityRetrievalItemCount, topTypes: continuityRetrievalTopTypes, confidence: continuityRetrievalConfidence \}/);
  assert.match(copilotRoute, /Operational continuity retrieval is degraded; response used live runtime context only\./);
});
