import type { DashboardSourceFreshness } from './types'
import { DEFAULT_DASHBOARD_CACHE_POLICY, type DashboardCachePolicy } from './types'

export function resolveDashboardCachePolicy(policy?: Partial<DashboardCachePolicy>): DashboardCachePolicy {
  const merged = { ...DEFAULT_DASHBOARD_CACHE_POLICY, ...policy }
  const maxAgeMinutes = Math.max(5, Number.isFinite(merged.maxAgeMinutes) ? merged.maxAgeMinutes : 5)
  const softRefreshMinutes = Math.max(
    1,
    Number.isFinite(merged.softRefreshMinutes) ? merged.softRefreshMinutes : DEFAULT_DASHBOARD_CACHE_POLICY.softRefreshMinutes,
  )
  const minHard = Math.max(maxAgeMinutes, softRefreshMinutes)
  const hardRefreshMinutes = Math.max(
    minHard,
    Number.isFinite(merged.hardRefreshMinutes) ? merged.hardRefreshMinutes : DEFAULT_DASHBOARD_CACHE_POLICY.hardRefreshMinutes,
  )

  return { ...merged, maxAgeMinutes, softRefreshMinutes, hardRefreshMinutes }
}

export function isRefreshIntervalElapsed(input: {
  freshness: DashboardSourceFreshness[]
  policy: DashboardCachePolicy
}): boolean {
  return input.freshness.some(
    (entry) => entry.status !== 'missing' && typeof entry.ageMinutes === 'number' && entry.ageMinutes >= input.policy.softRefreshMinutes,
  )
}
