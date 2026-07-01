import type { DashboardAction } from '../action-center'
import type { DashboardManualPushEnvelope } from '../manual-task-push'
import type {
  DashboardApprovalApproverLane,
  DashboardApprovalEvaluation,
} from './types'

const DETERMINISTIC_APPROVER_ORDER: DashboardApprovalApproverLane[] = [
  'project_manager',
  'technical_lead',
  'finance_lead',
  'pmo_director',
  'executive_sponsor',
  'security_owner',
  'system_owner',
]

export function routeDashboardApprovalApprovers(input: {
  envelope: DashboardManualPushEnvelope
  action?: DashboardAction
  evaluation: DashboardApprovalEvaluation
}): DashboardApprovalApproverLane[] {
  const { envelope, action, evaluation } = input
  if (!evaluation.approvalRequired) return []

  const set = new Set<DashboardApprovalApproverLane>()

  if (action?.type === 'review_financial_exposure') set.add('finance_lead')
  if (action?.type === 'review_executive_decision') set.add('executive_sponsor')
  if (action?.priority === 'critical') set.add('pmo_director')
  if (action?.executionLane === 'technical_coordination' || action?.executionLane === 'dependency_management') set.add('technical_lead')
  if (action?.escalationRoute?.required) set.add('pmo_director')
  if (envelope.adapter !== 'internal_runtime') set.add('system_owner')

  if (!set.has('pmo_director')) set.add('project_manager')

  return DETERMINISTIC_APPROVER_ORDER.filter((lane) => set.has(lane))
}
