import type { DashboardApprovalRequest } from './types'

export function deriveDashboardEnvelopeExecutionGate(request: DashboardApprovalRequest): {
  envelopeId: string
  executable: boolean
  blocked: boolean
  reason: string
} {
  switch (request.status) {
    case 'approved':
      return { envelopeId: request.envelopeId, executable: true, blocked: false, reason: 'Approval granted.' }
    case 'not_required':
      return { envelopeId: request.envelopeId, executable: true, blocked: false, reason: 'Approval not required.' }
    case 'pending':
      return { envelopeId: request.envelopeId, executable: false, blocked: true, reason: 'Approval pending.' }
    case 'rejected':
      return { envelopeId: request.envelopeId, executable: false, blocked: true, reason: 'Approval rejected.' }
    case 'changes_requested':
      return { envelopeId: request.envelopeId, executable: false, blocked: true, reason: 'Approval changes requested.' }
    case 'expired':
      return { envelopeId: request.envelopeId, executable: false, blocked: true, reason: 'Approval expired.' }
    default:
      return { envelopeId: request.envelopeId, executable: false, blocked: true, reason: 'Approval blocked.' }
  }
}
