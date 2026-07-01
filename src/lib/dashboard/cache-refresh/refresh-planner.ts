import type { DashboardHydrationResult, DashboardSourceKind } from '../source-hydration/index'
import { prioritizeDashboardRefreshActions } from './refresh-priority-engine'
import type {
  DashboardCachePolicy,
  DashboardCacheStatus,
  DashboardRefreshAction,
  DashboardRefreshPlan,
  DashboardRefreshReason,
} from './types'

function buildAction(sourceKind: DashboardSourceKind, reason: DashboardRefreshReason, title: string, description: string): DashboardRefreshAction {
  return { id: `${sourceKind}:${reason}`, sourceKind, reason, priority: 'medium', title, description }
}

export function buildDashboardRefreshPlan(input: {
  hydration: DashboardHydrationResult
  cacheStatus: DashboardCacheStatus
  policy: DashboardCachePolicy
  manualRefresh?: boolean
  intervalElapsed?: boolean
}): DashboardRefreshPlan {
  const actions: DashboardRefreshAction[] = []
  for (const freshness of input.hydration.freshness) {
    if (freshness.status === 'missing') {
      actions.push(buildAction(freshness.sourceKind, 'missing_source', `Missing ${freshness.sourceKind}`, `Source ${freshness.sourceKind} is missing.`))
    }
    if (freshness.status === 'invalid') {
      actions.push(buildAction(freshness.sourceKind, 'invalid_source', `Invalid ${freshness.sourceKind}`, `Source ${freshness.sourceKind} failed validation.`))
    }
    if (freshness.status === 'stale') {
      actions.push(buildAction(freshness.sourceKind, 'stale_source', `Stale ${freshness.sourceKind}`, `Source ${freshness.sourceKind} is stale.`))
    }
    if (freshness.reason.includes('expired')) {
      actions.push(buildAction(freshness.sourceKind, 'expired_source', `Expired ${freshness.sourceKind}`, `Source ${freshness.sourceKind} is expired.`))
    }
  }

  if (input.hydration.completeness.completenessScore < 100) {
    const sourceKind = input.hydration.completeness.missingSources.includes('executive_dashboard_report')
      ? 'executive_dashboard_report'
      : input.hydration.completeness.missingSources[0] ?? 'executive_dashboard_report'
    actions.push(
      buildAction(sourceKind, 'incomplete_hydration', 'Incomplete hydration', 'Hydration completeness score is below 100.'),
    )
  }

  if (input.hydration.riskLevel === 'high' || input.hydration.riskLevel === 'critical') {
    actions.push(
      buildAction('executive_dashboard_report', 'high_risk_hydration', 'High risk hydration', `Hydration risk level is ${input.hydration.riskLevel}.`),
    )
  }

  if (input.manualRefresh) {
    actions.push(
      buildAction('executive_dashboard_report', 'manual_refresh', 'Manual refresh requested', 'A manual refresh was requested.'),
    )
  }

  if (input.intervalElapsed) {
    actions.push(
      buildAction(
        'executive_dashboard_report',
        'policy_interval_elapsed',
        'Refresh interval elapsed',
        'Policy soft refresh interval has elapsed.',
      ),
    )
  }

  const prioritized = prioritizeDashboardRefreshActions(actions)
  const highest = prioritized[0]?.priority ?? 'low'
  const refreshRequired =
    input.cacheStatus === 'refresh_required' || input.cacheStatus === 'unavailable' || prioritized.some((a) => a.priority === 'critical')
  const refreshRecommended = prioritized.length > 0

  return {
    refreshRequired,
    refreshRecommended,
    actions: prioritized,
    priority: highest,
    reasonSummary: refreshRecommended
      ? `Dashboard refresh required because ${prioritized.length} source action(s) were detected.`
      : 'Dashboard cache is usable; no refresh action required.',
  }
}
