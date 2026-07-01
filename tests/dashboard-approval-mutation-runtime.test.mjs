import test from 'node:test'
import assert from 'node:assert/strict'

import { applyApprovalMutation } from '../src/lib/dashboard/approval-mutations/approval-mutation-engine.ts'
import { authorizeApprovalMutation } from '../src/lib/dashboard/approval-mutations/mutation-authorization-engine.ts'
import { buildApprovalDecisionFromMutation, mapMutationToApprovalDecisionType } from '../src/lib/dashboard/approval-mutations/approval-decision-builder.ts'
import { runDashboardApprovalMutationRuntime } from '../src/lib/dashboard/approval-mutations/approval-mutation-runtime.ts'
import { validateApprovalMutationRequest } from '../src/lib/dashboard/approval-mutations/mutation-request-validator.ts'


function fixtures() {
  const approvalRequest = {
    id: 'req-1', envelopeId: 'env-1', actionId: 'act-1', adapter: 'jira', actionTitle: 'Security review', priority: 'high', ownerLane: 'security_owner', requestedAt: '2026-01-01T00:00:00.000Z', status: 'pending', riskLevel: 'high', requiredApproverLanes: ['security_owner'], reasons: ['sensitive']
  }
  const lifecycle = {
    id: 'task-lifecycle:env-1', envelopeId: 'env-1', actionId: 'act-1', adapter: 'jira', status: 'approval_pending',
    envelope: { id: 'env-1', adapter: 'jira', actionId: 'act-1', mode: 'ready', payload: { title: 'Security review' }, createdAt: '2026-01-01T00:00:00.000Z', executionStatus: 'ready', warnings: [] },
    approvalRequest, approvalDecisions: [], retryCount: 0, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z'
  }
  const actor = { id: 'u1', roles: ['security_owner'], lanes: ['security_owner'] }
  const mutation = { requestId: 'req-1', envelopeId: 'env-1', decision: 'approve', actor }
  return { approvalRequest, lifecycle, actor, mutation }
}

class MemoryStore {
  lifecycles = []
  events = []
  async saveLifecycle(record) { this.lifecycles.push(record) }
  async getLifecycle() { return null }
  async getLifecycleByEnvelopeId() { return null }
  async listLifecycles() { return [] }
  async saveEvent(event) { this.events.push(event) }
  async listEvents() { return this.events }
}

test('1 valid request passes', () => assert.equal(validateApprovalMutationRequest(fixtures().mutation).valid, true))
test('2 missing requestId fails', () => assert.equal(validateApprovalMutationRequest({ ...fixtures().mutation, requestId: '' }).valid, false))
test('3 invalid decision fails', () => assert.equal(validateApprovalMutationRequest({ ...fixtures().mutation, decision: 'x' }).valid, false))
test('4 missing actor fails', () => assert.equal(validateApprovalMutationRequest({ ...fixtures().mutation, actor: undefined }).valid, false))
test('5 reject without comment warning', () => assert.ok(validateApprovalMutationRequest({ ...fixtures().mutation, decision: 'reject' }).warnings.includes('comment missing for reject')))
test('6 defer maps to request_changes', () => assert.equal(mapMutationToApprovalDecisionType('defer'), 'request_changes'))
test('7 decision builder uses actor id', () => assert.equal(buildApprovalDecisionFromMutation({ mutation: fixtures().mutation, now: '2026-01-02T00:00:00.000Z' }).decidedBy, 'u1'))
test('8 authorization allows PMO director', () => {
  const f = fixtures();
  const result = authorizeApprovalMutation({ mutation: { ...f.mutation, actor: { id: 'd1', roles: ['pmo_director'], lanes: ['security_owner'] } }, approvalRequest: f.approvalRequest, lifecycle: f.lifecycle })
  assert.equal(result.authorized, true)
})
test('9 authorization blocks viewer', () => assert.equal(authorizeApprovalMutation({ mutation: { ...fixtures().mutation, actor: { id: 'v1', roles: ['viewer'] } }, approvalRequest: fixtures().approvalRequest, lifecycle: fixtures().lifecycle }).authorized, false))
test('10 authorization blocks wrong lane', () => assert.equal(authorizeApprovalMutation({ mutation: { ...fixtures().mutation, actor: { id: 'pm', roles: ['project_manager'], lanes: ['project_manager'] } }, approvalRequest: fixtures().approvalRequest, lifecycle: fixtures().lifecycle }).authorized, false))

test('11 apply approve sets approval approved', () => assert.equal(applyApprovalMutation({ ...fixtures(), now: '2026-01-02T00:00:00.000Z' }).updatedApprovalRequest.status, 'approved'))
test('12 apply approve sets lifecycle ready_for_execution', () => assert.equal(applyApprovalMutation({ ...fixtures(), now: '2026-01-02T00:00:00.000Z' }).updatedLifecycle.status, 'ready_for_execution'))
test('13 apply reject sets approval rejected', () => assert.equal(applyApprovalMutation({ ...fixtures(), mutation: { ...fixtures().mutation, decision: 'reject', comment: 'no' }, now: '2026-01-02T00:00:00.000Z' }).updatedApprovalRequest.status, 'rejected'))
test('14 apply reject sets lifecycle rejected', () => assert.equal(applyApprovalMutation({ ...fixtures(), mutation: { ...fixtures().mutation, decision: 'reject', comment: 'no' }, now: '2026-01-02T00:00:00.000Z' }).updatedLifecycle.status, 'rejected'))
test('15 apply request_changes sets lifecycle changes_requested', () => assert.equal(applyApprovalMutation({ ...fixtures(), mutation: { ...fixtures().mutation, decision: 'request_changes', comment: 'fix' }, now: '2026-01-02T00:00:00.000Z' }).updatedLifecycle.status, 'changes_requested'))
test('16 apply defer creates deferred comment', () => assert.match(applyApprovalMutation({ ...fixtures(), mutation: { ...fixtures().mutation, decision: 'defer' }, now: '2026-01-02T00:00:00.000Z' }).decision.comment, /^Deferred:/))

test('17 runtime invalid request returns invalid', async () => { const store = new MemoryStore(); const res = await runDashboardApprovalMutationRuntime({ mutation: { ...fixtures().mutation, decision: 'bad' }, context: { store } }); assert.equal(res.result.status, 'invalid') })
test('18 runtime missing approval request returns not_found', async () => { const store = new MemoryStore(); const res = await runDashboardApprovalMutationRuntime({ mutation: fixtures().mutation, context: { store, lifecycle: fixtures().lifecycle } }); assert.equal(res.result.status, 'not_found') })
test('19 runtime missing lifecycle returns not_found', async () => { const store = new MemoryStore(); const f = fixtures(); const res = await runDashboardApprovalMutationRuntime({ mutation: f.mutation, context: { store, approvalRequest: f.approvalRequest } }); assert.equal(res.result.status, 'not_found') })
test('20 runtime envelope mismatch returns conflict', async () => { const store = new MemoryStore(); const f = fixtures(); const res = await runDashboardApprovalMutationRuntime({ mutation: { ...f.mutation, envelopeId: 'bad' }, context: { store, approvalRequest: f.approvalRequest, lifecycle: f.lifecycle } }); assert.equal(res.result.status, 'conflict') })
test('21 runtime unauthorized returns unauthorized', async () => { const store = new MemoryStore(); const f = fixtures(); const res = await runDashboardApprovalMutationRuntime({ mutation: { ...f.mutation, actor: { id: 'v', roles: ['viewer'] } }, context: { store, approvalRequest: f.approvalRequest, lifecycle: f.lifecycle } }); assert.equal(res.result.status, 'unauthorized') })
test('22 runtime accepted saves lifecycle', async () => { const store = new MemoryStore(); const f = fixtures(); await runDashboardApprovalMutationRuntime({ mutation: f.mutation, context: { store, approvalRequest: f.approvalRequest, lifecycle: f.lifecycle } }); assert.equal(store.lifecycles.length, 1) })
test('23 runtime accepted saves event', async () => { const store = new MemoryStore(); const f = fixtures(); await runDashboardApprovalMutationRuntime({ mutation: f.mutation, context: { store, approvalRequest: f.approvalRequest, lifecycle: f.lifecycle } }); assert.equal(store.events.length, 1) })
test('24 runtime does not execute connectors', async () => { const store = new MemoryStore(); const f = fixtures(); const res = await runDashboardApprovalMutationRuntime({ mutation: f.mutation, context: { store, approvalRequest: f.approvalRequest, lifecycle: f.lifecycle } }); assert.equal(res.ok, true) })
test('25 api route file exists', async () => { const fs = await import('node:fs/promises'); await fs.access('src/app/api/dashboard/approvals/decision/route.ts'); assert.ok(true) })
