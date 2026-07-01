import test from 'node:test'
import assert from 'node:assert/strict'

import { createStaticDashboardActorResolver, resolveDashboardActor } from '../src/lib/dashboard/authorization-enforcement/actor-resolver-contract.ts'
import { enforceDashboardScope } from '../src/lib/dashboard/authorization-enforcement/scope-enforcement-engine.ts'
import { enforceDashboardCapabilities } from '../src/lib/dashboard/authorization-enforcement/capability-enforcement-engine.ts'
import { enforceLifecycleCancelAuthorization, enforceLifecycleExecutionAuthorization, enforceLifecycleRetryAuthorization } from '../src/lib/dashboard/authorization-enforcement/lifecycle-enforcement-engine.ts'
import { enforceApprovalMutationAuthorization } from '../src/lib/dashboard/authorization-enforcement/approval-mutation-enforcement-engine.ts'
import { enforceAuditTrailRead, enforceSensitiveDashboardRead } from '../src/lib/dashboard/authorization-enforcement/sensitive-read-enforcement-engine.ts'
import { mapEnforcementStatusToHttpStatus, buildDashboardAuthorizationApiError } from '../src/lib/dashboard/authorization-enforcement/enforcement-response-builder.ts'
import { runDashboardAuthorizationEnforcement } from '../src/lib/dashboard/authorization-enforcement/authorization-enforcement-runtime.ts'

const actor = { id: 'u1', roles: ['system_owner'], lanes: ['system_owner'], tenantId: 't1', workspaceId: 'w1' }
const viewer = { id: 'v1', roles: ['viewer'], tenantId: 't1', workspaceId: 'w1' }
const lifecycle = { id: 'l1', envelopeId: 'e1', actionId: 'a1', adapter: 'system_runtime', status: 'ready_for_execution', envelope: { payload: { title: 'financial approval' } }, approvalDecisions: [], retryCount: 1, createdAt: 'x', updatedAt: 'x' }
const card = { id: 'c1', lifecycleId: 'l1', envelopeId: 'e1', actionTitle: 'financial change', adapter: 'jira', severity: 'high', state: 'action_required', approvalStatus: 'pending', approverLanes: ['finance_lead'], lifecycleStatus: 'approval_pending', retryCount: 0, decisionHistory: [], actions: { canApprove: true, canReject: true, canRequestChanges: true } }

// ... 28
test('1', async () => assert.equal((await createStaticDashboardActorResolver(actor)({})).id, 'u1'))
test('2', async () => assert.equal(await resolveDashboardActor({}), null))
test('3', async () => assert.equal(await resolveDashboardActor({ resolver: async () => ({ id: '', roles: [] }) }), null))
test('4', () => assert.equal(enforceDashboardScope({}).status, 'unauthenticated'))
test('5', () => assert.equal(enforceDashboardScope({ actor, scope: { resourceTenantId: 'other' } }).status, 'scope_conflict'))
test('6', () => assert.equal(enforceDashboardScope({ actor, scope: { resourceWorkspaceId: 'other' } }).status, 'scope_conflict'))
test('7', () => assert.equal(enforceDashboardScope({ actor: { ...actor, roles: ['admin'] }, scope: { resourceTenantId: 'other' } }).status, 'scope_conflict'))
test('8', () => assert.ok(enforceDashboardScope({ actor: { id: 'x', roles: ['viewer'] } }).warnings.length > 0))
test('9', () => assert.equal(enforceDashboardCapabilities({ actor: viewer, resourceType: 'dashboard_read', requiredCapabilities: ['view_queue_item'] }).allowed, true))
test('10', () => assert.equal(enforceDashboardCapabilities({ actor: viewer, resourceType: 'dashboard_read', requiredCapabilities: ['trigger_live_execution'] }).allowed, false))
test('11', () => assert.equal(enforceLifecycleExecutionAuthorization({ actor, lifecycle }).allowed, true))
test('12', () => assert.equal(enforceLifecycleExecutionAuthorization({ actor, lifecycle: { ...lifecycle, status: 'approved' } }).allowed, false))
test('13', () => assert.equal(enforceLifecycleRetryAuthorization({ actor, lifecycle: { ...lifecycle, status: 'execution_failed', retryCount: 2 } }).allowed, true))
test('14', () => assert.equal(enforceLifecycleRetryAuthorization({ actor, lifecycle: { ...lifecycle, status: 'execution_failed', retryCount: 0 } }).allowed, false))
test('15', () => assert.equal(enforceLifecycleCancelAuthorization({ actor, lifecycle: { ...lifecycle, status: 'execution_completed' } }).allowed, false))
test('16', () => assert.equal(enforceApprovalMutationAuthorization({ actor: { ...actor, roles: ['finance_lead'], lanes: ['finance_lead'] }, mutation: { requestId: 'r', envelopeId: 'e1', decision: 'approve', actor }, card }).allowed, true))
test('17', () => assert.equal(enforceApprovalMutationAuthorization({ actor: viewer, mutation: { requestId: 'r', envelopeId: 'e1', decision: 'reject', actor: viewer }, card }).allowed, false))
test('18', () => assert.ok(enforceApprovalMutationAuthorization({ actor, mutation: { requestId: 'r', envelopeId: 'e1', decision: 'approve', actor: viewer }, lifecycle }).warnings.length > 0))
test('19', () => assert.equal(enforceSensitiveDashboardRead({ actor: { id: 'p', roles: ['project_manager'] }, card }).allowed, false))
test('20', () => assert.equal(enforceSensitiveDashboardRead({ actor: { id: 'f', roles: ['finance_lead'], lanes: ['finance_lead'] }, card }).allowed, true))
test('21', () => assert.equal(enforceAuditTrailRead({ actor: viewer, card }).allowed, false))
test('22', () => assert.equal(mapEnforcementStatusToHttpStatus('unauthenticated'), 401))
test('23', () => assert.equal(mapEnforcementStatusToHttpStatus('unauthorized'), 403))
test('24', () => assert.equal(mapEnforcementStatusToHttpStatus('scope_conflict'), 409))
test('25', () => assert.equal(runDashboardAuthorizationEnforcement({ actor: viewer, resourceType: 'approval_mutation', requiredCapabilities: [], mutation: { requestId: 'r', envelopeId: 'e', decision: 'reject', actor: viewer } }).resourceType, 'approval_mutation'))
test('26', () => assert.equal(runDashboardAuthorizationEnforcement({ actor, resourceType: 'live_execution', requiredCapabilities: [], lifecycle }).resourceType, 'live_execution'))
test('27', () => assert.equal(runDashboardAuthorizationEnforcement({ actor: viewer, resourceType: 'audit_trail', requiredCapabilities: [], card }).resourceType, 'audit_trail'))
test('28', () => {
  const r1 = buildDashboardAuthorizationApiError(enforceDashboardCapabilities({ resourceType: 'dashboard_read', requiredCapabilities: ['view_queue_item'] }))
  const r2 = buildDashboardAuthorizationApiError(enforceDashboardCapabilities({ resourceType: 'dashboard_read', requiredCapabilities: ['view_queue_item'] }))
  assert.deepEqual(r1, r2)
})
