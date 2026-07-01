import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const guards = fs.readFileSync('src/lib/security/access-guards.ts', 'utf8');
const operationalRoute = fs.readFileSync('src/app/api/operational-memory/route.ts', 'utf8');
const copilotRoute = fs.readFileSync('src/app/api/copilot/route.ts', 'utf8');
const copilotMemoryRoute = fs.readFileSync('src/app/api/copilot/memory/route.ts', 'utf8');
const inputHubRoute = fs.readFileSync('src/app/api/input-hub/route.ts', 'utf8');
const uploadRoute = fs.readFileSync('src/app/api/upload/route.ts', 'utf8');

test('central access guards enforce server-side project/workspace checks', () => {
  assert.match(guards, /requireProjectAccess/);
  assert.match(guards, /requireWorkspaceMembership/);
  assert.match(guards, /workspace_memberships/);
  assert.match(guards, /\.eq\("user_id", user\.id\)/);
});

test('operational memory route enforces scoped retrieval and rejects foreign projects', () => {
  assert.match(operationalRoute, /authorizeRuntimeAction/);
  assert.match(operationalRoute, /buildEnterpriseRuntimeRequest/);
  assert.match(operationalRoute, /project_scope_violation/);
  assert.match(operationalRoute, /unresolvedOnly/);
  assert.match(operationalRoute, /memoryType/);
});

test('copilot and upload flows validate project ownership before memory access or persistence', () => {
  for (const text of [copilotRoute, copilotMemoryRoute, uploadRoute, inputHubRoute]) {
    assert.match(text, /requireProjectAccess|requireProjectPermission|enforceRuntimeAuthorization/);
    assert.match(text, /Invalid project context|Agent scope denied/);
  }
});


test('analyze-ai route uses canonical project access guard instead of direct user ownership checks', () => {
  const analyzeRoute = fs.readFileSync('src/app/api/analyze-ai/route.ts', 'utf8');
  assert.match(analyzeRoute, /requireProjectPermission/);
  assert.doesNotMatch(analyzeRoute, /from\("projects"\)\.select\("id"\)\.eq\("id", projectId\)\.eq\("user_id", user\.id\)/);
});
