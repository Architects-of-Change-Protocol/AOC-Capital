import type { DashboardAction, DashboardActionExecutionLane } from './types'

export function assignDashboardActionExecutionLane(action: DashboardAction): DashboardActionExecutionLane {
  switch (action.type) {
    case 'refresh_dashboard_source': return 'dashboard_refresh'
    case 'recover_dashboard_hydration': return 'system_recovery'
    case 'approve_refresh_plan': return 'dashboard_refresh'
    case 'resolve_portfolio_risk': return 'risk_management'
    case 'execute_pmo_intervention': return 'pmo_intervention'
    case 'review_executive_decision': return 'executive_decision'
    case 'escalate_dashboard_alert':
    case 'acknowledge_warning': return 'portfolio_governance'
    case 'open_follow_up_cadence': return 'pmo_intervention'
    case 'request_missing_input': return 'client_coordination'
    case 'resolve_dependency': return 'dependency_management'
    case 'review_financial_exposure': return 'financial_governance'
    default: return 'portfolio_governance'
  }
}
