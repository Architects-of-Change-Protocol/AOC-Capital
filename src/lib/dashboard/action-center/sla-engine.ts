import type { DashboardAction, DashboardActionSLA } from './types'

export function assignDashboardActionSLA(action: DashboardAction): DashboardActionSLA {
  const base = action.priority === 'critical' ? { responseDueHours: 4, resolutionDueHours: 24, cadence: 'Daily checkpoint until resolved' }
    : action.priority === 'high' ? { responseDueHours: 8, resolutionDueHours: 48, cadence: 'Every 48 hours until controlled' }
    : action.priority === 'medium' ? { responseDueHours: 24, resolutionDueHours: 120, cadence: 'Twice weekly follow-up' }
    : { responseDueHours: 72, resolutionDueHours: 240, cadence: 'Weekly governance review' }

  if ((action.type === 'refresh_dashboard_source') && (action.priority === 'critical' || action.priority === 'high')) return { ...base, cadence: 'Refresh and rehydrate before next dashboard review' }
  if ((action.type === 'review_executive_decision') && (action.priority === 'critical' || action.priority === 'high')) return { ...base, cadence: 'Executive decision checkpoint within 24 hours' }
  if ((action.type === 'request_missing_input') && (action.priority === 'critical' || action.priority === 'high')) return { ...base, cadence: 'Daily client follow-up until input received' }
  if ((action.type === 'review_financial_exposure') && (action.priority === 'critical' || action.priority === 'high')) return { ...base, cadence: 'Daily finance/logistics checkpoint until blocker is resolved' }
  return base
}
