import test from 'node:test'
import assert from 'node:assert/strict'

import { mapSnapshotToRecord, mapRecordToSnapshot, buildSnapshotRecordScopeFilter } from '../src/lib/dashboard/persistent-snapshot-store/snapshot-record-mapper.ts'
import { createSupabaseDashboardSnapshotStore } from '../src/lib/dashboard/persistent-snapshot-store/supabase-snapshot-store.ts'
import { createVaultDashboardSnapshotStore } from '../src/lib/dashboard/persistent-snapshot-store/vault-snapshot-store-contract.ts'
import { createPersistentDashboardSnapshotStore, getPersistentSnapshotStoreHealth } from '../src/lib/dashboard/persistent-snapshot-store/snapshot-store-factory.ts'
import { runPersistentSnapshotStoreHealthCheck, savePersistentDashboardSnapshot, hydratePersistentDashboardSnapshots } from '../src/lib/dashboard/persistent-snapshot-store/persistent-snapshot-store-runtime.ts'

const now = new Date().toISOString()
const base = { id: 'snap-1', tenantId: 't1', workspaceId: 'ws-1', portfolioId: 'pf-1', sourceKind: 'executive_dashboard_report', payload: { score: 90 }, generatedAt: now, schemaVersion: '1.0.0', runtimeVersion: '8.8.0' }
const record = { id: 'snap-1', tenant_id: 't1', workspace_id: 'ws-1', portfolio_id: 'pf-1', source_kind: 'executive_dashboard_report', payload: { score: 90 }, generated_at: now, schema_version: '1.0.0', runtime_version: '8.8.0' }

function makeFakeSupabaseClient(mockData = [], mockError = null) {
  let savedRecord = null
  const builder = {
    _data: mockData,
    _error: mockError,
    select() { return this },
    eq() { return this },
    is() { return this },
    order() { return this },
    limit() { return this },
    upsert(rec) {
      savedRecord = rec
      return Promise.resolve({ data: null, error: mockError })
    },
    then(resolve, reject) {
      Promise.resolve({ data: mockData, error: mockError }).then(resolve, reject)
    },
    getSavedRecord() { return savedRecord },
  }
  return {
    from() { return builder },
    getBuilder() { return builder },
  }
}

test('1 mapSnapshotToRecord maps camelCase to snake_case', () => {
  const r = mapSnapshotToRecord(base)
  assert.equal(r.id, base.id)
  assert.equal(r.tenant_id, base.tenantId)
  assert.equal(r.workspace_id, base.workspaceId)
  assert.equal(r.portfolio_id, base.portfolioId)
  assert.equal(r.source_kind, base.sourceKind)
  assert.deepEqual(r.payload, base.payload)
  assert.equal(r.generated_at, base.generatedAt)
  assert.equal(r.schema_version, base.schemaVersion)
  assert.equal(r.runtime_version, base.runtimeVersion)
})

test('2 mapSnapshotToRecord nullifies absent optional fields', () => {
  const snap = { ...base }
  delete snap.workspaceId
  delete snap.portfolioId
  const r = mapSnapshotToRecord(snap)
  assert.equal(r.workspace_id, null)
  assert.equal(r.portfolio_id, null)
})

test('3 mapRecordToSnapshot maps snake_case to camelCase', () => {
  const s = mapRecordToSnapshot(record)
  assert.equal(s.id, record.id)
  assert.equal(s.tenantId, record.tenant_id)
  assert.equal(s.workspaceId, record.workspace_id)
  assert.equal(s.portfolioId, record.portfolio_id)
  assert.equal(s.sourceKind, record.source_kind)
  assert.deepEqual(s.payload, record.payload)
  assert.equal(s.generatedAt, record.generated_at)
  assert.equal(s.schemaVersion, record.schema_version)
  assert.equal(s.runtimeVersion, record.runtime_version)
})

test('4 mapRecordToSnapshot converts null optional fields to undefined', () => {
  const rec = { ...record, workspace_id: null, portfolio_id: null }
  const s = mapRecordToSnapshot(rec)
  assert.equal(s.workspaceId, undefined)
  assert.equal(s.portfolioId, undefined)
})

test('5 buildSnapshotRecordScopeFilter maps all fields', () => {
  const f = buildSnapshotRecordScopeFilter({ tenantId: 't1', workspaceId: 'ws-1', portfolioId: 'pf-1', sourceKind: 'conflict_report' })
  assert.equal(f.tenant_id, 't1')
  assert.equal(f.workspace_id, 'ws-1')
  assert.equal(f.portfolio_id, 'pf-1')
  assert.equal(f.source_kind, 'conflict_report')
})

test('6 buildSnapshotRecordScopeFilter nullifies absent scope fields', () => {
  const f = buildSnapshotRecordScopeFilter({ tenantId: 't1' })
  assert.equal(f.tenant_id, 't1')
  assert.equal(f.workspace_id, null)
  assert.equal(f.portfolio_id, null)
  assert.equal('source_kind' in f, false)
})

test('7 memory provider factory returns working store', async () => {
  const store = createPersistentDashboardSnapshotStore({ provider: 'memory' })
  await store.saveSnapshot(base)
  const s = await store.getLatestSnapshot({ tenantId: 't1', workspaceId: 'ws-1', portfolioId: 'pf-1', sourceKind: 'executive_dashboard_report' })
  assert.ok(s)
  assert.equal(s.id, base.id)
})

test('8 unsupported provider throws', () => {
  assert.throws(() => createPersistentDashboardSnapshotStore({ provider: 'unknown' }), /Unsupported dashboard snapshot store provider/)
})

test('9 supabase provider throws when client missing', () => {
  assert.throws(() => createPersistentDashboardSnapshotStore({ provider: 'supabase' }), /Supabase client is required/)
})

test('10 vault provider throws when client missing', () => {
  assert.throws(() => createPersistentDashboardSnapshotStore({ provider: 'vault' }), /Vault client is required/)
})

test('11 vault provider throws invalid contract', () => {
  assert.throws(
    () => createVaultDashboardSnapshotStore({ vaultClient: { saveSnapshot: () => {} } }),
    /Vault client does not implement dashboard snapshot store contract/,
  )
})

test('12 vault provider wraps valid contract', async () => {
  const saved = []
  const vaultClient = {
    saveSnapshot: async (s) => { saved.push(s) },
    getLatestSnapshot: async () => null,
    listLatestSnapshots: async () => [],
  }
  const store = createVaultDashboardSnapshotStore({ vaultClient })
  await store.saveSnapshot(base)
  assert.equal(saved.length, 1)
  assert.equal(saved[0].id, base.id)
})

test('13 health memory available', () => {
  const h = getPersistentSnapshotStoreHealth({ provider: 'memory' })
  assert.equal(h.available, true)
  assert.equal(h.readSupported, true)
  assert.equal(h.writeSupported, true)
})

test('14 health supabase unavailable without client', () => {
  const h = getPersistentSnapshotStoreHealth({ provider: 'supabase' })
  assert.equal(h.available, false)
  assert.ok(h.reason)
})

test('15 health supabase available with client', () => {
  const h = getPersistentSnapshotStoreHealth({ provider: 'supabase', supabaseClient: {} })
  assert.equal(h.available, true)
})

test('16 health vault unavailable without client', () => {
  const h = getPersistentSnapshotStoreHealth({ provider: 'vault' })
  assert.equal(h.available, false)
  assert.ok(h.reason)
})

test('17 health vault unavailable with invalid contract', () => {
  const h = getPersistentSnapshotStoreHealth({ provider: 'vault', vaultClient: { saveSnapshot: () => {} } })
  assert.equal(h.available, false)
})

test('18 runtime health check', () => {
  const h = runPersistentSnapshotStoreHealthCheck({ provider: 'memory' })
  assert.equal(h.provider, 'memory')
  assert.equal(h.available, true)
})

test('19 savePersistentDashboardSnapshot with memory provider', async () => {
  const result = await savePersistentDashboardSnapshot({ config: { provider: 'memory' }, snapshot: base })
  assert.equal(result.saved, true)
  assert.equal(result.provider, 'memory')
})

test('20 hydratePersistentDashboardSnapshots with memory provider', async () => {
  const result = await hydratePersistentDashboardSnapshots({
    config: { provider: 'memory' },
    request: { tenantId: 't1', workspaceId: 'ws-1', portfolioId: 'pf-1' },
  })
  assert.equal(result.provider, 'memory')
  assert.ok(Array.isArray(result.snapshots))
})

test('21 Supabase store save calls upsert on configured table using mapped record', async () => {
  const fakeClient = makeFakeSupabaseClient()
  const store = createSupabaseDashboardSnapshotStore({ supabaseClient: fakeClient, tableName: 'test_snapshots' })
  await store.saveSnapshot(base)
  const saved = fakeClient.getBuilder().getSavedRecord()
  assert.ok(saved)
  assert.equal(saved.id, base.id)
  assert.equal(saved.tenant_id, base.tenantId)
  assert.equal(saved.source_kind, base.sourceKind)
})

test('22 Supabase store getLatestSnapshot maps returned record', async () => {
  const fakeClient = makeFakeSupabaseClient([record])
  const store = createSupabaseDashboardSnapshotStore({ supabaseClient: fakeClient })
  const snap = await store.getLatestSnapshot({ tenantId: 't1', workspaceId: 'ws-1', portfolioId: 'pf-1', sourceKind: 'executive_dashboard_report' })
  assert.ok(snap)
  assert.equal(snap.id, record.id)
  assert.equal(snap.tenantId, record.tenant_id)
  assert.equal(snap.sourceKind, record.source_kind)
})

test('23 Supabase store listLatestSnapshots deduplicates latest by source kind', async () => {
  const records = [
    { ...record, id: 'snap-1', source_kind: 'executive_dashboard_report', generated_at: new Date(Date.now() - 1000).toISOString() },
    { ...record, id: 'snap-2', source_kind: 'executive_dashboard_report', generated_at: new Date(Date.now() - 5000).toISOString() },
    { ...record, id: 'snap-3', source_kind: 'conflict_report', generated_at: new Date(Date.now() - 2000).toISOString() },
  ]
  const fakeClient = makeFakeSupabaseClient(records)
  const store = createSupabaseDashboardSnapshotStore({ supabaseClient: fakeClient })
  const snaps = await store.listLatestSnapshots({ tenantId: 't1', workspaceId: 'ws-1', portfolioId: 'pf-1' })
  assert.equal(snaps.length, 2)
  assert.ok(snaps.find(s => s.sourceKind === 'executive_dashboard_report')?.id === 'snap-1')
  assert.ok(snaps.find(s => s.sourceKind === 'conflict_report')?.id === 'snap-3')
})
