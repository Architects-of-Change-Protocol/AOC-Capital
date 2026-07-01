import type { DashboardApprovalApproverLane } from '../approval-workflow/index'
import type { DashboardApprovalQueueCard, DashboardApprovalQueueGroup, DashboardApprovalQueueSeverity } from './types'

const SEVERITY_ORDER: DashboardApprovalQueueSeverity[] = ['critical', 'high', 'medium', 'low']
const LANE_ORDER: DashboardApprovalApproverLane[] = ['pmo_director', 'executive_sponsor', 'finance_lead', 'technical_lead', 'project_manager', 'security_owner', 'system_owner']

export function groupApprovalCardsBySeverity(cards: DashboardApprovalQueueCard[]): DashboardApprovalQueueGroup[] {
  return SEVERITY_ORDER
    .map((severity) => ({ key: severity, label: severity, cards: cards.filter((card) => card.severity === severity) }))
    .filter((group) => group.cards.length > 0)
    .map((group) => ({ ...group, count: group.cards.length }))
}

export function groupApprovalCardsByApproverLane(cards: DashboardApprovalQueueCard[]): DashboardApprovalQueueGroup[] {
  return LANE_ORDER
    .map((lane) => {
      const laneCards = cards.filter((card) => card.approverLanes.includes(lane))
      return { key: lane, label: lane, cards: laneCards }
    })
    .filter((group) => group.cards.length > 0)
    .map((group) => ({ ...group, count: group.cards.length }))
}
