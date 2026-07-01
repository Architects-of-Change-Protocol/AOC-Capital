import { authorizeTaskLifecycle } from '../role-authorization/index'
import { mapEnforcementStatusToHttpStatus } from './enforcement-response-builder'
import { enforceDashboardScope } from './scope-enforcement-engine'
import type { DashboardAuthorizationActor } from '../role-authorization/index'
import type { DashboardTaskLifecycleRecord } from '../task-lifecycle/index'
import type { DashboardAuthorizationEnforcementResult, DashboardScopeContext } from './types'

function enforceLifecycleCapability ({ actor, lifecycle, scope, resourceType, required, allowedFlag }: { actor?: DashboardAuthorizationActor; lifecycle?: DashboardTaskLifecycleRecord; scope?: DashboardScopeContext; resourceType: 'task_lifecycle' | 'live_execution'; required: 'trigger_live_execution' | 'retry_execution' | 'cancel_lifecycle'; allowedFlag: 'canTriggerLiveExecution' | 'canRetryExecution' | 'canCancelLifecycle' }): DashboardAuthorizationEnforcementResult {
  if (!actor) return { status: 'unauthenticated', allowed: false, resourceType, decisions: [], errors: ['Authentication is required.'], warnings: [], httpStatus: mapEnforcementStatusToHttpStatus('unauthenticated') }
  if (!lifecycle) return { status: 'not_found', allowed: false, resourceType, decisions: [], errors: ['Requested dashboard authorization resource was not found.'], warnings: [], httpStatus: mapEnforcementStatusToHttpStatus('not_found') }
  const scopeResult = enforceDashboardScope({ actor, scope })
  if (!scopeResult.allowed) return { status: scopeResult.status, allowed: false, resourceType, decisions: [], errors: scopeResult.errors, warnings: scopeResult.warnings, httpStatus: mapEnforcementStatusToHttpStatus(scopeResult.status) }

  const report = authorizeTaskLifecycle({ actor, lifecycle })
  const decision = report.decisions.find(item => item.capability === required)
  const allowed = report.availability[allowedFlag] && !!decision?.allowed
  const status = allowed ? 'allowed' : 'unauthorized'
  return { status, allowed, resourceType, decisions: decision ? [decision] : [], errors: allowed ? [] : [decision?.reason ?? 'Authorization denied.'], warnings: scopeResult.warnings, httpStatus: mapEnforcementStatusToHttpStatus(status) }
}

export function enforceLifecycleExecutionAuthorization ({ actor, lifecycle, scope }: { actor?: DashboardAuthorizationActor; lifecycle?: DashboardTaskLifecycleRecord; scope?: DashboardScopeContext }): DashboardAuthorizationEnforcementResult {
  return enforceLifecycleCapability({ actor, lifecycle, scope, resourceType: 'live_execution', required: 'trigger_live_execution', allowedFlag: 'canTriggerLiveExecution' })
}

export function enforceLifecycleRetryAuthorization ({ actor, lifecycle, scope }: { actor?: DashboardAuthorizationActor; lifecycle?: DashboardTaskLifecycleRecord; scope?: DashboardScopeContext }): DashboardAuthorizationEnforcementResult {
  return enforceLifecycleCapability({ actor, lifecycle, scope, resourceType: 'task_lifecycle', required: 'retry_execution', allowedFlag: 'canRetryExecution' })
}

export function enforceLifecycleCancelAuthorization ({ actor, lifecycle, scope }: { actor?: DashboardAuthorizationActor; lifecycle?: DashboardTaskLifecycleRecord; scope?: DashboardScopeContext }): DashboardAuthorizationEnforcementResult {
  return enforceLifecycleCapability({ actor, lifecycle, scope, resourceType: 'task_lifecycle', required: 'cancel_lifecycle', allowedFlag: 'canCancelLifecycle' })
}
