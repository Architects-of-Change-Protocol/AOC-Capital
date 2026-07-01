import type { DashboardActionPriority, DashboardActionOwnerLane, DashboardActionExecutionLane, DashboardAction } from '@/lib/dashboard/action-center'
import type { DashboardActionDisplayGroup } from './types'

export const PRIORITY_BADGE_STYLES: Record<DashboardActionPriority, string> = {
  low: 'bg-slate-700/50 text-slate-300 border-slate-600/40',
  medium: 'bg-blue-900/50 text-blue-200 border-blue-700/40',
  high: 'bg-amber-900/50 text-amber-200 border-amber-700/40',
  critical: 'bg-red-900/60 text-red-200 border-red-600/50',
}

export const PRIORITY_BADGE_LABELS: Record<DashboardActionPriority, string> = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
  critical: 'CRITICAL',
}

export const OWNER_LANE_LABELS: Record<DashboardActionOwnerLane, string> = {
  project_manager: 'Project Manager',
  pmo_director: 'PMO Director',
  technical_lead: 'Technical Lead',
  finance_lead: 'Finance Lead',
  logistics_lead: 'Logistics Lead',
  executive_sponsor: 'Executive Sponsor',
  client_owner: 'Client Owner',
  vendor_owner: 'Vendor Owner',
  system_runtime: 'System Runtime',
}

export const EXECUTION_LANE_LABELS: Record<DashboardActionExecutionLane, string> = {
  dashboard_refresh: 'Dashboard Refresh',
  portfolio_governance: 'Portfolio Governance',
  pmo_intervention: 'PMO Intervention',
  executive_decision: 'Executive Decision',
  risk_management: 'Risk Management',
  dependency_management: 'Dependency Management',
  financial_governance: 'Financial Governance',
  client_coordination: 'Client Coordination',
  technical_coordination: 'Technical Coordination',
  system_recovery: 'System Recovery',
}

export const PRIORITY_ORDER: DashboardActionPriority[] = ['critical', 'high', 'medium', 'low']

export const PRIORITY_GROUP_LABELS: Record<DashboardActionPriority, string> = {
  critical: 'Critical',
  high: 'High Priority',
  medium: 'Medium Priority',
  low: 'Low Priority',
}

export function groupActionsByPriority(actions: DashboardAction[]): DashboardActionDisplayGroup[] {
  const groups: Record<DashboardActionPriority, DashboardAction[]> = {
    critical: [], high: [], medium: [], low: [],
  }
  for (const action of actions) {
    if (groups[action.priority]) groups[action.priority].push(action)
  }
  return PRIORITY_ORDER
    .filter(p => groups[p].length > 0)
    .map(p => ({ priority: p, actions: groups[p] }))
}
