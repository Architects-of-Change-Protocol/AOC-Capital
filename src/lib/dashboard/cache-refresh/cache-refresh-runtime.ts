import { runDashboardSourceHydration } from '../source-hydration/index'
import { evaluateDashboardCacheStatus } from './cache-health-engine'
import { buildDashboardCacheMetadata } from './cache-metadata-engine'
import { isRefreshIntervalElapsed, resolveDashboardCachePolicy } from './cache-policy-engine'
import { buildDashboardRefreshPlan } from './refresh-planner'
import type { DashboardCacheRefreshInput, DashboardCacheRefreshResult } from './types'

export async function runDashboardCacheRefresh(input: DashboardCacheRefreshInput): Promise<DashboardCacheRefreshResult> {
  const policy = resolveDashboardCachePolicy(input.policy)
  const hydration = await runDashboardSourceHydration({
    request: { ...input.request, maxAgeMinutes: policy.maxAgeMinutes },
    store: input.store,
  })

  const cacheStatus = evaluateDashboardCacheStatus({
    hydration,
    policy,
    manualRefresh: input.manualRefresh,
  })

  const intervalElapsed = isRefreshIntervalElapsed({ freshness: hydration.freshness, policy })
  const refreshPlan = buildDashboardRefreshPlan({
    hydration,
    cacheStatus,
    policy,
    manualRefresh: input.manualRefresh,
    intervalElapsed,
  })

  const metadata = buildDashboardCacheMetadata({ hydration, cacheStatus, refreshPlan, policy })

  return { hydration, cacheStatus, refreshPlan, metadata }
}
