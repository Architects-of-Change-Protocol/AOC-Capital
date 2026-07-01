import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const metadataRoute = fs.readFileSync('src/app/api/governance/trust/.well-known/capability-issuer/route.ts', 'utf8');
const keysRoute = fs.readFileSync('src/app/api/governance/trust/keys/route.ts', 'utf8');
const handshakes = fs.readFileSync('src/lib/security/trust-handshakes.ts', 'utf8');
const verifyRoute = fs.readFileSync('src/app/api/governance/capabilities/verify/route.ts', 'utf8');
const telemetry = fs.readFileSync('src/lib/security/telemetry.ts', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260513030000_external_verifier_handshakes.sql', 'utf8');

test('metadata endpoint uses safe public fields', () => {
  for (const s of ['issuerApp','supportedClaimVersions','supportedAlgorithms','trustDomains','handshakeEndpoint']) assert.match(metadataRoute, new RegExp(s));
  assert.doesNotMatch(metadataRoute, /secret_ref|PMFREAK_CAPABILITY_CLAIM_SECRET|service_role/i);
});

test('keys endpoint does not expose symmetric key material', () => {
  assert.match(keysRoute, /HMAC symmetric key material is never exposed/);
  assert.doesNotMatch(keysRoute, /secret_ref|signature|handshakeToken/i);
});

test('handshake request stores token hash only', () => {
  assert.match(handshakes, /handshake_token_hash/);
  assert.match(handshakes, /hashToken\(token\)/);
  assert.doesNotMatch(handshakes, /\.insert\([^)]*handshakeToken/s);
});

test('verification route integrates handshake validation without execution', () => {
  assert.match(verifyRoute, /consumeOrAssertHandshake/);
  assert.match(verifyRoute, /external_verifier_verified_claim/);
  assert.doesNotMatch(verifyRoute, /consumeCapability|execute/i);
});

test('telemetry events are registered', () => {
  for (const ev of ['trust_metadata_requested','trust_keys_requested','trust_handshake_requested','trust_handshake_approved','trust_handshake_rejected','trust_handshake_revoked','trust_handshake_validated','trust_handshake_invalid','external_verifier_verified_claim','external_verifier_rejected_claim']) assert.match(telemetry, new RegExp(ev));
});

test('migration contains handshake schema and server-only mutation posture', () => {
  assert.match(migration, /capability_verifier_handshakes/);
  assert.match(migration, /status in \('requested','approved','rejected','revoked'\)/);
  assert.match(migration, /server-only writes via service role/);
  assert.match(migration, /handshake_token_hash text not null unique/);
});
