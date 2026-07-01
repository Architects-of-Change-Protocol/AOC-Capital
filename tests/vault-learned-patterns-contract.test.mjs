/**
 * Contract tests for the Vault Learned Pattern Layer.
 *
 * Tests validate:
 *   - Pattern promotion from nutrients
 *   - Recurrence detection (longitudinal, not within-run)
 *   - Financial friction detection
 *   - Governance degradation detection
 *   - Escalation trajectory detection
 *   - Recovery pattern detection
 *   - Evidence lineage preservation
 *   - Tenant isolation
 *   - Project scoping
 *   - Determinism
 *   - Smoke test simulation coverage
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const {
  runLearnedPatternAnalysis,
  EXPECTED_PATTERNS_BY_PROJECT,
  SIMULATION_ARTIFACTS,
  digestArtifact,
} = await import('../scripts/smoke-test-vault-digestion.mjs');

// ─── Test Helpers ─────────────────────────────────────────────────────────────

function makeNutrient(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    nutrientType: 'blocker_signal',
    summary: 'Vendor is blocking delivery and we cannot proceed without resolution',
    entities: [],
    evidence: [{
      sourceArtifactId: overrides.artifactId ?? crypto.randomUUID(),
      sourceType: 'project_note',
      sourceTitle: 'Test Note',
      excerpt: 'Vendor is blocking delivery and we cannot proceed',
      timestamp: overrides.createdAt ?? new Date().toISOString(),
      workspaceId: overrides.workspaceId ?? 'ws-test',
      projectId: overrides.projectId ?? 'proj-test',
      actorUserId: null,
      confidenceBasis: 'Pattern matched: /\\bblocked\\b/',
      extractionMethod: 'rule_based',
    }],
    scoring: {
      confidence: 0.75,
      severity: 'high',
      freshness: 1.0,
      recurrenceHint: 'first_occurrence',
      ambiguityLevel: 'clear',
      actionability: 'actionable',
      evidenceStrength: 'strong',
      decayProfile: 'slow',
      significanceScore: 0.7,
    },
    duplicateMergeCount: 0,
    workspaceId: overrides.workspaceId ?? 'ws-test',
    projectId: overrides.projectId ?? 'proj-test',
    digestionRunId: overrides.digestionRunId ?? crypto.randomUUID(),
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates N nutrients of the same type with different digestionRunIds and artifactIds,
 * spread across N days.
 */
function makeRecurringNutrients(type, count, workspaceId = 'ws-test', projectId = 'proj-test', options = {}) {
  const base = new Date('2026-04-01T10:00:00Z').getTime();
  return Array.from({ length: count }, (_, i) => {
    const createdAt = new Date(base + i * 86_400_000 * 3).toISOString();
    const artId = `art-${type}-${i}`;
    return makeNutrient({
      id: crypto.randomUUID(),
      nutrientType: type,
      summary: options.summary ?? `${type} occurring again — vendor dependency unresolved`,
      workspaceId,
      projectId,
      digestionRunId: `run-${type}-${i}`,
      createdAt,
      artifactId: artId,
      evidence: [{
        sourceArtifactId: artId,
        sourceType: 'project_note',
        sourceTitle: `Note ${i}`,
        excerpt: options.summary ?? `${type} occurring again`,
        timestamp: createdAt,
        workspaceId,
        projectId,
        actorUserId: null,
        confidenceBasis: 'rule_based',
        extractionMethod: 'rule_based',
      }],
    });
  });
}

// Import the JS pattern functions via the smoke test exports for black-box testing
// (we can't import TS directly from .mjs tests)
const smokeModule = await import('../scripts/smoke-test-vault-digestion.mjs');

// ─── 1. Pattern Promotion ─────────────────────────────────────────────────────

test('repeated blocker_signals across different runs produce recurring_blocker_pattern', () => {
  const nutrients = makeRecurringNutrients('blocker_signal', 4, 'ws-a', 'proj-a');
  // Wrap in fake digested results
  const digestedResults = nutrients.map((n) => ({
    artifact: { id: n.evidence[0].sourceArtifactId, workspaceId: n.workspaceId, projectId: n.projectId },
    result: { nutrients: [n], residue: [], entities: [], digestivePass: { runId: n.digestionRunId, workspaceId: n.workspaceId, projectId: n.projectId, actorUserId: null, rawMaterialId: n.evidence[0].sourceArtifactId, startedAt: n.createdAt, completedAt: n.createdAt, extractionMethod: 'rule_based', nutrientCount: 1, residueCount: 0, entityCount: 0, suppressedCandidateCount: 0 } },
  }));
  const analysis = runLearnedPatternAnalysis(digestedResults);
  const projectPatterns = analysis.byProject['proj-a'] ?? [];
  const blocker = projectPatterns.find((p) => p.patternType === 'recurring_blocker_pattern');
  assert.ok(blocker, 'Should detect recurring_blocker_pattern from 4 blocker signals across 4 runs');
  assert.equal(blocker.workspaceId, 'ws-a', 'Pattern must be scoped to ws-a');
  assert.equal(blocker.projectId, 'proj-a', 'Pattern must be scoped to proj-a');
});

test('single blocker_signal does not produce recurring_blocker_pattern', () => {
  const nutrients = makeRecurringNutrients('blocker_signal', 1, 'ws-single', 'proj-single');
  const digestedResults = nutrients.map((n) => ({
    artifact: { id: n.evidence[0].sourceArtifactId, workspaceId: n.workspaceId, projectId: n.projectId },
    result: { nutrients: [n], residue: [], entities: [], digestivePass: { runId: n.digestionRunId, workspaceId: n.workspaceId, projectId: n.projectId, actorUserId: null, rawMaterialId: null, startedAt: n.createdAt, completedAt: n.createdAt, extractionMethod: 'rule_based', nutrientCount: 1, residueCount: 0, entityCount: 0, suppressedCandidateCount: 0 } },
  }));
  const analysis = runLearnedPatternAnalysis(digestedResults);
  const projectPatterns = analysis.byProject['proj-single'] ?? [];
  const blocker = projectPatterns.find((p) => p.patternType === 'recurring_blocker_pattern');
  assert.equal(blocker, undefined, 'Single occurrence should NOT produce a recurring_blocker_pattern');
});

test('two blocker_signals from same digestion run do not produce recurring pattern', () => {
  const sharedRunId = 'shared-run-001';
  const nutrients = [
    makeNutrient({ nutrientType: 'blocker_signal', digestionRunId: sharedRunId, workspaceId: 'ws-dup', projectId: 'proj-dup', artifactId: 'art-dup-1', createdAt: '2026-04-01T10:00:00Z' }),
    makeNutrient({ nutrientType: 'blocker_signal', digestionRunId: sharedRunId, workspaceId: 'ws-dup', projectId: 'proj-dup', artifactId: 'art-dup-2', createdAt: '2026-04-01T10:00:00Z' }),
  ];
  const digestedResults = [{
    artifact: { id: 'art-dup-1', workspaceId: 'ws-dup', projectId: 'proj-dup' },
    result: { nutrients, residue: [], entities: [], digestivePass: { runId: sharedRunId, workspaceId: 'ws-dup', projectId: 'proj-dup', actorUserId: null, rawMaterialId: null, startedAt: '2026-04-01T10:00:00Z', completedAt: '2026-04-01T10:00:00Z', extractionMethod: 'rule_based', nutrientCount: 2, residueCount: 0, entityCount: 0, suppressedCandidateCount: 0 } },
  }];
  const analysis = runLearnedPatternAnalysis(digestedResults);
  const projectPatterns = analysis.byProject['proj-dup'] ?? [];
  const blocker = projectPatterns.find((p) => p.patternType === 'recurring_blocker_pattern');
  assert.equal(blocker, undefined, 'Same-run duplicates must NOT count as longitudinal recurrence');
});

// ─── 2. Financial Friction ────────────────────────────────────────────────────

test('two financial_impediment_signals from different runs produce financial_friction_pattern', () => {
  const nutrients = makeRecurringNutrients('financial_impediment_signal', 2, 'ws-fin', 'proj-fin', { summary: 'Payment has not been processed and invoice is overdue' });
  const digestedResults = nutrients.map((n) => ({
    artifact: { id: n.evidence[0].sourceArtifactId, workspaceId: n.workspaceId, projectId: n.projectId },
    result: { nutrients: [n], residue: [], entities: [], digestivePass: { runId: n.digestionRunId, workspaceId: n.workspaceId, projectId: n.projectId, actorUserId: null, rawMaterialId: null, startedAt: n.createdAt, completedAt: n.createdAt, extractionMethod: 'rule_based', nutrientCount: 1, residueCount: 0, entityCount: 0, suppressedCandidateCount: 0 } },
  }));
  const analysis = runLearnedPatternAnalysis(digestedResults);
  const projectPatterns = analysis.byProject['proj-fin'] ?? [];
  const fin = projectPatterns.find((p) => p.patternType === 'financial_friction_pattern');
  assert.ok(fin, 'Two financial signals from 2 runs should produce financial_friction_pattern');
});

// ─── 3. Governance Degradation ────────────────────────────────────────────────

test('two governance_gap_signals from different runs produce governance_degradation_pattern', () => {
  const nutrients = makeRecurringNutrients('governance_gap_signal', 2, 'ws-gov', 'proj-gov', { summary: 'No approval owner identified — governance gap in procurement process' });
  const digestedResults = nutrients.map((n) => ({
    artifact: { id: n.evidence[0].sourceArtifactId, workspaceId: n.workspaceId, projectId: n.projectId },
    result: { nutrients: [n], residue: [], entities: [], digestivePass: { runId: n.digestionRunId, workspaceId: n.workspaceId, projectId: n.projectId, actorUserId: null, rawMaterialId: null, startedAt: n.createdAt, completedAt: n.createdAt, extractionMethod: 'rule_based', nutrientCount: 1, residueCount: 0, entityCount: 0, suppressedCandidateCount: 0 } },
  }));
  const analysis = runLearnedPatternAnalysis(digestedResults);
  const projectPatterns = analysis.byProject['proj-gov'] ?? [];
  const gov = projectPatterns.find((p) => p.patternType === 'governance_degradation_pattern');
  assert.ok(gov, 'Two governance gap signals across 2 runs should produce governance_degradation_pattern');
});

// ─── 4. Escalation Trajectory ─────────────────────────────────────────────────

test('two escalation_signals from different runs produce escalation_trajectory_pattern', () => {
  const nutrients = makeRecurringNutrients('escalation_signal', 2, 'ws-esc', 'proj-esc', { summary: 'Issue escalated to executive level — requires immediate resolution' });
  const digestedResults = nutrients.map((n) => ({
    artifact: { id: n.evidence[0].sourceArtifactId, workspaceId: n.workspaceId, projectId: n.projectId },
    result: { nutrients: [n], residue: [], entities: [], digestivePass: { runId: n.digestionRunId, workspaceId: n.workspaceId, projectId: n.projectId, actorUserId: null, rawMaterialId: null, startedAt: n.createdAt, completedAt: n.createdAt, extractionMethod: 'rule_based', nutrientCount: 1, residueCount: 0, entityCount: 0, suppressedCandidateCount: 0 } },
  }));
  const analysis = runLearnedPatternAnalysis(digestedResults);
  const projectPatterns = analysis.byProject['proj-esc'] ?? [];
  const esc = projectPatterns.find((p) => p.patternType === 'escalation_trajectory_pattern');
  assert.ok(esc, 'Two escalation signals across 2 runs should produce escalation_trajectory_pattern');
});

// ─── 5. Recovery Pattern ─────────────────────────────────────────────────────

test('recovery_signal after blockers produces recovery_pattern', () => {
  const base = new Date('2026-04-01T10:00:00Z').getTime();

  const blocker1 = makeNutrient({ nutrientType: 'blocker_signal', workspaceId: 'ws-rec', projectId: 'proj-rec', digestionRunId: 'run-rec-1', createdAt: new Date(base).toISOString(), artifactId: 'art-rec-1' });
  const blocker2 = makeNutrient({ nutrientType: 'blocker_signal', workspaceId: 'ws-rec', projectId: 'proj-rec', digestionRunId: 'run-rec-2', createdAt: new Date(base + 86_400_000).toISOString(), artifactId: 'art-rec-2' });
  const recovery = makeNutrient({ nutrientType: 'recovery_signal', workspaceId: 'ws-rec', projectId: 'proj-rec', digestionRunId: 'run-rec-3', createdAt: new Date(base + 86_400_000 * 5).toISOString(), artifactId: 'art-rec-3' });

  const allNuts = [blocker1, blocker2, recovery];
  const digestedResults = allNuts.map((n) => ({
    artifact: { id: n.evidence[0].sourceArtifactId, workspaceId: n.workspaceId, projectId: n.projectId },
    result: { nutrients: [n], residue: [], entities: [], digestivePass: { runId: n.digestionRunId, workspaceId: n.workspaceId, projectId: n.projectId, actorUserId: null, rawMaterialId: null, startedAt: n.createdAt, completedAt: n.createdAt, extractionMethod: 'rule_based', nutrientCount: 1, residueCount: 0, entityCount: 0, suppressedCandidateCount: 0 } },
  }));

  const analysis = runLearnedPatternAnalysis(digestedResults);
  const projectPatterns = analysis.byProject['proj-rec'] ?? [];
  const rec = projectPatterns.find((p) => p.patternType === 'recovery_pattern');
  assert.ok(rec, 'Recovery signal after 2 blockers should produce recovery_pattern');
  assert.equal(rec.status, 'recovering', 'Recovery pattern should have status = recovering');
  assert.equal(rec.trajectory, 'decreasing', 'Recovery pattern should have trajectory = decreasing');
});

test('recovery_signal without prior blockers does NOT produce recovery_pattern', () => {
  const recovery = makeNutrient({ nutrientType: 'recovery_signal', workspaceId: 'ws-nobl', projectId: 'proj-nobl', digestionRunId: 'run-nobl-1' });
  const digestedResults = [{
    artifact: { id: recovery.evidence[0].sourceArtifactId, workspaceId: 'ws-nobl', projectId: 'proj-nobl' },
    result: { nutrients: [recovery], residue: [], entities: [], digestivePass: { runId: 'run-nobl-1', workspaceId: 'ws-nobl', projectId: 'proj-nobl', actorUserId: null, rawMaterialId: null, startedAt: recovery.createdAt, completedAt: recovery.createdAt, extractionMethod: 'rule_based', nutrientCount: 1, residueCount: 0, entityCount: 0, suppressedCandidateCount: 0 } },
  }];
  const analysis = runLearnedPatternAnalysis(digestedResults);
  const projectPatterns = analysis.byProject['proj-nobl'] ?? [];
  const rec = projectPatterns.find((p) => p.patternType === 'recovery_pattern');
  assert.equal(rec, undefined, 'Recovery signal alone (no prior blockers) should NOT produce recovery_pattern');
});

// ─── 6. Evidence Lineage ──────────────────────────────────────────────────────

test('every learned pattern has evidence references', () => {
  const nutrients = makeRecurringNutrients('blocker_signal', 4, 'ws-ev', 'proj-ev');
  const digestedResults = nutrients.map((n) => ({
    artifact: { id: n.evidence[0].sourceArtifactId, workspaceId: n.workspaceId, projectId: n.projectId },
    result: { nutrients: [n], residue: [], entities: [], digestivePass: { runId: n.digestionRunId, workspaceId: n.workspaceId, projectId: n.projectId, actorUserId: null, rawMaterialId: null, startedAt: n.createdAt, completedAt: n.createdAt, extractionMethod: 'rule_based', nutrientCount: 1, residueCount: 0, entityCount: 0, suppressedCandidateCount: 0 } },
  }));
  const analysis = runLearnedPatternAnalysis(digestedResults);
  for (const pattern of analysis.patterns) {
    assert.ok(pattern.evidenceReferences.length > 0, `Pattern ${pattern.patternType} must have evidence references`);
    for (const ev of pattern.evidenceReferences) {
      assert.ok(ev.excerpt && ev.excerpt.length > 0, 'Evidence must have non-empty excerpt');
      assert.ok(ev.contributionReason, 'Evidence must have contribution reason');
      assert.ok(ev.patternId, 'Evidence must reference its parent pattern');
    }
  }
});

test('every learned pattern has non-empty involvedNutrientIds', () => {
  const nutrients = makeRecurringNutrients('dependency_signal', 3, 'ws-inv', 'proj-inv');
  const digestedResults = nutrients.map((n) => ({
    artifact: { id: n.evidence[0].sourceArtifactId, workspaceId: n.workspaceId, projectId: n.projectId },
    result: { nutrients: [n], residue: [], entities: [], digestivePass: { runId: n.digestionRunId, workspaceId: n.workspaceId, projectId: n.projectId, actorUserId: null, rawMaterialId: null, startedAt: n.createdAt, completedAt: n.createdAt, extractionMethod: 'rule_based', nutrientCount: 1, residueCount: 0, entityCount: 0, suppressedCandidateCount: 0 } },
  }));
  const analysis = runLearnedPatternAnalysis(digestedResults);
  for (const pattern of analysis.patterns) {
    assert.ok(pattern.involvedNutrientIds.length > 0, `Pattern ${pattern.patternType} must reference involved nutrient IDs`);
  }
});

// ─── 7. Tenant Isolation ──────────────────────────────────────────────────────

test('patterns never combine nutrients across different workspaces', () => {
  // Two projects, same pattern type, different workspaces
  const nutA = makeRecurringNutrients('blocker_signal', 3, 'ws-tenant-A', 'proj-A');
  const nutB = makeRecurringNutrients('blocker_signal', 3, 'ws-tenant-B', 'proj-B');
  const allNuts = [...nutA, ...nutB];

  const digestedResults = allNuts.map((n) => ({
    artifact: { id: n.evidence[0].sourceArtifactId, workspaceId: n.workspaceId, projectId: n.projectId },
    result: { nutrients: [n], residue: [], entities: [], digestivePass: { runId: n.digestionRunId, workspaceId: n.workspaceId, projectId: n.projectId, actorUserId: null, rawMaterialId: null, startedAt: n.createdAt, completedAt: n.createdAt, extractionMethod: 'rule_based', nutrientCount: 1, residueCount: 0, entityCount: 0, suppressedCandidateCount: 0 } },
  }));

  const analysis = runLearnedPatternAnalysis(digestedResults);

  for (const pattern of analysis.patterns) {
    const allInvolvedNuts = allNuts.filter((n) => pattern.involvedNutrientIds.includes(n.id));
    const workspaceIds = new Set(allInvolvedNuts.map((n) => n.workspaceId));
    assert.equal(workspaceIds.size, 1, `Pattern must not mix nutrients from different workspaces. Found: ${[...workspaceIds].join(', ')}`);
    assert.equal(pattern.workspaceId, [...workspaceIds][0], 'Pattern workspaceId must match its nutrients');
  }
});

test('patterns do not cross project boundaries within the same workspace', () => {
  const nutA = makeRecurringNutrients('blocker_signal', 3, 'ws-shared', 'proj-X');
  const nutB = makeRecurringNutrients('blocker_signal', 3, 'ws-shared', 'proj-Y');

  const digestedResults = [...nutA, ...nutB].map((n) => ({
    artifact: { id: n.evidence[0].sourceArtifactId, workspaceId: n.workspaceId, projectId: n.projectId },
    result: { nutrients: [n], residue: [], entities: [], digestivePass: { runId: n.digestionRunId, workspaceId: n.workspaceId, projectId: n.projectId, actorUserId: null, rawMaterialId: null, startedAt: n.createdAt, completedAt: n.createdAt, extractionMethod: 'rule_based', nutrientCount: 1, residueCount: 0, entityCount: 0, suppressedCandidateCount: 0 } },
  }));

  const analysis = runLearnedPatternAnalysis(digestedResults);
  const patternProjects = analysis.patterns.map((p) => p.projectId);

  // Should have separate patterns per project
  const uniqueProjects = new Set(patternProjects);
  assert.ok(uniqueProjects.has('proj-X'), 'Pattern for proj-X should exist');
  assert.ok(uniqueProjects.has('proj-Y'), 'Pattern for proj-Y should exist');

  // No pattern should reference nutrients from both projects
  for (const pattern of analysis.patterns) {
    const allInvolvedNuts = [...nutA, ...nutB].filter((n) => pattern.involvedNutrientIds.includes(n.id));
    const projectIds = new Set(allInvolvedNuts.map((n) => n.projectId));
    assert.equal(projectIds.size, 1, `Pattern must not mix nutrients from different projects. Found: ${[...projectIds].join(', ')}`);
  }
});

// ─── 8. Determinism ───────────────────────────────────────────────────────────

test('same input produces same pattern types (determinism)', () => {
  const nutrients = makeRecurringNutrients('financial_impediment_signal', 3, 'ws-det', 'proj-det');
  const digestedResults = nutrients.map((n) => ({
    artifact: { id: n.evidence[0].sourceArtifactId, workspaceId: n.workspaceId, projectId: n.projectId },
    result: { nutrients: [n], residue: [], entities: [], digestivePass: { runId: n.digestionRunId, workspaceId: n.workspaceId, projectId: n.projectId, actorUserId: null, rawMaterialId: null, startedAt: n.createdAt, completedAt: n.createdAt, extractionMethod: 'rule_based', nutrientCount: 1, residueCount: 0, entityCount: 0, suppressedCandidateCount: 0 } },
  }));

  const run1 = runLearnedPatternAnalysis(digestedResults);
  const run2 = runLearnedPatternAnalysis(digestedResults);

  const types1 = run1.patterns.map((p) => `${p.patternType}:${p.projectId}`).sort().join(';');
  const types2 = run2.patterns.map((p) => `${p.patternType}:${p.projectId}`).sort().join(';');

  assert.equal(types1, types2, 'Same inputs must produce same pattern types across runs');

  const counts1 = run1.patterns.map((p) => `${p.patternType}:${p.recurrenceCount}:${p.confidence}`).sort().join(';');
  const counts2 = run2.patterns.map((p) => `${p.patternType}:${p.recurrenceCount}:${p.confidence}`).sort().join(';');

  assert.equal(counts1, counts2, 'Same inputs must produce same recurrence counts and confidence scores');
});

// ─── 9. Pattern Structure Contracts ──────────────────────────────────────────

test('all learned patterns have required fields', () => {
  const nutrients = makeRecurringNutrients('blocker_signal', 4, 'ws-struct', 'proj-struct');
  const digestedResults = nutrients.map((n) => ({
    artifact: { id: n.evidence[0].sourceArtifactId, workspaceId: n.workspaceId, projectId: n.projectId },
    result: { nutrients: [n], residue: [], entities: [], digestivePass: { runId: n.digestionRunId, workspaceId: n.workspaceId, projectId: n.projectId, actorUserId: null, rawMaterialId: null, startedAt: n.createdAt, completedAt: n.createdAt, extractionMethod: 'rule_based', nutrientCount: 1, residueCount: 0, entityCount: 0, suppressedCandidateCount: 0 } },
  }));
  const analysis = runLearnedPatternAnalysis(digestedResults);

  for (const p of analysis.patterns) {
    assert.ok(p.id, 'pattern must have id');
    assert.ok(p.workspaceId, 'pattern must have workspaceId');
    assert.ok(p.patternType, 'pattern must have patternType');
    assert.ok(p.title, 'pattern must have title');
    assert.ok(p.summary, 'pattern must have summary');
    assert.ok(p.firstSeenAt, 'pattern must have firstSeenAt');
    assert.ok(p.lastSeenAt, 'pattern must have lastSeenAt');
    assert.ok(p.recurrenceProfile, 'pattern must have recurrenceProfile');
    assert.ok(typeof p.recurrenceProfile.totalOccurrences === 'number', 'recurrenceProfile.totalOccurrences must be number');
    assert.ok(typeof p.recurrenceProfile.distinctDigestionRuns === 'number', 'recurrenceProfile.distinctDigestionRuns must be number');
    assert.ok(p.confidence >= 0 && p.confidence <= 1, 'confidence must be 0..1');
    assert.ok(['low','medium','high','critical'].includes(p.severity), 'severity must be valid');
    assert.ok(['increasing','stable','decreasing','intermittent','recovered','unknown'].includes(p.trajectory), 'trajectory must be valid');
    assert.ok(['emerging','confirmed','chronic','recovering','resolved','stale'].includes(p.status), 'status must be valid');
    assert.ok(p.promotionReason, 'pattern must have promotionReason');
  }
});

test('recurrenceProfile.distinctDigestionRuns >= 2 for all non-recovery patterns', () => {
  const nutrients = makeRecurringNutrients('blocker_signal', 4, 'ws-rp', 'proj-rp');
  const digestedResults = nutrients.map((n) => ({
    artifact: { id: n.evidence[0].sourceArtifactId, workspaceId: n.workspaceId, projectId: n.projectId },
    result: { nutrients: [n], residue: [], entities: [], digestivePass: { runId: n.digestionRunId, workspaceId: n.workspaceId, projectId: n.projectId, actorUserId: null, rawMaterialId: null, startedAt: n.createdAt, completedAt: n.createdAt, extractionMethod: 'rule_based', nutrientCount: 1, residueCount: 0, entityCount: 0, suppressedCandidateCount: 0 } },
  }));
  const analysis = runLearnedPatternAnalysis(digestedResults);
  for (const p of analysis.patterns) {
    if (p.patternType === 'recovery_pattern') continue;
    assert.ok(
      p.recurrenceProfile.distinctDigestionRuns >= 2,
      `Pattern ${p.patternType} must have 2+ distinct digestion runs, got ${p.recurrenceProfile.distinctDigestionRuns}`,
    );
  }
});

// ─── 10. Smoke Test Simulation Coverage ──────────────────────────────────────

test('smoke test simulation detects at least one pattern per project', () => {
  const digestedResults = SIMULATION_ARTIFACTS.map((artifact) => ({
    artifact,
    result: digestArtifact(artifact),
  }));
  const analysis = runLearnedPatternAnalysis(digestedResults);
  const requiredProjects = [
    'proj-mep-14156', 'proj-ice-9298', 'proj-gch-15992', 'proj-hsa-15576', 'proj-muc-13098',
  ];
  for (const projectId of requiredProjects) {
    const patterns = analysis.byProject[projectId] ?? [];
    assert.ok(patterns.length > 0, `Should detect at least one pattern for ${projectId}`);
  }
});

test('smoke test detects financial_friction_pattern for ICE-9298', () => {
  const iceArtifacts = SIMULATION_ARTIFACTS.filter((a) => a.projectId === 'proj-ice-9298');
  const digestedResults = iceArtifacts.map((artifact) => ({ artifact, result: digestArtifact(artifact) }));
  const analysis = runLearnedPatternAnalysis(digestedResults);
  const icePatterns = analysis.byProject['proj-ice-9298'] ?? [];
  const fin = icePatterns.find((p) => p.patternType === 'financial_friction_pattern');
  assert.ok(fin, 'ICE-9298 should produce financial_friction_pattern from payment/invoice signals');
});

test('smoke test detects recurring_blocker_pattern for MEP-14156', () => {
  const mepArtifacts = SIMULATION_ARTIFACTS.filter((a) => a.projectId === 'proj-mep-14156');
  const digestedResults = mepArtifacts.map((artifact) => ({ artifact, result: digestArtifact(artifact) }));
  const analysis = runLearnedPatternAnalysis(digestedResults);
  const mepPatterns = analysis.byProject['proj-mep-14156'] ?? [];
  const blocker = mepPatterns.find((p) => p.patternType === 'recurring_blocker_pattern');
  assert.ok(blocker, 'MEP-14156 should produce recurring_blocker_pattern from multiple blocker signals');
});

test('smoke test detects escalation_trajectory_pattern for ICE-9298', () => {
  const iceArtifacts = SIMULATION_ARTIFACTS.filter((a) => a.projectId === 'proj-ice-9298');
  const digestedResults = iceArtifacts.map((artifact) => ({ artifact, result: digestArtifact(artifact) }));
  const analysis = runLearnedPatternAnalysis(digestedResults);
  const icePatterns = analysis.byProject['proj-ice-9298'] ?? [];
  const esc = icePatterns.find((p) => p.patternType === 'escalation_trajectory_pattern');
  assert.ok(esc, 'ICE-9298 should produce escalation_trajectory_pattern from CFO escalations');
});

test('smoke test detects recovery_pattern for MEP-14156', () => {
  const mepArtifacts = SIMULATION_ARTIFACTS.filter((a) => a.projectId === 'proj-mep-14156');
  const digestedResults = mepArtifacts.map((artifact) => ({ artifact, result: digestArtifact(artifact) }));
  const analysis = runLearnedPatternAnalysis(digestedResults);
  const mepPatterns = analysis.byProject['proj-mep-14156'] ?? [];
  const rec = mepPatterns.find((p) => p.patternType === 'recovery_pattern');
  assert.ok(rec, 'MEP-14156 should produce recovery_pattern (mep-008: HQ onboarding completed)');
});

test('smoke test detects governance_degradation_pattern for GCH-15992', () => {
  const gchArtifacts = SIMULATION_ARTIFACTS.filter((a) => a.projectId === 'proj-gch-15992');
  const digestedResults = gchArtifacts.map((artifact) => ({ artifact, result: digestArtifact(artifact) }));
  const analysis = runLearnedPatternAnalysis(digestedResults);
  const gchPatterns = analysis.byProject['proj-gch-15992'] ?? [];
  const gov = gchPatterns.find((p) => p.patternType === 'governance_degradation_pattern');
  assert.ok(gov, 'GCH-15992 should produce governance_degradation_pattern from governance gap signals');
});

test('smoke test patterns have complete evidence references', () => {
  const digestedResults = SIMULATION_ARTIFACTS.map((artifact) => ({
    artifact,
    result: digestArtifact(artifact),
  }));
  const analysis = runLearnedPatternAnalysis(digestedResults);
  let patternsWithEvidence = 0;
  for (const pattern of analysis.patterns) {
    if (pattern.evidenceReferences.length > 0) patternsWithEvidence++;
  }
  const coveragePct = analysis.patterns.length > 0
    ? Math.round((patternsWithEvidence / analysis.patterns.length) * 100)
    : 100;
  assert.ok(coveragePct >= 80, `At least 80% of patterns should have evidence references. Got ${coveragePct}%`);
});

test('smoke test total patterns count > 5', () => {
  const digestedResults = SIMULATION_ARTIFACTS.map((artifact) => ({
    artifact,
    result: digestArtifact(artifact),
  }));
  const analysis = runLearnedPatternAnalysis(digestedResults);
  assert.ok(analysis.totalPatterns > 5, `Expected > 5 total patterns, got ${analysis.totalPatterns}`);
});

test('smoke test expected pattern types match EXPECTED_PATTERNS_BY_PROJECT', () => {
  const digestedResults = SIMULATION_ARTIFACTS.map((artifact) => ({
    artifact,
    result: digestArtifact(artifact),
  }));
  const analysis = runLearnedPatternAnalysis(digestedResults);
  const missed = [];
  for (const [projectId, expectedTypes] of Object.entries(EXPECTED_PATTERNS_BY_PROJECT)) {
    const projectPatterns = analysis.byProject[projectId] ?? [];
    const detectedTypes = new Set(projectPatterns.map((p) => p.patternType));
    for (const expected of expectedTypes) {
      if (!detectedTypes.has(expected)) missed.push({ projectId, expected });
    }
  }
  assert.equal(missed.length, 0, `Missing expected patterns: ${missed.map((m) => `${m.projectId}/${m.expected}`).join(', ')}`);
});

test('patternsDetected include adaptiveScoring with adaptive severity/confidence', () => {
  const nutrients = makeRecurringNutrients('blocker_signal', 4, 'ws-adp', 'proj-adp');
  const digestedResults = nutrients.map((n) => ({
    artifact: { id: n.evidence[0].sourceArtifactId, workspaceId: n.workspaceId, projectId: n.projectId },
    result: { nutrients: [n], residue: [], entities: [], digestivePass: { runId: n.digestionRunId, workspaceId: n.workspaceId, projectId: n.projectId, actorUserId: null, rawMaterialId: null, startedAt: n.createdAt, completedAt: n.createdAt, extractionMethod: 'rule_based', nutrientCount: 1, residueCount: 0, entityCount: 0, suppressedCandidateCount: 0 } },
  }));
  const analysis = runLearnedPatternAnalysis(digestedResults);
  assert.ok(analysis.patterns.length > 0, 'Expected learned patterns');
  for (const pattern of analysis.patterns) {
    assert.ok(pattern.adaptiveScoring, 'Pattern should include adaptiveScoring');
    assert.ok(['low', 'medium', 'high', 'critical'].includes(pattern.adaptiveScoring.adaptiveSeverity), 'adaptiveSeverity should be valid');
    assert.equal(typeof pattern.adaptiveScoring.adaptiveConfidence, 'number', 'adaptiveConfidence should be number');
  }
});

test('runLearnedPatternAnalysis includes adaptiveOperationalContext', () => {
  const digestedResults = SIMULATION_ARTIFACTS.map((artifact) => ({ artifact, result: digestArtifact(artifact) }));
  const analysis = runLearnedPatternAnalysis(digestedResults);
  assert.ok(analysis.adaptiveOperationalContext, 'adaptiveOperationalContext should exist');
  assert.equal(typeof analysis.adaptiveOperationalContext.activeChronicRisks, 'number');
  assert.equal(typeof analysis.adaptiveOperationalContext.averageAdaptiveConfidence, 'number');
});

test('smoke test learned patterns explicitly validate adaptive scoring presence', () => {
  const digestedResults = SIMULATION_ARTIFACTS.map((artifact) => ({ artifact, result: digestArtifact(artifact) }));
  const analysis = runLearnedPatternAnalysis(digestedResults);
  const missing = analysis.patterns.filter((p) => !p.adaptiveScoring || typeof p.adaptiveScoring.adaptiveConfidence !== 'number');
  assert.equal(missing.length, 0, `All learned patterns must include adaptive scoring. Missing: ${missing.length}`);
});
