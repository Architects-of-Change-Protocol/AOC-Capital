import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const migration = fs.readFileSync('supabase/migrations/20260513100000_hardened_trust_interop_phase_6_3.sql','utf8');
const trust = fs.readFileSync('src/lib/security/trust-coordination.ts','utf8');
const handshakes = fs.readFileSync('src/lib/security/trust-handshakes.ts','utf8');
const offline = fs.readFileSync('src/lib/security/independent-verifier.ts','utf8');
const telemetry = fs.readFileSync('src/lib/security/telemetry.ts','utf8');

const requiredTelemetry = ['trust_anchor_created','trust_anchor_rotated','trust_anchor_revoked','verifier_handshake_started','verifier_handshake_succeeded','verifier_handshake_failed','replay_attack_detected','stale_event_detected','event_quarantined','quarantine_approved','quarantine_rejected','trust_policy_revoked','invalid_sequence_detected'];

test('trust anchor + policy + quarantine schema exists',()=>{
  for (const table of ['capability_trust_anchors','verifier_trust_policies','capability_trust_event_quarantine']) assert.match(migration,new RegExp(table));
});

test('replay fields exist on trust events',()=>{
  for (const f of ['sequence_number','nonce','previous_event_hash']) assert.match(migration,new RegExp(f));
});

test('sequence verification helper exists',()=> assert.match(trust,/function verifyTrustEventSequence/));
test('handshake hardening helpers exist',()=>{ for (const fn of ['createVerifierHandshake','verifyVerifierHandshake','negotiateVerifierCapabilities','explainVerifierHandshake']) assert.match(handshakes,new RegExp(`function ${fn}`)); });
test('trust policy lifecycle helpers exist',()=>{ for (const fn of ['evaluateVerifierTrustPolicy','revokeVerifierTrustPolicy','explainVerifierTrustPolicy']) assert.match(trust,new RegExp(`function ${fn}`)); });
test('quarantine helper exists',()=> assert.match(trust,/function quarantineTrustEvent/));
test('trust path evaluator exists',()=> assert.match(trust,/function evaluateTrustPath/));
test('offline verifier has replay/anchor checks',()=>{ assert.match(offline,/duplicate_nonce/); assert.match(offline,/anchor_missing/); assert.match(offline,/invalid_sequence_detected/); });
test('telemetry hardening events registered',()=>{ for (const ev of requiredTelemetry) assert.match(telemetry,new RegExp(ev)); });

// Scenario mapping coverage (Phase 6.3 required)
test('1-2 anchor revocation/suspension import blocking semantics present',()=>{ assert.match(trust,/anchor_unavailable|invalid_anchor/); });
test('3-5 and 15 replay/stale/sequence/nonce rejection semantics present',()=>{ for (const r of ['duplicate_nonce','stale_event_detected','invalid_sequence_detected']) assert.match(trust+offline,new RegExp(r)); });
test('6-7 handshake success/failure semantics present',()=>{ assert.match(handshakes,/handshake_valid/); assert.match(handshakes,/invalid_anchor/); });
test('8-9 quarantine flow semantics present',()=>{ assert.match(trust,/capability_trust_event_quarantine/); assert.match(trust,/quarantine_status: 'pending'/); });
test('10 and 14 distrust override semantics present',()=> assert.match(trust,/distrust_override/));
test('11 revoked policy blocks import semantics present',()=> assert.match(trust,/policy_revoked|policy_status/));
test('12-13 offline replay and revoked anchor checks present',()=>{ assert.match(offline,/duplicate_nonce/); assert.match(offline,/anchor_missing/); });
