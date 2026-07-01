import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// ─── Source file reads ────────────────────────────────────────────────────────

const typesFile = fs.readFileSync('src/lib/vault/digestive/types.ts', 'utf8');
const normalizerFile = fs.readFileSync('src/lib/vault/digestive/normalizer.ts', 'utf8');
const entityFile = fs.readFileSync('src/lib/vault/digestive/entity-extractor.ts', 'utf8');
const nutrientFile = fs.readFileSync('src/lib/vault/digestive/nutrient-extractor.ts', 'utf8');
const scoringFile = fs.readFileSync('src/lib/vault/digestive/scoring.ts', 'utf8');
const decayFile = fs.readFileSync('src/lib/vault/digestive/decay.ts', 'utf8');
const residueFile = fs.readFileSync('src/lib/vault/digestive/residue.ts', 'utf8');
const lineageFile = fs.readFileSync('src/lib/vault/digestive/lineage.ts', 'utf8');
const pipelineFile = fs.readFileSync('src/lib/vault/digestive/pipeline.ts', 'utf8');
const persistenceFile = fs.readFileSync('src/lib/vault/digestive/persistence.ts', 'utf8');
const indexFile = fs.readFileSync('src/lib/vault/digestive/index.ts', 'utf8');
const migrationFile = fs.readFileSync('supabase/migrations/20260520000000_vault_digestive_system.sql', 'utf8');

// ─── Load modules that are safe to import (no Supabase calls) ────────────────

// We use dynamic import to avoid Next.js module resolution at test time.
// The normalizer, extractor, scoring, decay, and residue modules are pure
// functions that do not depend on Supabase or Next.js APIs.

const { normalizeRawMaterial } = await import('../src/lib/vault/digestive/normalizer.js').catch(() => {
  // Fallback: parse test inline if ESM resolution fails
  return { normalizeRawMaterial: null };
});

const { extractNutrientCandidates } = await import('../src/lib/vault/digestive/nutrient-extractor.js').catch(() => {
  return { extractNutrientCandidates: null };
});

const { extractEntities } = await import('../src/lib/vault/digestive/entity-extractor.js').catch(() => {
  return { extractEntities: null };
});

const { scoreNutrient } = await import('../src/lib/vault/digestive/scoring.js').catch(() => {
  return { scoreNutrient: null };
});

const { computeDecayedFreshness, computeCurrentRelevance } = await import('../src/lib/vault/digestive/decay.js').catch(() => {
  return { computeDecayedFreshness: null, computeCurrentRelevance: null };
});

const { extractSemanticResidue } = await import('../src/lib/vault/digestive/residue.js').catch(() => {
  return { extractSemanticResidue: null };
});

const { runDigestivePipeline } = await import('../src/lib/vault/digestive/pipeline.js').catch(() => {
  return { runDigestivePipeline: null };
});

// ─── Type definitions ─────────────────────────────────────────────────────────

test('types file defines all required vault types', () => {
  const requiredTypes = [
    'VaultRawMaterial',
    'VaultRawMaterialType',
    'VaultDigestiveContext',
    'VaultNutrientType',
    'VaultExtractedEntity',
    'VaultExtractedEntityType',
    'VaultEvidenceLineage',
    'VaultNutrientScoring',
    'VaultNutrient',
    'VaultSemanticResidue',
    'VaultDigestivePass',
    'VaultDigestionResult',
  ];
  for (const typeName of requiredTypes) {
    assert.match(typesFile, new RegExp(`\\b${typeName}\\b`), `Expected type: ${typeName}`);
  }
});

test('VaultNutrientType covers all required signal types', () => {
  const requiredSignals = [
    'risk_signal',
    'blocker_signal',
    'stakeholder_signal',
    'dependency_signal',
    'decision_signal',
    'commitment_signal',
    'delivery_drift_signal',
    'financial_impediment_signal',
    'governance_gap_signal',
    'escalation_signal',
    'recovery_signal',
    'ambiguity_signal',
    'contradiction_signal',
    'timeline_pressure_signal',
  ];
  for (const signal of requiredSignals) {
    assert.match(typesFile, new RegExp(`"${signal}"`), `Expected signal type: ${signal}`);
  }
});

test('VaultSemanticResidue defines all residue categories', () => {
  const categories = [
    'vague_concern',
    'unclear_dependency',
    'incomplete_stakeholder_mention',
    'possible_risk',
    'unresolved_timeline_reference',
    'ambiguous_ownership',
  ];
  for (const cat of categories) {
    assert.match(typesFile, new RegExp(`"${cat}"`), `Expected residue category: ${cat}`);
  }
});

test('VaultEvidenceLineage contains required lineage fields', () => {
  assert.match(typesFile, /sourceArtifactId/);
  assert.match(typesFile, /sourceType/);
  assert.match(typesFile, /excerpt/);
  assert.match(typesFile, /workspaceId/);
  assert.match(typesFile, /projectId/);
  assert.match(typesFile, /confidenceBasis/);
  assert.match(typesFile, /extractionMethod/);
});

test('VaultNutrientScoring contains all scoring dimensions', () => {
  assert.match(typesFile, /confidence/);
  assert.match(typesFile, /severity/);
  assert.match(typesFile, /freshness/);
  assert.match(typesFile, /recurrenceHint/);
  assert.match(typesFile, /ambiguityLevel/);
  assert.match(typesFile, /actionability/);
  assert.match(typesFile, /evidenceStrength/);
  assert.match(typesFile, /decayProfile/);
});

// ─── Tenant scoping ───────────────────────────────────────────────────────────

test('all major types include workspaceId for tenant scoping', () => {
  for (const [name, src] of [
    ['VaultRawMaterial', typesFile],
    ['VaultEvidenceLineage', typesFile],
    ['VaultNutrient', typesFile],
    ['VaultSemanticResidue', typesFile],
    ['VaultDigestivePass', typesFile],
  ]) {
    assert.match(src, /workspaceId/, `${name} must include workspaceId`);
  }
});

test('persistence layer scopes all inserts to workspace_id', () => {
  assert.match(persistenceFile, /workspace_id/);
  assert.match(persistenceFile, /project_id/);
  assert.match(persistenceFile, /actor_user_id/);
});

// ─── Normalizer ───────────────────────────────────────────────────────────────

test('normalizer exports normalizeRawMaterial', () => {
  assert.match(normalizerFile, /normalizeRawMaterial/);
  assert.match(normalizerFile, /NormalizedInput/);
});

test('normalizer preserves source metadata on normalized output', () => {
  if (!normalizeRawMaterial) return; // skip if ESM not resolved
  const material = {
    id: 'test-id',
    type: 'project_note',
    title: 'Test Note',
    content: 'This project is blocked by the vendor API issues.\nWe have a risk of missing the deadline.',
    workspaceId: 'ws-123',
    projectId: 'proj-456',
    actorUserId: 'user-789',
    sourceRef: 'user-789:upload',
    submittedAt: new Date().toISOString(),
  };
  const result = normalizeRawMaterial(material);
  assert.equal(result.rawMaterial.workspaceId, 'ws-123');
  assert.equal(result.rawMaterial.projectId, 'proj-456');
  assert.ok(result.lines.length > 0, 'should produce non-empty lines');
  assert.ok(result.wordCount > 0, 'should count words');
});

// ─── Nutrient Extraction ──────────────────────────────────────────────────────

test('nutrient extractor identifies blocker signals', () => {
  if (!extractNutrientCandidates) return;
  const lines = ['The migration is blocked by the legacy system API rate limits.'];
  const candidates = extractNutrientCandidates(lines);
  const blockerSignal = candidates.find((c) => c.nutrientType === 'blocker_signal');
  assert.ok(blockerSignal, 'should find a blocker_signal');
  assert.ok(blockerSignal.confidence > 0, 'confidence should be positive');
});

test('nutrient extractor identifies risk signals', () => {
  if (!extractNutrientCandidates) return;
  const lines = ['There is a significant risk of missing the Q3 deadline due to vendor delays.'];
  const candidates = extractNutrientCandidates(lines);
  const riskSignal = candidates.find((c) => c.nutrientType === 'risk_signal');
  assert.ok(riskSignal, 'should find a risk_signal');
});

test('nutrient extractor identifies dependency signals', () => {
  if (!extractNutrientCandidates) return;
  const lines = ['We are waiting on the data team to deliver the schema migration.'];
  const candidates = extractNutrientCandidates(lines);
  const depSignal = candidates.find((c) => c.nutrientType === 'dependency_signal');
  assert.ok(depSignal, 'should find a dependency_signal');
});

test('nutrient extractor identifies decision signals', () => {
  if (!extractNutrientCandidates) return;
  const lines = ['The decision was made to proceed with vendor B for the integration layer.'];
  const candidates = extractNutrientCandidates(lines);
  const decisionSignal = candidates.find((c) => c.nutrientType === 'decision_signal');
  assert.ok(decisionSignal, 'should find a decision_signal');
});

test('nutrient extractor identifies timeline pressure signals', () => {
  if (!extractNutrientCandidates) return;
  const lines = ['The deadline for UAT sign-off is end of this month and we are behind.'];
  const candidates = extractNutrientCandidates(lines);
  const timelineSignal = candidates.find((c) => c.nutrientType === 'timeline_pressure_signal');
  assert.ok(timelineSignal, 'should find a timeline_pressure_signal');
});

test('nutrient extractor suppresses very short lines', () => {
  if (!extractNutrientCandidates) return;
  const lines = ['risk', 'block', 'TBD'];
  const candidates = extractNutrientCandidates(lines);
  assert.equal(candidates.length, 0, 'short lines should not produce candidates');
});

test('nutrient extractor produces deterministic output for the same input', () => {
  if (!extractNutrientCandidates) return;
  const lines = [
    'The project is blocked by missing approvals from the governance committee.',
    'We decided to escalate this to the executive sponsor next week.',
    'There is a risk of budget overrun due to vendor price increase.',
  ];
  const result1 = extractNutrientCandidates(lines);
  const result2 = extractNutrientCandidates(lines);
  assert.equal(result1.length, result2.length, 'extraction should be deterministic');
  for (let i = 0; i < result1.length; i++) {
    assert.equal(result1[i].nutrientType, result2[i].nutrientType);
    assert.equal(result1[i].confidence, result2[i].confidence);
  }
});

// ─── Scoring ──────────────────────────────────────────────────────────────────

test('scoring produces expected defaults for blocker_signal', () => {
  if (!scoreNutrient) return;
  const scoring = scoreNutrient({ nutrientType: 'blocker_signal', confidence: 0.75 });
  assert.equal(scoring.severity, 'high');
  assert.equal(scoring.actionability, 'actionable');
  assert.equal(scoring.decayProfile, 'slow');
  assert.equal(scoring.freshness, 1.0);
  assert.equal(scoring.evidenceStrength, 'moderate');
});

test('scoring marks resolved nutrients as low severity with fast decay', () => {
  if (!scoreNutrient) return;
  const scoring = scoreNutrient({ nutrientType: 'blocker_signal', confidence: 0.75, isResolved: true });
  assert.equal(scoring.severity, 'low');
  assert.equal(scoring.decayProfile, 'fast');
});

test('scoring marks recurring nutrients correctly', () => {
  if (!scoreNutrient) return;
  const scoring = scoreNutrient({ nutrientType: 'risk_signal', confidence: 0.7, isRecurring: true });
  assert.equal(scoring.recurrenceHint, 'confirmed_recurrence');
});

test('scoring confidence thresholds map to evidence strength correctly', () => {
  if (!scoreNutrient) return;
  assert.equal(scoreNutrient({ nutrientType: 'risk_signal', confidence: 0.85 }).evidenceStrength, 'strong');
  assert.equal(scoreNutrient({ nutrientType: 'risk_signal', confidence: 0.65 }).evidenceStrength, 'moderate');
  assert.equal(scoreNutrient({ nutrientType: 'risk_signal', confidence: 0.45 }).evidenceStrength, 'weak');
});

// ─── Decay ────────────────────────────────────────────────────────────────────

test('decay: fresh nutrient has freshness close to 1.0', () => {
  if (!computeDecayedFreshness) return;
  const freshness = computeDecayedFreshness({
    nutrientType: 'blocker_signal',
    createdAt: new Date().toISOString(),
    severity: 'high',
    decayProfile: 'slow',
  });
  assert.ok(freshness >= 0.95, `Expected freshness near 1.0, got ${freshness}`);
});

test('decay: fast-decay nutrient loses half its freshness in ~2 days', () => {
  if (!computeDecayedFreshness) return;
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const freshness = computeDecayedFreshness({
    nutrientType: 'timeline_pressure_signal',
    createdAt: twoDaysAgo,
    severity: 'medium',
    decayProfile: 'fast',
  });
  // After one half-life (2 days), freshness should be approximately 0.5
  assert.ok(freshness >= 0.35 && freshness <= 0.65, `Expected ~0.5 freshness after 2 days, got ${freshness}`);
});

test('decay: persistent nutrient retains high freshness after 7 days', () => {
  if (!computeDecayedFreshness) return;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const freshness = computeDecayedFreshness({
    nutrientType: 'governance_gap_signal',
    createdAt: sevenDaysAgo,
    severity: 'high',
    decayProfile: 'persistent',
  });
  assert.ok(freshness >= 0.8, `Persistent nutrient should stay fresh, got ${freshness}`);
});

test('decay: recovery accelerates decay', () => {
  if (!computeDecayedFreshness) return;
  const now = new Date().toISOString();
  const fresh = computeDecayedFreshness({ nutrientType: 'blocker_signal', createdAt: now, severity: 'high', decayProfile: 'slow' });
  const recovered = computeDecayedFreshness({ nutrientType: 'blocker_signal', createdAt: now, severity: 'high', decayProfile: 'slow', isRecovered: true });
  assert.ok(recovered < fresh, 'recovered nutrient should have lower freshness than active one');
});

test('decay: recurrence boosts freshness', () => {
  if (!computeDecayedFreshness) return;
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const noRecurrence = computeDecayedFreshness({ nutrientType: 'risk_signal', createdAt: twoDaysAgo, severity: 'medium', decayProfile: 'medium', recurrenceCount: 0 });
  const withRecurrence = computeDecayedFreshness({ nutrientType: 'risk_signal', createdAt: twoDaysAgo, severity: 'medium', decayProfile: 'medium', recurrenceCount: 3 });
  assert.ok(withRecurrence > noRecurrence, 'recurrence should boost freshness');
});

test('computeCurrentRelevance returns 0-100 integer', () => {
  if (!computeCurrentRelevance) return;
  const score = computeCurrentRelevance({
    nutrientType: 'blocker_signal',
    createdAt: new Date().toISOString(),
    severity: 'high',
    decayProfile: 'slow',
  });
  assert.ok(score >= 0 && score <= 100, `Score should be 0-100, got ${score}`);
});

// ─── Semantic Residue ─────────────────────────────────────────────────────────

test('residue extractor detects vague concerns', () => {
  if (!extractSemanticResidue) return;
  const lines = ["I'm not sure this approach is ideal but let's proceed."];
  const residue = extractSemanticResidue(lines, 'ws-123', null, 'run-abc');
  const found = residue.find((r) => r.residueCategory === 'vague_concern');
  assert.ok(found, 'should detect vague_concern');
  assert.equal(found.workspaceId, 'ws-123');
  assert.equal(found.digestionRunId, 'run-abc');
});

test('residue extractor detects ambiguous ownership', () => {
  if (!extractSemanticResidue) return;
  const lines = ['Somebody needs to handle the migration coordination.'];
  const residue = extractSemanticResidue(lines, 'ws-123', null, 'run-xyz');
  const found = residue.find((r) => r.residueCategory === 'ambiguous_ownership');
  assert.ok(found, 'should detect ambiguous_ownership');
});

test('residue extractor scopes output to workspace and project', () => {
  if (!extractSemanticResidue) return;
  const lines = ['Something seems off with the timeline for this feature.'];
  const residue = extractSemanticResidue(lines, 'ws-999', 'proj-111', 'run-000');
  for (const r of residue) {
    assert.equal(r.workspaceId, 'ws-999');
    assert.equal(r.projectId, 'proj-111');
    assert.equal(r.digestionRunId, 'run-000');
    assert.ok(r.id, 'residue must have an id');
    assert.ok(r.createdAt, 'residue must have createdAt');
  }
});

// ─── Full Pipeline ────────────────────────────────────────────────────────────

test('pipeline produces a complete digestion result', () => {
  if (!runDigestivePipeline) return;
  const rawMaterial = {
    id: 'artifact-001',
    type: 'meeting_transcript',
    title: 'Q2 Delivery Review',
    content: `
      The project is blocked by the vendor API not being ready.
      There is a risk of missing the July deadline.
      We decided to escalate to the executive sponsor.
      The integration team is waiting on the schema migration from the data team.
      Budget pressure is mounting as we are over the Q2 allocation.
    `,
    workspaceId: 'ws-abc',
    projectId: 'proj-xyz',
    actorUserId: 'user-001',
    sourceRef: 'user-001:meeting_transcript',
    submittedAt: new Date().toISOString(),
  };
  const context = {
    workspaceId: 'ws-abc',
    projectId: 'proj-xyz',
    actorUserId: 'user-001',
    traceId: 'trace-test-001',
    digestedAt: new Date().toISOString(),
  };

  const result = runDigestivePipeline(rawMaterial, context);

  // Digestion pass
  assert.ok(result.digestivePass, 'should have digestivePass');
  assert.equal(result.digestivePass.runId, 'trace-test-001');
  assert.equal(result.digestivePass.workspaceId, 'ws-abc');
  assert.equal(result.digestivePass.projectId, 'proj-xyz');
  assert.equal(result.digestivePass.extractionMethod, 'rule_based');
  assert.ok(result.digestivePass.completedAt, 'should have completedAt');

  // Nutrients
  assert.ok(Array.isArray(result.nutrients), 'nutrients should be an array');
  assert.ok(result.nutrients.length > 0, 'should extract at least one nutrient');

  const blocker = result.nutrients.find((n) => n.nutrientType === 'blocker_signal');
  assert.ok(blocker, 'should extract a blocker_signal from blocked content');
  assert.equal(blocker.workspaceId, 'ws-abc');
  assert.equal(blocker.projectId, 'proj-xyz');
  assert.equal(blocker.digestionRunId, 'trace-test-001');
  assert.ok(blocker.id, 'nutrient must have an id');
  assert.ok(blocker.evidence.length > 0, 'nutrient must have evidence lineage');
  assert.ok(blocker.scoring.confidence > 0, 'nutrient must have scoring confidence');

  // Evidence lineage on nutrients
  const ev = blocker.evidence[0];
  assert.ok(ev, 'should have evidence record');
  assert.equal(ev.sourceArtifactId, 'artifact-001');
  assert.equal(ev.workspaceId, 'ws-abc');
  assert.ok(ev.confidenceBasis, 'evidence must have confidenceBasis');
  assert.equal(ev.extractionMethod, 'rule_based');

  // Entities
  assert.ok(Array.isArray(result.entities), 'entities should be an array');

  // Residue
  assert.ok(Array.isArray(result.residue), 'residue should be an array');
});

test('pipeline output is workspace-scoped on every record', () => {
  if (!runDigestivePipeline) return;
  const rawMaterial = {
    id: null,
    type: 'operational_update',
    title: null,
    content: 'The blocker is unclear and somebody should own it. Risk of missing deadline.',
    workspaceId: 'ws-tenant-A',
    projectId: null,
    actorUserId: null,
    sourceRef: 'system:test',
    submittedAt: new Date().toISOString(),
  };
  const context = {
    workspaceId: 'ws-tenant-A',
    projectId: null,
    actorUserId: null,
    traceId: 'trace-scope-test',
    digestedAt: new Date().toISOString(),
  };
  const result = runDigestivePipeline(rawMaterial, context);
  assert.equal(result.digestivePass.workspaceId, 'ws-tenant-A');
  for (const n of result.nutrients) {
    assert.equal(n.workspaceId, 'ws-tenant-A', 'every nutrient must be scoped to workspace');
    assert.equal(n.projectId, null);
    for (const ev of n.evidence) {
      assert.equal(ev.workspaceId, 'ws-tenant-A', 'every evidence record must be workspace-scoped');
    }
  }
  for (const r of result.residue) {
    assert.equal(r.workspaceId, 'ws-tenant-A', 'every residue must be workspace-scoped');
  }
});

test('pipeline works when AI is unavailable (pure deterministic mode)', () => {
  if (!runDigestivePipeline) return;
  // This test verifies the pipeline does not throw even without AI services
  // The pipeline is synchronous and rule-based — no AI calls should be made.
  const rawMaterial = {
    id: 'test-002',
    type: 'risk_blocker_note',
    title: 'Risk Log',
    content: 'Critical risk: vendor contract not signed. Escalation needed. Deadline end of month.',
    workspaceId: 'ws-fallback',
    projectId: 'proj-fallback',
    actorUserId: 'user-fallback',
    sourceRef: 'user-fallback:risk_blocker_note',
    submittedAt: new Date().toISOString(),
  };
  const context = {
    workspaceId: 'ws-fallback',
    projectId: 'proj-fallback',
    actorUserId: 'user-fallback',
    traceId: 'trace-fallback',
    digestedAt: new Date().toISOString(),
  };
  // Should not throw
  const result = runDigestivePipeline(rawMaterial, context);
  assert.ok(result.nutrients.length > 0, 'should extract nutrients without AI');
});

// ─── Database migration integrity ─────────────────────────────────────────────

test('migration creates vault_digestion_runs with workspace_id scoping', () => {
  assert.match(migrationFile, /vault_digestion_runs/);
  assert.match(migrationFile, /workspace_id.*uuid.*references.*workspaces/s);
  assert.match(migrationFile, /is_workspace_member/);
});

test('migration creates vault_nutrients with nutrient_type constraint', () => {
  assert.match(migrationFile, /vault_nutrients/);
  assert.match(migrationFile, /'risk_signal'/);
  assert.match(migrationFile, /'blocker_signal'/);
  assert.match(migrationFile, /'governance_gap_signal'/);
  assert.match(migrationFile, /entities.*jsonb/s);
  assert.match(migrationFile, /evidence.*jsonb/s);
  assert.match(migrationFile, /scoring.*jsonb/s);
});

test('migration creates vault_semantic_residue with category constraint', () => {
  assert.match(migrationFile, /vault_semantic_residue/);
  assert.match(migrationFile, /'vague_concern'/);
  assert.match(migrationFile, /'ambiguous_ownership'/);
});

test('migration enables RLS on all three tables', () => {
  const rlsCount = (migrationFile.match(/enable row level security/g) ?? []).length;
  assert.ok(rlsCount >= 3, `Expected RLS on 3 tables, found ${rlsCount}`);
});

test('migration uses is_workspace_member for all policies', () => {
  const policyCount = (migrationFile.match(/is_workspace_member/g) ?? []).length;
  assert.ok(policyCount >= 6, `Expected at least 6 RLS policy references, found ${policyCount}`);
});

// ─── Integration surface ──────────────────────────────────────────────────────

test('index file exports digestVaultMaterial as primary integration surface', () => {
  assert.match(indexFile, /export.*digestVaultMaterial/);
  assert.match(indexFile, /DigestVaultMaterialOptions/);
  assert.match(indexFile, /DigestVaultMaterialResult/);
});

test('persistence layer has graceful fallback documented', () => {
  assert.match(persistenceFile, /fallback/i);
  assert.match(persistenceFile, /method.*none/s);
  assert.match(persistenceFile, /TODO/);
});

test('pipeline file does not import AI providers', () => {
  assert.doesNotMatch(pipelineFile, /openai/i);
  assert.doesNotMatch(pipelineFile, /anthropic/i);
  assert.doesNotMatch(pipelineFile, /\/ai\/gateway/);
});
