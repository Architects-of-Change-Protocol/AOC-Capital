import { runDashboardCacheRefresh } from '../cache-refresh/index'
import type { DashboardRefreshAction } from '../cache-refresh/index'
import type {
  DashboardBackgroundRefreshRequest,
  DashboardBackgroundRefreshPlannerResult,
} from './types'

export async function planDashboardBackgroundRefresh(
  request: DashboardBackgroundRefreshRequest,
): Promise<DashboardBackgroundRefreshPlannerResult> {
  const { hydrationRequest, store, trigger, requestedSourceKinds, maxActions } = request

  const cacheRefreshResult = await runDashboardCacheRefresh({
    request: hydrationRequest,
    store,
    manualRefresh: trigger === 'manual',
  })

  const refreshPlan = cacheRefreshResult.refreshPlan
  let selectedActions: DashboardRefreshAction[] = [...refreshPlan.actions]

  if (requestedSourceKinds && requestedSourceKinds.length > 0) {
    const planActionsByKind = new Map(refreshPlan.actions.map((a) => [a.sourceKind, a]))
    const filteredActions: DashboardRefreshAction[] = []

    for (const sourceKind of requestedSourceKinds) {
      if (planActionsByKind.has(sourceKind)) {
        filteredActions.push(planActionsByKind.get(sourceKind)!)
      } else {
        filteredActions.push({
          id: `manual-request:${sourceKind}`,
          sourceKind,
          reason: 'manual_refresh',
          priority: 'high',
          title: `Manual refresh requested for ${sourceKind}`,
          description: 'Manual source refresh was explicitly requested.',
        })
      }
    }

    selectedActions = filteredActions
  }

  const seen = new Set<string>()
  selectedActions = selectedActions.filter((a) => {
    const key = `${a.sourceKind}::${a.reason}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  if (maxActions != null && maxActions > 0) {
    selectedActions = selectedActions.slice(0, maxActions)
  }

  if (selectedActions.length === 0) {
    return { refreshPlan, selectedActions: [], skippedReason: 'No refresh actions selected.' }
  }

  return { refreshPlan, selectedActions }
}
