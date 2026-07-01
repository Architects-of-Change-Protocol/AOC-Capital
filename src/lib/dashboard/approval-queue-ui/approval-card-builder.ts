import type { DashboardApprovalDecision, DashboardApprovalRequest, DashboardApprovalStatus } from '../approval-workflow/index'
import type { DashboardTaskLifecycleRecord } from '../task-lifecycle/index'
import { deriveApprovalActionAvailability } from './approval-action-engine'
import { buildApprovalDecisionHistory } from './approval-history-engine'
import type { DashboardApprovalQueueCard, DashboardApprovalQueueCardState, DashboardApprovalQueueSeverity } from './types'

function deriveState(lifecycle: DashboardTaskLifecycleRecord, approvalStatus: DashboardApprovalStatus): DashboardApprovalQueueCardState {
  if (lifecycle.status === 'execution_failed' && lifecycle.retryCount > 0) return 'retry_attention'
  if (lifecycle.status === 'approval_pending') return 'action_required'
  if (lifecycle.status === 'execution_blocked') return 'blocked'
  if (lifecycle.status === 'approved') return 'approved'
  if (lifecycle.status === 'rejected') return 'rejected'
  if (lifecycle.status === 'expired') return 'expired'
  if (lifecycle.status === 'execution_completed') return 'completed'

  if (approvalStatus === 'pending') return 'action_required'
  if (approvalStatus === 'approved') return 'approved'
  if (approvalStatus === 'rejected') return 'rejected'
  if (approvalStatus === 'expired') return 'expired'
  return 'blocked'
}

function deriveSeverity(lifecycle: DashboardTaskLifecycleRecord, approvalRequest?: DashboardApprovalRequest): DashboardApprovalQueueSeverity {
  if (approvalRequest?.riskLevel === 'critical' || (lifecycle.status === 'execution_failed' && lifecycle.retryCount > 0)) return 'critical'
  if (lifecycle.status === 'approval_pending' || lifecycle.status === 'execution_blocked') return 'high'
  if (lifecycle.status === 'approved' || lifecycle.status === 'ready_for_execution') return 'medium'
  if (lifecycle.status === 'execution_completed' || lifecycle.status === 'execution_simulated') return 'low'
  return 'medium'
}

export function buildApprovalQueueCard({ lifecycle, approvalRequest, decisions = [] }: { lifecycle: DashboardTaskLifecycleRecord, approvalRequest?: DashboardApprovalRequest, decisions?: DashboardApprovalDecision[] }): DashboardApprovalQueueCard {
  const approvalStatus = approvalRequest?.status ?? lifecycle.approvalRequest?.status ?? 'not_required'
  const state = deriveState(lifecycle, approvalStatus)
  const blockedReason = lifecycle.status === 'execution_blocked'
    ? approvalRequest?.reasons?.[0] ?? lifecycle.approvalRequest?.reasons?.[0] ?? 'Execution blocked pending approval workflow state.'
    : lifecycle.status === 'approval_pending'
      ? approvalRequest?.reasons?.[0] ?? lifecycle.approvalRequest?.reasons?.[0]
      : undefined

  return {
    id: `approval-queue-card:${lifecycle.id}`,
    lifecycleId: lifecycle.id,
    envelopeId: lifecycle.envelopeId,
    actionTitle: approvalRequest?.actionTitle ?? lifecycle.envelope.payload.title,
    adapter: lifecycle.adapter,
    severity: deriveSeverity(lifecycle, approvalRequest),
    state,
    approvalStatus,
    approverLanes: approvalRequest?.requiredApproverLanes ?? lifecycle.approvalRequest?.requiredApproverLanes ?? [],
    lifecycleStatus: lifecycle.status,
    retryCount: lifecycle.retryCount,
    blockedReason,
    decisionHistory: buildApprovalDecisionHistory(decisions),
    actions: deriveApprovalActionAvailability({ approvalStatus, lifecycle }),
  }
}
