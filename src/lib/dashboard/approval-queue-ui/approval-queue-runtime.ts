import type { DashboardApprovalDecision } from '../approval-workflow/index'
import { buildApprovalQueueCard } from './approval-card-builder'
import { groupApprovalCardsByApproverLane, groupApprovalCardsBySeverity } from './approval-grouping-engine'
import { buildApprovalQueueSummary } from './approval-summary-engine'
import type { DashboardApprovalQueueReport, DashboardApprovalQueueRuntimeInput } from './types'

export function runDashboardApprovalQueueRuntime(input: DashboardApprovalQueueRuntimeInput): DashboardApprovalQueueReport {
  const generatedAt = input.now ?? new Date().toISOString()
  const requestIndex = new Map((input.approvalRequests ?? []).map((request) => [request.envelopeId, request]))
  const decisionsByRequestId = new Map<string, DashboardApprovalDecision[]>()

  for (const decision of input.approvalDecisions ?? []) {
    const existing = decisionsByRequestId.get(decision.requestId) ?? []
    existing.push(decision)
    decisionsByRequestId.set(decision.requestId, existing)
  }

  const cards = input.lifecycles.map((lifecycle) => {
    const approvalRequest = requestIndex.get(lifecycle.envelopeId) ?? lifecycle.approvalRequest
    const decisions = approvalRequest ? decisionsByRequestId.get(approvalRequest.id) ?? lifecycle.approvalDecisions : lifecycle.approvalDecisions
    return buildApprovalQueueCard({ lifecycle, approvalRequest, decisions })
  })

  return {
    generatedAt,
    groupsBySeverity: groupApprovalCardsBySeverity(cards),
    groupsByApproverLane: groupApprovalCardsByApproverLane(cards),
    summary: buildApprovalQueueSummary(cards),
  }
}
