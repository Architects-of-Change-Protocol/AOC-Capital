import test from 'node:test'; import assert from 'node:assert/strict'
import { createInMemoryDashboardSnapshotStore } from '../src/lib/dashboard/source-hydration/snapshot-store.ts'
import { createStaticDashboardSourceProvider, createDefaultDashboardSourceProviders } from '../src/lib/dashboard/background-refresh/refresh-source-provider.ts'
import { planDashboardBackgroundRefresh } from '../src/lib/dashboard/background-refresh/refresh-execution-planner.ts'
import { executeDashboardRefreshActions } from '../src/lib/dashboard/background-refresh/refresh-executor.ts'
import { buildDashboardBackgroundRefreshReport } from '../src/lib/dashboard/background-refresh/refresh-result-engine.ts'
import { runDashboardBackgroundRefresh } from '../src/lib/dashboard/background-refresh/background-refresh-runtime.ts'

const NOW = '2026-01-01T00:00:00.000Z'
const req = { tenantId: 'tenant-1', workspaceId: 'ws-1', portfolioId: 'pf-1' }

function makeStore() { return createInMemoryDashboardSnapshotStore() }
function makeProvider(payload = { data: 'ok' }, ttl) {
  return createStaticDashboardSourceProvider({ sourceKind: 'executive_dashboard_report', payload, ttlMinutes: ttl })
}
function makeAction(sourceKind = 'executive_dashboard_report', reason = 'missing_source') {
  return { id: `act-${sourceKind}`, sourceKind, reason, priority: 'high', title: 'T', description: 'D' }
}
function makeExecution(status, sourceKind = 'executive_dashboard_report', error) {
  return { sourceKind, reason: 'missing_source', priority: 'high', status, error }
}

test('1 static provider returns configured payload', async () => {
  const p = makeProvider({ value: 42 })
  const r = await p.refresh({ request: req, reason: 'missing_source', now: NOW })
  assert.deepEqual(r.payload, { value: 42 })
})

test('2 static provider generates expiresAt when ttlMinutes provided', async () => {
  const p = makeProvider({ v: 1 }, 30)
  const r = await p.refresh({ request: req, reason: 'missing_source', now: NOW })
  const expected = new Date(Date.parse(NOW) + 30 * 60000).toISOString()
  assert.equal(r.expiresAt, expected)
})

test('3 default providers only include provided payloads', () => {
  const providers = createDefaultDashboardSourceProviders({ executiveDashboardReport: { x: 1 } })
  assert.equal(Object.keys(providers).length, 1)
  assert.ok(providers['executive_dashboard_report'])
  assert.equal(providers['intervention_report'], undefined)
})

test('4 planner returns skipped reason when no actions', async () => {
  const s = makeStore()
  const freshNow = new Date().toISOString()
  for (const kind of ['executive_dashboard_report', 'intervention_report', 'decision_simulation_reports', 'conflict_report']) {
    await s.saveSnapshot({ id: `s-${kind}`, tenantId: 'tenant-1', workspaceId: 'ws-1', portfolioId: 'pf-1', sourceKind: kind, payload: {}, generatedAt: freshNow, schemaVersion: '1', runtimeVersion: '1' })
  }
  const result = await planDashboardBackgroundRefresh({ hydrationRequest: req, store: s, trigger: 'scheduled' })
  assert.equal(typeof result.skippedReason, 'string')
  assert.equal(result.selectedActions.length, 0)
})

test('5 planner includes requested source kind even if cache usable', async () => {
  const s = makeStore()
  await s.saveSnapshot({ id: 's1', tenantId: 'tenant-1', sourceKind: 'executive_dashboard_report', payload: {}, generatedAt: NOW, schemaVersion: '1', runtimeVersion: '1' })
  const result = await planDashboardBackgroundRefresh({
    hydrationRequest: req, store: s, trigger: 'manual',
    requestedSourceKinds: ['intervention_report'],
  })
  assert.ok(result.selectedActions.some(a => a.sourceKind === 'intervention_report'))
})

test('6 planner respects maxActions', async () => {
  const s = makeStore()
  const result = await planDashboardBackgroundRefresh({ hydrationRequest: req, store: s, trigger: 'scheduled', maxActions: 1 })
  assert.ok(result.selectedActions.length <= 1)
})

test('7 executor dry-run skips persistence', async () => {
  const s = makeStore()
  const execs = await executeDashboardRefreshActions({
    request: { hydrationRequest: req, store: s, trigger: 'manual', mode: 'dry_run', providers: { 'executive_dashboard_report': makeProvider() } },
    actions: [makeAction()],
    now: NOW,
  })
  assert.equal(execs[0].status, 'skipped')
  assert.ok(execs[0].error?.includes('Dry run'))
  const saved = await s.getLatestSnapshot({ tenantId: 'tenant-1', sourceKind: 'executive_dashboard_report' })
  assert.equal(saved, null)
})

test('8 executor refreshes and persists snapshot', async () => {
  const s = makeStore()
  const execs = await executeDashboardRefreshActions({
    request: { hydrationRequest: req, store: s, trigger: 'manual', mode: 'execute', providers: { 'executive_dashboard_report': makeProvider({ saved: true }) } },
    actions: [makeAction()],
    now: NOW,
  })
  assert.equal(execs[0].status, 'refreshed')
  assert.ok(execs[0].snapshotId?.startsWith('dashboard-snapshot:'))
  const saved = await s.getLatestSnapshot({ tenantId: 'tenant-1', workspaceId: 'ws-1', portfolioId: 'pf-1', sourceKind: 'executive_dashboard_report' })
  assert.ok(saved)
  assert.deepEqual(saved.payload, { saved: true })
})

test('9 executor skips missing provider', async () => {
  const s = makeStore()
  const execs = await executeDashboardRefreshActions({
    request: { hydrationRequest: req, store: s, trigger: 'manual', mode: 'execute', providers: {} },
    actions: [makeAction()],
    now: NOW,
  })
  assert.equal(execs[0].status, 'skipped')
  assert.ok(execs[0].error?.includes('No refresh provider'))
})

test('10 executor continues after provider failure', async () => {
  const s = makeStore()
  const failingProvider = { sourceKind: 'executive_dashboard_report', refresh: async () => { throw new Error('boom') } }
  const goodProvider = makeProvider({ ok: true })
  const execs = await executeDashboardRefreshActions({
    request: {
      hydrationRequest: req, store: s, trigger: 'manual', mode: 'execute',
      providers: { 'executive_dashboard_report': failingProvider, 'intervention_report': goodProvider },
    },
    actions: [makeAction('executive_dashboard_report'), makeAction('intervention_report')],
    now: NOW,
  })
  assert.equal(execs[0].status, 'failed')
  assert.equal(execs[1].status, 'refreshed')
})

test('11 report status skipped with no executions', () => {
  const r = buildDashboardBackgroundRefreshReport({ trigger: 'scheduled', mode: 'execute', generatedAt: NOW, executions: [] })
  assert.equal(r.status, 'skipped')
})

test('12 report status completed with refreshed executions', () => {
  const r = buildDashboardBackgroundRefreshReport({ trigger: 'manual', mode: 'execute', generatedAt: NOW, executions: [makeExecution('refreshed')] })
  assert.equal(r.status, 'completed')
  assert.equal(r.refreshedSources, 1)
})

test('13 report status partial with refreshed + failed', () => {
  const r = buildDashboardBackgroundRefreshReport({ trigger: 'cache_policy', mode: 'execute', generatedAt: NOW, executions: [makeExecution('refreshed'), makeExecution('failed', 'intervention_report', 'err')] })
  assert.equal(r.status, 'partial')
  assert.equal(r.refreshedSources, 1)
  assert.equal(r.failedSources, 1)
})

test('14 report status failed with only failed', () => {
  const r = buildDashboardBackgroundRefreshReport({ trigger: 'source_missing', mode: 'execute', generatedAt: NOW, executions: [makeExecution('failed', 'executive_dashboard_report', 'err')] })
  assert.equal(r.status, 'failed')
})

test('15 report includes skipped/failed warnings', () => {
  const r = buildDashboardBackgroundRefreshReport({
    trigger: 'scheduled', mode: 'execute', generatedAt: NOW,
    executions: [makeExecution('skipped', 'executive_dashboard_report', 'provider missing'), makeExecution('failed', 'intervention_report', 'boom')],
    skippedReason: 'no actions',
  })
  assert.ok(r.warnings.some(w => w.includes('no actions')))
  assert.ok(r.warnings.some(w => w.includes('provider missing')))
  assert.ok(r.warnings.some(w => w.includes('boom')))
})

test('16 runtime fails safely without tenantId', async () => {
  const s = makeStore()
  const r = await runDashboardBackgroundRefresh({ hydrationRequest: { tenantId: '' }, store: s, trigger: 'manual' })
  assert.equal(r.status, 'skipped')
  assert.ok(r.warnings.some(w => w.includes('tenantId')))
})

test('17 runtime end-to-end execute with static provider', async () => {
  const s = makeStore()
  const r = await runDashboardBackgroundRefresh({
    hydrationRequest: req,
    store: s,
    trigger: 'source_missing',
    mode: 'execute',
    providers: { 'executive_dashboard_report': makeProvider({ generated: true }) },
    requestedSourceKinds: ['executive_dashboard_report'],
  })
  assert.equal(r.status, 'completed')
  assert.equal(r.refreshedSources, 1)
  assert.equal(r.mode, 'execute')
  assert.equal(r.trigger, 'source_missing')
})

test('18 runtime end-to-end dry_run', async () => {
  const s = makeStore()
  const r = await runDashboardBackgroundRefresh({
    hydrationRequest: req,
    store: s,
    trigger: 'manual',
    mode: 'dry_run',
    providers: { 'executive_dashboard_report': makeProvider() },
    requestedSourceKinds: ['executive_dashboard_report'],
  })
  assert.equal(r.mode, 'dry_run')
  assert.equal(r.refreshedSources, 0)
})

test('19 runtime manual requested source refresh', async () => {
  const s = makeStore()
  await s.saveSnapshot({ id: 's1', tenantId: 'tenant-1', sourceKind: 'executive_dashboard_report', payload: {}, generatedAt: NOW, schemaVersion: '1', runtimeVersion: '1' })
  const r = await runDashboardBackgroundRefresh({
    hydrationRequest: req,
    store: s,
    trigger: 'manual',
    mode: 'execute',
    providers: { 'conflict_report': makeProvider({ conflict: true }) },
    requestedSourceKinds: ['conflict_report'],
  })
  assert.ok(r.executions.some(e => e.sourceKind === 'conflict_report'))
})

test('20 runtime persists snapshot retrievable by store', async () => {
  const s = makeStore()
  await runDashboardBackgroundRefresh({
    hydrationRequest: req,
    store: s,
    trigger: 'source_stale',
    mode: 'execute',
    providers: { 'intervention_report': makeProvider({ intervention: 1 }) },
    requestedSourceKinds: ['intervention_report'],
  })
  const snap = await s.getLatestSnapshot({ tenantId: 'tenant-1', workspaceId: 'ws-1', portfolioId: 'pf-1', sourceKind: 'intervention_report' })
  assert.ok(snap)
  assert.deepEqual(snap.payload, { intervention: 1 })
})
