import type {
  DashboardHydrationResult,
  DashboardSnapshotStore,
  DashboardSourceFreshness,
  DashboardSourceHydrationRequest,
  DashboardSourceKind,
} from '../source-hydration/index'

export type DashboardCacheStatus =
  | 'usable'
  | 'usable_with_warnings'
  | 'refresh_recommended'
  | 'refresh_required'
  | 'unavailable'

export type DashboardRefreshReason =
  | 'missing_source'
  | 'stale_source'
  | 'invalid_source'
  | 'expired_source'
  | 'incomplete_hydration'
  | 'high_risk_hydration'
  | 'manual_refresh'
  | 'policy_interval_elapsed'

export type DashboardRefreshPriority = 'low' | 'medium' | 'high' | 'critical'

export interface DashboardCachePolicy {
  maxAgeMinutes: number
  softRefreshMinutes: number
  hardRefreshMinutes: number
  allowPartialCache: boolean
  requireExecutiveDashboardReport: boolean
}

export interface DashboardRefreshAction {
  id: string
  sourceKind: DashboardSourceKind
  reason: DashboardRefreshReason
  priority: DashboardRefreshPriority
  title: string
  description: string
}

export interface DashboardRefreshPlan {
  refreshRequired: boolean
  refreshRecommended: boolean
  actions: DashboardRefreshAction[]
  priority: DashboardRefreshPriority
  reasonSummary: string
}

export interface DashboardCacheMetadata {
  cacheStatus: DashboardCacheStatus
  generatedAt: string
  freshnessScore: number
  completenessScore: number
  riskLevel: string
  refreshRequired: boolean
  refreshRecommended: boolean
  nextRecommendedRefreshAt?: string
  warnings: string[]
}

export interface DashboardCacheRefreshInput {
  request: DashboardSourceHydrationRequest
  store: DashboardSnapshotStore
  policy?: Partial<DashboardCachePolicy>
  manualRefresh?: boolean
}

export interface DashboardCacheRefreshResult {
  hydration: DashboardHydrationResult
  cacheStatus: DashboardCacheStatus
  refreshPlan: DashboardRefreshPlan
  metadata: DashboardCacheMetadata
}

export const DEFAULT_DASHBOARD_CACHE_POLICY: DashboardCachePolicy = {
  maxAgeMinutes: 60,
  softRefreshMinutes: 45,
  hardRefreshMinutes: 180,
  allowPartialCache: true,
  requireExecutiveDashboardReport: true,
}

export type { DashboardSourceFreshness }
