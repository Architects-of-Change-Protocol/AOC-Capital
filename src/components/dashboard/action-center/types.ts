import type { DashboardAction, DashboardActionCenterReport } from '@/lib/dashboard/action-center'

export type { DashboardAction, DashboardActionCenterReport }

export type DashboardActionUISeverity = 'low' | 'medium' | 'high' | 'critical'

export interface DashboardActionDisplayGroup {
  priority: DashboardActionUISeverity
  actions: DashboardAction[]
}

export interface DashboardActionUISummary {
  totalActions: number
  criticalActions: number
  escalationRequiredCount: number
  hasRecommendedNextAction: boolean
}
