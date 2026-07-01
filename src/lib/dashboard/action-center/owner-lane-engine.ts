import type { DashboardAction, DashboardActionOwnerLane } from './types'

const OWNER_LANES = new Set<DashboardActionOwnerLane>([
  'project_manager','pmo_director','technical_lead','finance_lead','logistics_lead','executive_sponsor','client_owner','vendor_owner','system_runtime',
])

export function assignDashboardActionOwnerLane(action: DashboardAction): DashboardActionOwnerLane {
  switch (action.type) {
    case 'refresh_dashboard_source':
    case 'recover_dashboard_hydration': return 'system_runtime'
    case 'approve_refresh_plan': return 'pmo_director'
    case 'resolve_portfolio_risk': return 'project_manager'
    case 'execute_pmo_intervention': return OWNER_LANES.has(action.ownerLane) ? action.ownerLane : 'project_manager'
    case 'review_executive_decision': return 'executive_sponsor'
    case 'escalate_dashboard_alert': return 'pmo_director'
    case 'acknowledge_warning':
    case 'open_follow_up_cadence': return 'project_manager'
    case 'request_missing_input': return 'client_owner'
    case 'resolve_dependency': return 'technical_lead'
    case 'review_financial_exposure': return 'finance_lead'
    default: return 'project_manager'
  }
}
