# Dashboard Background Refresh Worker Runtime

## Purpose

Track 8.9 provides a deterministic, side-effect-safe worker runtime that can:
- Accept a dashboard refresh worker request
- Evaluate cache/refresh state using Track 8.6
- Determine which dashboard sources need regeneration
- Execute source refresh through injected deterministic providers
- Persist refreshed snapshots through the `DashboardSnapshotStore` interface
- Return an auditable `DashboardBackgroundRefreshReport`

This track establishes the orchestration contract and execution mechanics that future scheduled or manual-trigger jobs will call without modification.

---

## Worker Execution Model

```
DashboardBackgroundRefreshRequest
        │
        ▼
planDashboardBackgroundRefresh()        ← Track 8.6 cache-refresh runtime
        │
        ▼ DashboardBackgroundRefreshPlannerResult
        │
        ▼
executeDashboardRefreshActions()        ← per-action, isolated, ordered
        │  ├── provider.refresh()       ← injected DashboardSourceRefreshProvider
        │  └── store.saveSnapshot()     ← Track 8.8 snapshot store
        │
        ▼ DashboardSourceRefreshExecution[]
        │
        ▼
buildDashboardBackgroundRefreshReport()
        │
        ▼
DashboardBackgroundRefreshReport
```

Each stage is a pure function or async function with no global side effects. The entire pipeline is safe to re-run.

---

## Trigger Taxonomy

| Trigger | When to use |
|---|---|
| `manual` | User-initiated refresh request |
| `scheduled` | Cron / timed job invocation |
| `cache_policy` | Cache policy interval elapsed |
| `source_missing` | One or more sources are absent |
| `source_stale` | Source freshness has degraded |
| `system_recovery` | Recovery after partial hydration failure |

The trigger is passed through to the report and controls `manualRefresh` flag in the Track 8.6 planner.

---

## Dry-Run vs Execute Mode

`DashboardRefreshExecutionMode`:

- **`execute`** (default): Providers are called, snapshots are saved to the store.
- **`dry_run`**: Planning runs normally, providers are resolved, but no snapshots are persisted. All executions report status `skipped` with reason `"Dry run mode; snapshot was not persisted."`.

Dry-run is useful for audit, preview, and testing scenarios.

---

## Provider Injection Model

The runtime never calls portfolio aggregation or external APIs directly. All source generation is delegated to `DashboardSourceRefreshProvider` instances:

```ts
interface DashboardSourceRefreshProvider {
  sourceKind: DashboardSourceKind
  refresh(input: {
    request: DashboardSourceHydrationRequest
    reason: string
    now: string
  }): Promise<{
    payload: any
    schemaVersion: string
    runtimeVersion: string
    expiresAt?: string
  }>
}
```

Providers are passed via `DashboardBackgroundRefreshRequest.providers`. If no provider is registered for a source kind required by a planned action, that source is skipped (not failed), and a warning is appended.

Two factory helpers are provided:

- **`createStaticDashboardSourceProvider()`**: Wraps a pre-computed payload. Deterministic. Safe for tests and preview modes.
- **`createDefaultDashboardSourceProviders()`**: Creates providers for explicitly supplied payloads. Does not invent data. Does not call runtime aggregation.

---

## Why Source Generation Is Provider-Based

Portfolio runtime recomputation (executive dashboard aggregation, PMO intervention, conflict arbitration, etc.) requires live project data and is expensive. Track 8.9 defines the worker mechanics first, without coupling to any specific data source.

Source generation adapters — which call `runExecutiveDashboardAggregation()`, `runPmoInterventionAutomation()`, etc. and wrap results in providers — are a future extension (Track 8.11 / 8.13).

This separation means:
- The worker is testable with `createInMemoryDashboardSnapshotStore()` and static providers
- Real adapters can be added without changing worker logic
- Provider failures are isolated per source

---

## Refresh Planning Integration (Track 8.6)

The planner calls `runDashboardCacheRefresh()` to obtain a `DashboardRefreshPlan`. This plan reflects current cache/freshness state for all source kinds.

If `requestedSourceKinds` is provided, the planner filters plan actions to those kinds. Sources not present in the plan are given a synthetic `manual_refresh` action, ensuring explicitly requested sources are always attempted.

`maxActions` caps the total planned actions for quota-controlled execution.

---

## Snapshot Persistence Integration (Track 8.8)

All snapshot writes go through the `DashboardSnapshotStore` interface provided in the request. This is compatible with:

- `createInMemoryDashboardSnapshotStore()` (Track 8.5 — for tests)
- `createPersistentSnapshotStore()` (Track 8.8 — for production Supabase/Vault backends)

The runtime never imports Supabase directly.

---

## Failure Isolation Model

Each source kind refresh is executed independently inside `executeDashboardRefreshActions()`. A provider throw is caught and recorded as `status: 'failed'` on that execution. Remaining actions continue to execute.

The worker as a whole does not throw. All outcomes — success, partial, dry-run skip, missing provider — are represented in the `DashboardBackgroundRefreshReport`.

---

## Report Contract

```ts
interface DashboardBackgroundRefreshReport {
  status: DashboardRefreshWorkerStatus     // completed | partial | skipped | failed
  trigger: DashboardRefreshWorkerTrigger
  mode: DashboardRefreshExecutionMode
  generatedAt: string
  attemptedSources: number
  refreshedSources: number
  skippedSources: number
  failedSources: number
  executions: DashboardSourceRefreshExecution[]
  warnings: string[]
}
```

Status derivation:
- `skipped`: no executions attempted
- `completed`: all attempted sources refreshed successfully
- `partial`: at least one refreshed, at least one failed
- `failed`: all attempted sources failed

---

## Why Real Cron/Background Jobs Are Deferred

Creating real scheduled jobs requires environment-specific infrastructure (Vercel Cron, Supabase Edge Functions, etc.) and must be paired with authentication, rate limiting, and deployment configuration.

Track 8.9 creates the callable worker function `runDashboardBackgroundRefresh()` with a well-defined contract. Cron/scheduler wrappers (Track 8.13) will call this function directly, inheriting all isolation and failure safety guarantees.

---

## Future Extension Path

| Track | Extension |
|---|---|
| 8.10 | Dashboard Action UI Surface |
| 8.11 | External Task Adapter Runtime — real portfolio source providers |
| 8.12 | Manual Refresh API Endpoint — HTTP trigger calling this runtime |
| 8.13 | Scheduled Refresh Job — Vercel Cron / Supabase Edge Function wrapper |
| — | Refresh audit trail persistence |
| — | Refresh SLA monitoring |
| — | Dashboard Action Center integration (surface refresh status) |
| — | Portfolio runtime snapshot generation adapters |
