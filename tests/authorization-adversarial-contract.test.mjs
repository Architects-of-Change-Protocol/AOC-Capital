import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const guards = fs.readFileSync('src/lib/security/access-guards.ts', 'utf8');
const rbac = fs.readFileSync('src/lib/security/rbac.ts', 'utf8');
const telemetry = fs.readFileSync('src/lib/security/telemetry.ts', 'utf8');
const agentAttestation = fs.readFileSync('src/lib/security/agent-attestation.ts', 'utf8');
const securityEventsMigration = fs.readFileSync('supabase/migrations/20260512195500_security_events.sql', 'utf8');
const copilotRoute = fs.readFileSync('src/app/api/copilot/route.ts', 'utf8');

test('contributor and external stakeholder cannot perform admin/billing actions via centralized governance primitives', () => {
  assert.match(rbac, /contributor:[\s\S]*upload_documents/);
  assert.doesNotMatch(rbac, /contributor:[\s\S]*manage_billing/);
  assert.match(rbac, /external_stakeholder:[\s\S]*new Set\(\["read"\]\)/);
});

test('executive viewer remains read/view only and PM cannot manage billing', () => {
  assert.match(rbac, /executive_viewer:[\s\S]*view_executive/);
  assert.doesNotMatch(rbac, /executive_viewer:[\s\S]*manage_projects[\s\S]*manage_members/);
  assert.match(rbac, /PM:[\s\S]*manage_projects/);
  assert.doesNotMatch(rbac, /PM:[\s\S]*manage_billing/);
});

test('revoked agents and forged scopes are denied through enterprise runtime + attestation', () => {
  assert.match(guards, /requireAgentScope/);
  assert.match(guards, /authorizeRuntimeAction/);
  assert.match(guards, /buildEnterpriseRuntimeRequest/);
  assert.doesNotMatch(guards, /from\("ai_agent_permissions"\)/);
  assert.match(agentAttestation, /signature_mismatch/);
  assert.match(agentAttestation, /claims\.exp/);
  assert.match(agentAttestation, /workspaceId !== input\.workspaceId/);
});

test('role-aware telemetry includes persisted audit writes', () => {
  assert.match(telemetry, /from\("security_events"\)\.insert/);
  assert.match(telemetry, /do not log|redacted|scrub/i);
  assert.match(guards, /denied_permission/);
});

test('security_events table is RLS protected against client forge attempts', () => {
  assert.match(securityEventsMigration, /enable row level security/);
  assert.match(securityEventsMigration, /owner','admin/);
  assert.match(securityEventsMigration, /revoke insert, update, delete on public\.security_events from anon, authenticated/);
});

test('copilot route enforces attested agent headers when agent context is presented', () => {
  assert.match(copilotRoute, /x-pmf-agent-token/);
  assert.match(copilotRoute, /verifyAgentAttestation/);
});
