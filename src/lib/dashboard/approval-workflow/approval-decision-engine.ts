import type { DashboardApprovalDecision, DashboardApprovalRequest } from './types'

export function applyDashboardApprovalDecision(input: {
  request: DashboardApprovalRequest
  decision?: DashboardApprovalDecision
  now: string
}): DashboardApprovalRequest {
  const { request, decision, now } = input

  if (request.status === 'not_required') return { ...request }

  const expired = request.expiresAt ? new Date(now).getTime() > new Date(request.expiresAt).getTime() : false
  if (expired) return { ...request, status: 'expired' }

  if (!decision) return { ...request }
  if (decision.requestId !== request.id) return { ...request }

  if (decision.decision === 'approve') return { ...request, status: 'approved' }
  if (decision.decision === 'reject') return { ...request, status: 'rejected' }
  return { ...request, status: 'changes_requested' }
}
