import assert from 'node:assert/strict'
import { applyApprovalMutation } from '../src/lib/dashboard/approval-mutations/approval-mutation-engine.ts'
import { authorizeApprovalMutation } from '../src/lib/dashboard/approval-mutations/mutation-authorization-engine.ts'
import { mapMutationToApprovalDecisionType } from '../src/lib/dashboard/approval-mutations/approval-decision-builder.ts'
import { runDashboardApprovalMutationRuntime } from '../src/lib/dashboard/approval-mutations/approval-mutation-runtime.ts'
import { validateApprovalMutationRequest } from '../src/lib/dashboard/approval-mutations/mutation-request-validator.ts'

// ...same
const approvalRequest = { id: 'req-1', envelopeId: 'env-1', actionId: 'a1', adapter: 'jira', actionTitle: 'Finance security review', priority: 'high', ownerLane: 'finance_lead', requestedAt: '2026-01-01T00:00:00.000Z', status: 'pending', riskLevel: 'high', requiredApproverLanes: ['finance_lead'], reasons: [] }
const lifecycle = { id: 'task-lifecycle:env-1', envelopeId: 'env-1', actionId: 'a1', adapter: 'jira', status: 'approval_pending', envelope: { id: 'env-1', adapter: 'jira', actionId: 'a1', mode: 'ready', payload: { title: 'Finance security review' }, createdAt: '2026-01-01T00:00:00.000Z', executionStatus: 'ready', warnings: [] }, approvalRequest, approvalDecisions: [], retryCount: 0, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
const mutation = { requestId: 'req-1', envelopeId: 'env-1', decision: 'approve', actor: { id: 'fin-1', roles: ['finance_lead'], lanes: ['finance_lead'] } }
assert.equal(validateApprovalMutationRequest(mutation).valid, true)
assert.equal(validateApprovalMutationRequest({ ...mutation, decision: 'bad' }).valid, false)
assert.equal(authorizeApprovalMutation({ mutation, approvalRequest, lifecycle }).authorized, true)
assert.equal(authorizeApprovalMutation({ mutation: { ...mutation, actor: { id: 'v', roles: ['viewer'] } }, approvalRequest, lifecycle }).authorized, false)
assert.equal(mapMutationToApprovalDecisionType('defer'), 'request_changes')
assert.equal(applyApprovalMutation({ mutation, approvalRequest, lifecycle, now: '2026-01-02T00:00:00.000Z' }).updatedLifecycle.status, 'ready_for_execution')
assert.equal(applyApprovalMutation({ mutation: { ...mutation, decision: 'reject', comment: 'stop' }, approvalRequest, lifecycle, now: '2026-01-02T00:00:00.000Z' }).updatedLifecycle.status, 'rejected')
assert.equal(applyApprovalMutation({ mutation: { ...mutation, decision: 'defer' }, approvalRequest, lifecycle, now: '2026-01-02T00:00:00.000Z' }).updatedLifecycle.status, 'changes_requested')
const store = { lifecycles: [], events: [], async saveLifecycle(x) { this.lifecycles.push(x) }, async saveEvent(e) { this.events.push(e) }, async getLifecycle(){return null}, async getLifecycleByEnvelopeId(){return null}, async listLifecycles(){return []}, async listEvents(){return []} }
assert.equal((await runDashboardApprovalMutationRuntime({ mutation, context: { store, approvalRequest, lifecycle } })).result.status, 'accepted')
assert.equal((await runDashboardApprovalMutationRuntime({ mutation: { ...mutation, actor: { id: 'v', roles: ['viewer'] } }, context: { store, approvalRequest, lifecycle } })).result.status, 'unauthorized')
assert.equal((await runDashboardApprovalMutationRuntime({ mutation: { ...mutation, envelopeId: 'oops' }, context: { store, approvalRequest, lifecycle } })).result.status, 'conflict')
console.log('[ok] dashboard approval mutation runtime valid')
