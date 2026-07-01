import assert from 'node:assert/strict'
import { calculateAllSourceFreshness } from '../src/lib/dashboard/source-hydration/freshness-engine.ts'
import { hydrateDashboardSourceData } from '../src/lib/dashboard/source-hydration/hydration-resolver.ts'
import { createInMemoryDashboardSnapshotStore } from '../src/lib/dashboard/source-hydration/snapshot-store.ts'
import { runDashboardSourceHydration, saveDashboardSourceSnapshots } from '../src/lib/dashboard/source-hydration/source-hydration-runtime.ts'
import { validateDashboardSnapshot } from '../src/lib/dashboard/source-hydration/snapshot-validator.ts'

const nowIso = new Date().toISOString()
const snapshot = { id:'snap-1', tenantId:'tenant-a', workspaceId:'ws-a', portfolioId:'pf-a', sourceKind:'executive_dashboard_report', payload:{score:80}, generatedAt:nowIso, schemaVersion:'1.0.0', runtimeVersion:'8.5.0' }
assert.equal(validateDashboardSnapshot(snapshot).valid, true)
const store=createInMemoryDashboardSnapshotStore(); await store.saveSnapshot(snapshot)
assert.ok(await store.getLatestSnapshot({tenantId:'tenant-a',workspaceId:'ws-a',portfolioId:'pf-a',sourceKind:'executive_dashboard_report'}))
assert.equal(calculateAllSourceFreshness([snapshot]).length,4)
const hydration=await hydrateDashboardSourceData({request:{tenantId:'tenant-a',workspaceId:'ws-a',portfolioId:'pf-a'},store})
assert.ok(hydration.sourceData.executiveDashboardReport); assert.equal(hydration.completeness.completenessScore,70)
assert.ok((await runDashboardSourceHydration({request:{tenantId:'tenant-a',workspaceId:'ws-a',portfolioId:'pf-a'},store})).recoveryPlan)
const saveResult=await saveDashboardSourceSnapshots({store,snapshots:[snapshot,{id:'bad'}]})
assert.equal(saveResult.saved>=1,true); assert.equal(saveResult.invalid>=1,true)
console.log('[ok] dashboard source hydration runtime valid')
