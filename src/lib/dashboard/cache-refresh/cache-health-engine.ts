import type { DashboardCachePolicy, DashboardCacheStatus } from './types'
import type { DashboardHydrationResult } from '../source-hydration/index'

export function evaluateDashboardCacheStatus(input: {
  hydration: DashboardHydrationResult
  policy: DashboardCachePolicy
  manualRefresh?: boolean
}): DashboardCacheStatus {
  const { hydration, policy, manualRefresh } = input

  if (manualRefresh) return 'refresh_required'
  if (!hydration.sourceData.executiveDashboardReport && policy.requireExecutiveDashboardReport) return 'unavailable'
  if (hydration.riskLevel === 'critical') return 'refresh_required'
  if (!hydration.completeness.requiredSourcesPresent) return 'refresh_required'
  if (hydration.freshness.some((entry) => entry.status === 'invalid')) return 'refresh_required'
  if (hydration.freshness.some((entry) => entry.status === 'stale')) return 'refresh_recommended'
  if (hydration.warnings.length > 0) return 'usable_with_warnings'
  if (hydration.completeness.completenessScore < 100 && !policy.allowPartialCache) return 'refresh_required'
  if (hydration.completeness.completenessScore < 100 && policy.allowPartialCache) return 'usable_with_warnings'
  return 'usable'
}

export function isDashboardCacheUsable(status: DashboardCacheStatus): boolean {
  return status === 'usable' || status === 'usable_with_warnings' || status === 'refresh_recommended'
}
