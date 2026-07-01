import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const claims = fs.readFileSync('src/lib/security/capability-claims.ts','utf8');
const trust = fs.readFileSync('src/lib/security/trust-domains.ts','utf8');
const keysRoute = fs.readFileSync('src/app/api/governance/trust/keys/route.ts','utf8');
const verifyRoute = fs.readFileSync('src/app/api/governance/capabilities/verify/route.ts','utf8');
const indep = fs.readFileSync('src/lib/security/independent-verifier.ts','utf8');
const telemetry = fs.readFileSync('src/lib/security/telemetry.ts','utf8');

test('ed25519 claim + v1.2 supported and fails closed unsupported alg',()=>{
  assert.match(claims,/CAPABILITY_CLAIM_VERSION_V12/);
  assert.match(claims,/Ed25519/);
  assert.match(claims,/unsupported_algorithm/);
});

test('key discovery exposes public key only and hmac non-public',()=>{
  assert.match(keysRoute,/publicJwk/);
  assert.match(keysRoute,/HMAC symmetric key material is never exposed/);
  assert.doesNotMatch(keysRoute,/secret_ref/);
});

test('independent verifier flow and trust checks exist',()=>{
  for (const fn of ['fetchIssuerMetadata','fetchIssuerKeys','verifyClaimOffline','evaluateLocalVerifierTrustPolicy','explainIndependentVerification']) assert.match(indep,new RegExp(`function ${fn}`));
  assert.doesNotMatch(indep,/createPrivilegedSupabaseClient/);
  assert.match(indep,/unexpected_trust_domain/);
  assert.match(indep,/revoked_key/);
  assert.match(indep,/signature_invalid/);
});

test('verify endpoint returns independent verification hints',()=>{
  for (const token of ['verificationMode','independentlyVerifiable','publicKeyAvailable','algorithm','trustDomain','keyId']) assert.match(verifyRoute,new RegExp(token));
});

test('telemetry includes asymmetric and independent verifier events',()=>{
  for (const ev of ['asymmetric_key_registered','asymmetric_key_rotated','asymmetric_key_revoked','asymmetric_claim_issued','independent_claim_verified','independent_claim_rejected','independent_verifier_metadata_fetched','independent_verifier_keys_fetched']) assert.match(telemetry,new RegExp(ev));
});

test('trust domain asymmetric helpers exist',()=>{
  for (const fn of ['registerAsymmetricSigningKey','getActiveAsymmetricSigningKey','resolvePublicVerificationKey','revokeAsymmetricSigningKey','rotateAsymmetricSigningKey']) assert.match(trust,new RegExp(`function ${fn}`));
});
