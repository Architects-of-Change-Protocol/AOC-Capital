import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const files = {
  types: fs.readFileSync('src/lib/governance/quality/quality-governance-types.ts', 'utf8'),
  baseline: fs.readFileSync('src/lib/governance/quality/quality-baseline-evaluator.ts', 'utf8'),
  defect: fs.readFileSync('src/lib/governance/quality/defect-pressure-analyzer.ts', 'utf8'),
  acceptance: fs.readFileSync('src/lib/governance/quality/acceptance-readiness-engine.ts', 'utf8'),
  debt: fs.readFileSync('src/lib/governance/quality/technical-debt-evaluator.ts', 'utf8'),
  interventions: fs.readFileSync('src/lib/governance/quality/quality-intervention-prioritizer.ts', 'utf8'),
  agent: fs.readFileSync('src/lib/governance/quality/quality-governance-agent.ts', 'utf8'),
};

test('healthy project scenario coverage', () => {
  assert.match(files.types, /"healthy"\s*\|\s*"watch"\s*\|\s*"elevated"\s*\|\s*"critical"/);
  assert.match(files.acceptance, /readinessScore/);
});

test('validation erosion scenario coverage', () => {
  assert.match(files.baseline, /validationErosion/);
  assert.match(files.baseline, /validationErosionDetected/);
});

test('critical defect escalation scenario coverage', () => {
  assert.match(files.defect, /runawayDefectGenerationDetected/);
  assert.match(files.defect, /lateStageDefectClusteringDetected/);
});

test('blocked acceptance scenario coverage', () => {
  assert.match(files.acceptance, /blockedAcceptanceDetected/);
  assert.match(files.acceptance, /evidenceInsufficiencyDetected/);
});

test('debt accumulation criticality scenario coverage', () => {
  assert.match(files.debt, /debtAccumulationRatio/);
  assert.match(files.debt, /maintainabilityErosionDetected/);
});

test('deterministic replay exact match in validator', () => {
  const output = execFileSync('npm', ['run', 'check:quality-governance-agent'], { encoding: 'utf8' });
  assert.match(output, /\[ok\] quality governance runtime valid/);
  assert.match(files.agent, /createQualityGovernanceAssessment/);
  assert.match(files.interventions, /sort\(\(a, b\) => b\.urgencyScore - a\.urgencyScore/);
});
