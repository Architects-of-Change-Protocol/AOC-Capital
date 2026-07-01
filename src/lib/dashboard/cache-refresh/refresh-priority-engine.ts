import type { DashboardRefreshAction, DashboardRefreshPriority } from './types'

const PRIORITY_ORDER: Record<DashboardRefreshPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

export function assignDashboardRefreshPriority(action: DashboardRefreshAction): DashboardRefreshPriority {
  const isExecutive = action.sourceKind === 'executive_dashboard_report'

  if (
    (isExecutive &&
      (action.reason === 'missing_source' || action.reason === 'invalid_source' || action.reason === 'expired_source')) ||
    action.reason === 'high_risk_hydration'
  ) {
    return 'critical'
  }

  if (
    (isExecutive && action.reason === 'stale_source') ||
    (action.reason === 'incomplete_hydration' && isExecutive) ||
    action.reason === 'manual_refresh'
  ) {
    return 'high'
  }

  if (
    action.reason === 'policy_interval_elapsed' ||
    action.reason === 'missing_source' ||
    action.reason === 'stale_source' ||
    action.reason === 'expired_source'
  ) {
    return 'medium'
  }

  return 'low'
}

export function prioritizeDashboardRefreshActions(actions: DashboardRefreshAction[]): DashboardRefreshAction[] {
  const dedup = new Map<string, DashboardRefreshAction>()
  for (const action of actions) {
    const prioritized = { ...action, priority: assignDashboardRefreshPriority(action) }
    dedup.set(`${prioritized.sourceKind}::${prioritized.reason}`, prioritized)
  }

  return [...dedup.values()].sort((a, b) => {
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    if (priorityDiff !== 0) return priorityDiff
    const sourceDiff = a.sourceKind.localeCompare(b.sourceKind)
    if (sourceDiff !== 0) return sourceDiff
    return a.reason.localeCompare(b.reason)
  })
}
