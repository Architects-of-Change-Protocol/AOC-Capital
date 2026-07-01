import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const engine = fs.readFileSync("src/lib/vault/intervention-memory.ts", "utf8");
const route = fs.readFileSync("src/app/api/copilot/route.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260521123000_create_intervention_memory.sql", "utf8");

test("persistence engine exports deterministic APIs with bounded fields and dedupe", () => {
  for (const token of [
    "export async function persistOperationalIntervention",
    "export async function retrieveInterventionHistory",
    "export async function updateInterventionOutcome",
    "export function classifyInterventionOutcome",
    "export function calculateInterventionFreshness",
    "export function buildInterventionMemorySummary",
    "export function extractOperationalInterventions",
    "const MAX_INTERVENTION_TEXT = 500",
    "const MAX_OUTCOME_SUMMARY = 300",
    "const MAX_STAKEHOLDERS = 8",
    "const MAX_PATTERNS = 8",
    "const MAX_NUTRIENTS = 12",
  ]) assert.match(engine, new RegExp(token));
  assert.match(engine, /createHash\("sha256"\)/);
  assert.match(engine, /if \(existing\) return \{ status: "duplicate"/);
  assert.match(engine, /catch \(error\) \{\n    return \{ status: "degraded"/);
});

test("outcome lifecycle enforces valid transitions and freshness behavior", () => {
  assert.match(engine, /pending: \["accepted", "ignored", "escalated"\]/);
  assert.match(engine, /accepted: \["resolved", "failed", "partially_resolved"\]/);
  assert.match(engine, /escalated: \["resolved", "failed"\]/);
  assert.match(engine, /if \(!transitions\[currentStatus\]\?\.includes\(input\.nextStatus\)\) return \{ status: "invalid_transition"/);
  assert.match(engine, /record\.outcomeStatus === "resolved" \? 0\.2 : record\.outcomeStatus === "failed" \? 0\.06/);
  assert.match(engine, /outcome_updated_at: outcomeUpdatedAt/);
});

test("migration creates intervention_memory with RLS and tenant isolation policies", () => {
  for (const token of ["create table if not exists public.intervention_memory", "intervention_id", "company_id", "workspace_id", "project_id", "target_stakeholders", "related_patterns", "related_nutrients", "lineage", "outcome_status", "freshness_score"]) assert.match(migration, new RegExp(token));
  assert.match(migration, /alter table public\.intervention_memory enable row level security/);
  assert.match(migration, /public\.is_workspace_member\(workspace_id\)/);
  assert.match(migration, /to service_role/);
});

test("copilot route retrieves intervention history pre-inference and persists post-inference", () => {
  assert.match(route, /const interventionHistory = await retrieveInterventionHistory\(/);
  assert.match(route, /const boundedInterventionSummary = buildInterventionMemorySummary\(interventionHistory\)\.slice\(0, 4\)/);
  assert.match(route, /const extractedInterventions = extractOperationalInterventions\(content\)/);
  assert.match(route, /persistOperationalIntervention\(\{/);
  assert.doesNotMatch(route, /interventionHistory\.map\(\(item\) => JSON\.stringify\(item\)/);
});
