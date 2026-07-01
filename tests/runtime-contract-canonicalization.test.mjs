import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const authz = readFileSync('src/lib/aoc/enterprise/authorization.ts', 'utf8');
const consumer = readFileSync('src/lib/aoc/pmfreak-runtime-consumer.ts', 'utf8');
const guards = readFileSync('src/lib/security/access-guards.ts', 'utf8');
const serverAuth = readFileSync('src/lib/security/server-authorization.ts', 'utf8');

test('authorization exposes canonical contract fields', () => {
  assert.match(authz, /authoritySource/);
  assert.match(authz, /governanceAction/);
  assert.match(authz, /lineage/);
  assert.match(authz, /policy:/);
});

test('runtime consumer builds request via canonical contract adapter', () => {
  assert.match(consumer, /toGovernanceEvaluationInput/);
  assert.match(consumer, /RuntimeAuthorizationRequest/);
});

test('critical runtime consumers use centralized authorizeRuntimeAction', () => {
  assert.match(guards, /authorizeRuntimeAction/);
  assert.match(serverAuth, /authorizeRuntimeAction/);
});
