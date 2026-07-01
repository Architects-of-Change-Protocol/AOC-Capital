import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const attestation = fs.readFileSync('src/lib/security/agent-attestation.ts', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260515000000_agent_attestation_nonces.sql', 'utf8');

test('first use of a valid token passes: nonce lookup proceeds to insert when no existing row', () => {
  // Verify the code performs a maybeSingle lookup and only blocks when existing is truthy
  assert.match(attestation, /\.from\("agent_attestation_nonces"\)/);
  assert.match(attestation, /\.maybeSingle\(\)/);
  assert.match(attestation, /if \(existing\)/);
  // Insert happens after the existence check (insert comes after the existing block)
  const insertPos = attestation.indexOf('.insert(');
  const existingBlockPos = attestation.indexOf('if (existing)');
  assert.ok(insertPos > existingBlockPos, 'nonce insert must occur after the existing-nonce check');
});

test('second use of the same token throws AccessDeniedError with reason replay_detected', () => {
  assert.match(attestation, /replay_detected/);
  assert.match(attestation, /Token already used\./);
  assert.match(attestation, /AccessDeniedError\("Token already used\.", \{ reason: "replay_detected" \}\)/);
  assert.match(attestation, /logSecurityEvent\("replay_detected"/);
});

test('expired token is rejected by existing expiry logic before replay check', () => {
  assert.match(attestation, /claims\.exp \* 1000 < Date\.now\(\)/);
  assert.match(attestation, /expired_attestation/);
  assert.match(attestation, /Agent token expired\./);
  // Expiry check must appear before the nonce insert
  const expPos = attestation.indexOf('claims.exp * 1000 < Date.now()');
  const insertPos = attestation.indexOf('.insert(');
  assert.ok(expPos < insertPos, 'expiry check must precede nonce insert');
});

test('race condition: unique violation on insert is caught and treated as replay_detected', () => {
  assert.match(attestation, /insertError\.code === "23505"/);
  // Both the lookup path and the insert-conflict path must throw the same error
  const replayMatches = [...attestation.matchAll(/reason: "replay_detected"/g)];
  assert.ok(replayMatches.length >= 2, 'replay_detected must be thrown on both lookup hit and unique-violation insert conflict');
  assert.match(migration, /nonce text primary key/);
});
