import type { DashboardHydrationResult } from '../source-hydration/index'
import type { DashboardCacheMetadata, DashboardCachePolicy, DashboardCacheStatus, DashboardRefreshPlan } from './types'

export function buildDashboardCacheMetadata(input: {
  hydration: DashboardHydrationResult
  cacheStatus: DashboardCacheStatus
  refreshPlan: DashboardRefreshPlan
  policy: DashboardCachePolicy
}): DashboardCacheMetadata {
  const generatedAt = new Date().toISOString()
  const freshnessScore =
    input.hydration.freshness.length === 0
      ? 0
      : input.hydration.freshness.reduce((sum, entry) => sum + entry.freshnessScore, 0) / input.hydration.freshness.length

  const nextRecommendedRefreshAt =
    input.cacheStatus === 'unavailable' || input.cacheStatus === 'refresh_required'
      ? undefined
      : new Date(Date.parse(generatedAt) + input.policy.softRefreshMinutes * 60_000).toISOString()

  const warnings = [...input.hydration.warnings]
  if (input.refreshPlan.refreshRecommended || input.refreshPlan.refreshRequired) warnings.push(input.refreshPlan.reasonSummary)

  return {
    cacheStatus: input.cacheStatus,
    generatedAt,
    freshnessScore,
    completenessScore: input.hydration.completeness.completenessScore,
    riskLevel: input.hydration.riskLevel,
    refreshRequired: input.refreshPlan.refreshRequired,
    refreshRecommended: input.refreshPlan.refreshRecommended,
    nextRecommendedRefreshAt,
    warnings,
  }
}
