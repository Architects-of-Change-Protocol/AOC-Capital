import { applyApprovalMutation } from './approval-mutation-engine'
import { buildApprovalMutationResult } from './approval-mutation-report-builder'
import { authorizeApprovalMutation } from './mutation-authorization-engine'
import { validateApprovalMutationRequest } from './mutation-request-validator'
import type { DashboardApprovalMutationApiResponse, DashboardApprovalMutationRuntimeInput } from './types'

export async function runDashboardApprovalMutationRuntime(input: DashboardApprovalMutationRuntimeInput): Promise<DashboardApprovalMutationApiResponse> {
  const now = input.now ?? new Date().toISOString()
  const validation = validateApprovalMutationRequest(input.mutation)

  if (!validation.valid) {
    return {
      ok: false,
      result: buildApprovalMutationResult({ mutation: input.mutation, status: 'invalid', errors: validation.errors, warnings: validation.warnings }),
    }
  }

  const approvalRequest = input.context.approvalRequest
  if (!approvalRequest) {
    return { ok: false, result: buildApprovalMutationResult({ mutation: input.mutation, status: 'not_found', errors: ['Approval request was not found.'], warnings: validation.warnings }) }
  }

  const lifecycle = input.context.lifecycle
  if (!lifecycle) {
    return { ok: false, result: buildApprovalMutationResult({ mutation: input.mutation, status: 'not_found', approvalRequest, errors: ['Lifecycle record was not found.'], warnings: validation.warnings }) }
  }

  if (approvalRequest.envelopeId !== input.mutation.envelopeId || lifecycle.envelopeId !== input.mutation.envelopeId) {
    return { ok: false, result: buildApprovalMutationResult({ mutation: input.mutation, status: 'conflict', approvalRequest, lifecycle, errors: ['Envelope ID mismatch for approval mutation.'], warnings: validation.warnings }) }
  }

  const authorization = authorizeApprovalMutation({ mutation: input.mutation, approvalRequest, lifecycle })
  if (!authorization.authorized) {
    return { ok: false, result: buildApprovalMutationResult({ mutation: input.mutation, status: 'unauthorized', approvalRequest, lifecycle, authorization, errors: [authorization.reason], warnings: validation.warnings }) }
  }

  const applied = applyApprovalMutation({ mutation: input.mutation, approvalRequest, lifecycle, now })
  await input.context.store.saveLifecycle(applied.updatedLifecycle)
  await input.context.store.saveEvent(applied.event)

  return {
    ok: true,
    result: buildApprovalMutationResult({
      mutation: input.mutation,
      status: 'accepted',
      approvalRequest: applied.updatedApprovalRequest,
      lifecycle: applied.updatedLifecycle,
      decision: applied.decision,
      event: applied.event,
      authorization,
      warnings: validation.warnings,
    }),
  }
}
