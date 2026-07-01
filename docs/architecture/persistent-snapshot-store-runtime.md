# Persistent Snapshot Store Runtime

**Track:** 8.8 — PMO Dashboard Runtime Integration  
**Module:** `src/lib/dashboard/persistent-snapshot-store`

---

## Purpose

Track 8.8 provides a durable, tenant-scoped storage implementation for the Dashboard Source Hydration Runtime introduced in Track 8.5. It supplies a persistent `DashboardSnapshotStore` adapter that can replace the in-memory store without changing any upstream interface or runtime behavior.

The module is a pure storage adapter layer. It contains no UI, no background workers, and no changes to the in-memory store.

---

## Store Abstraction Model

The `DashboardSnapshotStore` interface (defined in Track 8.5) is the single contract all stores must satisfy:

```typescript
interface DashboardSnapshotStore {
  saveSnapshot(snapshot: DashboardSourceSnapshot): Promise<void>
  getLatestSnapshot(request: { tenantId, workspaceId?, portfolioId?, sourceKind }): Promise<DashboardSourceSnapshot | null>
  listLatestSnapshots(request: DashboardSourceHydrationRequest): Promise<DashboardSourceSnapshot[]>
}
```

Track 8.8 provides three implementations behind this interface, selected by a factory.

---

## Provider Taxonomy

| Provider | Description | Status |
|----------|-------------|--------|
| `memory` | In-memory Map store from Track 8.5 | Production-ready (reference) |
| `supabase` | Supabase Postgres adapter | Production-ready (requires client) |
| `vault` | BYOS/Vault adapter | Contract-defined, pending implementation |

The provider is selected via `PersistentSnapshotStoreConfig.provider`.

---

## Record Mapping

Dashboard source snapshots use camelCase fields in TypeScript. The Supabase table uses snake_case columns. The mapper module (`snapshot-record-mapper.ts`) provides deterministic, bidirectional translation:

| TypeScript (DashboardSourceSnapshot) | SQL (DashboardSourceSnapshotRecord) |
|--------------------------------------|--------------------------------------|
| `tenantId` | `tenant_id` |
| `workspaceId` | `workspace_id` (null when absent) |
| `portfolioId` | `portfolio_id` (null when absent) |
| `sourceKind` | `source_kind` |
| `generatedAt` | `generated_at` |
| `expiresAt` | `expires_at` (null when absent) |
| `schemaVersion` | `schema_version` |
| `runtimeVersion` | `runtime_version` |
| `payload` | `payload` (jsonb) |

**Scope filter:** `buildSnapshotRecordScopeFilter()` converts a hydration request scope into the SQL column filter shape. `tenant_id` is always required. Absent `workspaceId`/`portfolioId` map to SQL `IS NULL` comparisons.

---

## Supabase Adapter Behavior

`createSupabaseDashboardSnapshotStore()` wraps a duck-typed Supabase client (any object satisfying the `@supabase/supabase-js` query builder shape). It does not import Supabase types directly, making it testable with lightweight fake clients.

**saveSnapshot:** Upserts the mapped record by `id`. Throws `"Failed to save dashboard source snapshot."` on client error.

**getLatestSnapshot:** Queries by `(tenant_id, source_kind, workspace_id, portfolio_id)`, orders by `generated_at desc`, limits to 1. Returns null when no match. Throws `"Failed to read dashboard source snapshot."` on client error.

**listLatestSnapshots:** Queries by `(tenant_id, workspace_id, portfolio_id)`, ordered by `generated_at desc`. Deduplicates the latest record per `source_kind` in memory, then returns sorted by `sourceKind` ascending. Throws `"Failed to list dashboard source snapshots."` on client error.

**Tenant safety:** Every query requires `tenantId`. The adapter never issues queries without a tenant scope.

---

## Vault / BYOS Contract

`createVaultDashboardSnapshotStore()` does not implement a real Vault client. It validates that the provided `vaultClient` implements the `DashboardVaultSnapshotStoreContract` interface (all three store methods), then delegates to it.

Failure modes:
- No `vaultClient`: throws `"Vault client is required for dashboard snapshot store."`
- Client present but missing methods: throws `"Vault client does not implement dashboard snapshot store contract."`
- Valid client: returned as a `DashboardSnapshotStore` wrapper.

This allows external BYOS adapters to plug in without modifying core runtime code.

---

## Factory Behavior

`createPersistentDashboardSnapshotStore(config)` selects the store implementation:

```typescript
provider: 'memory'   → createInMemoryDashboardSnapshotStore()
provider: 'supabase' → createSupabaseDashboardSnapshotStore(...)
provider: 'vault'    → createVaultDashboardSnapshotStore(...)
unknown provider     → throws "Unsupported dashboard snapshot store provider."
```

---

## Health Check Behavior

`getPersistentSnapshotStoreHealth(config)` returns a `PersistentSnapshotStoreHealth` object without creating or connecting to a store:

| Provider | Available when |
|----------|---------------|
| `memory` | Always |
| `supabase` | `supabaseClient` is provided |
| `vault` | `vaultClient` is provided and implements the contract |

The runtime function `runPersistentSnapshotStoreHealthCheck()` delegates to this and returns the health report.

---

## Tenant Isolation Model

Tenant isolation is enforced at every layer:

1. **Application layer:** Every `DashboardSnapshotStore` method requires `tenantId`. The Supabase adapter includes `tenant_id` in every query.
2. **SQL layer:** The `tenant_id` column is `not null`. All indexes include `tenant_id` as a leading column.
3. **RLS layer:** Row-level security is enabled on `dashboard_source_snapshots`. The policy maps `tenant_id` to `current_company_id()`.

No snapshot can be read or written without a tenant scope.

---

## SQL Table Contract

Table: `public.dashboard_source_snapshots`

```sql
id text primary key
tenant_id text not null
workspace_id text null
portfolio_id text null
source_kind text not null  -- enum-checked
payload jsonb not null
generated_at timestamptz not null
expires_at timestamptz null
schema_version text not null
runtime_version text not null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Indexes:
- `idx_dashboard_source_snapshots_scope` on `(tenant_id, workspace_id, portfolio_id, source_kind, generated_at desc)` — primary scope lookup
- `idx_dashboard_source_snapshots_tenant` on `(tenant_id)` — tenant-level listing

Migration: `supabase/migrations/20260526000000_create_dashboard_source_snapshots.sql`

---

## RLS Policy Notes

RLS is enabled on `dashboard_source_snapshots`. The policy uses `current_company_id() = tenant_id` consistent with the project convention. In the dashboard module, `tenant_id` maps to the company/organization scope (same as `company_id` in other tables). If the auth context resolves the company scope under a different identifier, the policy column reference should be updated before enabling in production.

---

## Integration with Track 8.5 — Source Hydration

Track 8.5 defines:
- `DashboardSourceSnapshot` — the canonical snapshot shape
- `DashboardSnapshotStore` — the storage interface
- `createInMemoryDashboardSnapshotStore()` — the reference implementation
- `buildDashboardSnapshotKey()` — key derivation for the in-memory store

Track 8.8 builds on top of these without modifying them. The persistent store is swappable with the in-memory store at the factory level. All Track 8.5 tests remain valid and unmodified.

---

## Integration with Track 8.6 — Cache Refresh

The cache refresh runtime (`runDashboardCacheRefresh`) receives a `DashboardSnapshotStore`. Swapping to the persistent store requires only a factory config change — the cache refresh logic is store-agnostic.

---

## Integration with Track 8.7 — Action Center

The action center runtime receives a `DashboardHydrationResult` computed from the store. The store implementation is transparent to action generation.

---

## Future Extension Path

| Track | Extension |
|-------|-----------|
| 8.9 | Background refresh worker — polls store and triggers re-hydration |
| 8.10 | Dashboard action UI surface — reads actions backed by persistent snapshots |
| 8.11 | External task adapter — writes snapshots from external connectors |

Planned persistence enhancements:
- **Supabase RLS hardening** — align `tenant_id` with the company auth scope and add column-level grants
- **Vault-backed BYOS storage** — implement `DashboardVaultSnapshotStoreContract` for company-managed storage
- **Snapshot lineage** — parent/child relationships for incremental hydration chains
- **Snapshot retention policies** — automated expiry and pruning by age or count
- **Field-level encryption** — encrypt `payload` at rest for sensitive source kinds
- **Dashboard cache headers** — ETag and Last-Modified derived from snapshot `generated_at`
- **Background refresh worker** — subscribe to staleness events and re-hydrate proactively
- **Audit events** — append-only write log for snapshot creation, expiry, and replacement
