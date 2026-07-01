import type { DashboardApprovalRequest } from '../approval-workflow/index'
import type { DashboardTaskLifecycleRecord } from '../task-lifecycle/index'
import { buildDashboardAuthorizationContext, inferSensitiveItemType, evaluateAuthorizationCapability } from '../role-authorization/index'
import type {
  DashboardApprovalMutationAuthorizationResult,
  DashboardApprovalMutationDecision,
  DashboardApprovalMutationRequest,
} from './types'

function mapDecisionToCapability(decision: DashboardApprovalMutationDecision): 'approve' | 'reject' | 'request_changes' {
  if (decision === 'approve') return 'approve'
  if (decision === 'reject') return 'reject'
  return 'request_changes'
}

export function authorizeApprovalMutation(input: {
  mutation: DashboardApprovalMutationRequest
  approvalRequest: DashboardApprovalRequest
  lifecycle?: DashboardTaskLifecycleRecord
}): DashboardApprovalMutationAuthorizationResult {
  const { mutation, approvalRequest, lifecycle } = input
  const capability = mapDecisionToCapability(mutation.decision)

  const context = buildDashboardAuthorizationContext({
    actor: mutation.actor,
    lifecycle: lifecycle
      ? { ...lifecycle, approvalRequest: { ...approvalRequest } }
      : ({
          id: `auth:${approvalRequest.id}`,
          envelopeId: approvalRequest.envelopeId,
          actionId: approvalRequest.actionId,
          adapter: approvalRequest.adapter,
          status: 'approval_pending',
          envelope: { id: approvalRequest.envelopeId, actionId: approvalRequest.actionId, adapter: approvalRequest.adapter, mode: 'ready', payload: { title: approvalRequest.actionTitle } },
          approvalRequest,
          approvalDecisions: [],
          retryCount: 0,
          createdAt: approvalRequest.requestedAt,
          updatedAt: approvalRequest.requestedAt,
        } as unknown as DashboardTaskLifecycleRecord),
  })

  const capabilityDecision = evaluateAuthorizationCapability({ capability, context })
  const sensitiveType = inferSensitiveItemType({ lifecycle })
  const sensitiveDecision = evaluateAuthorizationCapability({ capability: 'view_sensitive_item', context: { ...context, sensitiveType } })
  const decisions = [capabilityDecision, sensitiveDecision]

  if (!capabilityDecision.allowed) {
    return {
      authorized: false,
      decisions,
      reason: capabilityDecision.reason.includes('required approver lane')
        ? 'Actor is not authorized for the required approver lane.'
        : 'Actor role does not grant this capability.',
    }
  }

  if (!sensitiveDecision.allowed && sensitiveType !== 'none') {
    return { authorized: false, decisions, reason: 'Actor cannot access sensitive approval item.' }
  }

  return {
    authorized: true,
    decisions,
    reason: 'Actor is authorized to approve this request.',
  }
}
