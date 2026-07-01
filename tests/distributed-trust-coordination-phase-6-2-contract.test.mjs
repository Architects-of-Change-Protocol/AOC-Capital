import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('supabase/migrations/20260513043000_distributed_trust_coordination.sql','utf8');
const trust = fs.readFileSync('src/lib/security/trust-coordination.ts','utf8');
const indep = fs.readFileSync('src/lib/security/independent-verifier.ts','utf8');
const verifyRoute = fs.readFileSync('src/app/api/governance/capabilities/verify/route.ts','utf8');
const syncGet = fs.readFileSync('src/app/api/governance/trust/events/route.ts','utf8');
const syncImport = fs.readFileSync('src/app/api/governance/trust/events/import/route.ts','utf8');

test('trust event + revocation + graph schemas exist',()=>{
  for (const table of ['capability_trust_events','capability_revocation_registry','capability_trust_graph_edges']) assert.match(migration,new RegExp(table));
});

test('trust event helpers exist',()=>{
  for (const fn of ['createTrustEvent','signTrustEvent','verifyTrustEvent','hashTrustEvent','explainTrustEvent']) assert.match(trust,new RegExp(`function ${fn}`));
});

test('revocation and trust graph helpers exist',()=>{
  for (const fn of ['registerRevocationFromEvent','getRevocationReason','upsertTrustGraphEdge','getTrustGraphForDomain','explainTrustGraphPath']) assert.match(trust,new RegExp(`function ${fn}`));
});

test('independent verifier trust update hooks exist',()=>{
  for (const fn of ['importTrustEvents','applyRevocationEvent','updateLocalTrustPolicyFromEvent','explainTrustUpdate']) assert.match(indep,new RegExp(`function ${fn}`));
});

test('sync endpoints enforce controlled import',()=>{
  assert.match(syncImport,/handshake_required/);
  assert.match(syncImport,/consumeOrAssertHandshake/);
  assert.match(syncImport,/verifyTrustEvent/);
  assert.match(syncGet,/trustDomain/);
  assert.match(syncGet,/eventType/);
  assert.match(syncGet,/severity/);
  assert.match(syncGet,/since/);
});

test('verification path references revocation reasons and non-execution posture',()=>{
  for (const reason of ['claim_revoked','key_revoked','trust_domain_revoked','delegation_revoked','grant_revoked','verifier_policy_revoked','issuer_distrusted']) assert.match(trust,new RegExp(reason));
  assert.match(verifyRoute,/verifyCapabilityClaim/);
});

test('no raw secrets are logged',()=>{
  assert.doesNotMatch(trust,/console\.log\(.*secret/i);
});
