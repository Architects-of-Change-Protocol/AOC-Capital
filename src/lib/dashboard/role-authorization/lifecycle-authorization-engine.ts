import type { DashboardTaskLifecycleRecord } from '../task-lifecycle/index'
import { buildDashboardAuthorizationContext } from './authorization-context-builder'
import { evaluateAuthorizationCapability } from './authorization-decision-engine'
import type { DashboardAuthorizationActor, DashboardAuthorizationCapability, DashboardAuthorizedActionAvailability, DashboardAuthorizationDecision } from './types'

const CAPS: DashboardAuthorizationCapability[] = ['view_queue_item', 'view_sensitive_item', 'trigger_manual_push', 'trigger_live_execution', 'retry_execution', 'cancel_lifecycle', 'view_audit_trail']
const blankAvailability = (): DashboardAuthorizedActionAvailability => ({ canView: false, canViewSensitive: false, canApprove: false, canReject: false, canRequestChanges: false, canTriggerManualPush: false, canTriggerLiveExecution: false, canRetryExecution: false, canCancelLifecycle: false, canOverrideApproval: false, canViewAuditTrail: false, disabledReasons: {} })

export function authorizeTaskLifecycle ({ actor, lifecycle }: { actor: DashboardAuthorizationActor; lifecycle: DashboardTaskLifecycleRecord }): { lifecycleId: string; availability: DashboardAuthorizedActionAvailability; decisions: DashboardAuthorizationDecision[] } {
  const context = buildDashboardAuthorizationContext({ actor, lifecycle })
  const decisions = CAPS.map(capability => evaluateAuthorizationCapability({ capability, context }))
  const byCap = Object.fromEntries(decisions.map(decision => [decision.capability, decision])) as Record<DashboardAuthorizationCapability, DashboardAuthorizationDecision>
  const availability = blankAvailability()
  availability.canView = byCap.view_queue_item.allowed
  availability.canViewSensitive = byCap.view_sensitive_item.allowed || context.sensitiveType === 'none'
  availability.canTriggerManualPush = byCap.trigger_manual_push.allowed
  availability.canTriggerLiveExecution = byCap.trigger_live_execution.allowed
  availability.canRetryExecution = byCap.retry_execution.allowed
  availability.canCancelLifecycle = byCap.cancel_lifecycle.allowed
  availability.canViewAuditTrail = byCap.view_audit_trail.allowed
  for (const decision of decisions) if (!decision.allowed) availability.disabledReasons[decision.capability] = decision.reason
  return { lifecycleId: lifecycle.id, availability, decisions }
}
