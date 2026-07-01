import {
  authorizeApprovalQueueCard,
  buildDashboardAuthorizationContext,
  evaluateAuthorizationCapability,
} from '../role-authorization/index'
import { mapEnforcementStatusToHttpStatus } from './enforcement-response-builder'
import { enforceDashboardScope } from './scope-enforcement-engine'
import type { DashboardApprovalMutationDecision } from '../approval-mutations/index'
import type { DashboardAuthorizationCapability } from '../role-authorization/index'
import type { DashboardAuthorizationEnforcementResult, DashboardScopeContext } from './types'
import type { DashboardAuthorizationActor } from '../role-authorization/index'
import type { DashboardApprovalMutationRequest } from '../approval-mutations/index'
import type { DashboardTaskLifecycleRecord } from '../task-lifecycle/index'
import type { DashboardApprovalQueueCard } from '../approval-queue-ui/index'

const MAP: Record<DashboardApprovalMutationDecision, DashboardAuthorizationCapability> = { approve: 'approve', reject: 'reject', request_changes: 'request_changes', defer: 'request_changes' }

export function enforceApprovalMutationAuthorization ({ actor, mutation, lifecycle, card, scope }: { actor?: DashboardAuthorizationActor; mutation?: DashboardApprovalMutationRequest; lifecycle?: DashboardTaskLifecycleRecord; card?: DashboardApprovalQueueCard; scope?: DashboardScopeContext }): DashboardAuthorizationEnforcementResult {
  if (!actor) return { status: 'unauthenticated', allowed: false, resourceType: 'approval_mutation', decisions: [], errors: ['Authentication is required.'], warnings: [], httpStatus: 401 }
  if (!mutation) return { status: 'invalid_context', allowed: false, resourceType: 'approval_mutation', decisions: [], errors: ['Authorization context is invalid.'], warnings: [], httpStatus: 400 }
  const scopeResult = enforceDashboardScope({ actor, scope })
  if (!scopeResult.allowed) return { status: scopeResult.status, allowed: false, resourceType: 'approval_mutation', decisions: [], errors: scopeResult.errors, warnings: scopeResult.warnings, httpStatus: mapEnforcementStatusToHttpStatus(scopeResult.status) }
  const warnings = [...scopeResult.warnings]
  if (mutation.actor?.id && mutation.actor.id !== actor.id) warnings.push('Mutation actor differs from resolved actor; resolved actor takes precedence.')
  const capability = MAP[mutation.decision]
  const decision = card
    ? authorizeApprovalQueueCard({ actor, card }).decisions.find(item => item.capability === capability)
    : evaluateAuthorizationCapability({ capability, context: buildDashboardAuthorizationContext({ actor, lifecycle }) })
  const allowed = !!decision?.allowed
  const status = allowed ? 'allowed' : 'unauthorized'
  return { status, allowed, resourceType: 'approval_mutation', decisions: decision ? [decision] : [], errors: allowed ? [] : [decision?.reason ?? 'Actor role does not grant this capability.'], warnings, httpStatus: mapEnforcementStatusToHttpStatus(status) }
}
