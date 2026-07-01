import type { DashboardApprovalStatus } from '../approval-workflow/index'
import type { DashboardTaskLifecycleRecord } from '../task-lifecycle/index'
import type { DashboardApprovalActionAvailability } from './types'

export function deriveApprovalActionAvailability({
  approvalStatus,
  lifecycle,
}: {
  approvalStatus?: DashboardApprovalStatus
  lifecycle: DashboardTaskLifecycleRecord
}): DashboardApprovalActionAvailability {
  if (lifecycle.status === 'execution_completed') return { canApprove: false, canReject: false, canRequestChanges: false, disabledReason: 'Execution already completed.' }
  if (lifecycle.status === 'execution_failed' && lifecycle.retryCount > 0) return { canApprove: false, canReject: true, canRequestChanges: true, disabledReason: 'Execution retry required, not approval action.' }

  if (approvalStatus === 'approved') return { canApprove: false, canReject: false, canRequestChanges: false, disabledReason: 'Approval already granted.' }
  if (approvalStatus === 'rejected') return { canApprove: true, canReject: false, canRequestChanges: true }
  if (approvalStatus === 'expired') return { canApprove: true, canReject: true, canRequestChanges: true }

  return { canApprove: true, canReject: true, canRequestChanges: true }
}
