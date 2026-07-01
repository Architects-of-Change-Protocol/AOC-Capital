import type { DashboardApprovalWorkflowReport } from '../approval-workflow'
import { buildEventFromTransition } from './lifecycle-audit-engine'
import { deriveExecutionReadinessTransition, deriveLifecycleTransitionFromApproval } from './lifecycle-transition-engine'
import type { DashboardTaskLifecycleEvent, DashboardTaskLifecycleRecord } from './types'

export function reconcileDashboardTaskLifecycle(input: {
  lifecycle: DashboardTaskLifecycleRecord
  approvalWorkflowReport?: DashboardApprovalWorkflowReport
  now: string
  actor?: string
}): { lifecycle: DashboardTaskLifecycleRecord; events: DashboardTaskLifecycleEvent[] } {
  let current = { ...input.lifecycle, envelope: { ...input.lifecycle.envelope }, approvalDecisions: [...input.lifecycle.approvalDecisions] }
  const events: DashboardTaskLifecycleEvent[] = []

  const approvalTransition = deriveLifecycleTransitionFromApproval({ lifecycle: current, approvalRequest: current.approvalRequest })
  if (approvalTransition && approvalTransition.fromStatus !== approvalTransition.toStatus) {
    current = { ...current, status: approvalTransition.toStatus, updatedAt: input.now }
    events.push(buildEventFromTransition({ transition: { ...approvalTransition, actor: input.actor ?? approvalTransition.actor }, now: input.now }))
  }

  const executionTransition = deriveExecutionReadinessTransition({ lifecycle: current, approvalWorkflowReport: input.approvalWorkflowReport })
  if (executionTransition && executionTransition.fromStatus !== executionTransition.toStatus) {
    current = { ...current, status: executionTransition.toStatus, updatedAt: input.now }
    events.push(buildEventFromTransition({ transition: { ...executionTransition, actor: input.actor ?? executionTransition.actor }, now: input.now }))
  }

  if (events.length === 0) return { lifecycle: current, events: [] }
  return { lifecycle: current, events }
}
