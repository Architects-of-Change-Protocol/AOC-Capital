import test from 'node:test';
import assert from 'node:assert/strict';

const { digestArtifact, detectInterventionsFromDigestedResults, SIMULATION_ARTIFACTS } = await import('../scripts/smoke-test-vault-digestion.mjs');

function interventionsFor(id) {
  const artifact = SIMULATION_ARTIFACTS.find((a) => a.id === id);
  const result = digestArtifact(artifact);
  return detectInterventionsFromDigestedResults([{ artifact, result }], []);
}

test('detects financial_escalation intervention from ICE payment artifacts', () => {
  const interventions = interventionsFor('ice-001');
  assert.ok(interventions.some((x) => x.interventionType === 'financial_escalation'));
});

test('detects escalation intervention from escalation artifact', () => {
  const interventions = interventionsFor('mep-001');
  assert.ok(interventions.some((x) => x.interventionType === 'escalation'));
});

test('detects recovery_action from completion artifact', () => {
  const interventions = interventionsFor('mep-008');
  assert.ok(interventions.some((x) => x.interventionType === 'recovery_action'));
});
