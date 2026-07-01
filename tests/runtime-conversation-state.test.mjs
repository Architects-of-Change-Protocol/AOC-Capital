import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("src/lib/runtime-conversation-state.ts", "utf8");
const migrationPath = fs
  .readdirSync("supabase/migrations")
  .find((file) => file.endsWith("_runtime_conversation_state.sql"));
const migrationSql = migrationPath ? fs.readFileSync(`supabase/migrations/${migrationPath}`, "utf8") : "";

test("bounded constants are defined", () => {
  for (const token of [
    "MAX_RECENT_QUESTIONS = 8",
    "MAX_RECENT_ENTITIES = 16",
    "MAX_RECENT_BLOCKERS = 12",
    "MAX_RECENT_INTERVENTIONS = 12",
    "MAX_RECENT_STAKEHOLDERS = 12",
    "MAX_RECENT_EVIDENCE = 16",
    "DEFAULT_TTL_DAYS = 14",
  ]) assert.match(source, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("dedupe, trim, and cap helper behavior is implemented", () => {
  assert.match(source, /const normalizeValues = \(items: string\[], max: number\)/);
  assert.match(source, /const key = value\.toLocaleLowerCase\(\)/);
  assert.match(source, /if \(!value\) continue/);
  assert.match(source, /if \(out\.length >= max\) break/);
});

test("expired state is treated as expired or stale", () => {
  assert.match(source, /continuityStatus: RuntimeTrustState\["continuityStatus"\] = expired \? "expired"/);
  assert.match(source, /const start = expired \? emptyState\(input, "stale"\) : base/);
});

test("trustState evidenceDensity calculation exists", () => {
  assert.match(source, /export const computeEvidenceDensity/);
  assert.match(source, /if \(evidenceCount <= 0\) return "none"/);
  assert.match(source, /if \(evidenceCount <= 3\) return "low"/);
  assert.match(source, /if \(evidenceCount <= 8\) return "medium"/);
});

test("scope isolation via company/workspace/project/session filters", () => {
  assert.match(source, /\.eq\("company_id", scope\.companyId\)/);
  assert.match(source, /\.eq\("workspace_id", scope\.workspaceId \?\? null\)/);
  assert.match(source, /\.eq\("project_id", scope\.projectId \?\? null\)/);
  assert.match(source, /\.eq\("session_key", scope\.sessionKey\)/);
});

test("messageCount increments and preview truncates", () => {
  assert.match(source, /messageCount: start\.messageCount \+ 1/);
  assert.match(source, /lastMessagePreview: input\.message\.trim\(\)\.slice\(0, PREVIEW_MAX\)/);
});

test("persistent functions are exported", () => {
  assert.match(source, /export async function loadPersistentRuntimeConversationState/);
  assert.match(source, /export async function updatePersistentRuntimeConversationState/);
});

test("migration creates runtime_conversation_state and enables RLS", () => {
  assert.ok(migrationPath);
  assert.match(migrationSql, /create table if not exists public\.runtime_conversation_state/i);
  assert.match(migrationSql, /alter table public\.runtime_conversation_state enable row level security/i);
});
