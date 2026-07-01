import type { DashboardApprovalDecision, DashboardApprovalRequest } from '../approval-workflow'
import { buildLifecycleEvent } from './lifecycle-audit-engine'
import { createLifecycleRecordFromEnvelope, mergeApprovalIntoLifecycle } from './lifecycle-record-mapper'
import { reconcileDashboardTaskLifecycle } from './lifecycle-reconciliation-engine'
import { buildDashboardTaskLifecycleReport } from './lifecycle-report-builder'
import type { DashboardTaskLifecycleRuntimeInput, DashboardTaskLifecycleReport } from './types'

export async function runDashboardTaskLifecyclePersistence(
  input: DashboardTaskLifecycleRuntimeInput,
): Promise<DashboardTaskLifecycleReport> {
  const generatedAt = input.now ?? new Date().toISOString()
  const approvalByEnvelopeId = new Map<string, DashboardApprovalRequest>((input.approvalWorkflowReport?.requests ?? []).map((r) => [r.envelopeId, r]))
  const decisionsByRequestId = new Map<string, DashboardApprovalDecision[]>()
  for (const decision of input.approvalWorkflowReport?.decisions ?? []) {
    const list = decisionsByRequestId.get(decision.requestId) ?? []
    list.push(decision)
    decisionsByRequestId.set(decision.requestId, list)
  }

  for (const envelope of input.manualPushReport.envelopes) {
    const existing = await input.store.getLifecycleByEnvelopeId(envelope.id)
    let lifecycle = existing ?? createLifecycleRecordFromEnvelope({ envelope, now: generatedAt })

    if (!existing) {
      await input.store.saveEvent(buildLifecycleEvent({ lifecycleId: lifecycle.id, eventType: 'envelope_created', message: `Lifecycle created from manual push envelope ${envelope.id}.`, actor: input.actor, metadata: { envelopeId: envelope.id, actionId: envelope.actionId, adapter: envelope.adapter }, now: generatedAt }))
    }

    const approvalRequest = approvalByEnvelopeId.get(envelope.id)
    const approvalDecisions = approvalRequest ? (decisionsByRequestId.get(approvalRequest.id) ?? []) : []
    lifecycle = mergeApprovalIntoLifecycle({ lifecycle, approvalRequest, approvalDecisions, now: generatedAt })

    const reconciled = reconcileDashboardTaskLifecycle({ lifecycle, approvalWorkflowReport: input.approvalWorkflowReport, now: generatedAt, actor: input.actor })
    await input.store.saveLifecycle(reconciled.lifecycle)
    for (const event of reconciled.events) await input.store.saveEvent(event)
  }

  const lifecycles = await input.store.listLifecycles()
  const events = await input.store.listEvents()
  return buildDashboardTaskLifecycleReport({ generatedAt, lifecycles, events })
}
