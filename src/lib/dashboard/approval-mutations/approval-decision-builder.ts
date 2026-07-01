import type { DashboardApprovalDecisionType, DashboardApprovalDecision } from '../approval-workflow/index'
import type { DashboardApprovalMutationDecision, DashboardApprovalMutationRequest } from './types'

export function mapMutationToApprovalDecisionType(decision: DashboardApprovalMutationDecision): DashboardApprovalDecisionType {
  if (decision === 'approve') return 'approve'
  if (decision === 'reject') return 'reject'
  return 'request_changes'
}

export function buildApprovalDecisionFromMutation(input: {
  mutation: DashboardApprovalMutationRequest
  now: string
}): DashboardApprovalDecision {
  const { mutation, now } = input
  return {
    requestId: mutation.requestId,
    decision: mapMutationToApprovalDecisionType(mutation.decision),
    decidedBy: mutation.actor.id,
    decidedAt: mutation.decidedAt ?? now,
    comment:
      mutation.decision === 'defer'
        ? `Deferred: ${mutation.comment || 'No comment provided.'}`
        : mutation.comment,
  }
}
