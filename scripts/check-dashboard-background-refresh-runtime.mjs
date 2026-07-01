import assert from 'node:assert/strict'
import { createInMemoryDashboardSnapshotStore } from '../src/lib/dashboard/source-hydration/snapshot-store.ts'
import { createStaticDashboardSourceProvider, createDefaultDashboardSourceProviders } from '../src/lib/dashboard/background-refresh/refresh-source-provider.ts'
import { planDashboardBackgroundRefresh } from '../src/lib/dashboard/background-refresh/refresh-execution-planner.ts'
import { executeDashboardRefreshActions } from '../src/lib/dashboard/background-refresh/refresh-executor.ts'
import { buildDashboardBackgroundRefreshReport } from '../src/lib/dashboard/background-refresh/refresh-result-engine.ts'
import { runDashboardBackgroundRefresh } from '../src/lib/dashboard/background-refresh/background-refresh-runtime.ts'

const NOW = new Date().toISOString()
const req = { tenantId: 'tenant-check', workspaceId: 'ws-check', portfolioId: 'pf-check' }

// static provider returns payload
const staticProvider = createStaticDashboardSourceProvider({ sourceKind: 'executive_dashboard_report', payload: { check: true } })
const providerResult = await staticProvider.refresh({ request: req, reason: 'missing_source', now: NOW })
assert.deepEqual(providerResult.payload, { check: true })

// default providers are created only for provided payloads
const defaults = createDefaultDashboardSourceProviders({ executiveDashboardReport: { x: 1 }, conflictReport: { y: 2 } })
assert.equal(Object.keys(defaults).length, 2)
assert.ok(defaults['executive_dashboard_report'])
assert.ok(defaults['conflict_report'])
assert.equal(defaults['intervention_report'], undefined)

// planner selects manual requested source
const s1 = createInMemoryDashboardSnapshotStore()
const planResult = await planDashboardBackgroundRefresh({
  hydrationRequest: req, store: s1, trigger: 'manual',
  requestedSourceKinds: ['conflict_report'],
})
assert.ok(planResult.selectedActions.some(a => a.sourceKind === 'conflict_report'))

// executor dry-run skips persistence
const s2 = createInMemoryDashboardSnapshotStore()
const dryExecs = await executeDashboardRefreshActions({
  request: {
    hydrationRequest: req, store: s2, trigger: 'manual', mode: 'dry_run',
    providers: { 'executive_dashboard_report': createStaticDashboardSourceProvider({ sourceKind: 'executive_dashboard_report', payload: {} }) },
  },
  actions: [{ id: 'a1', sourceKind: 'executive_dashboard_report', reason: 'missing_source', priority: 'high', title: 'T', description: 'D' }],
  now: NOW,
})
assert.equal(dryExecs[0].status, 'skipped')
const drySnap = await s2.getLatestSnapshot({ tenantId: 'tenant-check', sourceKind: 'executive_dashboard_report' })
assert.equal(drySnap, null)

// executor refreshes with registered provider
const s3 = createInMemoryDashboardSnapshotStore()
const execExecs = await executeDashboardRefreshActions({
  request: {
    hydrationRequest: req, store: s3, trigger: 'manual', mode: 'execute',
    providers: { 'executive_dashboard_report': createStaticDashboardSourceProvider({ sourceKind: 'executive_dashboard_report', payload: { persisted: true } }) },
  },
  actions: [{ id: 'a2', sourceKind: 'executive_dashboard_report', reason: 'missing_source', priority: 'high', title: 'T', description: 'D' }],
  now: NOW,
})
assert.equal(execExecs[0].status, 'refreshed')

// executor skips missing provider
const s4 = createInMemoryDashboardSnapshotStore()
const skipExecs = await executeDashboardRefreshActions({
  request: { hydrationRequest: req, store: s4, trigger: 'manual', mode: 'execute', providers: {} },
  actions: [{ id: 'a3', sourceKind: 'executive_dashboard_report', reason: 'missing_source', priority: 'high', title: 'T', description: 'D' }],
  now: NOW,
})
assert.equal(skipExecs[0].status, 'skipped')
assert.ok(skipExecs[0].error?.includes('No refresh provider'))

// report builder summarizes statuses
const report = buildDashboardBackgroundRefreshReport({
  trigger: 'manual', mode: 'execute', generatedAt: NOW,
  executions: [
    { sourceKind: 'executive_dashboard_report', reason: 'missing_source', priority: 'high', status: 'refreshed' },
    { sourceKind: 'intervention_report', reason: 'stale_source', priority: 'medium', status: 'failed', error: 'err' },
  ],
})
assert.equal(report.status, 'partial')
assert.equal(report.refreshedSources, 1)
assert.equal(report.failedSources, 1)

const reportSkipped = buildDashboardBackgroundRefreshReport({ trigger: 'scheduled', mode: 'execute', generatedAt: NOW, executions: [] })
assert.equal(reportSkipped.status, 'skipped')

const reportCompleted = buildDashboardBackgroundRefreshReport({
  trigger: 'cache_policy', mode: 'execute', generatedAt: NOW,
  executions: [{ sourceKind: 'executive_dashboard_report', reason: 'missing_source', priority: 'high', status: 'refreshed' }],
})
assert.equal(reportCompleted.status, 'completed')

const reportFailed = buildDashboardBackgroundRefreshReport({
  trigger: 'source_stale', mode: 'execute', generatedAt: NOW,
  executions: [{ sourceKind: 'executive_dashboard_report', reason: 'missing_source', priority: 'high', status: 'failed', error: 'boom' }],
})
assert.equal(reportFailed.status, 'failed')

// runtime end-to-end with memory store and static provider
const s5 = createInMemoryDashboardSnapshotStore()
const runtimeReport = await runDashboardBackgroundRefresh({
  hydrationRequest: req,
  store: s5,
  trigger: 'source_missing',
  mode: 'execute',
  providers: { 'executive_dashboard_report': createStaticDashboardSourceProvider({ sourceKind: 'executive_dashboard_report', payload: { final: true } }) },
  requestedSourceKinds: ['executive_dashboard_report'],
})
assert.equal(runtimeReport.status, 'completed')
assert.equal(runtimeReport.refreshedSources, 1)

console.log('[ok] dashboard background refresh runtime valid')
