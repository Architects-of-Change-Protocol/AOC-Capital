import type { DashboardManualPushEnvelope } from '../manual-task-push'
import { deriveDashboardEnvelopeExecutionGate } from './approval-state-machine'
import type {
  DashboardApprovalDecision,
  DashboardApprovalRequest,
  DashboardApprovalWorkflowReport,
} from './types'

export function buildDashboardApprovalWorkflowReport(input: {
  generatedAt: string
  envelopes: DashboardManualPushEnvelope[]
  requests: DashboardApprovalRequest[]
  decisions: DashboardApprovalDecision[]
}): DashboardApprovalWorkflowReport {
  const { generatedAt, envelopes, requests, decisions } = input

  const executableEnvelopeIds: string[] = []
  const blockedEnvelopeIds: string[] = []
  const warnings: string[] = []

  for (const request of requests) {
    const gate = deriveDashboardEnvelopeExecutionGate(request)
    if (gate.executable) executableEnvelopeIds.push(gate.envelopeId)
    if (gate.blocked) blockedEnvelopeIds.push(gate.envelopeId)
    if (request.status === 'expired') warnings.push(`Envelope ${request.envelopeId}: approval expired.`)
    if (request.status === 'rejected') warnings.push(`Envelope ${request.envelopeId}: approval rejected.`)
    if (request.status === 'changes_requested') warnings.push(`Envelope ${request.envelopeId}: approval changes requested.`)
    if (request.status === 'pending') warnings.push(`Envelope ${request.envelopeId}: approval pending.`)
  }

  const approvalRequiredCount = requests.filter((r) => r.status !== 'not_required').length
  const pendingCount = requests.filter((r) => r.status === 'pending').length
  const approvedCount = requests.filter((r) => r.status === 'approved').length
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length
  const blockedCount = requests.filter((r) => ['pending', 'rejected', 'changes_requested', 'expired', 'blocked'].includes(r.status)).length

  const executiveSummary = approvalRequiredCount === 0
    ? 'No approval workflow required for current manual push envelopes.'
    : blockedEnvelopeIds.length > 0
      ? `PMFreak blocked ${blockedEnvelopeIds.length} envelope(s) pending approval workflow completion.`
      : 'All manual push envelopes are cleared for execution.'

  return {
    generatedAt,
    totalEnvelopes: envelopes.length,
    approvalRequiredCount,
    pendingCount,
    approvedCount,
    rejectedCount,
    blockedCount,
    requests,
    decisions,
    executableEnvelopeIds,
    blockedEnvelopeIds,
    warnings,
    executiveSummary,
  }
}
