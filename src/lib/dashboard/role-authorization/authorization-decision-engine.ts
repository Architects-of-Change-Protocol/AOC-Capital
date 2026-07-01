import { resolveActorCapabilities } from './role-capability-matrix'
import { canActorAccessSensitiveType, isActorInRequiredLane } from './authorization-policy-engine'
import type { DashboardAuthorizationCapability, DashboardAuthorizationContext, DashboardAuthorizationDecision } from './types'

const COMPLETED_STATES = new Set(['execution_completed', 'cancelled'])

export function evaluateAuthorizationCapability ({ capability, context }: { capability: DashboardAuthorizationCapability; context: DashboardAuthorizationContext }): DashboardAuthorizationDecision {
  const actorCapabilities = resolveActorCapabilities(context.actor)
  if (!actorCapabilities.includes(capability)) return { capability, allowed: false, reason: 'Actor role does not grant this capability.' }

  const status = context.lifecycle?.status ?? context.card?.lifecycleStatus
  const sensitiveAllowed = canActorAccessSensitiveType({ actor: context.actor, sensitiveType: context.sensitiveType })
  const laneAllowed = isActorInRequiredLane({ actor: context.actor, requiredLanes: context.requiredLanes })

  if (capability === 'view_queue_item') return { capability, allowed: true, reason: 'Actor can view queue items.' }
  if (capability === 'view_sensitive_item') return { capability, allowed: sensitiveAllowed, reason: sensitiveAllowed ? 'Sensitive access granted for actor.' : 'Sensitive access denied for this actor role.' }
  if (capability === 'approve' || capability === 'reject' || capability === 'request_changes') {
    if (!laneAllowed) return { capability, allowed: false, reason: 'Actor is not in a required approver lane.' }
    if (status && COMPLETED_STATES.has(status)) return { capability, allowed: false, reason: 'Lifecycle is already completed or cancelled.' }
    return { capability, allowed: true, reason: 'Actor can decide this approval item.' }
  }
  if (capability === 'trigger_manual_push') return { capability, allowed: !(status && COMPLETED_STATES.has(status)), reason: status && COMPLETED_STATES.has(status) ? 'Lifecycle is completed or cancelled.' : 'Actor can trigger manual push preparation.' }
  if (capability === 'trigger_live_execution') return { capability, allowed: status === 'ready_for_execution', reason: status === 'ready_for_execution' ? 'Lifecycle is ready for execution.' : 'Lifecycle must be ready_for_execution.' }
  if (capability === 'retry_execution') {
    const allowed = context.lifecycle?.status === 'execution_failed' && (context.lifecycle?.retryCount ?? 0) > 0
    return { capability, allowed, reason: allowed ? 'Lifecycle retry is allowed.' : 'Retry requires execution_failed status with retryCount > 0.' }
  }
  if (capability === 'cancel_lifecycle') return { capability, allowed: !(status && COMPLETED_STATES.has(status)), reason: status && COMPLETED_STATES.has(status) ? 'Lifecycle is already completed or cancelled.' : 'Actor can cancel this lifecycle.' }
  if (capability === 'override_approval') return { capability, allowed: sensitiveAllowed, reason: sensitiveAllowed ? 'Actor can override approval routing.' : 'Override blocked by sensitive access policy.' }
  if (capability === 'view_audit_trail') return { capability, allowed: sensitiveAllowed, reason: sensitiveAllowed ? 'Actor can view audit trail.' : 'Audit trail access denied by sensitive access policy.' }

  return { capability, allowed: false, reason: 'Unsupported capability.' }
}
