import type { DashboardAction } from '../action-center'
import type { DashboardManualPushEnvelope } from '../manual-task-push'
import type {
  DashboardApprovalEvaluation,
  DashboardApprovalPolicy,
  DashboardApprovalRequest,
} from './types'

export function buildDashboardApprovalRequest(input: {
  envelope: DashboardManualPushEnvelope
  action?: DashboardAction
  evaluation: DashboardApprovalEvaluation
  policy: DashboardApprovalPolicy
  now: string
}): DashboardApprovalRequest {
  const { envelope, action, evaluation, policy, now } = input
  const pending = evaluation.approvalRequired
  const expiresAt = pending ? new Date(new Date(now).getTime() + (policy.approvalExpiryHours * 60 * 60 * 1000)).toISOString() : undefined

  return {
    id: `approval:${envelope.id}`,
    envelopeId: envelope.id,
    actionId: envelope.actionId,
    adapter: envelope.adapter,
    actionTitle: action?.title ?? envelope.payload.title,
    priority: action?.priority ?? 'medium',
    ownerLane: action?.ownerLane ?? 'project_manager',
    requestedBy: envelope.requestedBy,
    requestedAt: now,
    status: pending ? 'pending' : 'not_required',
    riskLevel: evaluation.riskLevel,
    requiredApproverLanes: [...evaluation.requiredApproverLanes],
    reasons: [...evaluation.reasons],
    expiresAt,
  }
}
