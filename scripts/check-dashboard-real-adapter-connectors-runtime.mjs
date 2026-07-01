import assert from 'node:assert/strict'
import runtime from '../src/lib/dashboard/real-adapter-connectors/index.ts'
const {
  normalizeConnectorError, buildJiraIssuePayload, buildLinearIssuePayload, buildAsanaTaskPayload, buildWebhookPayload, buildAteneaPayload,
  createJiraDashboardConnector, createLinearDashboardConnector, createAsanaDashboardConnector, createWebhookDashboardConnector, createAteneaDashboardConnector,
  createRealDashboardConnectorRegistry, getRealConnectorClientHealth,
} = runtime

const payload = { adapter: 'jira', title: 'check', description: 'check', priority: 'medium', labels: [], metadata: { executionLane: 'financial_governance' } }
const lifecycle = { id: 'lc', envelopeId: 'env', actionId: 'act', adapter: 'jira', status: 'ready_for_execution', envelope: { payload }, approvalDecisions: [], retryCount: 0, createdAt: 'n', updatedAt: 'n' }

assert.equal(normalizeConnectorError(new Error('timeout')).retryable, true)
assert.equal(buildJiraIssuePayload({ payload, config: { projectKey: 'PRJ' } }).fields.project.key, 'PRJ')
assert.equal(buildLinearIssuePayload({ payload, config: { teamId: 'team' } }).teamId, 'team')
assert.equal(buildAsanaTaskPayload({ payload, config: { workspaceGid: 'ws' } }).workspace, 'ws')
assert.equal(buildWebhookPayload({ payload, lifecycle }).lifecycleId, 'lc')
assert.equal(buildAteneaPayload({ payload, lifecycle, config: {} }).recordType, 'impediment')
assert.equal((await createJiraDashboardConnector({ client: { createIssue: async () => ({ id: 'J1' }) }, config: { projectKey: 'P' } }).execute({ payload, lifecycle, mode: 'dry_run', now: 'n' })).status, 'simulated')
assert.equal((await createLinearDashboardConnector({ client: { createIssue: async () => ({ id: 'L1' }) }, config: { teamId: 'T' } }).execute({ payload, lifecycle, mode: 'execute', now: 'n' })).status, 'created')
assert.ok(createRealDashboardConnectorRegistry({ jira: { client: { createIssue: async () => ({ id: '1' }) }, config: { projectKey: 'P' } } }).jira)
assert.equal(getRealConnectorClientHealth({ jira: { client: {}, config: { projectKey: 'P' } } })[0].canCreateTask, false)
console.log('[ok] dashboard real adapter connectors runtime valid')
