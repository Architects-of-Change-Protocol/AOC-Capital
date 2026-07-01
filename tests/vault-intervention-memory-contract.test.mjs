import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260520113000_vault_intervention_memory.sql','utf8');
const persistenceSource = fs.readFileSync('src/lib/vault/learned-patterns/intervention-persistence.ts','utf8');
const learningSource = fs.readFileSync('src/lib/vault/learned-patterns/intervention-learning.ts','utf8');
const exportsSource = fs.readFileSync('src/lib/vault/learned-patterns/index.ts','utf8');

test('migration creates intervention memory tables with rls', () => {
  for (const t of ['vault_interventions','vault_intervention_evidence','vault_intervention_outcomes']) assert.match(migration, new RegExp(t));
  assert.equal((migration.match(/enable row level security/g) ?? []).length, 3);
  assert.match(migration, /is_workspace_member/g);
});

test('migration has required constraints and indexes', () => {
  assert.match(migration, /efficacy_score.*<= 100/s);
  assert.match(migration, /confidence.*<= 1/s);
  assert.match(migration, /fatigue_level.*'high'/s);
  assert.match(migration, /create index if not exists vault_interventions_workspace_project_attempted_idx/);
});

test('persistence layer includes graceful fallback and tenant fields', () => {
  assert.match(persistenceSource, /method: "none"/);
  assert.match(persistenceSource, /workspace_id/);
  assert.match(persistenceSource, /outcomeReasons/);
  assert.match(persistenceSource, /fatigueProfile/);
});

test('retrieval supports project/type/outcome/fatigue filters and attempted_at ordering', () => {
  for (const token of ['projectId','interventionTypes','outcomes','fatigueLevel','attempted_at']) assert.match(persistenceSource, new RegExp(token));
});

test('fatigue accumulation includes historical interventions', () => {
  assert.match(learningSource, /\.\.\.historical,\s*\.\.\.all/s);
  assert.match(learningSource, /repeatedAttemptCount/);
});

test('public exports include intervention persistence apis', () => {
  assert.match(exportsSource, /persistInterventions/);
  assert.match(exportsSource, /loadInterventionHistory/);
  assert.match(exportsSource, /learnAndPersistInterventionEfficacy/);
});
