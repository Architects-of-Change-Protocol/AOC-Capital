import { enforceApprovalMutationAuthorization } from './approval-mutation-enforcement-engine'
import { enforceDashboardCapabilities } from './capability-enforcement-engine'
import { enforceLifecycleExecutionAuthorization } from './lifecycle-enforcement-engine'
import { enforceSensitiveDashboardRead, enforceAuditTrailRead } from './sensitive-read-enforcement-engine'
import type { DashboardAuthorizationEnforcementRequest, DashboardAuthorizationEnforcementResult } from './types'

export function runDashboardAuthorizationEnforcement (request: DashboardAuthorizationEnforcementRequest): DashboardAuthorizationEnforcementResult {
  if (request.resourceType === 'approval_mutation') return enforceApprovalMutationAuthorization(request)
  if (request.resourceType === 'task_lifecycle' || request.resourceType === 'live_execution') return enforceLifecycleExecutionAuthorization(request)
  if (request.resourceType === 'manual_push') return enforceDashboardCapabilities({ ...request, requiredCapabilities: ['trigger_manual_push'] })
  if (request.resourceType === 'sensitive_read' || request.resourceType === 'dashboard_read' || request.resourceType === 'approval_queue_card') return enforceSensitiveDashboardRead(request)
  if (request.resourceType === 'audit_trail') return enforceAuditTrailRead(request)
  return enforceDashboardCapabilities(request)
}
