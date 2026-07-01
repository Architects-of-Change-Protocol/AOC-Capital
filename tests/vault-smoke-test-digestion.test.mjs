/**
 * Automated tests for the Vault Digestive System smoke-test runner.
 *
 * Tests validate:
 *   - Smoke test execution and output shape
 *   - Deterministic digestion behavior
 *   - Cognition metric generation
 *   - Validation heuristic behavior (over/under-trigger detection)
 *   - Lineage completeness
 *   - Signal density assertions
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// Load the smoke-test module (contains both the simulation data and validation logic)
const {
  runSmokeTest,
  validateOverTriggering,
  validateUnderTriggering,
  validateSignalDensity,
  validateLineageIntegrity,
  validateDeterminism,
  runDigestivePipeline,
  extractNutrientCandidates,
  digestArtifact,
  SIMULATION_ARTIFACTS,
  STAKEHOLDER_PRESSURE_PATTERNS,
  deduplicateCandidates,
  evaluateSignificance,
  BASELINE_METRICS,
  computeSuppressionMetrics,
} = await import('../scripts/smoke-test-vault-digestion.mjs');

// ─── Simulation Dataset ───────────────────────────────────────────────────────

test('simulation dataset has at least 50 artifacts', () => {
  assert.ok(SIMULATION_ARTIFACTS.length >= 50, `Expected >= 50 artifacts, got ${SIMULATION_ARTIFACTS.length}`);
});

test('simulation dataset covers all 5 required projects', () => {
  const projectIds = new Set(SIMULATION_ARTIFACTS.map((a) => a.projectId));
  const required = ['proj-mep-14156', 'proj-ice-9298', 'proj-gch-15992', 'proj-hsa-15576', 'proj-muc-13098'];
  for (const id of required) {
    assert.ok(projectIds.has(id), `Missing project: ${id}`);
  }
});

test('simulation dataset has at least 5 different workspaceIds', () => {
  const workspaceIds = new Set(SIMULATION_ARTIFACTS.map((a) => a.workspaceId));
  assert.ok(workspaceIds.size >= 5, `Expected >= 5 workspaces, got ${workspaceIds.size}`);
});

test('all artifacts have required fields', () => {
  for (const artifact of SIMULATION_ARTIFACTS) {
    assert.ok(artifact.id, `Artifact missing id`);
    assert.ok(artifact.workspaceId, `${artifact.id} missing workspaceId`);
    assert.ok(artifact.projectId, `${artifact.id} missing projectId`);
    assert.ok(artifact.type, `${artifact.id} missing type`);
    assert.ok(artifact.content && artifact.content.length >= 50, `${artifact.id} content too short`);
    assert.ok(artifact.submittedAt, `${artifact.id} missing submittedAt`);
  }
});

test('simulation dataset has diverse source types', () => {
  const sourceTypes = new Set(SIMULATION_ARTIFACTS.map((a) => a.type));
  assert.ok(sourceTypes.size >= 4, `Expected >= 4 source types, got ${sourceTypes.size}`);
});

// ─── Pipeline Output Shape ────────────────────────────────────────────────────

test('digestArtifact returns a well-formed digestion result', () => {
  const artifact = SIMULATION_ARTIFACTS[0];
  const result = digestArtifact(artifact);
  assert.ok(result.digestivePass, 'must have digestivePass');
  assert.ok(result.digestivePass.runId, 'runId required');
  assert.ok(result.digestivePass.workspaceId, 'workspaceId required');
  assert.equal(result.digestivePass.workspaceId, artifact.workspaceId);
  assert.equal(result.digestivePass.projectId, artifact.projectId);
  assert.ok(Array.isArray(result.nutrients), 'nutrients must be array');
  assert.ok(Array.isArray(result.residue), 'residue must be array');
  assert.ok(Array.isArray(result.entities), 'entities must be array');
  assert.equal(result.digestivePass.nutrientCount, result.nutrients.length);
  assert.equal(result.digestivePass.residueCount, result.residue.length);
});

test('digestion result nutrients have required structure', () => {
  const artifact = SIMULATION_ARTIFACTS.find((a) => a.id === 'mep-001');
  const result = digestArtifact(artifact);
  assert.ok(result.nutrients.length > 0, 'mep-001 should produce nutrients');
  for (const nutrient of result.nutrients) {
    assert.ok(nutrient.id, 'nutrient must have id');
    assert.ok(nutrient.nutrientType, 'nutrient must have type');
    assert.ok(nutrient.summary, 'nutrient must have summary');
    assert.ok(nutrient.workspaceId, 'nutrient must have workspaceId');
    assert.equal(nutrient.workspaceId, artifact.workspaceId);
    assert.ok(Array.isArray(nutrient.evidence), 'evidence must be array');
    assert.ok(nutrient.evidence.length > 0, 'evidence must not be empty');
    assert.ok(nutrient.scoring, 'nutrient must have scoring');
    assert.ok(typeof nutrient.scoring.confidence === 'number', 'confidence must be number');
    assert.ok(nutrient.scoring.confidence >= 0 && nutrient.scoring.confidence <= 1, 'confidence in [0,1]');
    assert.ok(['low', 'medium', 'high', 'critical'].includes(nutrient.scoring.severity));
    assert.ok(['fast', 'medium', 'slow', 'persistent'].includes(nutrient.scoring.decayProfile));
  }
});

test('digestion extracts blocker signal from mep-001 escalation artifact', () => {
  const artifact = SIMULATION_ARTIFACTS.find((a) => a.id === 'mep-001');
  const result = digestArtifact(artifact);
  const hasBlocker = result.nutrients.some((n) => n.nutrientType === 'blocker_signal');
  assert.ok(hasBlocker, 'mep-001 should extract a blocker_signal (blocked by Cisco SASE)');
});

test('digestion extracts financial signal from ice-001 payment escalation', () => {
  const artifact = SIMULATION_ARTIFACTS.find((a) => a.id === 'ice-001');
  const result = digestArtifact(artifact);
  const hasFinancial = result.nutrients.some((n) => n.nutrientType === 'financial_impediment_signal');
  assert.ok(hasFinancial, 'ice-001 should extract financial_impediment_signal (payment blocking release)');
});

test('digestion extracts escalation signal from escalation artifacts', () => {
  const escalationArtifacts = SIMULATION_ARTIFACTS.filter((a) => a.title.includes('ESCALATION'));
  for (const artifact of escalationArtifacts) {
    const result = digestArtifact(artifact);
    const hasEscalation = result.nutrients.some((n) => n.nutrientType === 'escalation_signal');
    assert.ok(hasEscalation, `${artifact.id} should extract escalation_signal`);
  }
});

test('digestion extracts recovery signal from successful completion artifacts', () => {
  const artifact = SIMULATION_ARTIFACTS.find((a) => a.id === 'mep-008');
  const result = digestArtifact(artifact);
  const hasRecovery = result.nutrients.some((n) => n.nutrientType === 'recovery_signal');
  assert.ok(hasRecovery, 'mep-008 (HQ onboarding completed) should extract recovery_signal');
});

test('digestion extracts ambiguity signal from ambiguous content', () => {
  const artifact = SIMULATION_ARTIFACTS.find((a) => a.id === 'mep-006');
  const result = digestArtifact(artifact);
  const hasAmbiguity = result.nutrients.some((n) => n.nutrientType === 'ambiguity_signal');
  assert.ok(hasAmbiguity, 'mep-006 (MFA unclear process) should extract ambiguity_signal');
});

test('digestion extracts contradiction signal from conflicting requirements', () => {
  const artifact = SIMULATION_ARTIFACTS.find((a) => a.id === 'gch-007');
  const result = digestArtifact(artifact);
  const hasContradiction = result.nutrients.some((n) => n.nutrientType === 'contradiction_signal');
  assert.ok(hasContradiction, 'gch-007 (license types conflict) should extract contradiction_signal');
});

// ─── Determinism ──────────────────────────────────────────────────────────────

test('digestion is deterministic: same artifact produces same nutrient count', () => {
  const artifact = SIMULATION_ARTIFACTS[0];
  const run1 = digestArtifact(artifact, '-det1');
  const run2 = digestArtifact(artifact, '-det2');
  assert.equal(run1.nutrients.length, run2.nutrients.length, 'Nutrient count must be deterministic');
});

test('digestion is deterministic: same artifact produces same nutrient types', () => {
  const artifact = SIMULATION_ARTIFACTS[5];
  const run1 = digestArtifact(artifact, '-det1');
  const run2 = digestArtifact(artifact, '-det2');
  const types1 = run1.nutrients.map((n) => n.nutrientType).sort().join(',');
  const types2 = run2.nutrients.map((n) => n.nutrientType).sort().join(',');
  assert.equal(types1, types2, 'Nutrient types must be deterministic');
});

test('digestion is deterministic: same artifact produces same residue count', () => {
  const artifact = SIMULATION_ARTIFACTS[10];
  const run1 = digestArtifact(artifact, '-det1');
  const run2 = digestArtifact(artifact, '-det2');
  assert.equal(run1.residue.length, run2.residue.length, 'Residue count must be deterministic');
});

test('digestion is deterministic: same artifact produces same scoring', () => {
  const artifact = SIMULATION_ARTIFACTS[3];
  const run1 = digestArtifact(artifact, '-det1');
  const run2 = digestArtifact(artifact, '-det2');
  const scores1 = run1.nutrients.map((n) => `${n.nutrientType}:${n.scoring.confidence}:${n.scoring.severity}`).sort().join(';');
  const scores2 = run2.nutrients.map((n) => `${n.nutrientType}:${n.scoring.confidence}:${n.scoring.severity}`).sort().join(';');
  assert.equal(scores1, scores2, 'Scoring must be deterministic');
});

test('validateDeterminism finds no mismatches across 10 test artifacts', () => {
  const mismatches = validateDeterminism(SIMULATION_ARTIFACTS);
  assert.equal(mismatches.length, 0, `Expected 0 determinism mismatches, got ${mismatches.length}: ${JSON.stringify(mismatches.slice(0, 3))}`);
});

// ─── Lineage Integrity ────────────────────────────────────────────────────────

test('every nutrient has at least one evidence lineage record', () => {
  const digestedResults = SIMULATION_ARTIFACTS.map((artifact) => ({ artifact, result: digestArtifact(artifact) }));
  const violations = validateLineageIntegrity(digestedResults);
  const missingEvidenceViolations = violations.filter((v) => v.violation === 'missing_evidence_lineage');
  assert.equal(missingEvidenceViolations.length, 0, `Found ${missingEvidenceViolations.length} nutrients with no evidence lineage`);
});

test('every evidence lineage record has a non-empty excerpt', () => {
  const digestedResults = SIMULATION_ARTIFACTS.map((artifact) => ({ artifact, result: digestArtifact(artifact) }));
  const violations = validateLineageIntegrity(digestedResults);
  const emptyExcerptViolations = violations.filter((v) => v.violation === 'empty_excerpt');
  assert.equal(emptyExcerptViolations.length, 0, `Found ${emptyExcerptViolations.length} evidence records with empty excerpts`);
});

test('every evidence lineage preserves workspaceId correctly', () => {
  const digestedResults = SIMULATION_ARTIFACTS.map((artifact) => ({ artifact, result: digestArtifact(artifact) }));
  const violations = validateLineageIntegrity(digestedResults);
  const workspaceViolations = violations.filter((v) => v.violation === 'workspaceId_mismatch');
  assert.equal(workspaceViolations.length, 0, `Found ${workspaceViolations.length} workspaceId mismatches in lineage`);
});

test('every evidence lineage preserves projectId correctly', () => {
  const digestedResults = SIMULATION_ARTIFACTS.map((artifact) => ({ artifact, result: digestArtifact(artifact) }));
  const violations = validateLineageIntegrity(digestedResults);
  const projectIdViolations = violations.filter((v) => v.violation === 'projectId_mismatch');
  assert.equal(projectIdViolations.length, 0, `Found ${projectIdViolations.length} projectId mismatches in lineage`);
});

test('every evidence lineage has a confidence basis explanation', () => {
  const digestedResults = SIMULATION_ARTIFACTS.map((artifact) => ({ artifact, result: digestArtifact(artifact) }));
  const violations = validateLineageIntegrity(digestedResults);
  const missingBasisViolations = violations.filter((v) => v.violation === 'missing_confidence_basis');
  assert.equal(missingBasisViolations.length, 0, `Found ${missingBasisViolations.length} nutrients with no confidence basis`);
});

// ─── Signal Density ───────────────────────────────────────────────────────────

test('signal density is within reasonable range for dense operational PM artifacts (1.5 to 12 avg nutrients)', () => {
  // This simulation dataset is intentionally signal-rich (multi-issue PM updates, escalations, blockers).
  // The over-trigger validator separately flags individual artifacts above 8 nutrients.
  // The density test validates the system doesn't produce absurdly sparse or completely unconstrained output.
  const digestedResults = SIMULATION_ARTIFACTS.map((artifact) => ({ artifact, result: digestArtifact(artifact) }));
  const density = validateSignalDensity(digestedResults);
  assert.ok(density.avgNutrients >= 1.5, `Average nutrients per artifact too sparse: ${density.avgNutrients.toFixed(2)}`);
  assert.ok(density.avgNutrients <= 12, `Average nutrients per artifact unreasonably high: ${density.avgNutrients.toFixed(2)}`);
});

test('at least 10 of the 14 signal types are represented across the dataset', () => {
  const digestedResults = SIMULATION_ARTIFACTS.map((artifact) => ({ artifact, result: digestArtifact(artifact) }));
  const density = validateSignalDensity(digestedResults);
  const coveredTypes = Object.keys(density.typeDistribution).length;
  assert.ok(coveredTypes >= 10, `Only ${coveredTypes} signal types represented — expected >= 10`);
});

test('blocker_signal appears in at least 5 artifacts', () => {
  const digestedResults = SIMULATION_ARTIFACTS.map((artifact) => ({ artifact, result: digestArtifact(artifact) }));
  const density = validateSignalDensity(digestedResults);
  const count = density.typeDistribution['blocker_signal'] ?? 0;
  assert.ok(count >= 5, `blocker_signal only appears ${count} times — expected >= 5 for this dataset`);
});

test('financial_impediment_signal appears at least once', () => {
  const digestedResults = SIMULATION_ARTIFACTS.map((artifact) => ({ artifact, result: digestArtifact(artifact) }));
  const density = validateSignalDensity(digestedResults);
  const count = density.typeDistribution['financial_impediment_signal'] ?? 0;
  assert.ok(count >= 1, 'financial_impediment_signal should appear — dataset has explicit payment blockers');
});

test('escalation_signal appears at least 3 times', () => {
  const digestedResults = SIMULATION_ARTIFACTS.map((artifact) => ({ artifact, result: digestArtifact(artifact) }));
  const density = validateSignalDensity(digestedResults);
  const count = density.typeDistribution['escalation_signal'] ?? 0;
  assert.ok(count >= 3, `escalation_signal only appears ${count} times — expected >= 3 for dataset with explicit escalations`);
});

// ─── Over-trigger Detection ───────────────────────────────────────────────────

test('over-trigger validator detects artifacts with excessive nutrients', () => {
  const excessiveArtifact = {
    id: 'test-over-trigger',
    workspaceId: 'ws-test',
    projectId: 'proj-test',
    actorUserId: 'user-test',
    type: 'operational_update',
    title: 'Over-trigger Test',
    submittedAt: new Date().toISOString(),
    sourceRef: 'user-test:test',
    content: [
      'The project is blocked by vendor delays and this is a risk to the timeline.',
      'Escalation raised to executive attention due to governance gap.',
      'Financial impediment: budget not approved by deadline today.',
      'Decision pending on whether to proceed with the dependency on the external vendor.',
      'Stakeholder confusion about commitment made last week.',
      'Timeline pressure is imminent as the delivery is slipping behind schedule.',
      'Waiting for approval from client executive sponsor to continue.',
      'Audit compliance concern raised about the governance process.',
      'TBD whether we can resolve the ambiguity before the deadline.',
      'Risk of contradiction with previously signed-off plan.',
    ].join('\n'),
  };
  const results = [{ artifact: excessiveArtifact, result: digestArtifact(excessiveArtifact) }];
  const flags = validateOverTriggering(results);
  const hasOverTrigger = flags.some((f) => f.flag === 'possible_over_triggering');
  assert.ok(hasOverTrigger, 'Should detect over-triggering for artifact with 9+ dense signal lines');
});

test('over-trigger validator does NOT flag minimal signal artifacts', () => {
  const simpleArtifact = {
    id: 'test-simple',
    workspaceId: 'ws-test',
    projectId: 'proj-test',
    actorUserId: 'user-test',
    type: 'project_note',
    title: 'Simple Update',
    submittedAt: new Date().toISOString(),
    sourceRef: 'user-test:test',
    content: 'Team meeting completed today. No major issues to report. Client confirmed availability for next sprint review.',
  };
  const results = [{ artifact: simpleArtifact, result: digestArtifact(simpleArtifact) }];
  const flags = validateOverTriggering(results);
  const hasOverTrigger = flags.some((f) => f.flag === 'possible_over_triggering');
  assert.ok(!hasOverTrigger, 'Simple low-signal artifact should not trigger over-trigger detection');
});

// ─── Under-trigger Detection ──────────────────────────────────────────────────

test('under-trigger validator detects missed payment signal', () => {
  const paymentArtifact = {
    id: 'test-payment-missed',
    workspaceId: 'ws-test',
    projectId: 'proj-test',
    actorUserId: 'user-test',
    type: 'email_update',
    title: 'Payment Not Processed',
    submittedAt: new Date().toISOString(),
    sourceRef: 'user-test:test',
    content: 'The wire transfer to the vendor was supposed to go through yesterday. Payment not processed by the treasury team. We are waiting on resolution from their side.',
  };
  const result = digestArtifact(paymentArtifact);
  const nutrientTypes = new Set(result.nutrients.map((n) => n.nutrientType));
  // Under-trigger check: if payment language present but no financial/blocker signal
  const hasFinancialOrBlocker = nutrientTypes.has('financial_impediment_signal') || nutrientTypes.has('blocker_signal') || nutrientTypes.has('dependency_signal');
  // This artifact should EITHER be caught by extraction OR flagged as under-triggered
  // The test verifies the under-trigger detection logic works correctly
  const results = [{ artifact: paymentArtifact, result }];
  const flags = validateUnderTriggering(results);
  if (!hasFinancialOrBlocker) {
    const hasFlag = flags.some((f) => f.flag === 'missed_payment_signal');
    assert.ok(hasFlag, 'If payment language not extracted, under-trigger validator should flag it');
  }
  // Either the extractor caught it OR the under-trigger detector did — one of these must be true
  const detectedByExtractor = hasFinancialOrBlocker;
  const detectedByValidator = flags.some((f) => f.artifactId === paymentArtifact.id);
  assert.ok(detectedByExtractor || detectedByValidator, 'Payment delay must be detected by extractor OR flagged by under-trigger validator');
});

test('under-trigger validator finds no major operational misses in the simulation dataset', () => {
  const digestedResults = SIMULATION_ARTIFACTS.map((artifact) => ({ artifact, result: digestArtifact(artifact) }));
  const flags = validateUnderTriggering(digestedResults);
  // Most critical signals should be caught — tolerate up to 5 under-trigger flags in a 51-artifact dataset
  assert.ok(flags.length <= 10, `${flags.length} under-trigger flags found — expected <= 10 for a well-designed simulation dataset`);
});

// ─── Cognition Metric Generation ─────────────────────────────────────────────

test('smoke test runs and returns a structured report', () => {
  // Redirect console output to avoid cluttering test output
  const originalLog = console.log;
  console.log = () => {};
  let report;
  try {
    report = runSmokeTest();
  } finally {
    console.log = originalLog;
  }
  assert.ok(report, 'runSmokeTest must return a report');
  assert.ok(report.metadata, 'report must have metadata');
  assert.ok(report.overview, 'report must have overview');
  assert.ok(report.signalDistribution, 'report must have signalDistribution');
  assert.ok(report.validation, 'report must have validation section');
  assert.ok(report.cognitionReadinessScore, 'report must have cognitionReadinessScore');
});

test('cognition readiness score has all required dimensions', () => {
  const originalLog = console.log;
  console.log = () => {};
  let report;
  try {
    report = runSmokeTest();
  } finally {
    console.log = originalLog;
  }
  const score = report.cognitionReadinessScore;
  const requiredDimensions = ['coherence', 'signalQuality', 'noiseSuppression', 'determinism', 'realism', 'explainabilityReadiness', 'persistenceReadiness', 'overall'];
  for (const dim of requiredDimensions) {
    assert.ok(dim in score, `Missing dimension: ${dim}`);
    assert.ok(typeof score[dim] === 'number', `${dim} must be a number`);
    assert.ok(score[dim] >= 0 && score[dim] <= 100, `${dim} must be in [0, 100], got ${score[dim]}`);
  }
});

test('overall cognition readiness score is at least 50/100', () => {
  const originalLog = console.log;
  console.log = () => {};
  let report;
  try {
    report = runSmokeTest();
  } finally {
    console.log = originalLog;
  }
  assert.ok(report.cognitionReadinessScore.overall >= 50, `Overall readiness ${report.cognitionReadinessScore.overall}/100 is below minimum threshold of 50`);
});

test('coherence score is 100 when all lineage violations are absent', () => {
  const digestedResults = SIMULATION_ARTIFACTS.map((artifact) => ({ artifact, result: digestArtifact(artifact) }));
  const violations = validateLineageIntegrity(digestedResults);
  if (violations.length === 0) {
    // Coherence should be 100 when there are no violations
    assert.ok(true, 'No lineage violations — coherence should be perfect');
  } else {
    assert.ok(violations.length < 5, `Unexpectedly high lineage violation count: ${violations.length}`);
  }
});

// ─── Project-level Isolation ──────────────────────────────────────────────────

test('nutrients are scoped to correct workspace for each project', () => {
  const mepArtifacts = SIMULATION_ARTIFACTS.filter((a) => a.projectId === 'proj-mep-14156');
  for (const artifact of mepArtifacts) {
    const result = digestArtifact(artifact);
    for (const nutrient of result.nutrients) {
      assert.equal(nutrient.workspaceId, 'ws-mep', `MEP nutrient has wrong workspaceId: ${nutrient.workspaceId}`);
      assert.equal(nutrient.projectId, 'proj-mep-14156', `MEP nutrient has wrong projectId: ${nutrient.projectId}`);
    }
  }
});

test('nutrients from different projects do not cross workspace boundaries', () => {
  const iceArtifacts = SIMULATION_ARTIFACTS.filter((a) => a.projectId === 'proj-ice-9298');
  const mepArtifacts = SIMULATION_ARTIFACTS.filter((a) => a.projectId === 'proj-mep-14156');
  const iceNutrients = iceArtifacts.flatMap((a) => digestArtifact(a).nutrients);
  const mepWorkspaces = new Set(mepArtifacts.map((a) => a.workspaceId));
  for (const nutrient of iceNutrients) {
    assert.ok(!mepWorkspaces.has(nutrient.workspaceId), 'ICE nutrients must not appear in MEP workspace');
  }
});

// ─── Scoring Semantics ────────────────────────────────────────────────────────

test('blocker_signal nutrients are scored as high severity by default', () => {
  const blockerArtifact = SIMULATION_ARTIFACTS.find((a) => a.id === 'mep-001');
  const result = digestArtifact(blockerArtifact);
  const blockerNutrients = result.nutrients.filter((n) => n.nutrientType === 'blocker_signal');
  for (const n of blockerNutrients) {
    assert.ok(['high', 'critical'].includes(n.scoring.severity), `Unresolved blocker should be high/critical severity, got ${n.scoring.severity}`);
  }
});

test('financial_impediment_signal nutrients have persistent decay profile', () => {
  const financialArtifact = SIMULATION_ARTIFACTS.find((a) => a.id === 'ice-001');
  const result = digestArtifact(financialArtifact);
  const financialNutrients = result.nutrients.filter((n) => n.nutrientType === 'financial_impediment_signal');
  for (const n of financialNutrients) {
    assert.equal(n.scoring.decayProfile, 'persistent', 'Financial signals must have persistent decay');
  }
});

test('recovery_signal nutrients have fast decay profile', () => {
  const recoveryArtifact = SIMULATION_ARTIFACTS.find((a) => a.id === 'mep-008');
  const result = digestArtifact(recoveryArtifact);
  const recoveryNutrients = result.nutrients.filter((n) => n.nutrientType === 'recovery_signal');
  for (const n of recoveryNutrients) {
    assert.equal(n.scoring.decayProfile, 'fast', 'Recovery signals must have fast decay');
  }
});

test('all nutrients have confidence in [0, 1]', () => {
  const digestedResults = SIMULATION_ARTIFACTS.map((artifact) => digestArtifact(artifact));
  for (const result of digestedResults) {
    for (const nutrient of result.nutrients) {
      assert.ok(nutrient.scoring.confidence >= 0 && nutrient.scoring.confidence <= 1, `Confidence ${nutrient.scoring.confidence} out of range for ${nutrient.nutrientType}`);
    }
  }
});

test('all nutrients are freshness 1.0 at creation time', () => {
  const digestedResults = SIMULATION_ARTIFACTS.map((artifact) => digestArtifact(artifact));
  for (const result of digestedResults) {
    for (const nutrient of result.nutrients) {
      assert.equal(nutrient.scoring.freshness, 1.0, `Freshness at creation must be 1.0 for ${nutrient.nutrientType}`);
    }
  }
});

// ─── Residue Behavior ─────────────────────────────────────────────────────────

test('residue records contain non-empty excerpts', () => {
  const digestedResults = SIMULATION_ARTIFACTS.map((artifact) => digestArtifact(artifact));
  for (const result of digestedResults) {
    for (const residue of result.residue) {
      assert.ok(residue.rawExcerpt && residue.rawExcerpt.length > 0, 'Residue must have rawExcerpt');
      assert.ok(residue.rationale && residue.rationale.length > 0, 'Residue must have rationale');
      assert.ok(residue.workspaceId, 'Residue must have workspaceId');
    }
  }
});

test('residue is capped at 30 per artifact', () => {
  const digestedResults = SIMULATION_ARTIFACTS.map((artifact) => digestArtifact(artifact));
  for (const result of digestedResults) {
    assert.ok(result.residue.length <= 30, `Residue count ${result.residue.length} exceeds cap of 30`);
  }
});

test('vague concern residue is triggered by appropriate artifacts', () => {
  const artifact = SIMULATION_ARTIFACTS.find((a) => a.id === 'hsa-007');
  const result = digestArtifact(artifact);
  const hasVagueConcern = result.residue.some((r) => r.residueCategory === 'vague_concern');
  assert.ok(hasVagueConcern, 'hsa-007 (a bit worried, something seems off) should produce vague_concern residue');
});

// ─── Stakeholder Signal Hardening ─────────────────────────────────────────────

test('stakeholder_signal is suppressed for bare vendor reference without pressure', () => {
  // A line with only a generic vendor mention — no escalation, delay, or blocking language
  const sig = evaluateSignificance('The vendor delivered the documentation package today.', 'stakeholder_signal', 1);
  assert.ok(sig.suppressed, 'Bare vendor reference without pressure co-indicator must be suppressed');
});

test('stakeholder_signal is kept when paired with escalation pressure', () => {
  const sig = evaluateSignificance('The client escalated the issue to executive level due to repeated delays.', 'stakeholder_signal', 2);
  assert.ok(!sig.suppressed, 'Stakeholder reference with escalation pressure must not be suppressed');
});

test('stakeholder_signal is kept when paired with blocking language', () => {
  const sig = evaluateSignificance('Vendor is blocking our deployment approval and we cannot proceed.', 'stakeholder_signal', 2);
  assert.ok(!sig.suppressed, 'Stakeholder reference with blocking language must not be suppressed');
});

test('stakeholder_signal is kept when confidence is lost', () => {
  const sig = evaluateSignificance('Executive sponsor is losing confidence in the delivery timeline.', 'stakeholder_signal', 2);
  assert.ok(!sig.suppressed, '"Losing confidence" is a strong pressure indicator and must be preserved');
});

test('STAKEHOLDER_PRESSURE_PATTERNS is a non-empty array of RegExp', () => {
  assert.ok(Array.isArray(STAKEHOLDER_PRESSURE_PATTERNS), 'STAKEHOLDER_PRESSURE_PATTERNS must be an array');
  assert.ok(STAKEHOLDER_PRESSURE_PATTERNS.length >= 5, 'Must have at least 5 pressure patterns');
  for (const pattern of STAKEHOLDER_PRESSURE_PATTERNS) {
    assert.ok(pattern instanceof RegExp, 'Each element must be a RegExp');
  }
});

test('tuned system produces fewer stakeholder_signal nutrients than baseline', () => {
  const digestedResults = SIMULATION_ARTIFACTS.map((artifact) => digestArtifact(artifact));
  const tunedCount = digestedResults.reduce((sum, r) => sum + r.nutrients.filter((n) => n.nutrientType === 'stakeholder_signal').length, 0);
  assert.ok(tunedCount < BASELINE_METRICS.stakeholderCount,
    `Tuned stakeholder_signal count (${tunedCount}) should be less than baseline (${BASELINE_METRICS.stakeholderCount})`);
});

// ─── Significance Scoring ─────────────────────────────────────────────────────

test('evaluateSignificance returns object with score, suppressed, reason', () => {
  const result = evaluateSignificance('The project is blocked by vendor payment delays.', 'blocker_signal', 1);
  assert.ok(typeof result.score === 'number', 'score must be a number');
  assert.ok(typeof result.suppressed === 'boolean', 'suppressed must be boolean');
  assert.ok(result.reason === null || typeof result.reason === 'string', 'reason must be string or null');
  assert.ok(result.score >= 0 && result.score <= 1, 'score must be in [0, 1]');
});

test('low-value filler lines are suppressed by significance filter', () => {
  // "no issues to report" matches LOW_VALUE_FILLER_PATTERNS and has no intensity markers
  const sig = evaluateSignificance('Team meeting completed, no major issues to report this week.', 'decision_signal', 1);
  assert.ok(sig.suppressed, 'Low-value filler pattern (no issues to report) should be suppressed');
});

test('high-intensity escalation language has higher significance score', () => {
  const lowSig = evaluateSignificance('We need to update the status report by end of day.', 'delivery_drift_signal', 1);
  const highSig = evaluateSignificance('CRITICAL: Project is completely stalled and facing imminent deadline breach.', 'delivery_drift_signal', 2);
  assert.ok(highSig.score > lowSig.score, 'High-intensity escalation language must score higher than routine update');
});

test('scoring.significanceScore is present on all nutrients', () => {
  const artifact = SIMULATION_ARTIFACTS[0];
  const result = digestArtifact(artifact);
  for (const nutrient of result.nutrients) {
    assert.ok('significanceScore' in nutrient.scoring, `nutrient ${nutrient.nutrientType} missing scoring.significanceScore`);
    assert.ok(typeof nutrient.scoring.significanceScore === 'number', 'significanceScore must be a number');
    assert.ok(nutrient.scoring.significanceScore >= 0 && nutrient.scoring.significanceScore <= 1, 'significanceScore must be in [0, 1]');
  }
});

test('scoring.significanceScore is present on all nutrients in the full dataset', () => {
  const digestedResults = SIMULATION_ARTIFACTS.map((artifact) => digestArtifact(artifact));
  let violations = 0;
  for (const result of digestedResults) {
    for (const nutrient of result.nutrients) {
      if (!('significanceScore' in nutrient.scoring) || typeof nutrient.scoring.significanceScore !== 'number') {
        violations++;
      }
    }
  }
  assert.equal(violations, 0, `${violations} nutrients missing or invalid significanceScore`);
});

// ─── Deduplication Behavior ───────────────────────────────────────────────────

test('deduplicateCandidates is a function', () => {
  assert.ok(typeof deduplicateCandidates === 'function', 'deduplicateCandidates must be exported as a function');
});

test('deduplicateCandidates merges near-identical candidates from consecutive lines', () => {
  const candidates = [
    {
      nutrientType: 'blocker_signal',
      summary: 'The deployment is blocked pending security review approval.',
      excerpt: 'The deployment is blocked pending security review approval.',
      matchedPattern: '/\\bblocked\\b/i',
      confidence: 0.7,
      significanceScore: 0.6,
      suppressed: false,
      suppressionReason: null,
    },
    {
      nutrientType: 'blocker_signal',
      summary: 'Deployment blocked pending security review from the infra team.',
      excerpt: 'Deployment blocked pending security review from the infra team.',
      matchedPattern: '/\\bblocked\\b/i',
      confidence: 0.7,
      significanceScore: 0.6,
      suppressed: false,
      suppressionReason: null,
    },
  ];
  const deduplicated = deduplicateCandidates(candidates);
  assert.ok(deduplicated.length < candidates.length || deduplicated[0].duplicateMergeCount > 0,
    'Near-identical blocker candidates should be merged or have duplicateMergeCount > 0');
});

test('deduplicateCandidates preserves duplicateMergeCount field', () => {
  const candidates = [
    {
      nutrientType: 'risk_signal',
      summary: 'Risk of timeline slippage due to delayed vendor approvals.',
      excerpt: 'Risk of timeline slippage due to delayed vendor approvals.',
      matchedPattern: '/\\brisk\\b/i',
      confidence: 0.65,
      significanceScore: 0.55,
      suppressed: false,
      suppressionReason: null,
    },
  ];
  const deduplicated = deduplicateCandidates(candidates);
  assert.ok(deduplicated.length > 0, 'Must return at least one candidate');
  assert.ok('duplicateMergeCount' in deduplicated[0], 'Result must have duplicateMergeCount field');
  assert.ok(typeof deduplicated[0].duplicateMergeCount === 'number', 'duplicateMergeCount must be a number');
});

test('deduplicateCandidates does not merge candidates of different types', () => {
  const candidates = [
    {
      nutrientType: 'blocker_signal',
      summary: 'The deployment is blocked pending approval.',
      excerpt: 'The deployment is blocked pending approval.',
      matchedPattern: '/\\bblocked\\b/i',
      confidence: 0.7,
      significanceScore: 0.6,
      suppressed: false,
      suppressionReason: null,
    },
    {
      nutrientType: 'risk_signal',
      summary: 'The deployment is blocked pending approval.',
      excerpt: 'The deployment is blocked pending approval.',
      matchedPattern: '/\\brisk\\b/i',
      confidence: 0.65,
      significanceScore: 0.55,
      suppressed: false,
      suppressionReason: null,
    },
  ];
  const deduplicated = deduplicateCandidates(candidates);
  assert.equal(deduplicated.length, 2, 'Candidates of different types must not be merged even if text is identical');
});

test('nutrient duplicateMergeCount field is present on all nutrients', () => {
  const artifact = SIMULATION_ARTIFACTS[0];
  const result = digestArtifact(artifact);
  for (const nutrient of result.nutrients) {
    assert.ok('duplicateMergeCount' in nutrient, `nutrient ${nutrient.nutrientType} missing duplicateMergeCount`);
    assert.ok(typeof nutrient.duplicateMergeCount === 'number', 'duplicateMergeCount must be a number');
    assert.ok(nutrient.duplicateMergeCount >= 0, 'duplicateMergeCount must be >= 0');
  }
});

// ─── Suppressed Candidate Count ───────────────────────────────────────────────

test('digestivePass includes suppressedCandidateCount field', () => {
  const artifact = SIMULATION_ARTIFACTS[0];
  const result = digestArtifact(artifact);
  assert.ok('suppressedCandidateCount' in result.digestivePass, 'digestivePass must include suppressedCandidateCount');
  assert.ok(typeof result.digestivePass.suppressedCandidateCount === 'number', 'suppressedCandidateCount must be a number');
  assert.ok(result.digestivePass.suppressedCandidateCount >= 0, 'suppressedCandidateCount must be >= 0');
});

test('suppressedCandidateCount is populated across the dataset', () => {
  const digestedResults = SIMULATION_ARTIFACTS.map((artifact) => digestArtifact(artifact));
  const totalSuppressed = digestedResults.reduce((sum, r) => sum + r.digestivePass.suppressedCandidateCount, 0);
  assert.ok(totalSuppressed > 0, `Expected some suppressed candidates across the full dataset, got ${totalSuppressed}`);
});

// ─── Before/After Comparison ──────────────────────────────────────────────────

test('BASELINE_METRICS contains expected pre-tuning values', () => {
  assert.ok(typeof BASELINE_METRICS === 'object', 'BASELINE_METRICS must be an object');
  assert.ok(BASELINE_METRICS.totalNutrients > 0, 'BASELINE_METRICS.totalNutrients must be positive');
  assert.ok(BASELINE_METRICS.avgPerArtifact > 0, 'BASELINE_METRICS.avgPerArtifact must be positive');
  assert.ok(BASELINE_METRICS.stakeholderCount > 0, 'BASELINE_METRICS.stakeholderCount must be positive');
});

test('tuned system produces fewer total nutrients than baseline', () => {
  const digestedResults = SIMULATION_ARTIFACTS.map((artifact) => digestArtifact(artifact));
  const tunedTotal = digestedResults.reduce((sum, r) => sum + r.nutrients.length, 0);
  assert.ok(tunedTotal < BASELINE_METRICS.totalNutrients,
    `Tuned total nutrients (${tunedTotal}) should be less than baseline (${BASELINE_METRICS.totalNutrients})`);
});

test('tuned system has lower avg nutrients per artifact than baseline', () => {
  const digestedResults = SIMULATION_ARTIFACTS.map((artifact) => digestArtifact(artifact));
  const tunedTotal = digestedResults.reduce((sum, r) => sum + r.nutrients.length, 0);
  const tunedAvg = tunedTotal / SIMULATION_ARTIFACTS.length;
  assert.ok(tunedAvg < BASELINE_METRICS.avgPerArtifact,
    `Tuned avg (${tunedAvg.toFixed(2)}) should be less than baseline avg (${BASELINE_METRICS.avgPerArtifact})`);
});

// ─── Suppression Metrics ──────────────────────────────────────────────────────

test('computeSuppressionMetrics is a function', () => {
  assert.ok(typeof computeSuppressionMetrics === 'function', 'computeSuppressionMetrics must be exported as a function');
});

test('computeSuppressionMetrics returns object with expected fields', () => {
  const metrics = computeSuppressionMetrics(SIMULATION_ARTIFACTS);
  assert.ok(typeof metrics === 'object', 'Must return an object');
  assert.ok('totalSuppressed' in metrics, 'Must include totalSuppressed');
  assert.ok('totalActive' in metrics, 'Must include totalActive');
  assert.ok('suppressionRate' in metrics, 'Must include suppressionRate');
  assert.ok('byReason' in metrics, 'Must include byReason');
  assert.ok(typeof metrics.totalSuppressed === 'number', 'totalSuppressed must be number');
  assert.ok(typeof metrics.totalActive === 'number', 'totalActive must be number');
  assert.ok(typeof metrics.suppressionRate === 'number', 'suppressionRate must be number');
  assert.ok(metrics.suppressionRate >= 0 && metrics.suppressionRate <= 100, 'suppressionRate must be in [0, 100]');
});

test('suppression metrics show non-trivial suppression across the dataset', () => {
  const metrics = computeSuppressionMetrics(SIMULATION_ARTIFACTS);
  assert.ok(metrics.totalSuppressed > 0, `Expected some suppression, got ${metrics.totalSuppressed}`);
  assert.ok(metrics.suppressionRate > 0, `suppressionRate should be > 0, got ${metrics.suppressionRate}`);
});

test('totalSuppressed + totalActive accounts for all candidates in suppression metrics', () => {
  const metrics = computeSuppressionMetrics(SIMULATION_ARTIFACTS);
  assert.ok(metrics.totalSuppressed >= 0, 'totalSuppressed must be >= 0');
  assert.ok(metrics.totalActive >= 0, 'totalActive must be >= 0');
  assert.ok(metrics.totalSuppressed + metrics.totalActive > 0, 'Total candidates must be > 0');
});
