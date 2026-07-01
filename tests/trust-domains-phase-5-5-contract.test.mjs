import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const claims = fs.readFileSync('src/lib/security/capability-claims.ts', 'utf8');
const trustDomains = fs.readFileSync('src/lib/security/trust-domains.ts', 'utf8');
const telemetry = fs.readFileSync('src/lib/security/telemetry.ts', 'utf8');
const verifyRoute = fs.readFileSync('src/app/api/governance/capabilities/verify/route.ts', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260513010000_trust_domains_federated_verification.sql', 'utf8');

test('claim version + trust domain fields exist', () => {
  assert.match(claims, /CAPABILITY_CLAIM_VERSION_V11/);
  assert.match(claims, /issuerId/);
  assert.match(claims, /trustDomain/);
  assert.match(claims, /issuedAt/);
});

test('federated verification checks are represented', () => {
  for (const token of ['verifyIssuerTrust','resolveVerificationKey','unsupported_algorithm','unknown_key','revoked_key','expired_key','expectedTrustDomain','enforceVerifierPolicy']) {
    assert.match(claims + verifyRoute, new RegExp(token));
  }
});

test('trust registry functions exist', () => {
  for (const fn of ['registerTrustDomain','getTrustDomain','getActiveSigningKey','rotateSigningKey','revokeSigningKey','suspendTrustDomain','revokeTrustDomain','verifyIssuerTrust','resolveVerificationKey','createVerifierPolicy','evaluateVerifierPolicy','listVerifierPolicies']) {
    assert.match(trustDomains, new RegExp(`function ${fn}`));
  }
});

test('telemetry federated events are registered', () => {
  for (const ev of ['trust_domain_registered','trust_domain_suspended','trust_domain_revoked','signing_key_rotated','signing_key_revoked','verifier_policy_created','verifier_policy_denied','federated_claim_verified','federated_claim_rejected','federated_claim_untrusted_issuer','federated_claim_revoked_key','federated_claim_expired_key']) {
    assert.match(telemetry, new RegExp(ev));
  }
});

test('migration contains trust tables and avoids raw secrets', () => {
  assert.match(migration, /capability_trust_domains/);
  assert.match(migration, /capability_signing_keys/);
  assert.match(migration, /capability_verifier_policies/);
  assert.doesNotMatch(migration.toLowerCase(), /private_key|raw_secret|secret_value/);
});
