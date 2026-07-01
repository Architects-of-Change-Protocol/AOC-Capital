import assert from 'node:assert/strict'

import { createStaticDashboardActorResolver } from '../src/lib/dashboard/authorization-enforcement/actor-resolver-contract.ts'
import { enforceDashboardScope } from '../src/lib/dashboard/authorization-enforcement/scope-enforcement-engine.ts'
import { enforceDashboardCapabilities } from '../src/lib/dashboard/authorization-enforcement/capability-enforcement-engine.ts'
import { enforceLifecycleExecutionAuthorization, enforceLifecycleRetryAuthorization } from '../src/lib/dashboard/authorization-enforcement/lifecycle-enforcement-engine.ts'
import { enforceApprovalMutationAuthorization } from '../src/lib/dashboard/authorization-enforcement/approval-mutation-enforcement-engine.ts'
import { enforceSensitiveDashboardRead } from '../src/lib/dashboard/authorization-enforcement/sensitive-read-enforcement-engine.ts'
import { mapEnforcementStatusToHttpStatus } from '../src/lib/dashboard/authorization-enforcement/enforcement-response-builder.ts'
import { runDashboardAuthorizationEnforcement } from '../src/lib/dashboard/authorization-enforcement/authorization-enforcement-runtime.ts'

const actor = { id: 'a1', roles: ['system_owner'], tenantId: 't1', workspaceId: 'w1' }
const viewer = { id: 'v1', roles: ['viewer'], tenantId: 't1', workspaceId: 'w1' }
const lifecycle = { id: 'l1', envelopeId: 'e1', actionId: 'a1', adapter: 'system_runtime', status: 'ready_for_execution', envelope: { payload: { title: 'financial sync' } }, approvalDecisions: [], retryCount: 1, createdAt: 'x', updatedAt: 'x' }
const card = { id: 'c1', lifecycleId: 'l1', envelopeId: 'e1', actionTitle: 'financial approval', adapter: 'jira', severity: 'high', state: 'action_required', approvalStatus: 'pending', approverLanes: ['finance_lead'], lifecycleStatus: 'approval_pending', retryCount: 0, decisionHistory: [], actions: { canApprove: true, canReject: true, canRequestChanges: true } }

assert.equal((await createStaticDashboardActorResolver(actor)({})).id, 'a1')
assert.equal(enforceDashboardScope({}).status, 'unauthenticated')
assert.equal(enforceDashboardScope({ actor: { ...actor, roles: ['admin'] }, scope: { resourceTenantId: 'x' } }).status, 'scope_conflict')
assert.equal(enforceDashboardCapabilities({ actor: viewer, resourceType: 'dashboard_read', requiredCapabilities: ['view_queue_item'] }).allowed, true)
assert.equal(enforceDashboardCapabilities({ actor: viewer, resourceType: 'dashboard_read', requiredCapabilities: ['trigger_live_execution'] }).allowed, false)
assert.equal(enforceLifecycleExecutionAuthorization({ actor, lifecycle }).allowed, true)
assert.equal(enforceLifecycleRetryAuthorization({ actor, lifecycle: { ...lifecycle, status: 'execution_failed', retryCount: 2 } }).allowed, true)
assert.equal(enforceApprovalMutationAuthorization({ actor: { ...actor, roles: ['finance_lead'], lanes: ['finance_lead'] }, mutation: { requestId: 'r', envelopeId: 'e', decision: 'approve', actor }, card }).allowed, true)
assert.equal(enforceSensitiveDashboardRead({ actor: viewer, card }).allowed, false)
assert.equal(mapEnforcementStatusToHttpStatus('scope_conflict'), 409)
assert.equal(runDashboardAuthorizationEnforcement({ actor, resourceType: 'live_execution', requiredCapabilities: [], lifecycle }).resourceType, 'live_execution')

console.log('[ok] dashboard authorization enforcement runtime valid')
