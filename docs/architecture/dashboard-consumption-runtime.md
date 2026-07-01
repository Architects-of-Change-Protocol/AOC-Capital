# Dashboard Consumption Runtime

**Track 8.3 — PMO Dashboard Runtime Integration**

## Purpose

The Dashboard Consumption Runtime provides the frontend consumption foundation for the PMFreak protected dashboard area. It connects protected routes to the Portfolio Executive Dashboard API created in Track 8.2, normalising raw API responses into stable `DashboardViewModel` contracts that future executive dashboard UI widgets can consume without coupling to the raw API response shape.

This layer does **not** render UI. It produces typed, stable view models for consumption by React components.

---

## Consumption Model

```
Protected Route (Server Component)
         │
         ▼
runDashboardConsumptionRuntime(input)
         │
         ├─► deriveDashboardConsumptionStatus(input)   → DashboardConsumptionStatus
         └─► adaptDashboardViewModel(input)            → DashboardViewModel
                                                           (status overridden by state machine)
```

For client-side or async contexts:

```
loadPortfolioDashboardViewModel(options)
         │
         ├─► fetchPortfolioDashboard(options)          → raw API response
         └─► runDashboardConsumptionRuntime({ apiResponse })  → DashboardViewModel
```

---

## Fetcher Strategy

`fetchPortfolioDashboard(options: DashboardFetchOptions)` calls `GET /api/dashboard/portfolio` using the browser or server `fetch` API.

- Uses `baseUrl` if provided; otherwise uses a relative path suitable for browser same-origin requests.
- Sets `Accept: application/json`.
- Does not inject manual auth headers — relies on same-origin cookies and session behaviour managed by the protected layout.
- Throws deterministic `DashboardConsumptionError` objects for network failures, HTTP errors, and JSON parse errors.

**Error codes:**

| Code | Cause | Recoverable |
|---|---|---|
| `dashboard_api_network_error` | `fetch()` threw (network failure, CORS, timeout) | true |
| `dashboard_api_http_error` | Response was not `ok` (4xx/5xx) | true if 5xx |
| `dashboard_api_parse_error` | Response body is not valid JSON | false |

**Future extension:** The `includeMetadata` option in `DashboardFetchOptions` is reserved for future use when the API route supports query-param metadata toggling. Currently it has no effect on the HTTP call.

---

## View Model Contract

`DashboardViewModel` is the stable frontend contract. All future executive dashboard UI widgets depend on this type, not on the raw API response.

```typescript
interface DashboardViewModel {
  status: DashboardConsumptionStatus      // 'idle' | 'loading' | 'ready' | 'partial' | 'empty' | 'error'
  healthScore: number
  healthLabel: string
  executiveSummary: string
  portfolioRecommendation: string
  risksCount: number
  criticalRisksCount: number
  decisionsCount: number
  interventionsCount: number
  alertsCount: number
  hasCriticalAttention: boolean
  sections: {
    healthPanel: any
    executiveSummaryCard: any
    topRisksTable: any[]
    decisionsWidget: any[]
    interventionsQueue: any[]
    alertPanel: any[]
  }
  warnings: string[]
  error?: DashboardConsumptionError
}
```

`sections` contains the raw DTO sections from Track 8.1/8.2, passed through unchanged so that future widgets can access structured data without re-fetching.

---

## State Machine Model

`deriveDashboardConsumptionStatus(input)` maps `DashboardConsumptionInput` to a deterministic status:

| Input condition | Status |
|---|---|
| `loading: true` | `loading` |
| `fetchError` present | `error` |
| No `apiResponse` | `idle` |
| `apiResponse.status === 'ok'` | `ready` |
| `apiResponse.status === 'partial'` | `partial` |
| `apiResponse.status === 'empty'` | `empty` |
| `apiResponse.status === 'error'` | `error` |
| Unknown `apiResponse.status` | `error` |

`isDashboardActionRequired(viewModel)` returns `true` when the dashboard signals that a human response is needed:

- Status is `partial`, `empty`, or `error`
- `hasCriticalAttention` is `true`
- `criticalRisksCount > 0`
- `alertsCount > 0` and status is not `ready`

---

## Error / Empty / Partial Handling

**error:** Both network failures (`DashboardConsumptionError` via `fetchError`) and API-level errors (`apiResponse.status === 'error'`) produce an `error` status view model. The `error` field on `DashboardViewModel` is always populated with a deterministic `DashboardConsumptionError`.

**empty:** When the API returns `status: 'empty'` (no `executiveDashboardReport` available — source hydration deferred to Track 8.5), the adapter maps DTO fallback sections through safely. All array fields default to `[]` and numeric fields to `0`. Warnings from the API response are preserved.

**partial:** When the API returns `status: 'partial'` (full DTO built but some source inputs were absent), the full DTO is mapped and warnings are preserved. `isDashboardActionRequired` returns `true` for partial state, prompting the UI to surface a notice.

---

## Protected Route Integration

The protected dashboard page at `src/app/(protected)/dashboard/page.tsx` serves as the consumption proof. As a Next.js Server Component it calls the Track 8.2 API runtime directly to avoid an HTTP round-trip, then passes the result through `runDashboardConsumptionRuntime` to obtain a `DashboardViewModel`.

```typescript
// Server component pattern (avoids HTTP round-trip)
const apiResponse = runDashboardApiRuntime({ tenantId: user.companyId, userId: user.id })
const viewModel = runDashboardConsumptionRuntime({ apiResponse })
```

For client-side or server-to-server contexts, `loadPortfolioDashboardViewModel(options)` wraps the async fetch + runtime pipeline:

```typescript
// Client or async server pattern
const viewModel = await loadPortfolioDashboardViewModel({ baseUrl: 'https://app.pmfreak.com' })
```

Authentication is enforced by the protected layout (`src/app/(protected)/layout.tsx`). The consumption layer itself does not perform auth checks.

---

## Why Final UI is Deferred

Track 8.3 intentionally stops before building executive dashboard widget components. The `DashboardViewModel` contract is stable, but the visual design of individual widgets (health score card, risk table, intervention queue, alert panel) will be implemented in Track 8.4. Separating the data contract from the component layer allows:

- Independent testing of data normalisation without rendering
- Widget design iteration without changing the consumption API
- Incremental delivery of dashboard panels as each widget reaches production readiness

---

## Integration with Track 8.2 API Runtime

Track 8.3 depends on but does not duplicate the Track 8.2 API Runtime:

| Track 8.2 responsibility | Track 8.3 responsibility |
|---|---|
| Request validation (tenantId, optional fields) | None — handled upstream |
| Source data resolution (deferred to 8.5) | None — handled upstream |
| DTO building via Track 8.1 adapters | None — consumed as-is |
| Fallback DTO on empty/error | Mapped safely into `DashboardViewModel` |
| API response status: `ok/partial/empty/error` | Translated to `DashboardConsumptionStatus` |

The full API response shape (`DashboardApiResponse`) flows into `DashboardConsumptionInput.apiResponse` and is never re-interpreted by the consumption layer beyond what the view model adapter maps.

---

## Future Extension Path

| Track | Extension |
|---|---|
| **Track 8.4** | Executive dashboard UI cards — React components consume `DashboardViewModel.sections` |
| **Track 8.5** | Dashboard persistence / source hydration — `resolveDashboardSourceData` connects to Supabase; `loadPortfolioDashboardViewModel` receives richer `ok` responses |
| **Track 8.6** | Dashboard refresh / caching — `loadPortfolioDashboardViewModel` gains SWR or React Query integration; `AbortSignal` support already in `DashboardFetchOptions` |
| Future | Suspense / loading skeletons — `status: 'loading'` maps directly to Suspense boundaries |
| Future | Client-side refresh — `loadPortfolioDashboardViewModel` called from a client hook on user interaction |
| Future | Role-aware dashboard visibility — `DashboardViewModel` extended with a `visibleSections` field based on user role |
| Future | Widget-level hydration — individual sections fetched independently for faster partial renders |
| Future | Dashboard personalisation — `DashboardFetchOptions` extended with user preferences |
| Future | Realtime refresh — WebSocket or SSE integration replaces polling in the consumption runtime |
