import test from 'node:test'
import assert from 'node:assert/strict'
import runtime from '../src/lib/dashboard/real-adapter-connectors/index.ts'
const {
  normalizeConnectorError,
  buildJiraIssuePayload,
  createJiraDashboardConnector,
  buildLinearIssuePayload,
  createLinearDashboardConnector,
  buildAsanaTaskPayload,
  createAsanaDashboardConnector,
  buildWebhookPayload,
  createWebhookDashboardConnector,
  buildAteneaPayload,
  createAteneaDashboardConnector,
  createRealDashboardConnectorRegistry,
  getRealConnectorClientHealth,
} = runtime

const payload = { adapter: 'jira', title: 'T', description: 'D', priority: 'high', labels: ['l1'], metadata: { projectCode: 'PC', executionLane: 'financial_governance', ownerLane: 'ops', evidence: ['e1'] } }
const lifecycle = { id: 'lc1', envelopeId: 'env1', actionId: 'act1', adapter: 'jira', status: 'ready_for_execution', envelope: { payload }, approvalDecisions: [], retryCount: 0, createdAt: 'n', updatedAt: 'n' }

test('1 error normalization retryable timeout', () => assert.equal(normalizeConnectorError(new Error('timeout')).retryable, true))
test('2 error normalization non-retryable 401', () => assert.equal(normalizeConnectorError({ status: 401, message: 'unauthorized' }).retryable, false))
test('3 jira payload maps title/project/priority', () => {
  const out = buildJiraIssuePayload({ payload, config: { projectKey: 'PM' } })
  assert.equal(out.fields.summary, 'T'); assert.equal(out.fields.project.key, 'PM'); assert.equal(out.fields.priority.name, 'High')
})
test('4 jira connector dry-run', async () => assert.match((await createJiraDashboardConnector({ client: { createIssue: async () => ({ id: '1' }) }, config: { projectKey: 'PM' } }).execute({ payload, lifecycle, mode: 'dry_run', now: 'n' })).externalTaskId, /simulated:jira/))
test('5 jira connector execute with fake client', async () => assert.equal((await createJiraDashboardConnector({ client: { createIssue: async () => ({ id: '1', key: 'J-1' }) }, config: { projectKey: 'PM' } }).execute({ payload, lifecycle, mode: 'execute', now: 'n' })).externalTaskId, 'J-1'))
test('6 linear payload maps priority', () => assert.equal(buildLinearIssuePayload({ payload, config: { teamId: 't1' } }).priority, 2))
test('7 linear connector execute with fake client', async () => assert.equal((await createLinearDashboardConnector({ client: { createIssue: async () => ({ id: 'L1', identifier: 'LIN-1' }) }, config: { teamId: 't' } }).execute({ payload, lifecycle, mode: 'execute', now: 'n' })).externalTaskId, 'LIN-1'))
test('8 asana payload maps project/workspace', () => { const p = buildAsanaTaskPayload({ payload, config: { projectGid: 'p', workspaceGid: 'w' } }); assert.deepEqual(p.projects, ['p']); assert.equal(p.workspace, 'w') })
test('9 asana connector execute with fake client', async () => assert.equal((await createAsanaDashboardConnector({ client: { createTask: async () => ({ gid: 'A1' }) }, config: {} }).execute({ payload, lifecycle, mode: 'execute', now: 'n' })).externalTaskId, 'A1'))
test('10 webhook payload contains lifecycle metadata', () => assert.equal(buildWebhookPayload({ payload, lifecycle }).lifecycleId, 'lc1'))
test('11 webhook connector execute with fake client', async () => assert.equal((await createWebhookDashboardConnector({ client: { post: async () => ({ id: 'W1', status: 202 }) }, config: { url: 'https://x' } }).execute({ payload, lifecycle, mode: 'execute', now: 'n' })).externalTaskId, 'W1'))
test('12 atenea payload infers impediment', () => assert.equal(buildAteneaPayload({ payload, lifecycle, config: {} }).recordType, 'impediment'))
test('13 atenea connector dry-run without client', async () => assert.equal((await createAteneaDashboardConnector({ config: {} }).execute({ payload, lifecycle, mode: 'dry_run', now: 'n' })).status, 'simulated'))
test('14 atenea connector fails safely without client in execute mode', async () => assert.equal((await createAteneaDashboardConnector({ config: {} }).execute({ payload, lifecycle, mode: 'execute', now: 'n' })).message, 'Atenea client is not configured.'))
test('15 atenea connector execute impediment with fake client', async () => assert.equal((await createAteneaDashboardConnector({ config: {}, client: { createImpediment: async () => ({ id: 'AT-1' }) } }).execute({ payload, lifecycle, mode: 'execute', now: 'n' })).externalTaskId, 'AT-1'))
test('16 registry includes configured connectors', () => assert.ok(createRealDashboardConnectorRegistry({ jira: { client: { createIssue: async () => ({ id: '1' }) }, config: { projectKey: 'PM' } } }).jira))
test('17 registry omits missing connectors', () => assert.equal(createRealDashboardConnectorRegistry({}).jira, undefined))
test('18 health detects missing Jira createIssue', () => assert.ok(getRealConnectorClientHealth({ jira: { client: {}, config: { projectKey: 'PM' } } })[0].errors.length > 0))
test('19 health detects valid Linear client', () => assert.equal(getRealConnectorClientHealth({ linear: { client: { createIssue: async () => ({ id: 'x' }) }, config: { teamId: 't' } } })[0].canCreateTask, true))
test('20 connector errors normalize failed response', async () => assert.equal((await createJiraDashboardConnector({ client: { createIssue: async () => { throw new Error('network timeout') } }, config: { projectKey: 'PM' } }).execute({ payload, lifecycle, mode: 'execute', now: 'n' })).message, 'Connector execution failed.'))
test('21 no secrets appear in normalized error metadata', () => assert.ok(!normalizeConnectorError(new Error('token=abcd')).metadata.rawMessage.includes('abcd')))
test('22 priority mapping deterministic across connectors', () => { assert.equal(buildJiraIssuePayload({ payload: { ...payload, priority: 'highest' }, config: { projectKey: 'PM' } }).fields.priority.name, 'Highest'); assert.equal(buildLinearIssuePayload({ payload: { ...payload, priority: 'highest' }, config: { teamId: 't' } }).priority, 1) })
test('23 metadata preserved', () => assert.equal(buildWebhookPayload({ payload, lifecycle }).metadata.projectCode, 'PC'))
test('24 connector result includes provider metadata', async () => assert.equal((await createLinearDashboardConnector({ client: { createIssue: async () => ({ id: 'x' }) }, config: { teamId: 't' } }).execute({ payload, lifecycle, mode: 'execute', now: 'n' })).metadata.provider, 'linear'))
test('25 all connectors conform to DashboardLiveConnector shape', () => {
  const cs = [
    createJiraDashboardConnector({ client: { createIssue: async () => ({ id: '1' }) }, config: { projectKey: 'PM' } }),
    createLinearDashboardConnector({ client: { createIssue: async () => ({ id: '1' }) }, config: { teamId: 'T' } }),
    createAsanaDashboardConnector({ client: { createTask: async () => ({ gid: '1' }) }, config: {} }),
    createWebhookDashboardConnector({ client: { post: async () => ({ status: 200 }) }, config: { url: 'https://x' } }),
    createAteneaDashboardConnector({ config: {} }),
  ]
  for (const c of cs) { assert.equal(typeof c.execute, 'function'); assert.equal(typeof c.adapter, 'string') }
})
