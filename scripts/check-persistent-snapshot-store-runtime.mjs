import assert from 'node:assert/strict'
import { mapSnapshotToRecord, mapRecordToSnapshot, buildSnapshotRecordScopeFilter } from '../src/lib/dashboard/persistent-snapshot-store/snapshot-record-mapper.ts'
import { createPersistentDashboardSnapshotStore, getPersistentSnapshotStoreHealth } from '../src/lib/dashboard/persistent-snapshot-store/snapshot-store-factory.ts'
import { createVaultDashboardSnapshotStore } from '../src/lib/dashboard/persistent-snapshot-store/vault-snapshot-store-contract.ts'
import { runPersistentSnapshotStoreHealthCheck, savePersistentDashboardSnapshot, hydratePersistentDashboardSnapshots } from '../src/lib/dashboard/persistent-snapshot-store/persistent-snapshot-store-runtime.ts'

const nowIso = new Date().toISOString()
const snapshot = { id: 'snap-check-1', tenantId: 't1', workspaceId: 'ws-1', portfolioId: 'pf-1', sourceKind: 'executive_dashboard_report', payload: { score: 80 }, generatedAt: nowIso, schemaVersion: '1.0.0', runtimeVersion: '8.8.0' }

// Snapshot to record mapping
const rec = mapSnapshotToRecord(snapshot)
assert.equal(rec.tenant_id, snapshot.tenantId)
assert.equal(rec.source_kind, snapshot.sourceKind)
assert.equal(rec.workspace_id, snapshot.workspaceId)
assert.equal(rec.generated_at, snapshot.generatedAt)

// Record to snapshot mapping
const back = mapRecordToSnapshot(rec)
assert.equal(back.tenantId, snapshot.tenantId)
assert.equal(back.sourceKind, snapshot.sourceKind)
assert.equal(back.id, snapshot.id)

// Null optional fields roundtrip
const recNoScope = mapSnapshotToRecord({ ...snapshot, workspaceId: undefined, portfolioId: undefined })
assert.equal(recNoScope.workspace_id, null)
assert.equal(recNoScope.portfolio_id, null)
const backNoScope = mapRecordToSnapshot(recNoScope)
assert.equal(backNoScope.workspaceId, undefined)
assert.equal(backNoScope.portfolioId, undefined)

// Scope filter mapping
const filter = buildSnapshotRecordScopeFilter({ tenantId: 't1', workspaceId: 'ws-1', sourceKind: 'conflict_report' })
assert.equal(filter.tenant_id, 't1')
assert.equal(filter.workspace_id, 'ws-1')
assert.equal(filter.portfolio_id, null)
assert.equal(filter.source_kind, 'conflict_report')

const filterMin = buildSnapshotRecordScopeFilter({ tenantId: 't1' })
assert.equal(filterMin.workspace_id, null)
assert.equal('source_kind' in filterMin, false)

// Memory provider factory
const memStore = createPersistentDashboardSnapshotStore({ provider: 'memory' })
await memStore.saveSnapshot(snapshot)
const retrieved = await memStore.getLatestSnapshot({ tenantId: 't1', workspaceId: 'ws-1', portfolioId: 'pf-1', sourceKind: 'executive_dashboard_report' })
assert.ok(retrieved)
assert.equal(retrieved.id, snapshot.id)
const listed = await memStore.listLatestSnapshots({ tenantId: 't1', workspaceId: 'ws-1', portfolioId: 'pf-1' })
assert.equal(listed.length, 1)

// Supabase provider health false when no client
const supabaseHealth = getPersistentSnapshotStoreHealth({ provider: 'supabase' })
assert.equal(supabaseHealth.available, false)
assert.ok(supabaseHealth.reason)

// Vault provider health false when no client
const vaultHealth = getPersistentSnapshotStoreHealth({ provider: 'vault' })
assert.equal(vaultHealth.available, false)
assert.ok(vaultHealth.reason)

// Vault provider rejects invalid contract
let vaultInvalidThrew = false
try { createVaultDashboardSnapshotStore({ vaultClient: { saveSnapshot: () => {} } }) } catch { vaultInvalidThrew = true }
assert.equal(vaultInvalidThrew, true)

// Runtime health check works
const health = runPersistentSnapshotStoreHealthCheck({ provider: 'memory' })
assert.equal(health.provider, 'memory')
assert.equal(health.available, true)

// save/hydrate works with memory provider
const saveResult = await savePersistentDashboardSnapshot({ config: { provider: 'memory' }, snapshot })
assert.equal(saveResult.saved, true)
assert.equal(saveResult.provider, 'memory')

const hydrateResult = await hydratePersistentDashboardSnapshots({
  config: { provider: 'memory' },
  request: { tenantId: 't1', workspaceId: 'ws-1', portfolioId: 'pf-1' },
})
assert.equal(hydrateResult.provider, 'memory')
assert.ok(Array.isArray(hydrateResult.snapshots))

console.log('[ok] persistent snapshot store runtime valid')
