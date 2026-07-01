import { buildDashboardAuthorizationContext } from './authorization-context-builder'
import { evaluateAuthorizationCapability } from './authorization-decision-engine'
import type { DashboardAuthorizationActor, DashboardAuthorizationCapability, DashboardAuthorizedActionAvailability, DashboardAuthorizationDecision } from './types'
import type { DashboardApprovalQueueCard } from '../approval-queue-ui/index'

const CAPS: DashboardAuthorizationCapability[] = ['view_queue_item', 'view_sensitive_item', 'approve', 'reject', 'request_changes', 'override_approval', 'view_audit_trail']
const blankAvailability = (): DashboardAuthorizedActionAvailability => ({ canView: false, canViewSensitive: false, canApprove: false, canReject: false, canRequestChanges: false, canTriggerManualPush: false, canTriggerLiveExecution: false, canRetryExecution: false, canCancelLifecycle: false, canOverrideApproval: false, canViewAuditTrail: false, disabledReasons: {} })

export function authorizeApprovalQueueCard ({ actor, card }: { actor: DashboardAuthorizationActor; card: DashboardApprovalQueueCard }): { cardId: string; availability: DashboardAuthorizedActionAvailability; decisions: DashboardAuthorizationDecision[] } {
  const context = buildDashboardAuthorizationContext({ actor, card })
  const decisions = CAPS.map(capability => evaluateAuthorizationCapability({ capability, context }))
  const byCap = Object.fromEntries(decisions.map(decision => [decision.capability, decision])) as Record<DashboardAuthorizationCapability, DashboardAuthorizationDecision>
  const availability = blankAvailability()
  availability.canView = byCap.view_queue_item.allowed
  availability.canViewSensitive = byCap.view_sensitive_item.allowed || context.sensitiveType === 'none'
  availability.canApprove = byCap.approve.allowed && card.actions.canApprove
  availability.canReject = byCap.reject.allowed && card.actions.canReject
  availability.canRequestChanges = byCap.request_changes.allowed && card.actions.canRequestChanges
  availability.canOverrideApproval = byCap.override_approval.allowed
  availability.canViewAuditTrail = byCap.view_audit_trail.allowed

  for (const decision of decisions) if (!decision.allowed) availability.disabledReasons[decision.capability] = decision.reason
  if (!card.actions.canApprove || !card.actions.canReject || !card.actions.canRequestChanges) {
    const reason = card.actions.disabledReason ?? 'Card action is currently disabled.'
    if (!card.actions.canApprove) availability.disabledReasons.approve = reason
    if (!card.actions.canReject) availability.disabledReasons.reject = reason
    if (!card.actions.canRequestChanges) availability.disabledReasons.request_changes = reason
  }

  return { cardId: card.id, availability, decisions }
}
