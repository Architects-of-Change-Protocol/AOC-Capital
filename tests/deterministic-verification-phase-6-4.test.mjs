import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const dv = fs.readFileSync('src/lib/security/deterministic-verification.ts','utf8');
const telemetry = fs.readFileSync('src/lib/security/telemetry.ts','utf8');
const migration = fs.readFileSync('supabase/migrations/20260512120000_deterministic_verification_phase_6_4.sql','utf8');

const requiredTelemetry = [
  'verification_snapshot_created','verification_receipt_signed','verification_receipt_verified','deterministic_evaluation_completed','verifier_divergence_detected','forensic_replay_executed','canonicalization_failed','state_hash_generated','replay_diff_detected'
];

test('canonical serialization helpers exist',()=>{
  for (const fn of ['canonicalizeTrustEvent','canonicalizeTrustPolicy','canonicalizeTrustAnchor','canonicalizeTrustGraphEdge']) assert.match(dv,new RegExp(`const ${fn}|function ${fn}`));
});

test('state hashing helpers exist',()=>{
  for (const fn of ['hashTrustAnchorState','hashTrustPolicyState','hashRevocationState','hashTrustGraphState','hashReplayWindow','hashVerifierState']) assert.match(dv,new RegExp(`function ${fn}`));
});

test('verification receipt helpers exist',()=>{
  for (const fn of ['createVerificationReceipt','signVerificationReceipt','verifyVerificationReceipt','explainVerificationReceipt']) assert.match(dv,new RegExp(`function ${fn}`));
});

test('deterministic policy + replay + consistency helpers exist',()=>{
  for (const fn of ['evaluateDeterministicTrustDecision','replayVerificationScenario','compareVerifierOutcomes']) assert.match(dv,new RegExp(`function ${fn}`));
});

test('snapshot + immutable audit schema exists',()=>{
  for (const token of ['capability_verification_snapshots','capability_verification_receipts','capability_verification_audit_records','prevent_verification_evidence_mutation']) assert.match(migration,new RegExp(token));
});

test('telemetry deterministic events registered',()=>{
  for (const ev of requiredTelemetry) assert.match(telemetry,new RegExp(ev));
});
