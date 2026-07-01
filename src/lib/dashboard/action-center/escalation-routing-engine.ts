import type { DashboardAction, DashboardActionEscalationRoute } from './types'

export function buildDashboardActionEscalationRoute(action: DashboardAction): DashboardActionEscalationRoute {
  const required = action.priority === 'critical' || action.type === 'review_executive_decision' || action.type === 'escalate_dashboard_alert' ||
    (action.type === 'review_financial_exposure' && action.priority === 'high') ||
    action.type === 'resolve_portfolio_risk' ||
    action.type === 'execute_pmo_intervention'

  if (!required) return { required: false, reason: 'Escalation not required by current priority and type policy.' }
  if (action.type === 'review_executive_decision') return { required: true, routeTo: 'executive_sponsor', reason: 'Executive decisions require executive sponsorship oversight.' }
  if (action.type === 'review_financial_exposure') return { required: true, routeTo: 'finance_lead', reason: 'Financial exposure requires finance leadership escalation.' }
  if (action.type === 'refresh_dashboard_source' || action.type === 'recover_dashboard_hydration') return { required: true, routeTo: 'system_runtime', reason: 'Dashboard source and recovery actions escalate to system runtime operations.' }
  if (action.type === 'request_missing_input') return { required: true, routeTo: 'client_owner', reason: 'Client input blockers escalate to client ownership lane.' }
  if (action.type === 'resolve_dependency') return { required: true, routeTo: 'technical_lead', reason: 'Dependency blockers escalate to technical ownership.' }
  return { required: true, routeTo: 'pmo_director', reason: 'Critical risk, alert, or intervention requires PMO director escalation.' }
}
