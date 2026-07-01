# Dashboard Cache / Refresh Runtime (Track 8.6)

## Purpose
Track 8.6 introduces a deterministic runtime that evaluates hydrated dashboard snapshots and decides cache usability, refresh eligibility, action priorities, and cache metadata for API/frontend consumers.

## Cache policy model
The runtime resolves a normalized cache policy with clamped limits:
- max age window
- soft refresh cadence
- hard refresh threshold
- partial cache allowance
- executive dashboard requirement

## Cache status taxonomy
- `usable`
- `usable_with_warnings`
- `refresh_recommended`
- `refresh_required`
- `unavailable`

## Refresh reason taxonomy
- missing_source
- stale_source
- invalid_source
- expired_source
- incomplete_hydration
- high_risk_hydration
- manual_refresh
- policy_interval_elapsed

## Refresh priority model
Priority assignment is deterministic:
- critical for executive missing/invalid/expired and high-risk hydration
- high for executive stale, executive incomplete hydration, and manual refresh
- medium for optional stale/missing/expired and interval elapsed
- low for preventive optional actions

## Refresh planning behavior
The planner translates hydration freshness/completeness/risk/manual flags into deduplicated actions, prioritizes them, and emits plan-level `refreshRequired` and `refreshRecommended` flags with deterministic summary text.

## Cache metadata contract
Metadata includes:
- cache status
- generated timestamp
- freshness average score
- completeness score
- risk level
- refresh flags
- next recommended refresh timestamp (when applicable)
- warnings list

## Runtime orchestration
`runDashboardCacheRefresh()` pipeline:
1. Resolve policy
2. Run Track 8.5 hydration with `maxAgeMinutes` override
3. Evaluate cache status
4. Detect interval elapsed
5. Build refresh plan
6. Build metadata
7. Return deterministic runtime result

## Integration with Track 8.5
Track 8.6 composes `runDashboardSourceHydration()` and existing source hydration types/store interfaces without changing hydration persistence or mutation behavior.

## Why background jobs are deferred
This track provides deterministic planning only. Execution of refresh actions remains deferred to future tracks to avoid introducing asynchronous workers before orchestration contracts stabilize.

## Future extension path
- Background refresh workers
- Supabase/Vault refresh persistence
- Cache invalidation events
- ETag / HTTP cache headers
- Widget-level refresh strategy
- Manual refresh endpoint
- Refresh audit trail
- Tenant-specific cache policies
