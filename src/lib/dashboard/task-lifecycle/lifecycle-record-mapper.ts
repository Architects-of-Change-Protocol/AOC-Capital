import type { DashboardApprovalDecision, DashboardApprovalRequest } from '../approval-workflow'
import type { DashboardManualPushEnvelope } from '../manual-task-push'
import type { DashboardTaskLifecycleRecord, DashboardTaskLifecycleStatus } from './types'

export function buildLifecycleId(input: { envelopeId: string }): string {
  return `task-lifecycle:${input.envelopeId}`
}

export function createLifecycleRecordFromEnvelope(input: {
  envelope: DashboardManualPushEnvelope
  now: string
}): DashboardTaskLifecycleRecord {
  const status: DashboardTaskLifecycleStatus = input.envelope.mode === 'dry_run' ? 'execution_simulated' : 'created'
  return {
    id: buildLifecycleId({ envelopeId: input.envelope.id }),
    envelopeId: input.envelope.id,
    actionId: input.envelope.actionId,
    adapter: input.envelope.adapter,
    status,
    envelope: { ...input.envelope },
    approvalDecisions: [],
    retryCount: 0,
    createdAt: input.now,
    updatedAt: input.now,
  }
}

const APPROVAL_STATUS_TO_LIFECYCLE_STATUS: Record<string, DashboardTaskLifecycleStatus> = {
  not_required: 'approval_not_required',
  pending: 'approval_pending',
  approved: 'approved',
  rejected: 'rejected',
  changes_requested: 'changes_requested',
  expired: 'expired',
  blocked: 'execution_blocked',
}

export function mergeApprovalIntoLifecycle(input: {
  lifecycle: DashboardTaskLifecycleRecord
  approvalRequest?: DashboardApprovalRequest
  approvalDecisions?: DashboardApprovalDecision[]
  now: string
}): DashboardTaskLifecycleRecord {
  const next: DashboardTaskLifecycleRecord = {
    ...input.lifecycle,
    envelope: { ...input.lifecycle.envelope },
    approvalRequest: input.approvalRequest ? { ...input.approvalRequest } : undefined,
    approvalDecisions: [...(input.approvalDecisions ?? [])],
    updatedAt: input.now,
  }

  if (input.approvalRequest) {
    next.status = APPROVAL_STATUS_TO_LIFECYCLE_STATUS[input.approvalRequest.status] ?? next.status
  }

  return next
}
