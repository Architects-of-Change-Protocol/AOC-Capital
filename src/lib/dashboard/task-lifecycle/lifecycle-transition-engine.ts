import type { DashboardApprovalRequest, DashboardApprovalWorkflowReport } from '../approval-workflow'
import type { DashboardTaskLifecycleRecord, DashboardTaskLifecycleTransition } from './types'

export function deriveLifecycleTransitionFromApproval(input: {
  lifecycle: DashboardTaskLifecycleRecord
  approvalRequest?: DashboardApprovalRequest
}): DashboardTaskLifecycleTransition | null {
  const request = input.approvalRequest
  if (!request) return null

  const base = { lifecycleId: input.lifecycle.id, fromStatus: input.lifecycle.status, actor: input.lifecycle.envelope.requestedBy }
  switch (request.status) {
    case 'not_required': return { ...base, toStatus: 'approval_not_required', eventType: 'approval_not_required', reason: 'Approval not required for this envelope.' }
    case 'pending': return { ...base, toStatus: 'approval_pending', eventType: 'approval_requested', reason: 'Approval request is pending.' }
    case 'approved': return { ...base, toStatus: 'approved', eventType: 'approval_approved', reason: 'Approval request was approved.' }
    case 'rejected': return { ...base, toStatus: 'rejected', eventType: 'approval_rejected', reason: 'Approval request was rejected.' }
    case 'changes_requested': return { ...base, toStatus: 'changes_requested', eventType: 'approval_changes_requested', reason: 'Changes were requested before approval.' }
    case 'expired': return { ...base, toStatus: 'expired', eventType: 'approval_expired', reason: 'Approval request expired.' }
    default: return null
  }
}

export function deriveExecutionReadinessTransition(input: {
  lifecycle: DashboardTaskLifecycleRecord
  approvalWorkflowReport?: DashboardApprovalWorkflowReport
}): DashboardTaskLifecycleTransition | null {
  const { lifecycle, approvalWorkflowReport } = input
  const executable = new Set(approvalWorkflowReport?.executableEnvelopeIds ?? [])
  const blocked = new Set(approvalWorkflowReport?.blockedEnvelopeIds ?? [])

  if (blocked.has(lifecycle.envelopeId)) {
    return { lifecycleId: lifecycle.id, fromStatus: lifecycle.status, toStatus: 'execution_blocked', eventType: 'execution_blocked', reason: 'Execution blocked by approval workflow gate.', actor: lifecycle.envelope.requestedBy }
  }

  if (lifecycle.envelope.mode === 'dry_run') {
    return { lifecycleId: lifecycle.id, fromStatus: lifecycle.status, toStatus: 'execution_simulated', eventType: 'execution_simulated', reason: 'Dry-run envelope simulated execution only.', actor: lifecycle.envelope.requestedBy }
  }

  if (['rejected', 'changes_requested', 'expired'].includes(lifecycle.status)) return null

  if (executable.has(lifecycle.envelopeId)) {
    return { lifecycleId: lifecycle.id, fromStatus: lifecycle.status, toStatus: 'ready_for_execution', eventType: 'execution_ready', reason: 'Execution gate is open and ready.', actor: lifecycle.envelope.requestedBy }
  }

  return null
}
