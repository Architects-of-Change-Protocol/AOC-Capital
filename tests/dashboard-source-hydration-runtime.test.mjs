import test from 'node:test'
import assert from 'node:assert/strict'

import { calculateAllSourceFreshness, calculateSourceFreshness } from '../src/lib/dashboard/source-hydration/freshness-engine.ts'
import { hydrateDashboardSourceData } from '../src/lib/dashboard/source-hydration/hydration-resolver.ts'
import { buildDashboardHydrationRecoveryPlan } from '../src/lib/dashboard/source-hydration/recovery-engine.ts'
import { createInMemoryDashboardSnapshotStore } from '../src/lib/dashboard/source-hydration/snapshot-store.ts'
import { runDashboardSourceHydration, saveDashboardSourceSnapshots } from '../src/lib/dashboard/source-hydration/source-hydration-runtime.ts'
import { validateDashboardSnapshot } from '../src/lib/dashboard/source-hydration/snapshot-validator.ts'

const now = Date.now()
const isoMinutesAgo = (minutes) => new Date(now - minutes * 60000).toISOString()
const base = { tenantId: 'tenant-a', workspaceId: 'ws-a', portfolioId: 'pf-a', schemaVersion: '1.0.0', runtimeVersion: '8.5.0' }
const snap = (sourceKind, payload, generatedAt = isoMinutesAgo(5)) => ({ id: `${sourceKind}-id`, ...base, sourceKind, payload, generatedAt })

test('1', () => assert.equal(validateDashboardSnapshot(snap('executive_dashboard_report', { ok: true })).valid, true))
test('2', () => assert.equal(validateDashboardSnapshot({}).valid, false))
test('3', async () => { const s=createInMemoryDashboardSnapshotStore(); const v=snap('executive_dashboard_report',{}); await s.saveSnapshot(v); assert.deepEqual(await s.getLatestSnapshot({...base,sourceKind:v.sourceKind}), v) })
test('4', async () => { const s=createInMemoryDashboardSnapshotStore(); await s.saveSnapshot(snap('executive_dashboard_report',{v:1},isoMinutesAgo(10))); await s.saveSnapshot(snap('executive_dashboard_report',{v:2},isoMinutesAgo(2))); assert.equal((await s.getLatestSnapshot({...base,sourceKind:'executive_dashboard_report'})).payload.v,2) })
test('5', async () => { const s=createInMemoryDashboardSnapshotStore(); await s.saveSnapshot(snap('conflict_report',{})); await s.saveSnapshot(snap('executive_dashboard_report',{})); const list=await s.listLatestSnapshots(base); assert.deepEqual(list.map(x=>x.sourceKind),['conflict_report','executive_dashboard_report']) })
test('6', () => assert.equal(calculateSourceFreshness(null,'conflict_report').status,'missing'))
test('7', () => assert.equal(calculateSourceFreshness(snap('conflict_report',{},isoMinutesAgo(1)),'conflict_report').status,'fresh'))
test('8', () => assert.equal(calculateSourceFreshness({...snap('conflict_report',{},isoMinutesAgo(120)),expiresAt:isoMinutesAgo(1)},'conflict_report').status,'stale'))
test('9', () => assert.equal(calculateAllSourceFreshness([]).length,4))
test('10-15', async () => { const s=createInMemoryDashboardSnapshotStore(); await saveDashboardSourceSnapshots({store:s,snapshots:[snap('executive_dashboard_report',{a:1}),snap('intervention_report',{b:1}),snap('decision_simulation_reports',[{c:1}]),snap('conflict_report',{d:1})]}); const h=await hydrateDashboardSourceData({request:base,store:s}); assert.ok(h.sourceData.executiveDashboardReport&&h.sourceData.interventionReport&&h.sourceData.decisionSimulationReports&&h.sourceData.conflictReport); assert.equal(h.completeness.completenessScore,100); const s2=createInMemoryDashboardSnapshotStore(); await s2.saveSnapshot(snap('executive_dashboard_report',{a:1})); const h2=await hydrateDashboardSourceData({request:base,store:s2}); assert.equal(h2.completeness.completenessScore,70) })
test('16', async () => assert.equal((await hydrateDashboardSourceData({request:base,store:createInMemoryDashboardSnapshotStore()})).riskLevel,'critical'))
test('17', async () => { const s=createInMemoryDashboardSnapshotStore(); await s.saveSnapshot(snap('intervention_report',{})); assert.equal((await hydrateDashboardSourceData({request:base,store:s})).riskLevel,'high') })
test('18', async () => assert.equal(buildDashboardHydrationRecoveryPlan(await hydrateDashboardSourceData({request:base,store:createInMemoryDashboardSnapshotStore()})).fallbackMode,'empty'))
test('19', async () => { const s=createInMemoryDashboardSnapshotStore(); await s.saveSnapshot(snap('executive_dashboard_report',{},isoMinutesAgo(300))); assert.equal(buildDashboardHydrationRecoveryPlan(await hydrateDashboardSourceData({request:base,store:s})).fallbackMode,'partial') })
test('20', async () => { const s=createInMemoryDashboardSnapshotStore(); const r=await saveDashboardSourceSnapshots({store:s,snapshots:[snap('conflict_report',{}),{}]}); assert.equal(r.saved,1); assert.equal(r.invalid,1) })
test('21', async () => { const s=createInMemoryDashboardSnapshotStore(); await s.saveSnapshot(snap('executive_dashboard_report',{ok:true})); assert.ok((await runDashboardSourceHydration({request:base,store:s})).recoveryPlan) })
